/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE TEMPORADAS Y COLECCIONES (CU09)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Consume /api/temporadas/. Permite listar temporadas con filtro de búsqueda,
 * obtener detalle, registrar nuevas temporadas con validación de fechas,
 * actualizar vigencias y eliminar temporadas sin prendas asociadas.
 * =============================================================================
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { traducirErrorApi } from '../utils/api-error';
import {
  Temporada,
  TemporadaActualizar,
  TemporadaCrear,
  TemporadaEliminadaRespuesta,
} from '../models/temporada.model';

@Injectable({ providedIn: 'root' })
export class TemporadaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/temporadas`;

  /**
   * Recupera la lista de temporadas comerciales registradas.
   *
   * @param busqueda Filtro de texto opcional para coincidencia en nombre o descripción.
   * @param soloActivas Si es true, retorna solo temporadas con estado=true.
   * @returns Observable con el arreglo de temporadas.
   */
  listar(busqueda?: string, soloActivas?: boolean): Observable<Temporada[]> {
    let params = new HttpParams();
    if (busqueda && busqueda.trim()) {
      params = params.set('busqueda', busqueda.trim());
    }
    if (soloActivas !== undefined && soloActivas !== null) {
      params = params.set('solo_activas', soloActivas.toString());
    }

    return this.http
      .get<Temporada[]>(`${this.baseUrl}/`, { params })
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Recupera los datos de una temporada por su ID.
   *
   * @param id Identificador numérico de la temporada.
   * @returns Observable con la temporada.
   */
  obtener(id: number): Observable<Temporada> {
    return this.http
      .get<Temporada>(`${this.baseUrl}/${id}`)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Registra una nueva temporada comercial.
   *
   * @param datos Nombre, descripción, fecha_inicio, fecha_fin y activo.
   * @returns Observable con la temporada creada (HTTP 201).
   */
  crear(datos: TemporadaCrear): Observable<Temporada> {
    return this.http
      .post<Temporada>(`${this.baseUrl}/`, datos)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Actualiza los datos de una temporada existente.
   *
   * @param id Identificador numérico de la temporada a modificar.
   * @param datos Campos a modificar.
   * @returns Observable con la temporada actualizada (HTTP 200).
   */
  actualizar(id: number, datos: TemporadaActualizar): Observable<Temporada> {
    return this.http
      .put<Temporada>(`${this.baseUrl}/${id}`, datos)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Elimina una temporada del sistema.
   * Si existen prendas vinculadas, el backend responderá HTTP 400 o 409.
   *
   * @param id Identificador numérico de la temporada.
   * @returns Observable con mensaje de confirmación.
   */
  eliminar(id: number): Observable<TemporadaEliminadaRespuesta> {
    return this.http
      .delete<TemporadaEliminadaRespuesta>(`${this.baseUrl}/${id}`)
      .pipe(catchError(traducirErrorApi));
  }
}
