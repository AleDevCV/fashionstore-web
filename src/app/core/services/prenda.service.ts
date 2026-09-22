/**
 * FASHIONSTORE - SERVICIO DE PRENDAS Y VARIANTES (CU08)
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { traducirErrorApi } from '../utils/api-error';
import { Prenda, PrendaCrear, PrendaActualizar, Talla, Color, MensajeRespuesta } from '../models/catalogo.model';

@Injectable({ providedIn: 'root' })
export class PrendaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/prendas`;

  listar(busqueda?: string, id_categoria?: number, genero?: string, estado?: string): Observable<Prenda[]> {
    let params = new HttpParams();
    if (busqueda) params = params.set('busqueda', busqueda);
    if (id_categoria) params = params.set('id_categoria', id_categoria.toString());
    if (genero) params = params.set('genero', genero);
    if (estado) params = params.set('estado', estado);

    return this.http
      .get<Prenda[]>(`${this.baseUrl}/`, { params })
      .pipe(catchError(traducirErrorApi));
  }

  obtener(idPrenda: number): Observable<Prenda> {
    return this.http
      .get<Prenda>(`${this.baseUrl}/${idPrenda}`)
      .pipe(catchError(traducirErrorApi));
  }

  crear(datos: PrendaCrear): Observable<Prenda> {
    return this.http
      .post<Prenda>(`${this.baseUrl}/`, datos)
      .pipe(catchError(traducirErrorApi));
  }

  actualizar(idPrenda: number, datos: PrendaActualizar): Observable<Prenda> {
    return this.http
      .put<Prenda>(`${this.baseUrl}/${idPrenda}`, datos)
      .pipe(catchError(traducirErrorApi));
  }

  inhabilitar(idPrenda: number): Observable<MensajeRespuesta> {
    return this.http
      .delete<MensajeRespuesta>(`${this.baseUrl}/${idPrenda}`)
      .pipe(catchError(traducirErrorApi));
  }

  listarTallas(): Observable<Talla[]> {
    return this.http
      .get<Talla[]>(`${this.baseUrl}/tallas`)
      .pipe(catchError(traducirErrorApi));
  }

  listarColores(): Observable<Color[]> {
    return this.http
      .get<Color[]>(`${this.baseUrl}/colores`)
      .pipe(catchError(traducirErrorApi));
  }
}