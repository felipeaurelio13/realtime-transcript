import { buildFallbackSummary, parseSummaryResponse } from '@/lib/utils';
import { EMPTY_SUMMARY } from '@/lib/types';

describe('parseSummaryResponse', () => {
  it('returns null on invalid shape', () => {
    expect(parseSummaryResponse({ bad: true })).toBeNull();
  });

  it('returns parsed summary when content is a string', () => {
    const result = parseSummaryResponse({ content: '## Resumen\n\nTodo bien' });
    expect(result).toEqual({ content: '## Resumen\n\nTodo bien' });
  });

  it('returns null when content is not a string', () => {
    expect(parseSummaryResponse({ content: 123 })).toBeNull();
  });
});

describe('buildFallbackSummary', () => {
  it('creates a provisional summary from transcript text', () => {
    const result = buildFallbackSummary(
      EMPTY_SUMMARY,
      'Acordamos enviar la propuesta mañana. Falta confirmar el presupuesto?'
    );

    expect(result.content).toContain('Resumen local provisional');
  });

  it('preserves prior content while appending new text', () => {
    const result = buildFallbackSummary(
      { content: 'Resumen previo' },
      'Necesitamos enviar el acta hoy.'
    );

    expect(result.content).toContain('Resumen previo');
    expect(result.content).toContain('Necesitamos enviar el acta hoy.');
  });
});
