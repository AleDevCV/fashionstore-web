/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE COMPRAS Y ADQUISICIONES (CU13)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Consume /api/compras/. Permite registrar compras transaccionales atómicas
 * con desglose de ítems, cálculo de 13% IVA e incremento automático de stock
 * en almacén mediante el disparador de base de datos.
 * =============================================================================
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { traducirErrorApi } from '../utils/api-error';
import {
  Compra,
  CompraCrear,
  CompraDetallada,
  FiltrosCompras,
} from '../models/compra.model';

@Injectable({ providedIn: 'root' })
export class CompraService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/compras`;

  /**
   * Recupera el historial de compras realizadas a proveedores.
   *
   * @param filtros Filtros por proveedor, sucursal receptora y paginación.
   * @returns Observable con la lista de compras.
   */
  listar(filtros?: FiltrosCompras): Observable<Compra[]> {
    let params = new HttpParams();
    if (filtros?.id_proveedor) {
      params = params.set('id_proveedor', filtros.id_proveedor.toString());
    }
    if (filtros?.id_sucursal) {
      params = params.set('id_sucursal', filtros.id_sucursal.toString());
    }
    if (filtros?.skip !== undefined && filtros?.skip !== null) {
      params = params.set('skip', filtros.skip.toString());
    }
    if (filtros?.limit !== undefined && filtros?.limit !== null) {
      params = params.set('limit', filtros.limit.toString());
    }

    return this.http
      .get<Compra[]>(`${this.baseUrl}/`, { params })
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Recupera la cabecera y el detalle completo de una compra específica.
   *
   * @param id_compra Identificador de la compra.
   * @returns Observable con la compra y el desglose de ítems recibidos.
   */
  obtener(id_compra: number): Observable<CompraDetallada> {
    return this.http
      .get<CompraDetallada>(`${this.baseUrl}/${id_compra}`)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Registra una nueva compra en una transacción atómica completa.
   *
   * @param datos Proveedor, sucursal de destino y arreglo de ítems adquiridos.
   * @returns Observable con la compra creada y sus totales (HTTP 201).
   */
  crear(datos: CompraCrear): Observable<CompraDetallada> {
    return this.http
      .post<CompraDetallada>(`${this.baseUrl}/`, datos)
      .pipe(catchError(traducirErrorApi));
  }
}
