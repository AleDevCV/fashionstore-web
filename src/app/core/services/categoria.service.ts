/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE CATEGORÍAS DE PRENDAS (CU07)
 * -----------------------------------------------------------------------------
 * Consume /api/categorias/. La jerarquía llega ya resuelta desde el backend:
 * cada categoría trae el nombre de su padre y su conteo de prendas.
 * =============================================================================
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { traducirErrorApi } from '../utils/api-error';
import {
  Categoria,
  CategoriaActualizar,
  CategoriaCrear,
  MensajeRespuesta,
} from '../models/catalogo.model';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/categorias`;

  /**
   * Recupera el árbol de categorías.
   *
   * @param estado Filtro opcional por estado.
   * @returns Observable con las categorías: raíces primero, luego sus hijas.
   */
  listar(estado?: string): Observable<Categoria[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }

    return this.http
      .get<Categoria[]>(`${this.baseUrl}/`, { params })
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Registra una categoría, opcionalmente colgando de otra.
   *
   * @param datos Nombre, descripción y categoría padre.
   * @returns Observable con la categoría creada (HTTP 201).
   */
  crear(datos: CategoriaCrear): Observable<Categoria> {
    return this.http
      .post<Categoria>(`${this.baseUrl}/`, datos)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Actualiza parcialmente una categoría.
   *
   * @param idCategoria Categoría a modificar.
   * @param datos Campos a cambiar.
   * @returns Observable con la categoría ya actualizada.
   */
  actualizar(
    idCategoria: number,
    datos: CategoriaActualizar,
  ): Observable<Categoria> {
    return this.http
      .put<Categoria>(`${this.baseUrl}/${idCategoria}`, datos)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Inhabilita una categoría mediante borrado lógico.
   *
   * El backend responde 409 si la categoría todavía tiene subcategorías
   * activas colgando de ella.
   *
   * @param idCategoria Categoría a inhabilitar.
   * @returns Observable con el mensaje de confirmación.
   */
  inhabilitar(idCategoria: number): Observable<MensajeRespuesta> {
    return this.http
      .delete<MensajeRespuesta>(`${this.baseUrl}/${idCategoria}`)
      .pipe(catchError(traducirErrorApi));
  }
}
