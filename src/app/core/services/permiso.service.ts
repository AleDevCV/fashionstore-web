/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE PERMISOS Y ROLES (CU03)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Consume los endpoints de control de acceso basado en roles (RBAC) granular
 * en el backend de FastAPI:
 *   - GET /api/permisos: Catálogo de permisos disponibles agrupados por módulo.
 *   - GET /api/roles/{id_rol}/permisos: Lista de permisos asignados a un rol.
 *   - PUT /api/roles/{id_rol}/permisos: Sincronización inmutable de permisos por rol.
 * =============================================================================
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Permiso,
  RolPermisosResponse,
  UpdateRolPermisosResponse,
} from '../models/permiso.model';
import { Rol } from '../models/usuario.model';
import { traducirErrorApi } from '../utils/api-error';

@Injectable({ providedIn: 'root' })
export class PermisoService {
  private readonly http = inject(HttpClient);

  /** URL base de la API. */
  private readonly apiUrl = environment.apiUrl;

  /**
   * Obtiene el catálogo completo de permisos del sistema.
   * Endpoint: GET /api/permisos
   *
   * @returns Observable con la lista de permisos disponibles.
   */
  listarPermisos(): Observable<Permiso[]> {
    return this.http
      .get<Permiso[]>(`${this.apiUrl}/api/permisos`)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Obtiene los permisos actualmente asignados a un rol determinado.
   * Endpoint: GET /api/roles/{id_rol}/permisos
   *
   * @param idRol Identificador del rol a consultar.
   * @returns Observable con el rol y su lista de IDs de permisos asignados.
   */
  obtenerPermisosRol(idRol: number): Observable<RolPermisosResponse> {
    return this.http
      .get<RolPermisosResponse>(`${this.apiUrl}/api/roles/${idRol}/permisos`)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Actualiza y sincroniza el conjunto de permisos asignados a un rol.
   * Endpoint: PUT /api/roles/{id_rol}/permisos
   *
   * @param idRol Identificador del rol a actualizar.
   * @param permisosIds Lista completa de IDs de permisos asignados.
   * @returns Observable con la respuesta de confirmación del backend.
   */
  actualizarPermisosRol(
    idRol: number,
    permisosIds: number[],
  ): Observable<UpdateRolPermisosResponse> {
    return this.http
      .put<UpdateRolPermisosResponse>(
        `${this.apiUrl}/api/roles/${idRol}/permisos`,
        { permisos_ids: permisosIds },
      )
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Consulta la lista de roles registrados en el sistema.
   * Consume el endpoint GET /api/usuarios/roles.
   *
   * @returns Observable con los roles del sistema.
   */
  listarRoles(): Observable<Rol[]> {
    return this.http
      .get<Rol[]>(`${this.apiUrl}/api/usuarios/roles`)
      .pipe(catchError(traducirErrorApi));
  }
}
