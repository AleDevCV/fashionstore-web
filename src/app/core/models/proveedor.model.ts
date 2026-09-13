/**
 * =============================================================================
 * FASHIONSTORE - MODELO DE PROVEEDORES (CU12)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Contratos de datos para el directorio de proveedores de la cadena de suministro.
 * Refleja los esquemas Pydantic del backend en app/schemas/proveedor.py.
 * =============================================================================
 */

export interface Proveedor {
  id_proveedor: number;
  nit: string;
  razon_social: string;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  created_at: string | null;
}

export interface ProveedorCrear {
  nit: string;
  razon_social: string;
  contacto?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
}

export type ProveedorActualizar = Partial<ProveedorCrear>;

export interface ProveedorEliminadoRespuesta {
  mensaje: string;
  id_proveedor?: number;
}
