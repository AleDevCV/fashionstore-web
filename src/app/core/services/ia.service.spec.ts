/**
 * =============================================================================
 * FASHIONSTORE - PRUEBAS UNITARIAS DEL SERVICIO IA (Bloque 4)
 * CU22 - Recomendador de Moda / CU23 - Analitica por Voz
 * =============================================================================
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { IaService } from './ia.service';
import { environment } from '../../../environments/environment';
import {
  RecomendadorPayload,
  RespuestaRecomendador,
  AnaliticaVozPayload,
  RespuestaAnaliticaVoz,
} from '../models/ia.model';

describe('IaService (Bloque 4)', () => {
  let servicio: IaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    servicio = TestBed.inject(IaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // -------------------------------------------------------------------------
  // CU22 - recomendar()
  // -------------------------------------------------------------------------

  it('recomendar() envia POST /api/ia/recomendar/ con el payload correcto', () => {
    const payload: RecomendadorPayload = {
      estilo: 'Casual',
      ocasion: 'Diario',
      genero: 'Masculino',
      talla: 'M',
      temporada: 1,
      clima: 'Templado',
      limite: 6,
    };

    const mockRespuesta: RespuestaRecomendador = {
      mensaje_estilista: 'Te recomiendo estas prendas para tu dia a dia casual.',
      prendas: [
        {
          id_prenda: 10,
          nombre: 'Jean Slim Fit',
          precio: 250.0,
          stock_total: 15,
          imagen_url: null,
          categoria: 'Pantalones',
          justificacion: 'Perfecto para un look casual y comodo.',
        },
      ],
      es_fallback: false,
    };

    servicio.recomendar(payload).subscribe((res) => {
      expect(res.prendas.length).toBe(1);
      expect(res.prendas[0].nombre).toBe('Jean Slim Fit');
      expect(res.es_fallback).toBeFalse();
      expect(res.mensaje_estilista).toContain('casual');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/ia/recomendar/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockRespuesta);
  });

  it('recomendar() devuelve resultados con es_fallback=true cuando Gemini falla', () => {
    const payload: RecomendadorPayload = {
      estilo: 'Formal',
      ocasion: 'Trabajo',
      genero: 'Femenino',
      talla: 'S',
      temporada: null,
      clima: 'Frio',
    };

    const mockFallback: RespuestaRecomendador = {
      mensaje_estilista: 'Aqui tienes algunas opciones de nuestro catalogo.',
      prendas: [],
      es_fallback: true,
    };

    servicio.recomendar(payload).subscribe((res) => {
      expect(res.es_fallback).toBeTrue();
      expect(res.prendas.length).toBe(0);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/ia/recomendar/`);
    req.flush(mockFallback);
  });

  it('recomendar() propaga error 500 como Error con mensaje legible', (done) => {
    const payload: RecomendadorPayload = {
      estilo: 'Elegante',
      ocasion: 'Fiesta',
      genero: 'Unisex',
      talla: 'L',
      temporada: 2,
      clima: 'Calido',
    };

    servicio.recomendar(payload).subscribe({
      next: () => fail('Debia fallar'),
      error: (err: Error) => {
        expect(err instanceof Error).toBeTrue();
        done();
      },
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/ia/recomendar/`);
    req.flush(
      { detail: 'Error interno del servidor de IA.' },
      { status: 500, statusText: 'Internal Server Error' },
    );
  });

  // -------------------------------------------------------------------------
  // CU23 - analiticaVoz()
  // -------------------------------------------------------------------------

  it('analiticaVoz() envia POST /api/ia/analitica-voz/ con texto y flag PDF', () => {
    const payload: AnaliticaVozPayload = {
      texto_voz: 'Cuales son las ventas de octubre',
      generar_pdf: true,
    };

    const mockRespuesta: RespuestaAnaliticaVoz = {
      interpretacion: {
        metrica: 'ventas_total',
        sucursal: null,
        temporada: null,
        fecha_inicio: null,
        fecha_fin: null,
      },
      consulta_sql_ejecutada: 'SELECT ...',
      resultados: [
        { etiqueta: 'Total ventas', valor: 152000, cantidad_operaciones: 87 },
        { etiqueta: 'Producto mas vendido', valor: 'Jean Slim', cantidad_operaciones: 23 },
      ],
      resumen_ejecutivo: 'Las ventas de octubre alcanzaron Bs 152,000 con 87 transacciones.',
      pdf_base64: 'JVBERi0xLjQKJeLjz9MKMyAwIG9iag==',
    };

    servicio.analiticaVoz(payload).subscribe((res) => {
      expect(res.resultados.length).toBe(2);
      expect(res.pdf_base64).toBeTruthy();
      expect(res.resumen_ejecutivo).toContain('152,000');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/ia/analitica-voz/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockRespuesta);
  });

  it('analiticaVoz() retorna pdf_base64 null cuando generar_pdf es false', () => {
    const payload: AnaliticaVozPayload = {
      texto_voz: 'Cuantos clientes nuevos este mes',
      generar_pdf: false,
    };

    const mockRespuesta: RespuestaAnaliticaVoz = {
      interpretacion: {
        metrica: 'ventas_total',
        sucursal: null,
        temporada: null,
        fecha_inicio: null,
        fecha_fin: null,
      },
      consulta_sql_ejecutada: 'SELECT ...',
      resultados: [{ etiqueta: 'Clientes nuevos', valor: 34, cantidad_operaciones: 1 }],
      resumen_ejecutivo: 'Se registraron 34 clientes nuevos este mes.',
      pdf_base64: null,
    };

    servicio.analiticaVoz(payload).subscribe((res) => {
      expect(res.pdf_base64).toBeNull();
      expect(res.resultados[0].etiqueta).toBe('Clientes nuevos');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/ia/analitica-voz/`);
    req.flush(mockRespuesta);
  });

  it('analiticaVoz() propaga error 400 con mensaje del backend', (done) => {
    const payload: AnaliticaVozPayload = {
      texto_voz: '',
      generar_pdf: false,
    };

    servicio.analiticaVoz(payload).subscribe({
      next: () => fail('Debia fallar con 400'),
      error: (err: Error) => {
        expect(err.message).toContain('La operacion no pudo completarse');
        done();
      },
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/ia/analitica-voz/`);
    req.flush(
      { detail: 'La operacion no pudo completarse.' },
      { status: 400, statusText: 'Bad Request' },
    );
  });

  // -------------------------------------------------------------------------
  // FASE 2 - generarTryOn()
  // -------------------------------------------------------------------------

  it('generarTryOn() envia POST /api/ia/try-on con payload de imagen y retorna composicion', () => {
    const payload = {
      foto_usuario: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
      id_prenda: 5,
      url_prenda: 'https://example.com/prenda.png',
      usar_ia_generativa: true,
      ajuste_holgura: 1.0,
    };

    const mockRespuesta = {
      estado: 'exito',
      imagen_resultado: 'data:image/jpeg;base64,/9j/4AAQSkZJRgFINAL...',
      tiempo_procesamiento_ms: 1240,
      metadatos_calce: {
        metodo: 'gemini_vision',
        anclaje_torso: { cuello: [360, 200] },
        ajuste_luz: { factor_brillo: 1.05 },
        prenda_id: 5,
        es_fallback: false,
        tiempo_procesamiento_ms: 1240,
        confianza_calce: 0.96,
      },
      mensaje: 'Composición completada exitosamente',
      confianza_calce: 0.96,
    };

    servicio.generarTryOn(payload).subscribe((res) => {
      expect(res.estado).toBe('exito');
      expect(res.imagen_resultado).toContain('FINAL');
      expect(res.tiempo_procesamiento_ms).toBe(1240);
      expect(res.metadatos_calce.metodo).toBe('gemini_vision');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/ia/try-on`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockRespuesta);
  });

  it('procesarTryOn() funciona como alias de generarTryOn()', () => {
    const payload = {
      foto_usuario: 'data:image/jpeg;base64,TEST',
      id_prenda: 10,
    };

    const mockRespuesta = {
      estado: 'exito',
      imagen_resultado: 'data:image/jpeg;base64,RESULTADO',
      tiempo_procesamiento_ms: 850,
      metadatos_calce: { metodo: 'warping_hsv_local' },
      mensaje: 'Prueba completada',
    };

    servicio.procesarTryOn(payload).subscribe((res) => {
      expect(res.estado).toBe('exito');
      expect(res.imagen_resultado).toBe('data:image/jpeg;base64,RESULTADO');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/ia/try-on`);
    expect(req.request.method).toBe('POST');
    req.flush(mockRespuesta);
  });
});

