import { tenure } from './tenure';

/** How long someone has worked here, for the drawer (task 8.11). Dates are ISO, today injected. */
describe('tenure', () => {
  it('counts whole years and months', () => {
    expect(tenure('2021-04-12', '2026-10-26')).toBe('5 yrs 6 mos');
  });

  it('drops a zero part', () => {
    expect(tenure('2025-10-26', '2026-10-26')).toBe('1 yr');
    expect(tenure('2026-07-26', '2026-10-26')).toBe('3 mos');
  });

  it('uses the singular for one', () => {
    expect(tenure('2025-09-26', '2026-10-26')).toBe('1 yr 1 mo');
  });

  it('counts a month only when it is complete', () => {
    expect(tenure('2026-01-31', '2026-02-28')).toBe('Under a month');
  });

  it('borrows a year when the anniversary has not come yet', () => {
    expect(tenure('2020-12-27', '2026-10-26')).toBe('5 yrs 9 mos');
    expect(tenure('2025-10-27', '2026-10-26')).toBe('11 mos');
  });

  it('counts a 29 February hire on 1 March in a non-leap year', () => {
    expect(tenure('2024-02-29', '2025-02-28')).toBe('11 mos');
    expect(tenure('2024-02-29', '2025-03-01')).toBe('1 yr');
  });

  it('says under a month for a new hire', () => {
    expect(tenure('2026-10-26', '2026-10-26')).toBe('Under a month');
  });
});
