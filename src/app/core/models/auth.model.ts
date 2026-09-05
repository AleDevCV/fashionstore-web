/**
 * =============================================================================
 * FASHIONSTORE - CONTRATOS DE DATOS DEL MÓDULO DE AUTENTICACIÓN (CU01)
 * -----------------------------------------------------------------------------
 * Interfaces TypeScript que describen el intercambio de información entre el
 * frontend Angular y el endpoint POST /api/login/ del backend en FastAPI.
 * =============================================================================
 */

/**
 * Credenciales que el usuario escribe en el formulario de inicio de sesión y
 * que se envían al backend como cuerpo JSON de la petición POST.
 */
export interface SolicitudLogin {
  /** Correo electrónico registrado en la tabla `usuario` de PostgreSQL. */
  correo: string;

  /** Contraseña en texto plano; el backend la compara contra el hash bcrypt. */
  password: string;
}

/**
 * Respuesta HTTP 200 que devuelve FastAPI cuando las credenciales son válidas.
 */
export interface RespuestaLogin {
  /** Token JWT firmado por el backend. */
  access_token: string;

  /** Esquema de autorización; FastAPI devuelve habitualmente "bearer". */
  token_type: string;
}

/**
 * Carga útil (payload) que viaja dentro del token JWT.
 *
 * Según la tabla PUDS del CU01, el backend inyecta el ID del usuario, su
 * correo, su nombre y su rol jerárquico, además de las marcas de tiempo
 * estándar del estándar JWT (RFC 7519).
 */
export interface PayloadJwt {
  /** Identificador del usuario en la tabla `usuario`. */
  id_usuario: number;

  /** Correo electrónico del usuario autenticado. */
  correo: string;

  /** Nombre visible que se muestra en la cabecera del panel. */
  nombre: string;

  /** Rol jerárquico: Administrador, Encargado de Sucursal, Cajero o Cliente. */
  rol: string;

  /** Fecha de expiración en segundos desde la época Unix (claim `exp`). */
  exp: number;

  /** Fecha de emisión en segundos desde la época Unix (claim `iat`). */
  iat?: number;

  /** Sujeto del token (claim `sub`), opcional según lo que emita el backend. */
  sub?: string;
}

/**
 * Roles definidos en la tabla `rol` del script db_scheme.sql.
 * Se usan para autorizar la navegación hacia los distintos paneles.
 */
export const ROLES = {
  ADMINISTRADOR: 'Administrador',
  ENCARGADO: 'Encargado de Sucursal',
  CAJERO: 'Cajero (POS)',
  CLIENTE: 'Cliente',
} as const;
