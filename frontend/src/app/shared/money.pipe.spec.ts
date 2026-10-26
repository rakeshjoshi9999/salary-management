import { MoneyPipe } from './money.pipe';

/** UI_DESIGN.md Formatting: ISO code, en-US style, always 2 decimals, for every country. */
describe('MoneyPipe', () => {
  const pipe = new MoneyPipe();

  it('formats with the ISO code and en-US grouping', () => {
    expect(pipe.transform(2400000, 'INR')).toBe('INR 2,400,000.00');
  });

  it('always shows 2 decimals', () => {
    expect(pipe.transform(52000, 'EUR')).toBe('EUR 52,000.00');
    expect(pipe.transform(0.5, 'GBP')).toBe('GBP 0.50');
    expect(pipe.transform(1528176.37, 'INR')).toBe('INR 1,528,176.37');
  });

  it('renders nothing for null', () => {
    expect(pipe.transform(null, 'INR')).toBe('');
    expect(pipe.transform(undefined, 'INR')).toBe('');
  });
});
