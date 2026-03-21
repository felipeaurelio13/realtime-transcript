'use client';

import { useCallback, useRef } from 'react';
import { useLiveNotesStore } from '@/store/livenotes-store';

const REALTIME_SESSION_URL = '/api/realtime';
const CONNECTION_TIMEOUT_MS = 10000;
const ICE_GATHERING_TIMEOUT_MS = 2500;
const NO_AUDIO_TIMEOUT_MS = 8000;

const humanizeRealtimeError = (error: unknown) => {
  if (error instanceof Error) {
    if (/NotAllowedError/i.test(error.name)) {
      return 'El navegador no permitió usar el micrófono.';
    }

    return error.message;
  }

  return 'No se pudo iniciar la transcripción.';
};

const waitForIceGatheringComplete = async (peer: RTCPeerConnection) => {
  if (peer.iceGatheringState === 'complete') return;

  await new Promise<void>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      resolve();
    }, ICE_GATHERING_TIMEOUT_MS);

    const handleChange = () => {
      if (peer.iceGatheringState === 'complete') {
        cleanup();
        resolve();
      }
    };

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      peer.removeEventListener('icegatheringstatechange', handleChange);
    };

    peer.addEventListener('icegatheringstatechange', handleChange);
  });
};

export const useRealtimeTranscription = () => {
  const setStatus = useLiveNotesStore((state) => state.setStatus);
  const setErrorMessage = useLiveNotesStore((state) => state.setErrorMessage);
  const setLiveTranscript = useLiveNotesStore((state) => state.setLiveTranscript);
  const updateLiveDelta = useLiveNotesStore((state) => state.updateLiveDelta);
  const commitLiveTranscript = useLiveNotesStore((state) => state.commitLiveTranscript);
  const startRecordingCost = useLiveNotesStore((state) => state.startRecordingCost);
  const stopRecordingCost = useLiveNotesStore((state) => state.stopRecordingCost);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const isStoppingRef = useRef(false);
  const committedOrderRef = useRef<string[]>([]);
  const flushedCountRef = useRef(0);
  const completedTranscriptsRef = useRef<Map<string, string>>(new Map());
  const liveItemIdRef = useRef<string | null>(null);
  const hasReceivedAudioEventRef = useRef(false);
  const noAudioTimeoutRef = useRef<number | null>(null);

  const flushCompletedTranscripts = useCallback(() => {
    while (flushedCountRef.current < committedOrderRef.current.length) {
      const itemId = committedOrderRef.current[flushedCountRef.current];
      const transcript = completedTranscriptsRef.current.get(itemId);
      if (!transcript) break;

      const preserveLiveTranscript = liveItemIdRef.current !== itemId;
      commitLiveTranscript(transcript, { preserveLiveTranscript });
      if (!preserveLiveTranscript) {
        liveItemIdRef.current = null;
      }

      completedTranscriptsRef.current.delete(itemId);
      flushedCountRef.current += 1;
    }
  }, [commitLiveTranscript]);

  const resetRealtimeState = useCallback(() => {
    committedOrderRef.current = [];
    flushedCountRef.current = 0;
    completedTranscriptsRef.current.clear();
    liveItemIdRef.current = null;
    hasReceivedAudioEventRef.current = false;
    if (noAudioTimeoutRef.current) {
      window.clearTimeout(noAudioTimeoutRef.current);
      noAudioTimeoutRef.current = null;
    }
  }, []);

  const stop = useCallback(async () => {
    isStoppingRef.current = true;
    stopRecordingCost();
    const channel = channelRef.current;

    for (const itemId of completedTranscriptsRef.current.keys()) {
      if (!committedOrderRef.current.includes(itemId)) {
        committedOrderRef.current.push(itemId);
      }
    }

    flushCompletedTranscripts();
    channel?.close();
    peerRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
      audioElementRef.current = null;
    }

    channelRef.current = null;
    peerRef.current = null;
    streamRef.current = null;
    commitLiveTranscript();
    resetRealtimeState();
    setStatus('idle');
  }, [commitLiveTranscript, flushCompletedTranscripts, resetRealtimeState, setStatus, stopRecordingCost]);

  const start = useCallback(async () => {
    isStoppingRef.current = false;
    setErrorMessage(null);
    resetRealtimeState();
    setLiveTranscript('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      peer.onconnectionstatechange = () => {
        if (isStoppingRef.current) return;

        if (peer.connectionState === 'failed') {
          setErrorMessage('La conexión WebRTC con OpenAI falló.');
        }

        if (peer.connectionState === 'disconnected') {
          setErrorMessage('La conexión WebRTC se desconectó antes de recibir transcripción.');
        }
      };
      peer.oniceconnectionstatechange = () => {
        if (isStoppingRef.current) return;

        if (peer.iceConnectionState === 'failed') {
          setErrorMessage('La conexión ICE con OpenAI falló.');
        }
      };
      audioElementRef.current = document.createElement('audio');
      audioElementRef.current.autoplay = true;
      peer.ontrack = (event) => {
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = event.streams[0];
        }
      };

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      const channel = peer.createDataChannel('oai-events');
      channelRef.current = channel;
      channel.onerror = () => {
        if (isStoppingRef.current) return;
        setErrorMessage('El canal de datos realtime falló.');
      };
      channel.onclose = () => {
        if (isStoppingRef.current) return;

        if (peerRef.current === peer && peer.connectionState !== 'closed') {
          setErrorMessage('El canal de datos realtime se cerró.');
        }
      };

      channel.onmessage = async (event) => {
        const rawData =
          typeof event.data === 'string'
            ? event.data
            : event.data instanceof Blob
              ? await event.data.text()
              : '';

        if (!rawData) return;

        let payload: {
          type?: string;
          delta?: string;
          transcript?: string;
          item_id?: string;
          previous_item_id?: string | null;
          error?: { message?: string };
        };

        try {
          payload = JSON.parse(rawData) as {
            type?: string;
            delta?: string;
            transcript?: string;
            error?: { message?: string };
          };
        } catch {
          return;
        }

        if (
          payload.type === 'input_audio_buffer.speech_started' ||
          payload.type === 'input_audio_buffer.speech_stopped' ||
          payload.type === 'input_audio_buffer.committed' ||
          payload.type === 'conversation.item.input_audio_transcription.delta' ||
          payload.type === 'conversation.item.input_audio_transcription.completed'
        ) {
          hasReceivedAudioEventRef.current = true;
          if (noAudioTimeoutRef.current) {
            window.clearTimeout(noAudioTimeoutRef.current);
            noAudioTimeoutRef.current = null;
          }
        }

        if (payload.type === 'input_audio_buffer.committed' && payload.item_id) {
          committedOrderRef.current.push(payload.item_id);
          flushCompletedTranscripts();
          return;
        }

        if (payload.type === 'conversation.item.input_audio_transcription.delta') {
          if (payload.item_id && liveItemIdRef.current !== payload.item_id) {
            setLiveTranscript(payload.delta ?? '');
            liveItemIdRef.current = payload.item_id;
            return;
          }

          updateLiveDelta(payload.delta ?? '');
          return;
        }

        if (payload.type === 'conversation.item.input_audio_transcription.completed') {
          const text = payload.transcript ?? '';
          if (payload.item_id) {
            completedTranscriptsRef.current.set(payload.item_id, text);
            if (!committedOrderRef.current.includes(payload.item_id)) {
              committedOrderRef.current.push(payload.item_id);
            }
            flushCompletedTranscripts();
            return;
          }

          commitLiveTranscript(text);
          return;
        }

        // Fallback for output transcript streams in some realtime configurations.
        if (payload.type === 'response.output_audio_transcript.delta') {
          updateLiveDelta(payload.delta ?? '');
          return;
        }

        if (payload.type === 'response.output_audio_transcript.done') {
          const text = payload.transcript ?? '';
          commitLiveTranscript(text);
          return;
        }

        if (payload.type === 'conversation.item.input_audio_transcription.failed') {
          console.error('[realtime] transcription failed:', payload);
          setErrorMessage(
            (payload.error?.message ?? 'La transcripción falló.') +
              ' Verifica que el modelo gpt-4o-transcribe esté habilitado en tu proyecto de OpenAI.'
          );
          return;
        }

        if (payload.type === 'error') {
          setErrorMessage(payload.error?.message ?? 'OpenAI devolvió un error realtime.');
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await waitForIceGatheringComplete(peer);

      const localSdp = peer.localDescription?.sdp;
      if (!localSdp) {
        throw new Error('No se pudo generar la SDP local.');
      }

      const sdpResponse = await fetch(REALTIME_SESSION_URL, {
        method: 'POST',
        body: localSdp,
        headers: {
          'Content-Type': 'application/sdp'
        }
      });

      const answerSdp = await sdpResponse.text();
      if (!sdpResponse.ok) {
        let details = answerSdp;
        try {
          const parsed = JSON.parse(answerSdp) as { error?: { message?: string } | string };
          if (typeof parsed.error === 'string') {
            details = parsed.error;
          } else if (parsed.error?.message) {
            details = parsed.error.message;
          }
        } catch {
          // If the response is not JSON, keep raw text for debugging.
        }

        throw new Error(`No se pudo negociar WebRTC (${sdpResponse.status}): ${details}`);
      }

      if (!answerSdp.trimStart().startsWith('v=')) {
        throw new Error('Respuesta SDP inválida de OpenAI.');
      }

      await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      await new Promise<void>((resolve, reject) => {
        if (channel.readyState === 'open') {
          resolve();
          return;
        }

        const timeoutId = window.setTimeout(() => {
          cleanup();
          reject(new Error('La conexión realtime no abrió el canal de datos a tiempo.'));
        }, CONNECTION_TIMEOUT_MS);

        const handleOpen = () => {
          cleanup();
          resolve();
        };

        const handleConnectionState = () => {
          if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
            cleanup();
            reject(new Error(`La conexión WebRTC terminó en estado ${peer.connectionState}.`));
          }
        };

        const cleanup = () => {
          window.clearTimeout(timeoutId);
          channel.removeEventListener('open', handleOpen);
          peer.removeEventListener('connectionstatechange', handleConnectionState);
        };

        channel.addEventListener('open', handleOpen);
        peer.addEventListener('connectionstatechange', handleConnectionState);
      });

      noAudioTimeoutRef.current = window.setTimeout(() => {
        if (!hasReceivedAudioEventRef.current) {
          setErrorMessage('La sesión conectó, pero OpenAI no detectó audio. Voy a seguir escuchando, pero revisa si el navegador está enviando señal real del micrófono.');
        }
      }, NO_AUDIO_TIMEOUT_MS);

      startRecordingCost();
      setStatus('recording');
    } catch (error) {
      setErrorMessage(humanizeRealtimeError(error));
      await stop();
      throw error;
    }
  }, [
    commitLiveTranscript,
    flushCompletedTranscripts,
    resetRealtimeState,
    setErrorMessage,
    setLiveTranscript,
    setStatus,
    startRecordingCost,
    stop,
    updateLiveDelta
  ]);

  return { start, stop };
};
