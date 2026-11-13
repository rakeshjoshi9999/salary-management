/**
 * How long someone has worked here, from ISO dates: "5 yrs 6 mos". A month counts only once its day is
 * reached, so a 29 February hire completes its first year on 1 March in a non-leap year. A future hire
 * date (never valid, ADR-010) gives an empty string.
 */
export function tenure(hireDate: string, today: string): string {
  const [hy, hm, hd] = hireDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  const months = (ty - hy) * 12 + (tm - hm) - (td < hd ? 1 : 0);
  if (months < 0) {
    return '';
  }
  if (months === 0) {
    return 'Under a month';
  }
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [
    years > 0 ? `${years} ${years === 1 ? 'yr' : 'yrs'}` : '',
    rest > 0 ? `${rest} ${rest === 1 ? 'mo' : 'mos'}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}
