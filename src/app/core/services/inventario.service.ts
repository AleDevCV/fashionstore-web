/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE MONITOREO DE INVENTARIO MULTISUCURSAL (CU10)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Consume los endpoints analíticos de /api/inventario/resumen y
 * /api/inventario/monitoreo para supervisión ejecutiva de existencias,
 * indicadores clave de rotura de stock y consolidado multisucursal.
 * =============================================================================
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { traducirErrorApi } from '../utils/api-error';
import {
  FiltrosMonitoreo,
  MonitoreoItem,
  ResumenInventario,
} from '../models/inventario-monitoreo.model';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/inventario`;

  /**
   * Obtiene el resumen analítico de inventario (totales globales y desglose por sucursal).
   *
   * @param id_sucursal Filtro opcional por sucursal física.
   * @param id_categoria Filtro opcional por categoría.
   * @param id_temporada Filtro opcional por temporada comercial.
   * @param busqueda Filtro opcional por término de búsqueda.
   * @returns Observable con el resumen agregado de existencias.
   */
  obtenerResumen(
    id_sucursal?: number | null,
    id_categoria?: number | null,
    id_temporada?: number | null,
    busqueda?: string,
  ): Observable<ResumenInventario> {
    let params = new HttpParams();
    if (id_sucursal !== undefined && id_sucursal !== null) {
      params = params.set('id_sucursal', id_sucursal.toString());
    }
    if (id_categoria !== undefined && id_categoria !== null) {
      params = params.set('id_categoria', id_categoria.toString());
    }
    if (id_temporada !== undefined && id_temporada !== null) {
      params = params.set('id_temporada', id_temporada.toString());
    }
    if (busqueda && busqueda.trim()) {
      params = params.set('busqueda', busqueda.trim());
    }

    return this.http
      .get<ResumenInventario>(`${this.baseUrl}/resumen`, { params })
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Consulta la matriz detallada de monitoreo con clasificación de stock por variante.
   *
   * @param filtros Filtros combinados por sucursal, categoría, temporada, estado y SKU/nombre.
   * @returns Observable con la lista detallada de existencias por sucursal y variante.
   */
  monitorear(filtros?: FiltrosMonitoreo): Observable<MonitoreoItem[]> {
    let params = new HttpParams();
    if (filtros?.id_sucursal !== undefined && filtros.id_sucursal !== null) {
      params = params.set('id_sucursal', filtros.id_sucursal.toString());
    }
    if (filtros?.id_categoria !== undefined && filtros.id_categoria !== null) {
      params = params.set('id_categoria', filtros.id_categoria.toString());
    }
    if (filtros?.id_temporada !== undefined && filtros.id_temporada !== null) {
      params = params.set('id_temporada', filtros.id_temporada.toString());
    }
    if (filtros?.busqueda && filtros.busqueda.trim()) {
      params = params.set('busqueda', filtros.busqueda.trim());
    }
    if (filtros?.estado_stock && filtros.estado_stock !== 'Todos') {
      params = params.set('estado_stock', filtros.estado_stock);
    }
    if (filtros?.skip !== undefined && filtros.skip !== null) {
      params = params.set('skip', filtros.skip.toString());
    }
    if (filtros?.limit !== undefined && filtros.limit !== null) {
      params = params.set('limit', filtros.limit.toString());
    }

    return this.http
      .get<MonitoreoItem[]>(`${this.baseUrl}/monitoreo`, { params })
      .pipe(catchError(traducirErrorApi));
  }
}
