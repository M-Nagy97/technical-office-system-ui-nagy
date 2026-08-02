/** Convert datetime-local input value to ISO string for API. */
export function datetimeLocalToIso(v: string | null | undefined): string | null {
  if (v == null || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Format API ISO date for datetime-local input. */
export function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function employeeLabel(e: {
  firstName?: string | null;
  lastName?: string | null;
  employeeCode?: string | null;
}): string {
  const name = [e.firstName, e.lastName].filter(Boolean).join(' ').trim();
  const code = e.employeeCode?.trim();
  if (name && code) return `${name} (${code})`;
  return name || code || '—';
}
