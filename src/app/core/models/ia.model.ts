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
// CU23 � Analitica Ejecutiva por Voz (POST /api/ia/analitica-voz/)
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
