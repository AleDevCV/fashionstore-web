/**
 * =============================================================================
 * PRUEBAS UNITARIAS DEL SERVICIO DE PERMISOS (CU03)
 * =============================================================================
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { PermisoService } from './permiso.service';
import { environment } from '../../../environments/environment';

describe('PermisoService (CU03)', () => {
  let servicio: PermisoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    servicio = TestBed.inject(PermisoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listarPermisos() realiza petición GET /api/permisos', () => {
    const mockPermisos = [
      {
        id_permiso: 1,
        nombre: 'Ver usuarios',
        codigo: 'usuarios.ver',
        modulo: 'Usuarios',
        descripcion: null,
      },
    ];

    servicio.listarPermisos().subscribe((res) => {
      expect(res).toEqual(mockPermisos);
    });

    const peticion = httpMock.expectOne(`${environment.apiUrl}/api/permisos`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(mockPermisos);
  });

  it('obtenerPermisosRol(idRol) realiza petición GET /api/roles/{idRol}/permisos', () => {
    const mockRespuesta = {
      id_rol: 2,
      rol: 'Encargado de Sucursal',
      permisos: [1, 3],
    };

    servicio.obtenerPermisosRol(2).subscribe((res) => {
      expect(res.id_rol).toBe(2);
      expect(res.permisos).toEqual([1, 3]);
    });

    const peticion = httpMock.expectOne(`${environment.apiUrl}/api/roles/2/permisos`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(mockRespuesta);
  });

  it('actualizarPermisosRol(idRol, permisosIds) realiza PUT /api/roles/{idRol}/permisos', () => {
    const mockRespuesta = {
      mensaje: 'Permisos actualizados exitosamente',
      id_rol: 2,
      total_permisos: 2,
    };

    servicio.actualizarPermisosRol(2, [1, 3]).subscribe((res) => {
      expect(res.mensaje).toBe('Permisos actualizados exitosamente');
      expect(res.total_permisos).toBe(2);
    });

    const peticion = httpMock.expectOne(`${environment.apiUrl}/api/roles/2/permisos`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({ permisos_ids: [1, 3] });
    peticion.flush(mockRespuesta);
  });

  it('listarRoles() realiza petición GET /api/usuarios/roles', () => {
    const mockRoles = [
      { id_rol: 1, nombre: 'Administrador', descripcion: null },
      { id_rol: 2, nombre: 'Cajero (POS)', descripcion: null },
    ];

    servicio.listarRoles().subscribe((res) => {
      expect(res.length).toBe(2);
    });

    const peticion = httpMock.expectOne(`${environment.apiUrl}/api/usuarios/roles`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(mockRoles);
  });

  it('traduce un error 403 al mensaje legible correspondiente', (listo) => {
    servicio.listarPermisos().subscribe({
      error: (error: Error) => {
        expect(error.message).toContain('No tiene permisos');
        listo();
      },
    });

    httpMock
      .expectOne(`${environment.apiUrl}/api/permisos`)
      .flush({ detail: 'No tiene permisos para realizar esta acción.' }, { status: 403, statusText: 'Forbidden' });
  });
});
