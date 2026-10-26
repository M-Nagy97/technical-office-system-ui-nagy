/**
 * Egyptian national ID: 14 digits.
 * Digit 1 = century (2 = 1900s, 3 = 2000s), digits 2–7 = YYMMDD.
 */
export function parseEgyptianNationalIdBirthDate(nationalId: string | null | undefined): Date | null {
  const id = (nationalId ?? '').trim();
  if (!/^\d{14}$/.test(id)) return null;

  const centuryDigit = id[0];
  const century = centuryDigit === '2' ? 1900 : centuryDigit === '3' ? 2000 : null;
  if (century === null) return null;

  const year = century + Number(id.slice(1, 3));
  const month = Number(id.slice(3, 5));
  const day = Number(id.slice(5, 7));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Noon UTC keeps the calendar day stable across Egyptian and other time zones.
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}
