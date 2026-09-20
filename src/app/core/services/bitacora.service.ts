import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BitacoraListadoRespuesta } from '../models/bitacora.model';

@Injectable({ providedIn: 'root' })
export class BitacoraService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/bitacora`;

  listar(
    pagina: number = 1,
    limite: number = 50,
    accion?: string,
    tablaAfectada?: string,
    busqueda?: string,
  ): Observable<BitacoraListadoRespuesta> {
    let params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('limite', limite.toString());

    if (accion) params = params.set('accion', accion);
    if (tablaAfectada) params = params.set('tabla_afectada', tablaAfectada);
    if (busqueda) params = params.set('busqueda', busqueda);

    return this.http.get<BitacoraListadoRespuesta>(this.base, { params });
  }
}
