import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../auth/permission.service';

export const permissionGuard: CanActivateFn = (route) => {
  const permission = inject(PermissionService);
  const router = inject(Router);
  const required = route.data['permission'] as string | undefined;
  const anyPermission = route.data['anyPermission'] as string[] | undefined;

  const allowed = anyPermission?.length
    ? permission.hasAny(anyPermission)
    : required
      ? permission.has(required)
      : true;

  return allowed ? true : router.parseUrl('/dashboard');
};
