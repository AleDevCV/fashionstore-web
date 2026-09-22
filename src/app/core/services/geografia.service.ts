/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE CIUDADES Y SUCURSALES (CU06)
 * -----------------------------------------------------------------------------
 * Consume /api/ciudades y /api/sucursales. El token JWT lo adjunta el
 * `authInterceptor`, por lo que aquí no se manipulan cabeceras.
 * =============================================================================
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { traducirErrorApi } from '../utils/api-error';
import {
  Ciudad,
  Sucursal,
  SucursalActualizar,
  SucursalCrear,
} from '../models/catalogo.model';

@Injectable({ providedIn: 'root' })
export class GeografiaService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /**
   * Recupera las ciudades de cobertura con su número de sucursales.
   *
   * @returns Observable con el arreglo de ciudades.
   */
  listarCiudades(): Observable<Ciudad[]> {
    return this.http
      .get<Ciudad[]>(`${this.api}/api/ciudades`)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Registra una nueva ciudad.
   *
   * @param nombre Nombre de la ciudad; el backend rechaza duplicados con 400.
   * @returns Observable con la ciudad creada.
   */
  crearCiudad(nombre: string): Observable<Ciudad> {
    return this.http
      .post<Ciudad>(`${this.api}/api/ciudades`, { nombre })
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Recupera las sucursales físicas, opcionalmente de una sola ciudad.
   *
   * @param idCiudad Filtro opcional por ciudad.
   * @returns Observable con el arreglo de sucursales.
   */
  listarSucursales(idCiudad?: number | null): Observable<Sucursal[]> {
    const url = idCiudad
      ? `${this.api}/api/sucursales?id_ciudad=${idCiudad}`
      : `${this.api}/api/sucursales`;

    return this.http.get<Sucursal[]>(url).pipe(catchError(traducirErrorApi));
  }

  /**
   * Registra una sucursal y la asocia a una ciudad.
   *
   * @param datos Nombre, dirección, teléfono, ciudad y encargado.
   * @returns Observable con la sucursal creada (HTTP 201).
   */
  crearSucursal(datos: SucursalCrear): Observable<Sucursal> {
    return this.http
      .post<Sucursal>(`${this.api}/api/sucursales`, datos)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Actualiza parcialmente una sucursal existente.
   *
   * @param idSucursal Sucursal a modificar.
   * @param datos Campos a cambiar; los omitidos quedan intactos.
   * @returns Observable con la sucursal ya actualizada.
   */
  actualizarSucursal(
    idSucursal: number,
    datos: SucursalActualizar,
  ): Observable<Sucursal> {
    return this.http
      .put<Sucursal>(`${this.api}/api/sucursales/${idSucursal}`, datos)
      .pipe(catchError(traducirErrorApi));
  }
}
