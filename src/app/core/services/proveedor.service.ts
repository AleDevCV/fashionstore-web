/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE PROVEEDORES (CU12)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Consume /api/proveedores/. Soporta búsqueda parcial por NIT o Razón Social
 * en el backend, alta con validación de unicidad de NIT y borrado protegido.
 * =============================================================================
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { traducirErrorApi } from '../utils/api-error';
import {
  Proveedor,
  ProveedorActualizar,
  ProveedorCrear,
  ProveedorEliminadoRespuesta,
} from '../models/proveedor.model';

@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/proveedores`;

  /**
   * Recupera el directorio de proveedores, opcionalmente filtrado por búsqueda.
   *
   * @param busqueda Texto para coincidencia sobre NIT o razón social.
   * @param skip Cantidad de registros a omitir para paginación.
   * @param limit Límite máximo de registros a retornar.
   * @returns Observable con la lista de proveedores.
   */
  listar(busqueda?: string, skip?: number, limit?: number): Observable<Proveedor[]> {
    let params = new HttpParams();
    if (busqueda && busqueda.trim()) {
      params = params.set('busqueda', busqueda.trim());
    }
    if (skip !== undefined && skip !== null) {
      params = params.set('skip', skip.toString());
    }
    if (limit !== undefined && limit !== null) {
      params = params.set('limit', limit.toString());
    }

    return this.http
      .get<Proveedor[]>(`${this.baseUrl}/`, { params })
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Recupera la ficha de un proveedor por su ID.
   *
   * @param id Identificador numérico del proveedor.
   * @returns Observable con el proveedor.
   */
  obtener(id: number): Observable<Proveedor> {
    return this.http
      .get<Proveedor>(`${this.baseUrl}/${id}`)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Registra un nuevo proveedor en el sistema.
   *
   * @param datos Datos obligatorios y opcionales del nuevo proveedor.
   * @returns Observable con el proveedor creado.
   */
  crear(datos: ProveedorCrear): Observable<Proveedor> {
    return this.http
      .post<Proveedor>(`${this.baseUrl}/`, datos)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Actualiza los datos de un proveedor existente.
   *
   * @param id Identificador del proveedor a actualizar.
   * @param datos Campos a modificar.
   * @returns Observable con el proveedor actualizado.
   */
  actualizar(id: number, datos: ProveedorActualizar): Observable<Proveedor> {
    return this.http
      .put<Proveedor>(`${this.baseUrl}/${id}`, datos)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Elimina un proveedor si no tiene compras registradas.
   * Si existen compras asociadas, el backend responderá HTTP 409.
   *
   * @param id Identificador del proveedor a eliminar.
   * @returns Observable con mensaje de confirmación.
   */
  eliminar(id: number): Observable<ProveedorEliminadoRespuesta> {
    return this.http
      .delete<ProveedorEliminadoRespuesta>(`${this.baseUrl}/${id}`)
      .pipe(catchError(traducirErrorApi));
  }
}
