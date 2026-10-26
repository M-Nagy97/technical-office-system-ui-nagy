import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthSessionService } from '../auth/auth-session.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authSession = inject(AuthSessionService);

  if (authSession.hasAccessToken()) {
    return true;
  }

  const returnPath = state.url && !state.url.startsWith('/auth/') ? state.url : '/dashboard';
  authSession.redirectToLogin(returnPath);
  return false;
};
