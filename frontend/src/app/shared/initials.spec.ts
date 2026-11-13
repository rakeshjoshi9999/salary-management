import { initials } from './initials';

/** The letters in an employee's avatar (task 8.10). */
describe('initials', () => {
  it('takes the first letters of the first and last names', () => {
    expect(initials('Asha Rao')).toBe('AR');
  });

  it('skips middle names', () => {
    expect(initials('Mary Jane Watson')).toBe('MW');
  });

  it('uses one letter for a one-word name', () => {
    expect(initials('Cher')).toBe('C');
  });

  it('upper-cases and ignores extra spaces', () => {
    expect(initials('  asha   rao ')).toBe('AR');
  });

  it('keeps letters outside A to Z', () => {
    expect(initials('Élodie Ørsted')).toBe('ÉØ');
  });
});
