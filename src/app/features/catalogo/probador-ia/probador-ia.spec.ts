/**
 * =============================================================================
 * FASHIONSTORE - PRUEBAS UNITARIAS: PROBADOR VIRTUAL IA (FASE 2)
 * Componente: ProbadorIa
 * =============================================================================
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { ProbadorIa } from './probador-ia';
import { IaService } from '../../../core/services/ia.service';
import { VentaService } from '../../../core/services/venta.service';
import { GeografiaService } from '../../../core/services/geografia.service';
import { PrendaCatalogo, Sucursal } from '../../../core/models/catalogo.model';
import { TryOnRespuesta } from '../../../core/models/ia.model';
import { TicketReservaRespuesta } from '../../../core/models/venta.model';

describe('ProbadorIa Component (Fase 2)', () => {
  let component: ProbadorIa;
  let fixture: ComponentFixture<ProbadorIa>;
  let mockIaService: jasmine.SpyObj<IaService>;
  let mockVentaService: jasmine.SpyObj<VentaService>;
  let mockGeografiaService: jasmine.SpyObj<GeografiaService>;

  const mockPrenda: PrendaCatalogo = {
    id_prenda: 12,
    sku: 'VEST-GALA-01',
    nombre: 'Vestido Gala Seda Champagne',
    descripcion: 'Vestido largo de fiesta en satén de seda pura.',
    precio_base: 850.0,
    id_categoria: 1,
    categoria: 'Vestidos',
    genero: 'Femenino',
    marca: 'Atelier FashionStore',
    url_imagen: 'https://example.com/vestido-champagne.png',
    stock_total: 10,
    variantes: [
      {
        id_variante_prenda: 45,
        id_talla: 1,
        talla: 'S',
        id_color: 1,
        color: 'Champagne',
        codigo_hex: '#F7E7CE',
        precio: 850.0,
        stock_total: 4,
        disponibilidad: [
          {
            id_sucursal: 1,
            sucursal: 'Sucursal Central',
            direccion: 'Av. Monseñor Rivero 240',
            ciudad: 'Santa Cruz',
            stock: 4,
          },
        ],
      },
    ],
  };

  const mockSucursales: Sucursal[] = [
    {
      id_sucursal: 1,
      nombre: 'Sucursal Central',
      direccion: 'Av. Monseñor Rivero 240',
      telefono: '33445566',
      ciudad: 'Santa Cruz',
      id_ciudad: 1,
      id_encargado: 2,
      encargado: 'Juan Pérez',
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  const mockTryOnRespuesta: TryOnRespuesta = {
    estado: 'exito',
    imagen_resultado: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    tiempo_procesamiento_ms: 1180,
    metadatos_calce: {
      metodo: 'gemini_vision',
      anclaje_torso: { cuello: [360, 200] },
      ajuste_luz: { factor_luminancia: 1.04 },
      prenda_id: 12,
      es_fallback: false,
      tiempo_procesamiento_ms: 1180,
      confianza_calce: 0.97,
    },
    mensaje: 'Composición completada exitosamente',
    confianza_calce: 0.97,
  };

  const mockTicketReserva: TicketReservaRespuesta = {
    id_reserva: 101,
    codigo_ticket: 'TKT-829104',
    qr_base64: 'iVBORw0KGgoAAAANSUhEUgAA...',
    id_cliente: 61,
    cliente_nombre: 'Cliente FashionStore',
    id_sucursal: 1,
    sucursal_nombre: 'Sucursal Central',
    fecha_reserva: '2026-09-20T16:00:00Z',
    fecha_limite: '2026-09-21T16:00:00Z',
    estado: 'Pendiente',
    total: 850.0,
    items: [],
  };

  beforeEach(async () => {
    mockIaService = jasmine.createSpyObj('IaService', ['generarTryOn', 'procesarTryOn']);
    mockVentaService = jasmine.createSpyObj('VentaService', ['crearReservaProbador']);
    mockGeografiaService = jasmine.createSpyObj('GeografiaService', ['listarSucursales']);

    mockGeografiaService.listarSucursales.and.returnValue(of(mockSucursales));
    mockIaService.generarTryOn.and.returnValue(of(mockTryOnRespuesta));
    mockVentaService.crearReservaProbador.and.returnValue(of(mockTicketReserva));

    await TestBed.configureTestingModule({
      imports: [ProbadorIa],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: IaService, useValue: mockIaService },
        { provide: VentaService, useValue: mockVentaService },
        { provide: GeografiaService, useValue: mockGeografiaService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProbadorIa);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('prenda', mockPrenda);
    fixture.detectChanges();
  });

  it('se inicializa en estado CAPTURA con pestaña webcam por defecto', () => {
    expect(component).toBeTruthy();
    expect(component.estado()).toBe('CAPTURA');
    expect(component.modoCaptura()).toBe('webcam');
    expect(component.sucursales().length).toBe(1);
    expect(component.varianteSeleccionada()?.id_variante_prenda).toBe(45);
  });

  it('permite cambiar entre pestañas de webcam y archivo', () => {
    component.cambiarModoCaptura('archivo');
    expect(component.modoCaptura()).toBe('archivo');
    expect(component.camaraIniciada()).toBeFalse();

    component.cambiarModoCaptura('webcam');
    expect(component.modoCaptura()).toBe('webcam');
  });

  it('actualiza el slider comparativo y alterna modo de comparación', () => {
    const mockEvent = { target: { value: '75' } } as unknown as Event;
    component.actualizarSlider(mockEvent);
    expect(component.posicionSlider()).toBe(75);

    expect(component.modoComparacion()).toBe('slider');
    component.alternarModoComparacion();
    expect(component.modoComparacion()).toBe('lado_a_lado');
    component.alternarModoComparacion();
    expect(component.modoComparacion()).toBe('slider');
  });

  it('procesa try-on con backend y actualiza a estado RESULTADO', (done) => {
    const fotoMock = 'data:image/jpeg;base64,TESTFOTO';
    (component as any).procesarConBackend(fotoMock);

    expect(component.estado()).toBe('PROCESANDO');
    expect(component.cargando()).toBeTrue();
    expect(mockIaService.generarTryOn).toHaveBeenCalled();

    setTimeout(() => {
      expect(component.estado()).toBe('RESULTADO');
      expect(component.respuestaTryOn()).toEqual(mockTryOnRespuesta);
      expect(component.cargando()).toBeFalse();
      done();
    }, 500);
  });

  it('gestiona error del backend retornando a estado CAPTURA', () => {
    mockIaService.generarTryOn.and.returnValue(
      throwError(() => new Error('Fallo en detección anatómica')),
    );

    (component as any).procesarConBackend('data:image/jpeg;base64,TEST');
    expect(component.estado()).toBe('CAPTURA');
    expect(component.error()).toBe('Fallo en detección anatómica');
    expect(component.cargando()).toBeFalse();
  });

  it('flujo de reserva en tienda (CU16) confirma ticket con QR', () => {
    component.iniciarReserva();
    expect(component.estado()).toBe('RESERVA_CU16');
    expect(component.ticketReserva()).toBeNull();

    component.confirmarReserva();
    expect(mockVentaService.crearReservaProbador).toHaveBeenCalled();
    expect(component.ticketReserva()?.codigo_ticket).toBe('TKT-829104');
    expect(component.ticketReserva()?.qr_base64).toBeTruthy();
  });

  it('emite evento cerrado al invocar cerrarModal()', () => {
    let cerradoEmitido = false;
    component.cerrado.subscribe(() => {
      cerradoEmitido = true;
    });

    component.cerrarModal();
    expect(cerradoEmitido).toBeTrue();
  });
});
