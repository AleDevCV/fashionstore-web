/**
 * =============================================================================
 * FASHIONSTORE - MODELO DE TEMPORADAS Y COLECCIONES (CU09)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Contratos de datos para la gestión del ciclo comercial de colecciones.
 * Refleja app/schemas/temporada.py del backend FastAPI.
 * =============================================================================
 */

export type VigenciaTemporada = 'Activa' | 'Proxima' | 'Pasada';

export interface Temporada {
  id_temporada: number;
  nombre: string;
  descripcion: string | null;
  fecha_inicio: string; // Formato ISO YYYY-MM-DD
  fecha_fin: string;    // Formato ISO YYYY-MM-DD
  estado: boolean;
  activo: boolean;
  vigencia?: VigenciaTemporada | 'Próxima' | null;
  total_prendas?: number;
  created_at?: string | null;
}

export interface TemporadaCrear {
  nombre: string;
  descripcion?: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  activo?: boolean;
  estado?: boolean;
}

export type TemporadaActualizar = Partial<TemporadaCrear>;

export interface TemporadaEliminadaRespuesta {
  mensaje: string;
  id_temporada?: number;
}

/**
 * Evalúa la vigencia temporal de una temporada respecto a la fecha actual.
 */
export function calcularVigenciaTemporada(
  fechaInicio: string,
  fechaFin: string,
  activo = true,
): VigenciaTemporada {
  if (!activo) {
    return 'Pasada';
  }
  const hoy = new Date().toISOString().split('T')[0];
  if (hoy < fechaInicio) {
    return 'Proxima';
  }
  if (hoy > fechaFin) {
    return 'Pasada';
  }
  return 'Activa';
}
