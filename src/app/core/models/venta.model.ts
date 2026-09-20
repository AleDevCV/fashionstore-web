/**
 * =============================================================================
 * FASHIONSTORE - MODELOS DE VENTA, CARRITO Y COMPROBANTES (CU15, CU20, CU21)
 * =============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// CARRITO
// ─────────────────────────────────────────────────────────────────────────────

export interface CarritoItem {
  id_variante_prenda: number;
  sku_variante?: string;
  prenda_nombre?: string;
  talla?: string | null;
  color?: string | null;
  precio_unitario: number;
  cantidad: number;
  imagen_url?: string;
}

export interface VentaConfirmarPeticion {
  id_reserva: number;
  id_sucursal: number;
  id_cliente?: number;
  tipo_venta?: 'Presencial' | 'Online';
  metodo_pago?: 'Efectivo' | 'Tarjeta' | 'QR' | 'Transferencia';
  descuento?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESERVA
// ─────────────────────────────────────────────────────────────────────────────

export interface DetalleReservaPeticion {
  id_variante_prenda: number;
  cantidad: number;
  precio_unitario: number;
}

export interface ReservaPeticion {
  id_cliente: number;
  id_sucursal: number;
  items: DetalleReservaPeticion[];
}

export interface DetalleReservaRespuesta {
  id_variante_prenda: number;
  sku_variante?: string;
  prenda_nombre?: string;
  talla?: string;
  color?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface ReservaRespuesta {
  id_reserva: number;
  id_cliente: number;
  id_sucursal: number;
  sucursal_nombre?: string;
  fecha_reserva: string;
  fecha_limite: string;
  estado: string;
  total: number;
  items: DetalleReservaRespuesta[];
}

// ─────────────────────────────────────────────────────────────────────────────
// VENTA
// ─────────────────────────────────────────────────────────────────────────────

export interface DetalleVentaRespuesta {
  id_variante_prenda: number;
  sku_variante?: string;
  prenda_nombre?: string;
  talla?: string;
  color?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface VentaRespuesta {
  id_venta: number;
  id_cliente?: number;
  cliente_nombre?: string;
  id_sucursal?: number;
  sucursal_nombre?: string;
  tipo_venta: string;
  metodo_pago: string;
  subtotal: number;
  descuento: number;
  total: number;
  fecha_venta: string;
}

export interface VentaDetalladaRespuesta extends VentaRespuesta {
  items: DetalleVentaRespuesta[];
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGOS
// ─────────────────────────────────────────────────────────────────────────────

export interface StripeCheckoutPeticion {
  id_reserva: number;
  id_cliente: number;
  url_exito?: string;
  url_cancelacion?: string;
}

export interface StripeCheckoutRespuesta {
  url_pago: string;
  session_id: string;
  id_reserva: number;
  monto: number;
}

export interface QRGenerarPeticion {
  id_reserva: number;
  id_cliente: number;
  monto: number;
  concepto?: string;
}

export interface QRGenerarRespuesta {
  qr_base64: string;
  referencia: string;
  monto: number;
  id_reserva: number;
  expira_en_minutos: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPROBANTE
// ─────────────────────────────────────────────────────────────────────────────

export interface ComprobanteGenerarPeticion {
  id_venta: number;
  nit_ci: string;
  razon_social: string;
  enviar_email?: boolean;
}

export interface ComprobanteRespuesta {
  id_comprobante: number;
  id_venta: number;
  numero_comprobante: string;
  nit_ci: string;
  razon_social: string;
  fecha_emision: string;
  url_pdf?: string;
}
