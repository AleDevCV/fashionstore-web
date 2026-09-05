/**
 * =============================================================================
 * FASHIONSTORE - CONTRATOS DE DATOS DE LA ITERACIÓN 1
 * -----------------------------------------------------------------------------
 * Interfaces que reflejan los esquemas de Pydantic del backend para los casos
 * de uso CU05, CU06, CU07, CU08 y CU14.
 * =============================================================================
 */

/** Estados de baja lógica usados por clientes, categorías y prendas. */
export type EstadoRegistro = 'Activo' | 'Inactivo';

// =============================================================================
// CU06 - CIUDADES Y SUCURSALES
// =============================================================================

/** Ciudad de cobertura con su número de tiendas. */
export interface Ciudad {
  id_ciudad: number;
  nombre: string;
  /** Calculado con COUNT en el backend; no es una columna de la tabla. */
  total_sucursales: number;
}

/** Sucursal física con su ciudad y su encargado ya resueltos por JOIN. */
export interface Sucursal {
  id_sucursal: number;
  nombre: string;
  direccion: string;
  telefono: string | null;
  id_ciudad: number | null;
  ciudad: string | null;
  id_encargado: number | null;
  encargado: string | null;
  created_at: string | null;
}

/** Cuerpo de POST /api/sucursales. */
export interface SucursalCrear {
  nombre: string;
  direccion: string;
  telefono: string | null;
  id_ciudad: number;
  id_encargado: number | null;
}

/** Cuerpo de PUT /api/sucursales/{id}; todos los campos son opcionales. */
export type SucursalActualizar = Partial<SucursalCrear>;

// =============================================================================
// CU05 - FICHAS DE CLIENTES
// =============================================================================

/**
 * Ficha maestra de un comprador.
 *
 * NOTA: la tabla `cliente` guarda un único `nombre_completo`, no un par
 * nombre/apellido. El modelo respeta esa estructura.
 */
export interface Cliente {
  id_cliente: number;
  ci: string;
  nombre_completo: string;
  telefono: string | null;
  correo: string | null;
  direccion_envio: string | null;
  estado: EstadoRegistro;
  created_at: string | null;
}

/** Cuerpo de POST /api/clientes/. */
export interface ClienteCrear {
  ci: string;
  nombre_completo: string;
  telefono: string | null;
  correo: string | null;
  direccion_envio: string | null;
}

/** Cuerpo de PUT /api/clientes/{id}. */
export type ClienteActualizar = Partial<ClienteCrear> & {
  estado?: EstadoRegistro;
};

// =============================================================================
// CU07 - CATEGORÍAS
// =============================================================================

/** Categoría del catálogo, con su padre resuelto y su conteo de prendas. */
export interface Categoria {
  id_categoria: number;
  nombre: string;
  descripcion: string | null;
  id_categoria_padre: number | null;
  categoria_padre: string | null;
  estado: EstadoRegistro;
  total_prendas: number;
}

/** Cuerpo de POST /api/categorias/. */
export interface CategoriaCrear {
  nombre: string;
  descripcion: string | null;
  id_categoria_padre: number | null;
}

/** Cuerpo de PUT /api/categorias/{id}. */
export type CategoriaActualizar = Partial<CategoriaCrear> & {
  estado?: EstadoRegistro;
};

// =============================================================================
// CU08 - PRENDAS Y VARIANTES
// =============================================================================

/** Público objetivo de la prenda; se usa como filtro del catálogo. */
export type GeneroPrenda = 'Dama' | 'Caballero' | 'Unisex' | 'Nino';

/** Estado de publicación de una prenda. */
export type EstadoPrenda = 'Activo' | 'Inactivo' | 'Borrador';

/** Talla del catálogo maestro. */
export interface Talla {
  id_talla: number;
  nombre: string;
  descripcion: string | null;
}

/** Color del catálogo maestro. */
export interface Color {
  id_color: number;
  nombre: string;
  codigo_hex: string | null;
}

/** Combinación física talla + color con su stock consolidado. */
export interface Variante {
  id_variante_prenda: number;
  id_talla: number;
  talla: string | null;
  id_color: number;
  color: string | null;
  codigo_hex: string | null;
  sku_variante: string;
  precio_adicional: string | number;
  stock_total: number;
}

/** Fila de la matriz de variantes que se envía al crear una prenda. */
export interface VarianteCrear {
  id_talla: number;
  id_color: number;
  /** Unidades iniciales EN CADA SUCURSAL, no repartidas entre ellas. */
  stock_inicial: number;
  precio_adicional: number;
}

/** Prenda del catálogo maestro. */
export interface Prenda {
  id_prenda: number;
  sku: string;
  nombre: string;
  descripcion: string | null;
  marca: string | null;
  genero: string | null;
  precio_base: string | number;
  id_categoria: number | null;
  categoria: string | null;
  estado: EstadoPrenda;
  url_imagen: string | null;
  stock_total: number;
  variantes: Variante[];
  created_at: string | null;
}

/** Cuerpo de POST /api/prendas/. */
export interface PrendaCrear {
  sku: string;
  nombre: string;
  descripcion: string | null;
  marca: string | null;
  genero: GeneroPrenda;
  precio_base: number;
  id_categoria: number;
  url_imagen: string | null;
  variantes: VarianteCrear[];
}

/** Cuerpo de PUT /api/prendas/{id}; las variantes no se editan por esta vía. */
export type PrendaActualizar = Partial<Omit<PrendaCrear, 'variantes'>> & {
  estado?: EstadoPrenda;
};

// =============================================================================
// CU14 - CATÁLOGO PÚBLICO
// =============================================================================

/** Existencias de una variante en una sucursal concreta. */
export interface StockSucursal {
  id_sucursal: number;
  sucursal: string;
  ciudad: string | null;
  direccion: string | null;
  stock: number;
}

/** Variante del catálogo con su precio final y su desglose por sucursal. */
export interface VarianteCatalogo {
  id_variante_prenda: number;
  id_talla: number;
  talla: string | null;
  id_color: number;
  color: string | null;
  codigo_hex: string | null;
  /** precio_base + precio_adicional, ya calculado por el backend. */
  precio: string | number;
  stock_total: number;
  disponibilidad: StockSucursal[];
}

/** Ficha de prenda tal como se muestra en la vitrina pública. */
export interface PrendaCatalogo {
  id_prenda: number;
  sku: string;
  nombre: string;
  descripcion: string | null;
  marca: string | null;
  genero: string | null;
  precio_base: string | number;
  id_categoria: number | null;
  categoria: string | null;
  url_imagen: string | null;
  stock_total: number;
  variantes: VarianteCatalogo[];
}

/** Página de resultados del catálogo. */
export interface RespuestaCatalogo {
  total: number;
  limite: number;
  desplazamiento: number;
  prendas: PrendaCatalogo[];
}

/** Opciones con las que se arma la barra de filtros del catálogo. */
export interface FiltrosDisponibles {
  categorias: { id_categoria: number; nombre: string }[];
  tallas: { id_talla: number; nombre: string }[];
  colores: { id_color: number; nombre: string; codigo_hex: string | null }[];
  generos: string[];
  precio_minimo: string | number;
  precio_maximo: string | number;
}

/** Parámetros de consulta del catálogo. */
export interface FiltrosCatalogo {
  busqueda?: string;
  id_categoria?: number | null;
  genero?: string | null;
  id_talla?: number | null;
  id_color?: number | null;
  precio_min?: number | null;
  precio_max?: number | null;
  limite?: number;
  desplazamiento?: number;
}

/** Respuesta simple del backend para operaciones sin entidad de retorno. */
export interface MensajeRespuesta {
  mensaje: string;
}
