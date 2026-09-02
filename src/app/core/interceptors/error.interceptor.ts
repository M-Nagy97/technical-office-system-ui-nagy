import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpContextToken,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

/**
 * Context token to bypass global error notification for specific HTTP requests.
 *
 * Usage:
 * ```typescript
 * this.http.get('/api/data', {
 *   context: new HttpContext().set(SKIP_GLOBAL_ERROR_NOTIFICATION, true)
 * });
 * ```
 */
export const SKIP_GLOBAL_ERROR_NOTIFICATION = new HttpContextToken<boolean>(() => false);

const LANG_KEY = 'technical-office-lang';

interface ValidationErrorsDictionary {
  [key: string]: string[] | string;
}

interface BackendErrorPayload {
  success?: boolean;
  message?: string | null;
  error?: {
    message?: string | null;
    innerException?: { message?: string | null };
    stackTrace?: string | null;
  };
  errors?: ValidationErrorsDictionary;
  title?: string;
  detail?: string;
  status?: number;
}

function getCurrentLang(): 'ar' | 'en' {
  if (typeof window !== 'undefined' && window.localStorage) {
    const lang = localStorage.getItem(LANG_KEY);
    if (lang === 'en') return 'en';
  }
  return 'ar';
}

function parseValidationErrors(errorsObj: ValidationErrorsDictionary): string {
  const errorLines: string[] = [];

  for (const [field, messages] of Object.entries(errorsObj)) {
    if (Array.isArray(messages)) {
      messages.forEach((msg) => {
        if (msg) errorLines.push(field ? `${field}: ${msg}` : msg);
      });
    } else if (typeof messages === 'string' && messages.trim()) {
      errorLines.push(field ? `${field}: ${messages}` : messages);
    }
  }

  return errorLines.join(' | ');
}

function extractErrorMessage(error: HttpErrorResponse, lang: 'ar' | 'en'): string {
  const isAr = lang === 'ar';
  const payload = error.error as BackendErrorPayload | string | null;

  // 1. Check if backend returned an ASP.NET ValidationProblemDetails dictionary
  if (payload && typeof payload === 'object' && payload.errors && typeof payload.errors === 'object') {
    const parsedErrors = parseValidationErrors(payload.errors);
    if (parsedErrors) {
      return parsedErrors;
    }
  }

  // 2. Check if backend returned Clean Architecture ApiResult `message`
  if (payload && typeof payload === 'object' && typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }

  // 3. Check if backend returned Clean Architecture Exception `error.message`
  if (payload && typeof payload === 'object' && payload.error?.message) {
    return payload.error.message.trim();
  }

  // 4. Check ProblemDetails detail or title
  if (payload && typeof payload === 'object') {
    if (typeof payload.detail === 'string' && payload.detail.trim()) {
      return payload.detail.trim();
    }
    if (typeof payload.title === 'string' && payload.title.trim()) {
      return payload.title.trim();
    }
  }

  // 5. Check if error payload is a raw string
  if (typeof payload === 'string' && payload.trim() && !payload.trim().startsWith('<!DOCTYPE html>')) {
    return payload.trim();
  }

  // 6. Status-based fallbacks with Arabic & English support
  switch (error.status) {
    case 0:
      return isAr
        ? 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت أو حالة الخادم.'
        : 'Unable to connect to the server. Please check your network or server status.';

    case 400:
      return isAr
        ? 'طلب غير صالح أو البيانات المدخلة غير صحيحة.'
        : 'Bad request or invalid input data.';

    case 401:
      return isAr
        ? 'انتهت صلاحية الجلسة أو غير مصرح بالوصول. يرجى تسجيل الدخول مجدداً.'
        : 'Session expired or unauthorized. Please sign in again.';

    case 403:
      return isAr
        ? 'ليس لديك الصلاحيات الكافية لتنفيذ هذا الإجراء.'
        : 'You do not have sufficient permissions to perform this action.';

    case 404:
      return isAr
        ? 'العنصر المطلوب أو نقطة النهاية غير موجودة.'
        : 'The requested resource or endpoint was not found.';

    case 409:
      return isAr
        ? 'حدث تعارض في البيانات. قد يكون السجل مكرراً أو تم تعديله مسبقاً.'
        : 'A data conflict occurred. The record may already exist or was modified.';

    case 422:
      return isAr
        ? 'تعذر معالجة البيانات بسبب قيود العمل في النظام.'
        : 'Unprocessable entity due to business rules.';

    case 500:
      return isAr
        ? 'حدث خطأ غير متوقع في الخادم الداخلي. يرجى المحاولة لاحقاً.'
        : 'An unexpected internal server error occurred. Please try again later.';

    case 502:
    case 503:
    case 504:
      return isAr
        ? 'الخادم غير متاح حالياً أو استغرق الرد وقتاً أطول من المتوقع.'
        : 'Server is temporarily unavailable or gateway timed out.';

    default:
      return error.statusText
        ? `${isAr ? 'خطأ' : 'Error'}: ${error.statusText}`
        : (isAr ? 'حدث خطأ غير متوقع.' : 'An unexpected error occurred.');
  }
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        // Skip toast notification if requested via HttpContext
        const skipNotification = req.context.get(SKIP_GLOBAL_ERROR_NOTIFICATION);

        if (!skipNotification) {
          const lang = getCurrentLang();
          const isAr = lang === 'ar';
          const summary = error.status > 0
            ? `${isAr ? 'خطأ' : 'Error'} (${error.status})`
            : (isAr ? 'خطأ في الاتصال' : 'Connection Error');

          const detail = extractErrorMessage(error, lang);

          messageService.add({
            severity: 'error',
            summary,
            detail,
            life: 6000,
          });
        }
      }

      return throwError(() => error);
    })
  );
};
