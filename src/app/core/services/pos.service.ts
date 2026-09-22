/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE TERMINAL POS (CU19)
 * =============================================================================
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  POSProductoVariante,
  POSReservaCargadaRespuesta,
  POSVentaCrear,
  POSVentaRespuesta,
} from '../models/pos.model';

@Injectable({ providedIn: 'root' })
export class PosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/pos`;

  listarProductos(idSucursal: number, q: string = '', idCategoria?: number, soloStock: boolean = false): Observable<POSProductoVariante[]> {
    let params: any = { id_sucursal: idSucursal };
    if (q) params.q = q;
    if (idCategoria) params.id_categoria = idCategoria;
    if (soloStock) params.solo_stock = true;
    return this.http.get<POSProductoVariante[]>(`${this.base}/productos`, { params });
  }

  cargarReserva(codigoOId: string | number): Observable<POSReservaCargadaRespuesta> {
    return this.http.get<POSReservaCargadaRespuesta>(`${this.base}/reserva/${codigoOId}`);
  }

  procesarVenta(datos: POSVentaCrear): Observable<POSVentaRespuesta> {
    return this.http.post<POSVentaRespuesta>(`${this.base}/ventas`, datos);
  }
}
