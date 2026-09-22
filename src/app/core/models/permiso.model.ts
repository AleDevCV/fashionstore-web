/**
 * =============================================================================
 * FASHIONSTORE - MODELOS DE ROLES Y PERMISOS (CU03)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Contratos de datos TypeScript para la gestión del control de acceso basado
 * en roles (RBAC) granular y la matriz de permisos por rol.
 * =============================================================================
 */

/**
 * Permiso individual registrado en el catálogo del sistema.
 */
export interface Permiso {
  /** Identificador único del permiso en la tabla `permiso`. */
  id_permiso: number;

  /** Nombre descriptivo legible (ej. "Ver catálogo", "Crear usuario"). */
  nombre: string;

  /** Código técnico para verificación (ej. "usuarios.ver", "prendas.crear"). */
  codigo: string;

  /** Módulo funcional al que pertenece (ej. "Usuarios", "Inventario", "Seguridad"). */
  modulo: string;

  /** Descripción detallada del alcance o propósito del permiso. */
  descripcion: string | null;
}

/**
 * Respuesta del backend al consultar los permisos asignados a un rol específico.
 * Endpoint: GET /api/roles/{id_rol}/permisos
 */
export interface RolPermisosResponse {
  /** Identificador del rol. */
  id_rol: number;

  /** Nombre del rol (ej. "Administrador", "Encargado de Sucursal"). */
  rol: string;

  /** Arreglo de IDs de permisos asignados a este rol. */
  permisos: number[];
}

/**
 * Cuerpo de la petición para sincronizar/actualizar los permisos de un rol.
 * Endpoint: PUT /api/roles/{id_rol}/permisos
 */
export interface UpdateRolPermisosRequest {
  /** Lista completa de identificadores de permisos que se asignarán al rol. */
  permisos_ids: number[];
}

/**
 * Respuesta de confirmación tras actualizar los permisos de un rol.
 */
export interface UpdateRolPermisosResponse {
  /** Mensaje de confirmación del backend. */
  mensaje: string;

  /** Identificador del rol modificado. */
  id_rol: number;

  /** Cantidad total de permisos asignados tras la operación. */
  total_permisos: number;
}
