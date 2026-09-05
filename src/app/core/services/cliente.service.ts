/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE FICHAS DE CLIENTES (CU05)
 * -----------------------------------------------------------------------------
 * Consume /api/clientes/. El buscador se resuelve EN EL SERVIDOR mediante el
 * parámetro `busqueda`, no filtrando en memoria: así el rendimiento se mantiene
 * cuando la tabla de clientes crezca (RNF02).
 * =============================================================================
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { traducirErrorApi } from '../utils/api-error';
import {
  Cliente,
  ClienteActualizar,
  ClienteCrear,
  MensajeRespuesta,
} from '../models/catalogo.model';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/clientes`;

  /**
   * Recupera las fichas de cliente aplicando buscador y filtro de estado.
   *
   * @param busqueda Texto libre sobre cédula o nombre completo.
   * @param estado 'Activo' o 'Inactivo' para acotar el listado.
   * @returns Observable con el arreglo de clientes.
   */
  listar(busqueda?: string, estado?: string): Observable<Cliente[]> {
    let params = new HttpParams();
    if (busqueda) {
      params = params.set('busqueda', busqueda);
    }
    if (estado) {
      params = params.set('estado', estado);
    }

    return this.http
      .get<Cliente[]>(`${this.baseUrl}/`, { params })
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Registra la ficha maestra de un comprador.
   *
   * @param datos Cédula, nombre, teléfono, correo y dirección de envío.
   * @returns Observable con la ficha creada (HTTP 201). Ante una cédula
   *          duplicada el backend responde 400 con el texto de la excepción A.
   */
  crear(datos: ClienteCrear): Observable<Cliente> {
    return this.http
      .post<Cliente>(`${this.baseUrl}/`, datos)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Actualiza parcialmente una ficha existente.
   *
   * @param idCliente Ficha a modificar.
   * @param datos Campos a cambiar.
   * @returns Observable con la ficha ya actualizada.
   */
  actualizar(idCliente: number, datos: ClienteActualizar): Observable<Cliente> {
    return this.http
      .put<Cliente>(`${this.baseUrl}/${idCliente}`, datos)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Inhabilita una ficha mediante borrado lógico.
   *
   * El backend NO borra la fila: cambia el estado a 'Inactivo' para preservar
   * la integridad referencial con `venta` y `reserva`.
   *
   * @param idCliente Ficha a inhabilitar.
   * @returns Observable con el mensaje de confirmación.
   */
  inhabilitar(idCliente: number): Observable<MensajeRespuesta> {
    return this.http
      .delete<MensajeRespuesta>(`${this.baseUrl}/${idCliente}`)
      .pipe(catchError(traducirErrorApi));
  }
}
