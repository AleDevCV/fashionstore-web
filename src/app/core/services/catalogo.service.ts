/**
 * FASHIONSTORE - SERVICIO DEL CATÁLOGO PÚBLICO (CU14)
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { traducirErrorApi } from '../utils/api-error';
import { FiltrosDisponibles, RespuestaCatalogo, PrendaCatalogo, StockSucursal } from '../models/catalogo.model';

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/catalogo`;

  obtenerFiltros(): Observable<FiltrosDisponibles> {
    return this.http
      .get<FiltrosDisponibles>(`${this.baseUrl}/filtros`)
      .pipe(catchError(traducirErrorApi));
  }

  consultar(filtros: any): Observable<RespuestaCatalogo> {
    let params = new HttpParams();
    Object.keys(filtros).forEach(key => {
      if (filtros[key] !== null && filtros[key] !== undefined) {
        params = params.set(key, filtros[key].toString());
      }
    });

    return this.http
      .get<RespuestaCatalogo>(`${this.baseUrl}/`, { params })
      .pipe(catchError(traducirErrorApi));
  }

  obtenerFicha(idPrenda: number): Observable<PrendaCatalogo> {
    return this.http
      .get<PrendaCatalogo>(`${this.baseUrl}/${idPrenda}`)
      .pipe(catchError(traducirErrorApi));
  }

  consultarDisponibilidad(idVariantePrenda: number): Observable<StockSucursal[]> {
    return this.http
      .get<StockSucursal[]>(`${this.baseUrl}/variantes/${idVariantePrenda}/disponibilidad`)
      .pipe(catchError(traducirErrorApi));
  }
}