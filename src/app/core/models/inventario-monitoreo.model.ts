/**
 * =============================================================================
 * FASHIONSTORE - MODELO DE MONITOREO DE INVENTARIO MULTISUCURSAL (CU10)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Contratos de datos para consultas de agregación analítica multisucursal,
 * resumen de KPIs ejecutivos y grilla de existencias con clasificación cromática.
 * Refleja app/schemas/inventario.py del backend FastAPI.
 * =============================================================================
 */

export type EstadoStock = 'Optimo' | 'Bajo' | 'Agotado';
export type ColorBadge = 'verde' | 'amarillo' | 'rojo';

export interface ResumenSucursal {
  id_sucursal: number;
  sucursal: string;
  nombre_sucursal?: string | null;
  ciudad: string;
  total_stock: number;
  total_variantes?: number;
  total_optimo?: number;
  total_bajo?: number;
  total_agotado?: number;
  variantes_optimo?: number;
  variantes_bajo?: number;
  variantes_agotadas?: number;
}

export interface ResumenInventario {
  total_stock: number;
  total_stock_global?: number | null;
  total_prendas: number;
  total_prendas_distintas?: number | null;
  total_variantes: number;
  total_optimo: number;
  total_bajo: number;
  total_agotado: number;
  variantes_optimo?: number | null;
  variantes_bajo_stock?: number | null;
  variantes_agotadas?: number | null;
  por_sucursal?: ResumenSucursal[];
  sucursales?: ResumenSucursal[];
}

export interface MonitoreoItem {
  id_inventario?: number | null;
  id_sucursal: number;
  sucursal: string;
  nombre_sucursal?: string | null;
  ciudad: string;
  id_prenda: number;
  prenda_sku?: string;
  sku_prenda?: string | null;
  prenda_nombre: string;
  nombre_prenda?: string | null;
  id_categoria?: number | null;
  categoria?: string | null;
  nombre_categoria?: string | null;
  id_temporada?: number | null;
  temporada?: string | null;
  nombre_temporada?: string | null;
  id_variante_prenda: number;
  sku_variante: string;
  sku?: string | null;
  talla?: string | null;
  color?: string | null;
  codigo_hex?: string | null;
  precio_base?: number;
  precio_adicional?: number;
  precio?: number | null;
  stock: number;
  estado_stock: EstadoStock;
  color_badge: ColorBadge;
}

export interface FiltrosMonitoreo {
  id_sucursal?: number | null;
  id_categoria?: number | null;
  id_temporada?: number | null;
  busqueda?: string;
  estado_stock?: EstadoStock | 'Todos' | string | null;
  skip?: number;
  limit?: number;
}

/**
 * Determina el estado de stock y color cromático en base a la cantidad física.
 * - Óptimo (>= 5): Verde
 * - Bajo Stock (1-4): Amarillo
 * - Agotado (0): Rojo
 */
export function clasificarStock(stock: number): {
  estado: EstadoStock;
  color: ColorBadge;
  badgeClass: string;
  etiqueta: string;
} {
  if (stock >= 5) {
    return {
      estado: 'Optimo',
      color: 'verde',
      badgeClass: 'fs-badge--activo',
      etiqueta: 'Óptimo',
    };
  }
  if (stock >= 1) {
    return {
      estado: 'Bajo',
      color: 'amarillo',
      badgeClass: 'fs-badge--oro',
      etiqueta: 'Bajo stock',
    };
  }
  return {
    estado: 'Agotado',
    color: 'rojo',
    badgeClass: 'fs-badge--inactivo',
    etiqueta: 'Agotado',
  };
}
