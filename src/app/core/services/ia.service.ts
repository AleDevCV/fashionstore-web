/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE INTELIGENCIA ARTIFICIAL (Bloque 4)
 * Sistemas de Informacion II - UAGRM
 * -----------------------------------------------------------------------------
 * Consume los endpoints de IA del backend FastAPI:
 *   POST /api/ia/recomendar/      - Recomendador de moda Gemini (CU22)
 *   POST /api/ia/analitica-voz/   - Analitica ejecutiva por voz (CU23)
 * =============================================================================
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { traducirErrorApi } from '../utils/api-error';
import {
  RecomendadorPayload,
  RespuestaRecomendador,
  AnaliticaVozPayload,
  RespuestaAnaliticaVoz,
  TryOnPeticion,
  TryOnRespuesta,
} from '../models/ia.model';

@Injectable({ providedIn: 'root' })
export class IaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/ia`;

  /**
   * Solicita recomendaciones de prendas al asistente de moda con Gemini (CU22).
   *
   * @param payload Preferencias del usuario: estilo, ocasion, genero, talla,
   *                temporada, clima y limite de resultados.
   * @returns Observable con el mensaje del estilista, prendas recomendadas
   *          y bandera de fallback.
   */
  recomendar(payload: RecomendadorPayload): Observable<RespuestaRecomendador> {
    return this.http
      .post<RespuestaRecomendador>(`${this.baseUrl}/recomendar/`, payload)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Interpreta una consulta en lenguaje natural y genera resultados analiticos
   * ejecutivos, opcionalmente en PDF (CU23).
   *
   * @param payload Texto de la consulta y bandera generar_pdf.
   * @returns Observable con interpretacion, tabla de resultados, resumen
   *          ejecutivo y PDF en base64 (si fue solicitado).
   */
  analiticaVoz(payload: AnaliticaVozPayload): Observable<RespuestaAnaliticaVoz> {
    return this.http
      .post<RespuestaAnaliticaVoz>(`${this.baseUrl}/analitica-voz/`, payload)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Genera la prueba virtual fotorealista de una prenda sobre la fotografía del usuario (Fase 2).
   * Endpoint: POST /api/ia/try-on
   *
   * @param peticion Payload con foto_usuario en Base64, id_prenda o url_prenda, y opciones.
   * @returns Observable con la imagen compuesta resultante, tiempo de cómputo y metadatos de calce.
   */
  generarTryOn(peticion: TryOnPeticion): Observable<TryOnRespuesta> {
    return this.http
      .post<TryOnRespuesta>(`${this.baseUrl}/try-on`, peticion)
      .pipe(catchError(traducirErrorApi));
  }

  /**
   * Alias de conveniencia para generarTryOn.
   */
  procesarTryOn(peticion: TryOnPeticion): Observable<TryOnRespuesta> {
    return this.generarTryOn(peticion);
  }
}

