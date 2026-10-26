import { Injectable, computed, inject } from '@angular/core';
import { AuthSessionService } from './auth-session.service';
import { ErpModuleKey, MODULE_PERMISSIONS } from './erp-permissions';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly authSession = inject(AuthSessionService);

  readonly codes = computed(() => {
    this.authSession.sessionVersion();
    return parsePermissionCodes(this.authSession.getAccessToken());
  });

  has(code: string): boolean {
    return this.codes().has(code.toLowerCase());
  }

  hasAny(codes: readonly string[]): boolean {
    return codes.some((code) => this.has(code));
  }

  canAccessModule(module: string): boolean {
    if (module === 'dashboard') {
      return this.authSession.hasAccessToken();
    }

    const mapped = MODULE_PERMISSIONS[module as Exclude<ErpModuleKey, 'dashboard'>];
    if (!mapped) {
      return this.authSession.hasAccessToken();
    }

    return this.has(mapped.read) || this.has(mapped.write);
  }

  canWriteModule(module: string): boolean {
    if (module === 'dashboard') {
      return false;
    }

    const mapped = MODULE_PERMISSIONS[module as Exclude<ErpModuleKey, 'dashboard'>];
    if (!mapped) {
      return false;
    }

    return this.has(mapped.write);
  }

  writeVisible<T>(module: string, extra?: (row: T) => boolean): (row: T) => boolean {
    return (row) => this.canWriteModule(module) && (extra ? extra(row) : true);
  }
}

function parsePermissionCodes(token: string | null): Set<string> {
  const codes = new Set<string>();
  if (!token) {
    return codes;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return codes;
  }

  const raw = payload['permission'] ?? payload['permissions'];
  for (const value of asStringArray(raw)) {
    const normalized = value.trim().toLowerCase();
    if (normalized) {
      codes.add(normalized);
    }
  }

  return codes;
}

function asStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  return [];
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
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
