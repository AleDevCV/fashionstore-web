/**
 * =============================================================================
 * PRUEBAS UNITARIAS DEL SERVICIO DE MOVIMIENTOS DE INVENTARIO (CU11)
 * =============================================================================
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { MovimientoInventarioService } from './movimiento-inventario.service';
import { environment } from '../../../environments/environment';
import {
  MovimientoInventario,
  MovimientoInventarioCrear,
} from '../models/movimiento.model';

describe('MovimientoInventarioService (CU11)', () => {
  let servicio: MovimientoInventarioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    servicio = TestBed.inject(MovimientoInventarioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listar() envía GET /api/movimientos-inventario/ con filtros de sucursal y tipo', () => {
    const mockMovimientos: MovimientoInventario[] = [
      {
        id_movimiento: 10,
        id_sucursal: 1,
        sucursal_nombre: 'Central',
        id_variante_prenda: 5,
        sku_variante: 'POLO-BLA-M',
        prenda_nombre: 'Polo Pima',
        tipo: 'Entrada',
        cantidad: 20,
        motivo: 'Ajuste inicial',
        fecha: '2026-09-13T10:00:00',
      },
    ];

    servicio.listar({ id_sucursal: 1, tipo: 'Entrada' }).subscribe((res) => {
      expect(res.length).toBe(1);
      expect(res[0].tipo).toBe('Entrada');
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/api/movimientos-inventario/` &&
        r.params.get('id_sucursal') === '1' &&
        r.params.get('tipo') === 'Entrada',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockMovimientos);
  });

  it('crear() envía POST /api/movimientos-inventario/', () => {
    const nuevo: MovimientoInventarioCrear = {
      id_sucursal: 1,
      id_variante_prenda: 5,
      tipo: 'Salida',
      cantidad: 2,
      motivo: 'Muestra comercial',
    };

    const mockCreado: MovimientoInventario = {
      id_movimiento: 11,
      id_sucursal: 1,
      id_variante_prenda: 5,
      tipo: 'Salida',
      cantidad: 2,
      motivo: 'Muestra comercial',
      fecha: '2026-09-13T10:05:00',
    };

    servicio.crear(nuevo).subscribe((res) => {
      expect(res.id_movimiento).toBe(11);
      expect(res.cantidad).toBe(2);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/movimientos-inventario/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nuevo);
    req.flush(mockCreado);
  });

  it('consultarStock() envía GET /api/movimientos-inventario/stock', () => {
    servicio.consultarStock(1, 5).subscribe((res) => {
      expect(res.stock).toBe(15);
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/api/movimientos-inventario/stock` &&
        r.params.get('id_sucursal') === '1' &&
        r.params.get('id_variante_prenda') === '5',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ id_sucursal: 1, id_variante_prenda: 5, stock: 15 });
  });
});
