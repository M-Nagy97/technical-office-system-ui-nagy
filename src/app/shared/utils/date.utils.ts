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
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
