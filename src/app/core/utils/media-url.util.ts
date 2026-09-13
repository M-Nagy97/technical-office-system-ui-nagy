import { environment } from '../../../environments/environment';

const PLACEHOLDER_DOC_URL = 'https://example.com/doc.pdf';

function apiBase(): string {
  return environment.apiBaseUrl.replace(/\/$/, '');
}

/**
 * Turns API-relative upload paths into absolute URLs the browser can load
 * from the Angular app origin (e.g. /uploads/... → http://localhost:8400/uploads/...).
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed;
  }

  const base = apiBase();
  return trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

/**
 * Converts a display URL back to the short path/URL the API expects when saving.
 */
export function toStorageFileUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  const base = apiBase();
  if (trimmed.startsWith(`${base}/`)) {
    return trimmed.slice(base.length);
  }
  if (trimmed === base) {
    return '/';
  }
  return trimmed;
}

export function isPlaceholderDocumentUrl(url: string | null | undefined): boolean {
  return (url ?? '').trim() === PLACEHOLDER_DOC_URL;
}

export function isImageMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const value = url.trim().toLowerCase();
  if (value.startsWith('data:image/')) return true;
  const path = value.split('?')[0].split('#')[0];
  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(path);
}
