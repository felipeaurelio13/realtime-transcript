'use client';

import { useCallback, useRef } from 'react';
import { useLiveNotesStore } from '@/store/livenotes-store';

const MODEL = 'gpt-4o-transcribe';

export const useRealtimeTranscription = () => {
  const setStatus = useLiveNotesStore((state) => state.setStatus);
  const updateLiveDelta = useLiveNotesStore((state) => state.updateLiveDelta);
  const commitLiveTranscript = useLiveNotesStore((state) => state.commitLiveTranscript);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    channelRef.current?.close();
    peerRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());

    channelRef.current = null;
    peerRef.current = null;
    streamRef.current = null;
    commitLiveTranscript();
    setStatus('idle');
  }, [commitLiveTranscript, setStatus]);

  const start = useCallback(async () => {
    setStatus('recording');

    const tokenResponse = await fetch('/api/token', { method: 'POST' });
    if (!tokenResponse.ok) {
      setStatus('idle');
      throw new Error('No se pudo obtener token efímero');
    }

    const tokenData = (await tokenResponse.json()) as { client_secret?: { value?: string } };
    const ephemeralKey = tokenData.client_secret?.value;

    if (!ephemeralKey) {
      setStatus('idle');
      throw new Error('Token efímero inválido');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const peer = new RTCPeerConnection();
    peerRef.current = peer;

    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    const channel = peer.createDataChannel('events');
    channelRef.current = channel;

    channel.onopen = () => {
      channel.send(
        JSON.stringify({
          type: 'session.update',
          session: {
            input_audio_transcription: { model: MODEL }
          }
        })
      );
    };

    channel.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'conversation.item.input_audio_transcription.delta') {
        updateLiveDelta(payload.delta ?? '');
      }

      if (payload.type === 'conversation.item.input_audio_transcription.completed') {
        const text = payload.transcript ?? '';
        commitLiveTranscript(text);
      }
    };

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    const baseUrl = 'https://api.openai.com/v1/realtime';
    const sdpResponse = await fetch(`${baseUrl}?model=${MODEL}`, {
      method: 'POST',
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        'Content-Type': 'application/sdp'
      }
    });

    const answer = {
      type: 'answer' as const,
      sdp: await sdpResponse.text()
    };

    await peer.setRemoteDescription(answer);
  }, [commitLiveTranscript, setStatus, updateLiveDelta]);

  return { start, stop };
};
