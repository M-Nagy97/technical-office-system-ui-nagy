import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_GLOBAL_ERROR_NOTIFICATION } from '../interceptors/error.interceptor';
import {
  ACCESS_TOKEN_KEY,
  IS_AUTH_LOGIN,
  IS_AUTH_REFRESH,
  REFRESH_TOKEN_KEY,
  SESSION_KEY,
  USER_ID_KEY,
} from './auth.constants';

interface IdentityAuthResponse {
  userId?: string;
  accessToken?: string | null;
  refreshToken?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private refreshInFlight$: Observable<boolean> | null = null;

  readonly isAuthenticated = signal<boolean>(this.hasAccessToken());
  readonly currentUserId = signal<string | null>(this.resolveUserId());
  readonly sessionVersion = signal(0);

  login(credentials: { username: string; password: string }): Observable<void> {
    return this.http
      .post<IdentityAuthResponse>(
        `${this.identityApiBase}/api/auth/login`,
        {
          userNameOrEmail: credentials.username,
          password: credentials.password,
        },
        {
          context: new HttpContext()
            .set(SKIP_GLOBAL_ERROR_NOTIFICATION, true)
            .set(IS_AUTH_LOGIN, true),
        },
      )
      .pipe(
        tap((response) => this.setSession(response)),
        map(() => void 0),
      );
  }

  getAccessToken(): string | null {
    return this.readStorage(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return this.readStorage(REFRESH_TOKEN_KEY);
  }

  hasAccessToken(): boolean {
    return !!this.getAccessToken();
  }

  redirectToLogin(returnPath?: string): void {
    const queryParams: Record<string, string> = {};
    if (returnPath && this.isSafeReturnPath(returnPath)) {
      queryParams['returnUrl'] = returnPath;
    }

    void this.router.navigate(['/auth/login'], { queryParams });
  }

  expireSessionAndRedirectToLogin(returnPath?: string): void {
    this.clearSession();
    this.redirectToLogin(returnPath);
  }

  refreshSession(): Observable<boolean> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    if (!accessToken || !refreshToken) {
      return of(false);
    }

    this.refreshInFlight$ = this.http
      .post<IdentityAuthResponse>(
        `${this.identityApiBase}/api/auth/refresh-token`,
        { accessToken, refreshToken },
        {
          context: new HttpContext()
            .set(SKIP_GLOBAL_ERROR_NOTIFICATION, true)
            .set(IS_AUTH_REFRESH, true),
        },
      )
      .pipe(
        tap((response) => this.setSession(response)),
        map(() => true),
        catchError(() => of(false)),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay(1),
      );

    return this.refreshInFlight$;
  }

  logout(): void {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    const finish = () => {
      this.clearSession();
      void this.router.navigateByUrl('/auth/login');
    };

    if (!refreshToken) {
      finish();
      return;
    }

    this.http
      .post(
        `${this.identityApiBase}/api/auth/revoke-refresh-token`,
        { refreshToken },
        {
          context: new HttpContext().set(SKIP_GLOBAL_ERROR_NOTIFICATION, true),
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        },
      )
      .pipe(catchError(() => of(null)))
      .subscribe({ complete: finish });
  }

  private get identityApiBase(): string {
    return environment.identityApiUrl.replace(/\/$/, '');
  }

  private isSafeReturnPath(returnPath: string): boolean {
    return (
      returnPath.startsWith('/') &&
      !returnPath.startsWith('//') &&
      !returnPath.startsWith('/auth/') &&
      returnPath !== '/dashboard'
    );
  }

  private setSession(response: IdentityAuthResponse): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    if (response.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
      localStorage.setItem(SESSION_KEY, 'true');
      this.isAuthenticated.set(true);
      this.sessionVersion.update((value) => value + 1);
    }

    if (response.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    }

    if (response.userId) {
      localStorage.setItem(USER_ID_KEY, response.userId);
      this.currentUserId.set(response.userId);
    } else {
      this.currentUserId.set(this.resolveUserId());
    }
  }

  private clearSession(): void {
    this.isAuthenticated.set(false);
    this.currentUserId.set(null);
    this.sessionVersion.update((value) => value + 1);
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  private resolveUserId(): string | null {
    const stored = this.readStorage(USER_ID_KEY);
    if (stored) {
      return stored;
    }

    const token = this.readStorage(ACCESS_TOKEN_KEY);
    if (!token) {
      return null;
    }

    const userId = parseUserIdFromToken(token);
    if (userId && typeof localStorage !== 'undefined') {
      localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  }

  private readStorage(key: string): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(key);
  }
}

function parseUserIdFromToken(token: string): string | null {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  const sub =
    payload['sub'] ??
    payload['nameid'] ??
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
  return typeof sub === 'string' && sub.trim() ? sub : null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
