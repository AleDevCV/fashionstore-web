/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE DASHBOARD Y KPIS GERENCIALES (CU24)
 * =============================================================================
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardKPIsRespuesta } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/dashboard`;

  obtenerKPIs(): Observable<DashboardKPIsRespuesta> {
    return this.http.get<DashboardKPIsRespuesta>(`${this.base}/kpis`);
  }
}
