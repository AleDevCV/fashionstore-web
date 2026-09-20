export interface KPISummary {
  ingresos_totales: number;
  total_ventas: number;
  ticket_promedio: number;
  total_reservas: number;
  reservas_atendidas: number;
  tasa_conversion_reservas: number;
  stock_total_piezas: number;
  valor_inventario_estimado: number;
}

export interface VentaPorPeriodo {
  fecha: string;
  total_ingresos: number;
  cantidad_ventas: number;
}

export interface DistribucionCanal {
  canal: string;
  total_ingresos: number;
  cantidad_ventas: number;
  porcentaje: number;
}

export interface DistribucionMetodoPago {
  metodo_pago: string;
  total_ingresos: number;
  cantidad_ventas: number;
  porcentaje: number;
}

export interface SucursalReservaRendimiento {
  id_sucursal: number;
  sucursal: string;
  ciudad?: string;
  total_reservas: number;
  atendidas: number;
  pendientes: number;
  canceladas: number;
  tasa_efectividad: number;
}

export interface TopPrendaVendida {
  id_prenda: number;
  nombre: string;
  categoria?: string;
  unidades_vendidas: number;
  total_ingresos: number;
  url_imagen?: string;
}

export interface EstadoInventarioSucursal {
  id_sucursal: number;
  sucursal: string;
  total_stock: number;
  variantes_agotadas: number;
  variantes_bajo_stock: number;
  variantes_optimas: number;
}

export interface DashboardKPIsRespuesta {
  resumen: KPISummary;
  ventas_recientes: VentaPorPeriodo[];
  canales: DistribucionCanal[];
  metodos_pago: DistribucionMetodoPago[];
  rendimiento_sucursales: SucursalReservaRendimiento[];
  top_prendas: TopPrendaVendida[];
  inventario_sucursales: EstadoInventarioSucursal[];
}
