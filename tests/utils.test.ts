import { parseSummaryResponse } from '@/lib/utils';

describe('parseSummaryResponse', () => {
  it('returns null on invalid shape', () => {
    expect(parseSummaryResponse({ bad: true })).toBeNull();
  });

  it('returns normalized summary', () => {
    const result = parseSummaryResponse({
      executive_summary: 'ok',
      key_points: ['a', 1],
      decisions: ['d'],
      action_items: ['x'],
      open_questions: ['q']
    });

    expect(result).toEqual({
      executive_summary: 'ok',
      key_points: ['a'],
      decisions: ['d'],
      action_items: ['x'],
      open_questions: ['q']
    });
  });
});
