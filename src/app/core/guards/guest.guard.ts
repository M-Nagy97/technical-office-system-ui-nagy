import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from '../auth/auth-session.service';

export const guestGuard: CanActivateFn = (route) => {
  const authSession = inject(AuthSessionService);
  const router = inject(Router);

  if (!authSession.hasAccessToken()) {
    return true;
  }

  const returnUrl = route.queryParamMap.get('returnUrl');
  if (returnUrl?.startsWith('/') && !returnUrl.startsWith('//') && !returnUrl.startsWith('/auth/')) {
    return router.parseUrl(returnUrl);
  }

  return router.parseUrl('/dashboard');
};
