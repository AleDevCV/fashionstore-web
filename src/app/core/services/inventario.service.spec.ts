/**
 * =============================================================================
 * PRUEBAS UNITARIAS DEL SERVICIO DE INVENTARIO Y MONITOREO (CU10)
 * =============================================================================
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { InventarioService } from './inventario.service';
import { environment } from '../../../environments/environment';
import {
  MonitoreoItem,
  ResumenInventario,
} from '../models/inventario-monitoreo.model';

describe('InventarioService (CU10)', () => {
  let servicio: InventarioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    servicio = TestBed.inject(InventarioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('obtenerResumen() envía GET /api/inventario/resumen con parámetros', () => {
    const mockResumen: ResumenInventario = {
      total_stock: 120,
      total_stock_global: 120,
      total_prendas: 15,
      total_prendas_distintas: 15,
      total_variantes: 28,
      total_optimo: 18,
      total_bajo: 7,
      total_agotado: 3,
      variantes_optimo: 18,
      variantes_bajo_stock: 7,
      variantes_agotadas: 3,
      sucursales: [
        {
          id_sucursal: 1,
          sucursal: 'Sucursal Central',
          nombre_sucursal: 'Sucursal Central',
          ciudad: 'Santa Cruz',
          total_stock: 120,
          variantes_optimo: 18,
          variantes_bajo: 7,
          variantes_agotadas: 3,
        },
      ],
    };

    servicio.obtenerResumen(1, 2, 3, 'vestido').subscribe((res) => {
      expect(res.total_stock).toBe(120);
      expect(res.variantes_bajo_stock).toBe(7);
      expect(res.variantes_agotadas).toBe(3);
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/api/inventario/resumen` &&
        r.params.get('id_sucursal') === '1' &&
        r.params.get('id_categoria') === '2' &&
        r.params.get('id_temporada') === '3' &&
        r.params.get('busqueda') === 'vestido',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResumen);
  });

  it('monitorear() envía GET /api/inventario/monitoreo con filtros combinados', () => {
    const mockItems: MonitoreoItem[] = [
      {
        id_inventario: 1,
        id_sucursal: 1,
        sucursal: 'Sucursal Central',
        nombre_sucursal: 'Sucursal Central',
        ciudad: 'Santa Cruz',
        id_prenda: 10,
        prenda_nombre: 'Vestido Seda Floral',
        id_variante_prenda: 20,
        sku_variante: 'VES-FLOR-S-ROJ',
        stock: 2,
        estado_stock: 'Bajo',
        color_badge: 'amarillo',
      },
    ];

    servicio
      .monitorear({
        id_sucursal: 1,
        estado_stock: 'Bajo',
        busqueda: 'VES',
      })
      .subscribe((items) => {
        expect(items.length).toBe(1);
        expect(items[0].sku_variante).toBe('VES-FLOR-S-ROJ');
        expect(items[0].estado_stock).toBe('Bajo');
        expect(items[0].color_badge).toBe('amarillo');
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/api/inventario/monitoreo` &&
        r.params.get('id_sucursal') === '1' &&
        r.params.get('estado_stock') === 'Bajo' &&
        r.params.get('busqueda') === 'VES',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockItems);
  });
});
