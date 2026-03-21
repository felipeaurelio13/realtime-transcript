export const TRANSCRIPTION_MODEL = 'gpt-4o-transcribe';

const DEFAULT_LANGUAGE = 'es';

export const getPreferredTranscriptionLanguage = (value?: string) => {
  const normalized = value?.trim().split('-')[0]?.toLowerCase();
  return normalized && /^[a-z]{2}$/.test(normalized) ? normalized : DEFAULT_LANGUAGE;
};

export const buildTranscriptionSession = (language = DEFAULT_LANGUAGE) => ({
  type: 'transcription' as const,
  audio: {
    input: {
      noise_reduction: { type: 'far_field' as const },
      transcription: {
        model: TRANSCRIPTION_MODEL,
        language
      },
      turn_detection: {
        type: 'server_vad' as const,
        threshold: 0.2,
        prefix_padding_ms: 500,
        silence_duration_ms: 400,
        create_response: false,
        interrupt_response: false
      }
    }
  },
  include: ['item.input_audio_transcription.logprobs']
});
