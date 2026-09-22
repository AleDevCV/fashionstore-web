/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE COMPROBANTES (CU21)
 * =============================================================================
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ComprobanteGenerarPeticion, ComprobanteRespuesta } from '../models/venta.model';

@Injectable({ providedIn: 'root' })
export class ComprobanteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/comprobantes`;

  generarComprobante(datos: ComprobanteGenerarPeticion): Observable<ComprobanteRespuesta> {
    return this.http.post<ComprobanteRespuesta>(`${this.base}/generar`, datos);
  }

  obtenerPorVenta(id_venta: number): Observable<ComprobanteRespuesta> {
    return this.http.get<ComprobanteRespuesta>(`${this.base}/venta/${id_venta}`);
  }

  obtenerPorNumero(numero: string): Observable<ComprobanteRespuesta> {
    return this.http.get<ComprobanteRespuesta>(`${this.base}/${numero}`);
  }
}
