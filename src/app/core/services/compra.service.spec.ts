/**
 * =============================================================================
 * PRUEBAS UNITARIAS DEL SERVICIO DE COMPRAS (CU13)
 * =============================================================================
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { CompraService } from './compra.service';
import { environment } from '../../../environments/environment';
import { Compra, CompraCrear, CompraDetallada } from '../models/compra.model';

describe('CompraService (CU13)', () => {
  let servicio: CompraService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    servicio = TestBed.inject(CompraService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listar() envía GET /api/compras/ con filtros de proveedor y sucursal', () => {
    const mockCompras: Compra[] = [
      {
        id_compra: 101,
        id_proveedor: 2,
        proveedor_razon_social: 'Textil Sur',
        id_sucursal: 1,
        sucursal_nombre: 'Central',
        fecha: '2026-09-13T10:00:00',
        subtotal: 1000,
        iva: 130,
        total: 1130,
      },
    ];

    servicio.listar({ id_proveedor: 2, id_sucursal: 1 }).subscribe((res) => {
      expect(res.length).toBe(1);
      expect(res[0].total).toBe(1130);
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/api/compras/` &&
        r.params.get('id_proveedor') === '2' &&
        r.params.get('id_sucursal') === '1',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockCompras);
  });

  it('obtener() envía GET /api/compras/{id} y retorna detalle con ítems', () => {
    const mockCompra: CompraDetallada = {
      id_compra: 101,
      id_proveedor: 2,
      id_sucursal: 1,
      fecha: '2026-09-13T10:00:00',
      total: 1130,
      subtotal: 1000,
      iva: 130,
      items: [
        {
          id_variante_prenda: 5,
          sku_variante: 'POLO-01',
          cantidad: 10,
          costo_unitario: 100,
          subtotal_item: 1000,
        },
      ],
      detalles: [],
    };

    servicio.obtener(101).subscribe((res) => {
      expect(res.id_compra).toBe(101);
      expect(res.items.length).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/compras/101`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCompra);
  });

  it('crear() envía POST /api/compras/', () => {
    const nueva: CompraCrear = {
      id_proveedor: 2,
      id_sucursal: 1,
      items: [{ id_variante_prenda: 5, cantidad: 10, costo_unitario: 100 }],
    };

    const mockRespuesta: CompraDetallada = {
      id_compra: 102,
      id_proveedor: 2,
      id_sucursal: 1,
      fecha: '2026-09-13T10:10:00',
      total: 1130,
      items: [],
      detalles: [],
    };

    servicio.crear(nueva).subscribe((res) => {
      expect(res.id_compra).toBe(102);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/compras/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nueva);
    req.flush(mockRespuesta);
  });
});
