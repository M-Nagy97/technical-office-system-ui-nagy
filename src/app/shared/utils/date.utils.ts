import { AppLang } from '../../core/services/language.service';

export const APP_CALENDAR_DATE_FORMAT = 'dd/mm/yy';

export function appDateLocale(lang: AppLang | string): string {
  return lang === 'ar' ? 'ar-EG' : 'en-GB';
}

export function formatAppDate(
  value: Date | string | number | null | undefined,
  lang: AppLang | string = 'ar',
): string {
  if (value == null || value === '') {
    return '-';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString(appDateLocale(lang));
}

export function formatAppDateTime(
  value: Date | string | number | null | undefined,
  lang: AppLang | string = 'ar',
): string {
  if (value == null || value === '') {
    return '-';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString(appDateLocale(lang), {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const TIME_STRING_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/;

export function parseTimeToDate(value: Date | string | null | undefined): Date | null {
  if (value == null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const match = TIME_STRING_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }

  const date = new Date();
  date.setHours(hours, minutes, seconds, 0);
  return date;
}

export function formatAppTime(
  value: Date | string | number | null | undefined,
  lang: AppLang | string = 'ar',
  options?: { empty?: string; withSeconds?: boolean },
): string {
  const empty = options?.empty ?? '—';
  if (value == null || value === '') {
    return empty;
  }

  let date: Date | null = null;
  if (value instanceof Date) {
    date = Number.isNaN(value.getTime()) ? null : value;
  } else if (typeof value === 'number') {
    const parsed = new Date(value);
    date = Number.isNaN(parsed.getTime()) ? null : parsed;
  } else {
    date = parseTimeToDate(value);
    if (!date) {
      const parsed = new Date(value);
      date = Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  if (!date) {
    return empty;
  }

  return date.toLocaleTimeString(appDateLocale(lang), {
    hour: 'numeric',
    minute: '2-digit',
    ...(options?.withSeconds ? { second: '2-digit' } : {}),
    hour12: true,
  });
}

export function formatTimeFromDate(
  date: Date | null | undefined,
  withSeconds = false,
): string | null {
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  if (!withSeconds) {
    return `${hours}:${minutes}`;
  }

  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
