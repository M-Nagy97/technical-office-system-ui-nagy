import { HttpErrorResponse } from '@angular/common/http';

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const errorBag = error.error?.errors as Record<string, string[] | string> | undefined;
    if (errorBag) {
      const validationMessages = Object.values(errorBag)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter(Boolean);
      if (validationMessages.length) {
        return validationMessages.join(' ');
      }
    }

    const title = error.error?.title as string | undefined;
    if (title) {
      return title;
    }

    const message = error.error?.message as string | undefined;
    if (message) {
      return message;
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
