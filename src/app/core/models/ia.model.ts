/**
 * =============================================================================
 * FASHIONSTORE - MODELOS DE INTELIGENCIA ARTIFICIAL (Bloque 4)
 * Sistemas de Informacion II - UAGRM
 * -----------------------------------------------------------------------------
 * Contratos de tipos para CU22 (Recomendador IA) y CU23 (Analitica por Voz).
 * Reflejan los schemas del backend FastAPI en /api/ia/.
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// CU22 � Recomendador de Moda (POST /api/ia/recomendar/)
// ---------------------------------------------------------------------------

/** Estilos de vestimenta disponibles en el recomendador. */
export type EstiloModa = 'Casual' | 'Formal' | 'Deportivo' | 'Elegante';

/** Ocasiones para las que se busca una recomendacion. */
export type OcasionModa = 'Trabajo' | 'Fiesta' | 'Cita' | 'Deporte' | 'Diario';

/** Genero del destinatario de la recomendacion. */
export type GeneroModa = 'Masculino' | 'Femenino' | 'Unisex';

/** Tallas disponibles en el catalogo de FashionStore. */
export type TallaModa = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

/** Condicion climatica para filtrar las recomendaciones. */
export type ClimaModa = 'Calido' | 'Templado' | 'Frio';

/** Payload para POST /api/ia/recomendar/. */
export interface RecomendadorPayload {
  estilo: EstiloModa;
  ocasion: OcasionModa;
  genero: GeneroModa;
  talla: TallaModa;
  /** ID numerico de la temporada seleccionada. */
  temporada: number | null;
  clima: ClimaModa;
  /** Numero maximo de prendas a devolver (por defecto 6). */
  limite?: number;
}

/** Prenda recomendada por el estilista IA. */
export interface PrendaRecomendada {
  id_prenda: number;
  nombre: string;
  precio: number;
  stock_total: number;
  imagen_url: string | null;
  categoria: string;
  /** Explicacion del por que Gemini eligio esta prenda para el outfit. */
  justificacion: string;
}

/** Respuesta completa de POST /api/ia/recomendar/. */
export interface RespuestaRecomendador {
  mensaje_estilista: string;
  prendas: PrendaRecomendada[];
  /** true cuando Gemini no pudo procesar y el backend devolvio resultados genericos. */
  es_fallback: boolean;
}

// ---------------------------------------------------------------------------
// CU23 – Analitica Ejecutiva por Voz (POST /api/ia/analitica-voz/)
// ---------------------------------------------------------------------------

/** Payload para POST /api/ia/analitica-voz/. */
export interface AnaliticaVozPayload {
  texto_voz: string;
  /** Si true, el backend genera y devuelve el PDF en base64. */
  generar_pdf: boolean;
}

/** Fila de la tabla de resultados analiticos. */
export interface FilaAnalitica {
  etiqueta: string;
  valor: string | number;
  cantidad_operaciones: number;
}

/** Parametros semanticos extraidos por Gemini a partir del lenguaje natural. */
export interface ParametrosAnalitica {
  metrica: 'ventas_total' | 'inventario_stock' | 'compras_total' | null;
  sucursal: string | null;
  temporada: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

/** Respuesta completa de POST /api/ia/analitica-voz/. */
export interface RespuestaAnaliticaVoz {
  interpretacion: ParametrosAnalitica;
  consulta_sql_ejecutada: string;
  resultados: FilaAnalitica[];
  resumen_ejecutivo: string;
  /** PDF codificado en Base64, presente solo cuando generar_pdf=true. */
  pdf_base64: string | null;
}

// ---------------------------------------------------------------------------
// FASE 2: VESTIDOR VIRTUAL FOTOREALISTA CON IA (POST /api/ia/try-on)
// ---------------------------------------------------------------------------

/** Payload de entrada para el vestidor virtual fotorealista (POST /api/ia/try-on). */
export interface TryOnPeticion {
  /** Fotografía del usuario en Base64 (Data URI con o sin prefijo data:image/...;base64,). */
  foto_usuario: string;
  /** Identificador de la prenda en catálogo PostgreSQL. */
  id_prenda?: number | null;
  /** Identificador opcional de variante específica de la prenda. */
  id_variante_prenda?: number | null;
  /** URL directa o Base64 de la prenda con transparencia PNG. */
  url_prenda?: string | null;
  /** Habilitar refinamiento y análisis con Gemini Vision (por defecto true). */
  usar_ia_generativa?: boolean;
  /** Factor de holgura / entalle (1.0 estándar, <1 ajustado, >1 holgado). */
  ajuste_holgura?: number;
}

/** Métricas y telemetría de ajuste anatómico y balance lumínico. */
export interface MetadatosCalce {
  /** Motor utilizado: 'gemini_multimodal_tryon', 'gemini_vision' o 'warping_hsv_local' */
  metodo: string;
  /** Identificador de método ejecutado: 'gemini_multimodal_tryon' u 'opencv_homography_warp' */
  metodo_usado?: string;
  /** Coordenadas y dimensiones detectadas de hombros, cuello y torso. */
  anclaje_torso?: Record<string, any>;
  /** Métricas de ecualización de luminancia (V) y saturación (S) en espacio HSV. */
  ajuste_luz?: Record<string, any>;
  /** ID de la prenda asociada. */
  prenda_id?: number | null;
  /** true si se recurrió al motor local por fallback de Gemini. */
  es_fallback?: boolean;
  /** Duración total del procesamiento en milisegundos. */
  tiempo_procesamiento_ms?: number;
  /** Nivel de confianza o calce natural (0.0 - 1.0). */
  confianza_calce?: number;
}

/** Respuesta estructurada del vestidor virtual fotorealista. */
export interface TryOnRespuesta {
  /** Estado de la operación ('exito', 'error'). */
  estado: string;
  /** Fotografía resultante compuesta en Data URI Base64 (data:image/jpeg;base64,...). */
  imagen_resultado: string;
  /** Tiempo de ejecución total en milisegundos. */
  tiempo_procesamiento_ms: number;
  /** Telemetría de calce anatómico y balance lumínico. */
  metadatos_calce: MetadatosCalce;
  /** Detalle o recomendación de calce. */
  mensaje: string;
  /** Nivel de confianza calculado. */
  confianza_calce?: number;
  /** Alias en Base64 de la imagen generada. */
  imagen_resultado_b64?: string;
  /** Indica si la composición fue generada por IA generativa (Gemini multimodal). */
  es_generativo?: boolean;
  /** Método efectivamente ejecutado ('gemini_multimodal_tryon' u 'opencv_homography_warp'). */
  metodo_usado?: string;
}

