/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE PAGOS (CU20)
 * =============================================================================
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  QRGenerarPeticion,
  QRGenerarRespuesta,
  StripeCheckoutPeticion,
  StripeCheckoutRespuesta,
} from '../models/venta.model';

export interface QRConfirmarPeticion {
  referencia: string;
  id_reserva: number;
  id_cliente: number;
  id_sucursal: number;
}

@Injectable({ providedIn: 'root' })
export class PagoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/pagos`;

  crearSesionStripe(datos: StripeCheckoutPeticion): Observable<StripeCheckoutRespuesta> {
    return this.http.post<StripeCheckoutRespuesta>(`${this.base}/stripe/crear-sesion`, datos);
  }

  generarQR(datos: QRGenerarPeticion): Observable<QRGenerarRespuesta> {
    return this.http.post<QRGenerarRespuesta>(`${this.base}/qr/generar`, datos);
  }

  confirmarQR(datos: QRConfirmarPeticion): Observable<any> {
    return this.http.post(`${this.base}/qr/confirmar`, datos);
  }
}
