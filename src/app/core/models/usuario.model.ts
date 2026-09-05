/**
 * =============================================================================
 * FASHIONSTORE - CONTRATOS DE DATOS DEL MÓDULO DE USUARIOS (CU02)
 * -----------------------------------------------------------------------------
 * Interfaces que reflejan exactamente los esquemas de Pydantic definidos en
 * `app/schemas/usuario.py` del backend en FastAPI.
 * =============================================================================
 */

/** Estados admitidos por la restricción CHECK de la columna `usuario.estado`. */
export type EstadoUsuario = 'Activo' | 'Inactivo';

/**
 * Usuario tal como lo devuelve el backend.
 *
 * Obsérvese que NO existe ningún campo de contraseña: el backend excluye
 * `password_hash` de forma estructural en su modelo de respuesta (RNF01).
 */
export interface Usuario {
  /** Clave primaria en la tabla `usuario`. */
  id_usuario: number;

  /** Nombre de pila. */
  nombre: string;

  /** Apellido. */
  apellido: string;

  /** Correo electrónico; es único en todo el sistema y sirve de identidad. */
  correo: string;

  /** Teléfono de contacto; puede venir nulo. */
  telefono: string | null;

  /** 'Activo' o 'Inactivo'. Un usuario inactivo no puede autenticarse. */
  estado: EstadoUsuario;

  /** Clave foránea hacia `rol.id_rol`. */
  id_role: number | null;

  /** Nombre textual del rol, resuelto por el JOIN del backend. */
  rol: string | null;

  /** Fecha de alta del registro, en formato ISO 8601. */
  created_at: string | null;
}

/**
 * Cuerpo de la petición POST /api/usuarios/ para dar de alta un usuario.
 */
export interface UsuarioCrear {
  nombre: string;
  apellido: string;
  correo: string;

  /** Contraseña temporal; el backend la convierte a hash bcrypt al recibirla. */
  password: string;

  telefono: string | null;

  /** Rol jerárquico que se le asigna. */
  id_role: number;
}

/**
 * Cuerpo de la petición PUT /api/usuarios/{id}.
 *
 * Todos los campos son opcionales porque el backend aplica una actualización
 * parcial: solo modifica las columnas que realmente se envían.
 *
 * El correo y la contraseña se omiten a propósito, igual que en el backend: el
 * correo es la identidad de acceso y la contraseña se restablece con el CU04.
 */
export interface UsuarioActualizar {
  nombre?: string;
  apellido?: string;
  telefono?: string | null;
  estado?: EstadoUsuario;
  id_role?: number;
}

/**
 * Rol disponible, usado para poblar el menú desplegable del formulario.
 */
export interface Rol {
  id_rol: number;
  nombre: string;
  descripcion: string | null;
}

/**
 * Respuesta simple del backend para operaciones sin entidad de retorno
 * (por ejemplo, la inactivación lógica).
 */
export interface MensajeRespuesta {
  mensaje: string;
}
