/**
 * =============================================================================
 * PRUEBAS UNITARIAS DEL SERVICIO DE PROVEEDORES (CU12)
 * =============================================================================
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { ProveedorService } from './proveedor.service';
import { environment } from '../../../environments/environment';
import { Proveedor, ProveedorCrear } from '../models/proveedor.model';

describe('ProveedorService (CU12)', () => {
  let servicio: ProveedorService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    servicio = TestBed.inject(ProveedorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listar() envía GET /api/proveedores/ con parámetros de búsqueda', () => {
    const mockProveedores: Proveedor[] = [
      {
        id_proveedor: 1,
        nit: '10203040',
        razon_social: 'Textiles Andinos S.A.',
        contacto: 'Juan Pérez',
        telefono: '70012345',
        correo: 'contacto@andinos.bo',
        direccion: 'Av. Industrial 123',
        created_at: '2026-09-13T00:00:00',
      },
    ];

    servicio.listar('Andinos', 0, 50).subscribe((res) => {
      expect(res.length).toBe(1);
      expect(res[0].razon_social).toBe('Textiles Andinos S.A.');
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/api/proveedores/` &&
        r.params.get('busqueda') === 'Andinos' &&
        r.params.get('skip') === '0' &&
        r.params.get('limit') === '50',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockProveedores);
  });

  it('crear() envía POST /api/proveedores/ y retorna el proveedor registrado', () => {
    const nuevo: ProveedorCrear = {
      nit: '99887766',
      razon_social: 'Confecciones del Valle',
    };

    const mockCreado: Proveedor = {
      id_proveedor: 2,
      nit: '99887766',
      razon_social: 'Confecciones del Valle',
      contacto: null,
      telefono: null,
      correo: null,
      direccion: null,
      created_at: '2026-09-13T00:00:00',
    };

    servicio.crear(nuevo).subscribe((res) => {
      expect(res.id_proveedor).toBe(2);
      expect(res.nit).toBe('99887766');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/proveedores/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nuevo);
    req.flush(mockCreado);
  });

  it('eliminar() propaga error 409 cuando existen compras asociadas', (done) => {
    servicio.eliminar(1).subscribe({
      next: () => fail('Debió fallar con 409'),
      error: (err: Error) => {
        expect(err.message).toContain('No es posible eliminar el proveedor');
        done();
      },
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/proveedores/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(
      { detail: 'No es posible eliminar el proveedor porque posee historial de compras registradas' },
      { status: 409, statusText: 'Conflict' },
    );
  });
});
