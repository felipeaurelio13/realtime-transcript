import { buildTranscriptionSession, getPreferredTranscriptionLanguage } from '@/lib/realtime';

describe('getPreferredTranscriptionLanguage', () => {
  it('normalizes browser locales to ISO-639-1', () => {
    expect(getPreferredTranscriptionLanguage('es-CL')).toBe('es');
    expect(getPreferredTranscriptionLanguage('EN-us')).toBe('en');
  });

  it('falls back to spanish for empty or invalid values', () => {
    expect(getPreferredTranscriptionLanguage()).toBe('es');
    expect(getPreferredTranscriptionLanguage('123')).toBe('es');
  });
});

describe('buildTranscriptionSession', () => {
  it('builds a transcription-only session with explicit VAD and noise reduction', () => {
    const session = buildTranscriptionSession('es');

    expect(session.type).toBe('transcription');
    expect(session.audio.input.transcription).toEqual({
      model: 'gpt-4o-transcribe',
      language: 'es'
    });
    expect(session.audio.input.noise_reduction).toEqual({ type: 'near_field' });
    expect(session.audio.input.turn_detection).toMatchObject({
      type: 'server_vad',
      threshold: 0.35,
      prefix_padding_ms: 500,
      silence_duration_ms: 400,
      create_response: false,
      interrupt_response: false
    });
    expect(session.include).toContain('item.input_audio_transcription.logprobs');
  });
});
