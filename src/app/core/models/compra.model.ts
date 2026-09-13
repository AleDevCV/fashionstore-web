/**
 * =============================================================================
 * FASHIONSTORE - MODELO DE COMPRAS (CU13)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Contratos de datos para el registro transaccional y consulta de compras
 * a proveedores, cálculo de 13% IVA y desglose de líneas de detalle.
 * Refleja app/schemas/compra.py.
 * =============================================================================
 */

export interface DetalleCompraItem {
  id_variante_prenda: number;
  sku_variante?: string | null;
  prenda_nombre?: string | null;
  talla?: string | null;
  color?: string | null;
  cantidad: number;
  costo_unitario: number;
  subtotal_item?: number;
}

export interface DetalleCompraCrear {
  id_variante_prenda: number;
  cantidad: number;
  costo_unitario: number;
}

export interface Compra {
  id_compra: number;
  id_proveedor: number;
  proveedor_razon_social?: string | null;
  id_sucursal: number;
  sucursal_nombre?: string | null;
  fecha: string;
  subtotal?: number | null;
  iva?: number | null;
  total: number;
  id_usuario?: number | null;
  usuario_nombre?: string | null;
  total_items?: number | null;
}

export interface CompraDetallada extends Compra {
  items: DetalleCompraItem[];
  detalles: DetalleCompraItem[];
}

export interface CompraCrear {
  id_proveedor: number;
  id_sucursal: number;
  items?: DetalleCompraCrear[];
  detalles?: DetalleCompraCrear[];
}

export interface FiltrosCompras {
  id_proveedor?: number | null;
  id_sucursal?: number | null;
  skip?: number;
  limit?: number;
}
