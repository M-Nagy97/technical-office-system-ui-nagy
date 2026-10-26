import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSessionService } from '../auth/auth-session.service';
import { IS_AUTH_LOGIN, IS_AUTH_REFRESH } from '../auth/auth.constants';

function isAppApiRequest(url: string): boolean {
  const api = environment.apiBaseUrl.replace(/\/$/, '');
  const identity = environment.identityApiUrl.replace(/\/$/, '');
  return url.startsWith(api) || url.startsWith(identity) || url.startsWith('/api');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authSession = inject(AuthSessionService);

  if (req.context.get(IS_AUTH_REFRESH) || req.context.get(IS_AUTH_LOGIN)) {
    return next(req);
  }

  const token = authSession.getAccessToken();
  const authReq =
    token && isAppApiRequest(req.url)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      if (!authSession.getRefreshToken()) {
        authSession.expireSessionAndRedirectToLogin();
        return throwError(() => error);
      }

      return authSession.refreshSession().pipe(
        switchMap((refreshed) => {
          if (!refreshed) {
            authSession.expireSessionAndRedirectToLogin();
            return throwError(() => error);
          }

          const retryToken = authSession.getAccessToken();
          const retryReq =
            retryToken && isAppApiRequest(authReq.url)
              ? authReq.clone({ setHeaders: { Authorization: `Bearer ${retryToken}` } })
              : authReq;

          return next(retryReq);
        }),
      );
    }),
  );
};
