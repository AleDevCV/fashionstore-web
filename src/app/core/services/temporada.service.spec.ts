/**
 * =============================================================================
 * PRUEBAS UNITARIAS DEL SERVICIO DE TEMPORADAS (CU09)
 * =============================================================================
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { TemporadaService } from './temporada.service';
import { environment } from '../../../environments/environment';
import { Temporada, TemporadaCrear } from '../models/temporada.model';

describe('TemporadaService (CU09)', () => {
  let servicio: TemporadaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    servicio = TestBed.inject(TemporadaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listar() envía GET /api/temporadas/ con parámetros de búsqueda', () => {
    const mockTemporadas: Temporada[] = [
      {
        id_temporada: 1,
        nombre: 'Primavera 2026',
        descripcion: 'Colección Floral',
        fecha_inicio: '2026-09-01',
        fecha_fin: '2026-11-30',
        estado: true,
        activo: true,
        vigencia: 'Activa',
        total_prendas: 5,
        created_at: '2026-09-13T00:00:00',
      },
    ];

    servicio.listar('Primavera', true).subscribe((res) => {
      expect(res.length).toBe(1);
      expect(res[0].nombre).toBe('Primavera 2026');
      expect(res[0].vigencia).toBe('Activa');
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/api/temporadas/` &&
        r.params.get('busqueda') === 'Primavera' &&
        r.params.get('solo_activas') === 'true',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockTemporadas);
  });

  it('crear() envía POST /api/temporadas/ y retorna la temporada creada', () => {
    const nueva: TemporadaCrear = {
      nombre: 'Verano 2027',
      descripcion: 'Línea de playa',
      fecha_inicio: '2026-12-01',
      fecha_fin: '2027-02-28',
      activo: true,
    };

    const mockCreada: Temporada = {
      id_temporada: 2,
      nombre: 'Verano 2027',
      descripcion: 'Línea de playa',
      fecha_inicio: '2026-12-01',
      fecha_fin: '2027-02-28',
      estado: true,
      activo: true,
      vigencia: 'Proxima',
      total_prendas: 0,
      created_at: '2026-09-13T00:00:00',
    };

    servicio.crear(nueva).subscribe((res) => {
      expect(res.id_temporada).toBe(2);
      expect(res.nombre).toBe('Verano 2027');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/temporadas/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nueva);
    req.flush(mockCreada);
  });

  it('eliminar() propaga error 400 o 409 cuando tiene prendas asociadas', (done) => {
    servicio.eliminar(1).subscribe({
      next: () => fail('Debió fallar con error'),
      error: (err: Error) => {
        expect(err.message).toContain('No es posible eliminar');
        done();
      },
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/temporadas/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(
      { detail: 'No es posible eliminar la temporada porque tiene prendas asociadas' },
      { status: 400, statusText: 'Bad Request' },
    );
  });
});
