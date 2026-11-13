/**
 * The letters in an employee's avatar: first and last name, so "Mary Jane Watson" is "MW", and one
 * letter for a one-word name. Spread by code point, so a letter outside the BMP stays whole.
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '';
  }
  const first = [...words[0]][0];
  const last = words.length > 1 ? [...words[words.length - 1]][0] : '';
  return (first + last).toUpperCase();
}
