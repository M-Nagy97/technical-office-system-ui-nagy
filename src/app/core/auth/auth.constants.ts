import { HttpContextToken } from '@angular/common/http';

export const ACCESS_TOKEN_KEY = 'reusable-identity-access-token';
export const REFRESH_TOKEN_KEY = 'reusable-identity-refresh-token';
export const USER_ID_KEY = 'reusable-identity-user-id';
export const SESSION_KEY = 'reusable-identity-authenticated';

export const IS_AUTH_REFRESH = new HttpContextToken<boolean>(() => false);
export const IS_AUTH_LOGIN = new HttpContextToken<boolean>(() => false);
