/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE VENTAS (CU15)
 * =============================================================================
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ReservaPeticion,
  ReservaProbadorCrear,
  ReservaProbadorEstadoActualizar,
  ReservaRespuesta,
  ReservaSucursalItem,
  TicketReservaRespuesta,
  VentaConfirmarPeticion,
  VentaDetalladaRespuesta,
  VentaRespuesta,
} from '../models/venta.model';

@Injectable({ providedIn: 'root' })
export class VentaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ventas`;

  crearReserva(datos: ReservaPeticion): Observable<ReservaRespuesta> {
    return this.http.post<ReservaRespuesta>(`${this.base}/reserva`, datos);
  }

  obtenerReserva(id: number): Observable<ReservaRespuesta> {
    return this.http.get<ReservaRespuesta>(`${this.base}/reserva/${id}`);
  }

  misReservas(id_cliente: number): Observable<ReservaRespuesta[]> {
    return this.http.get<ReservaRespuesta[]>(`${this.base}/mis-reservas/${id_cliente}`);
  }

  confirmarVenta(datos: VentaConfirmarPeticion): Observable<VentaDetalladaRespuesta> {
    return this.http.post<VentaDetalladaRespuesta>(`${this.base}/confirmar`, datos);
  }

  misPedidos(id_cliente: number): Observable<VentaRespuesta[]> {
    return this.http.get<VentaRespuesta[]>(`${this.base}/mis-pedidos/${id_cliente}`);
  }

  obtenerVenta(id: number): Observable<VentaDetalladaRespuesta> {
    return this.http.get<VentaDetalladaRespuesta>(`${this.base}/${id}`);
  }

  listarVentas(params?: { id_cliente?: number; id_sucursal?: number; skip?: number; limit?: number }): Observable<VentaRespuesta[]> {
    return this.http.get<VentaRespuesta[]>(`${this.base}/`, { params: params as any });
  }

  // ── RESERVAS DE PROBADOR Y ATENCIÓN EN SUCURSAL (CU16, CU17) ────────────────

  crearReservaProbador(datos: ReservaProbadorCrear): Observable<TicketReservaRespuesta> {
    return this.http.post<TicketReservaRespuesta>(`${this.base}/reservas-probador`, datos);
  }

  obtenerTicketReserva(codigoOId: string | number): Observable<TicketReservaRespuesta> {
    return this.http.get<TicketReservaRespuesta>(`${this.base}/reservas-probador/${codigoOId}`);
  }

  listarReservasSucursal(params?: { id_sucursal?: number; estado?: string; skip?: number; limit?: number }): Observable<ReservaSucursalItem[]> {
    return this.http.get<ReservaSucursalItem[]>(`${this.base}/reservas-probador`, { params: params as any });
  }

  actualizarEstadoReservaProbador(idReserva: number, datos: ReservaProbadorEstadoActualizar): Observable<TicketReservaRespuesta> {
    return this.http.patch<TicketReservaRespuesta>(`${this.base}/reservas-probador/${idReserva}/estado`, datos);
  }
}

