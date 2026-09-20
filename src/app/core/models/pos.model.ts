/**
 * =============================================================================
 * FASHIONSTORE - MODELOS TYPESCRIPT DE TERMINAL POS (CU19)
 * =============================================================================
 */

export interface POSProductoVariante {
  id_variante_prenda: number;
  sku: string;
  id_prenda: number;
  prenda_nombre: string;
  categoria_nombre?: string;
  talla: string;
  color: string;
  precio_unitario: number;
  stock_disponible: number;
  imagen_url?: string;
}

export interface POSItemReserva {
  id_variante_prenda: number;
  sku: string;
  prenda_nombre: string;
  talla: string;
  color: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface POSReservaCargadaRespuesta {
  id_reserva: number;
  codigo_ticket: string;
  id_cliente: number;
  cliente_nombre: string;
  cliente_ci: string;
  id_sucursal: number;
  sucursal_nombre: string;
  estado: string;
  total: number;
  items: POSItemReserva[];
}

export interface POSItemVenta {
  id_variante_prenda: number;
  cantidad: number;
  precio_unitario: number;
}

export interface POSVentaCrear {
  id_sucursal: number;
  id_cliente?: number | null;
  id_reserva?: number | null;
  metodo_pago: 'Efectivo' | 'Tarjeta' | 'QR' | 'Transferencia';
  monto_recibido?: number;
  descuento?: number;
  nit_ci?: string;
  razon_social?: string;
  enviar_email?: boolean;
  items: POSItemVenta[];
}

export interface POSItemVentaRespuesta {
  id_variante_prenda: number;
  sku?: string;
  prenda_nombre?: string;
  talla?: string;
  color?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface POSVentaRespuesta {
  id_venta: number;
  id_sucursal: number;
  sucursal_nombre: string;
  id_cliente: number;
  cliente_nombre: string;
  cajero_nombre?: string;
  id_reserva?: number;
  tipo_venta: string;
  metodo_pago: string;
  subtotal: number;
  descuento: number;
  total: number;
  monto_recibido?: number;
  cambio_vuelto?: number;
  fecha_venta: string;
  id_comprobante?: number;
  numero_comprobante?: string;
  url_pdf?: string;
  items: POSItemVentaRespuesta[];
}

export interface ItemCarritoPOS {
  variante: POSProductoVariante;
  cantidad: number;
  precio_unitario: number;
}
