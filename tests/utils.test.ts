import { buildFallbackSummary, parseSummaryResponse, sectionsToMarkdown, mergeSections } from '@/lib/utils';

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
      [],
      'Acordamos enviar la propuesta mañana. Falta confirmar el presupuesto?'
    );

    expect(result.content).toContain('Resumen local provisional');
    expect(result.sections).toHaveLength(1);
  });

  it('preserves prior sections while appending new text', () => {
    const result = buildFallbackSummary(
      [{ title: 'Puntos clave', items: [{ text: 'Resumen previo' }] }],
      'Necesitamos enviar el acta hoy.'
    );

    expect(result.content).toContain('Puntos clave');
    expect(result.content).toContain('Resumen previo');
    expect(result.content).toContain('Necesitamos enviar el acta hoy.');
    expect(result.sections).toHaveLength(2);
  });
});

describe('sectionsToMarkdown', () => {
  it('renders sections as markdown', () => {
    const md = sectionsToMarkdown([
      { title: 'Resumen', items: [{ text: 'Todo bien' }] },
      { title: 'Decisiones', items: [{ text: 'Aprobar X' }, { text: 'Rechazar Y' }] }
    ]);
    expect(md).toContain('**Resumen**');
    expect(md).toContain('Todo bien');
    expect(md).toContain('- Aprobar X');
    expect(md).toContain('- Rechazar Y');
  });

  it('returns empty string for empty sections', () => {
    expect(sectionsToMarkdown([])).toBe('');
  });
});

describe('mergeSections', () => {
  it('adds items to existing section', () => {
    const result = mergeSections(
      [{ title: 'Puntos clave', items: [{ text: 'A' }] }],
      [{ action: 'add', section: 'Puntos clave', items: ['B', 'C'] }]
    );
    expect(result[0].items).toEqual([{ text: 'A' }, { text: 'B' }, { text: 'C' }]);
  });

  it('creates new section on add if not found', () => {
    const result = mergeSections(
      [],
      [{ action: 'add', section: 'Decisiones', items: ['Aprobar'] }]
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Decisiones');
    expect(result[0].items).toEqual([{ text: 'Aprobar' }]);
  });

  it('replaces items on update', () => {
    const result = mergeSections(
      [{ title: 'Resumen', items: [{ text: 'viejo' }] }],
      [{ action: 'update', section: 'Resumen', items: ['nuevo'] }]
    );
    expect(result[0].items).toEqual([{ text: 'nuevo' }]);
  });

  it('does not mutate original sections', () => {
    const original = [{ title: 'A', items: [{ text: '1' }] }];
    mergeSections(original, [{ action: 'add', section: 'A', items: ['2'] }]);
    expect(original[0].items).toHaveLength(1);
  });
});
