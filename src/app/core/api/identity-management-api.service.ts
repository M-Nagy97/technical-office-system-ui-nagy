import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ModulesService,
  PagesService,
  PermissionsService,
  RolesService,
} from './identity-generated';

export interface IdentityRole {
  id?: string;
  name?: string | null;
  description?: string | null;
}

export interface IdentityModule {
  id?: number;
  code?: string | null;
  name?: string | null;
}

export interface IdentityPermission {
  id?: number;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  moduleId?: number;
}

export interface IdentityPage {
  id?: number;
  code?: string | null;
  name?: string | null;
  urlPath?: string | null;
  parentId?: number | null;
  moduleId?: number | null;
  permissionId?: number | null;
}

export interface RolePayload {
  name: string;
  description: string | null;
}

export interface ModulePayload {
  code: string;
  name: string;
}

export interface PagePayload {
  code: string;
  name: string;
  urlPath: string | null;
  parentId: number | null;
  moduleId: number | null;
  permissionId: number | null;
}

export interface PermissionPayload {
  code: string;
  name: string;
  description: string | null;
  moduleId: number;
}

@Injectable({ providedIn: 'root' })
export class IdentityManagementApiService {
  private readonly rolesApi = inject(RolesService);
  private readonly modulesApi = inject(ModulesService);
  private readonly pagesApi = inject(PagesService);
  private readonly permissionsApi = inject(PermissionsService);

  getRoles(): Observable<IdentityRole[]> {
    return this.rolesApi.apiRolesGet();
  }

  createRole(payload: RolePayload): Observable<IdentityRole> {
    return this.rolesApi.apiRolesPost({ name: payload.name, description: payload.description });
  }

  updateRole(id: string, payload: RolePayload): Observable<IdentityRole> {
    return this.rolesApi.apiRolesIdPut(id, { name: payload.name, description: payload.description });
  }

  deleteRole(id: string): Observable<void> {
    return this.rolesApi.apiRolesIdDelete(id);
  }

  getRolePermissions(roleId: string): Observable<IdentityPermission[]> {
    return this.rolesApi.apiRolesIdPermissionsGet(roleId);
  }

  updateRolePermissions(roleId: string, permissionIds: number[]): Observable<IdentityPermission[]> {
    return this.rolesApi.apiRolesIdPermissionsPut(roleId, { permissionIds });
  }

  getModules(): Observable<IdentityModule[]> {
    return this.modulesApi.apiModulesGet();
  }

  createModule(payload: ModulePayload): Observable<IdentityModule> {
    return this.modulesApi.apiModulesPost(payload);
  }

  updateModule(id: number, payload: ModulePayload): Observable<IdentityModule> {
    return this.modulesApi.apiModulesIdPut(id, payload);
  }

  deleteModule(id: number): Observable<void> {
    return this.modulesApi.apiModulesIdDelete(id);
  }

  getPages(): Observable<IdentityPage[]> {
    return this.pagesApi.apiPagesGet();
  }

  createPage(payload: PagePayload): Observable<IdentityPage> {
    return this.pagesApi.apiPagesPost(payload);
  }

  updatePage(id: number, payload: PagePayload): Observable<IdentityPage> {
    return this.pagesApi.apiPagesIdPut(id, payload);
  }

  deletePage(id: number): Observable<void> {
    return this.pagesApi.apiPagesIdDelete(id);
  }

  getPermissions(): Observable<IdentityPermission[]> {
    return this.permissionsApi.apiPermissionsGet();
  }

  createPermission(payload: PermissionPayload): Observable<IdentityPermission> {
    return this.permissionsApi.apiPermissionsPost(payload);
  }

  updatePermission(id: number, payload: PermissionPayload): Observable<IdentityPermission> {
    return this.permissionsApi.apiPermissionsIdPut(id, payload);
  }

  deletePermission(id: number): Observable<void> {
    return this.permissionsApi.apiPermissionsIdDelete(id);
  }
}
