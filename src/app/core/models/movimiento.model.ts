/**
 * =============================================================================
 * FASHIONSTORE - MODELO DE MOVIMIENTOS DE INVENTARIO (CU11)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Contratos de datos para el registro y consulta de movimientos de almacén:
 * Entrada, Salida y Traspaso. Refleja app/schemas/movimiento.py.
 * =============================================================================
 */

export type TipoMovimiento = 'Entrada' | 'Salida' | 'Traspaso';

export interface MovimientoInventario {
  id_movimiento: number;
  id_sucursal: number;
  sucursal_nombre?: string | null;
  id_variante_prenda: number;
  sku_variante?: string | null;
  prenda_nombre?: string | null;
  talla?: string | null;
  color?: string | null;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
  id_usuario?: number | null;
  usuario_nombre?: string | null;
  fecha: string;
  stock_actual?: number | null;
}

export interface MovimientoInventarioCrear {
  id_sucursal: number;
  id_variante_prenda: number;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
}

export interface FiltrosMovimientos {
  id_sucursal?: number | null;
  id_variante_prenda?: number | null;
  tipo?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  skip?: number;
  limit?: number;
}

export interface StockRespuesta {
  id_sucursal: number;
  id_variante_prenda: number;
  stock: number;
}
