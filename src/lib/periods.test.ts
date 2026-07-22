import { describe, it, expect } from 'vitest';
import { format } from 'date-fns';
import { derivePeriodStarts } from './periods';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

describe('derivePeriodStarts', () => {
  it('treats a single consecutive run as one cycle start', () => {
    const starts = derivePeriodStarts(['2026-07-01', '2026-07-02', '2026-07-03']);
    expect(starts.map(iso)).toEqual(['2026-07-01']);
  });

  it('splits runs separated by a gap into separate starts', () => {
    const starts = derivePeriodStarts([
      '2026-06-01',
      '2026-06-02',
      '2026-06-29',
      '2026-06-30',
      '2026-07-01',
    ]);
    expect(starts.map(iso)).toEqual(['2026-06-01', '2026-06-29']);
  });

  it('is robust to unsorted input and duplicates', () => {
    const starts = derivePeriodStarts(['2026-07-02', '2026-07-01', '2026-07-01']);
    expect(starts.map(iso)).toEqual(['2026-07-01']);
  });

  it('returns an empty list for no logs', () => {
    expect(derivePeriodStarts([])).toEqual([]);
  });
});
