/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE ADMINISTRACIÓN DE USUARIOS (CU02)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Consume los endpoints protegidos de /api/usuarios/ del backend en FastAPI.
 *
 * No añade la cabecera `Authorization` manualmente: de eso se encarga el
 * `authInterceptor`, que inyecta el token JWT en toda petición saliente.
 * =============================================================================
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  MensajeRespuesta,
  Rol,
  Usuario,
  UsuarioActualizar,
  UsuarioCrear,
} from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);

  /** Ruta base del módulo de usuarios en el backend. */
  private readonly baseUrl = `${environment.apiUrl}/api/usuarios`;

  // ---------------------------------------------------------------------------
  // CONSULTAS
  // ---------------------------------------------------------------------------

  /**
   * Recupera la lista completa de usuarios con su rol asociado.
   * Corresponde al paso 2 del flujo principal del CU02.
   *
   * @returns Observable con el arreglo de usuarios; emite Error con mensaje
   *          legible si la petición falla.
   */
  listar(): Observable<Usuario[]> {
    return this.http
      .get<Usuario[]>(`${this.baseUrl}/`)
      .pipe(catchError((error) => this.traducirError(error)));
  }

  /**
   * Recupera los roles definidos en la tabla `rol`.
   * Alimenta el menú desplegable del formulario de alta y edición.
   *
   * @returns Observable con el arreglo de roles disponibles.
   */
  listarRoles(): Observable<Rol[]> {
    return this.http
      .get<Rol[]>(`${this.baseUrl}/roles`)
      .pipe(catchError((error) => this.traducirError(error)));
  }

  // ---------------------------------------------------------------------------
  // ESCRITURA
  // ---------------------------------------------------------------------------

  /**
   * Registra un nuevo usuario en el sistema.
   * Corresponde a los pasos 7 y 8 del flujo principal del CU02.
   *
   * @param datos Nombre, apellido, correo, contraseña temporal, teléfono y rol.
   * @returns Observable con el usuario creado (respuesta HTTP 201).
   *          Ante un correo duplicado, el backend responde 400 y aquí se
   *          convierte en un Error con el texto exacto de la excepción A.
   */
  crear(datos: UsuarioCrear): Observable<Usuario> {
    return this.http
      .post<Usuario>(`${this.baseUrl}/`, datos)
      .pipe(catchError((error) => this.traducirError(error)));
  }

  /**
   * Actualiza parcialmente los datos de un usuario existente.
   *
   * @param idUsuario Clave primaria del usuario a modificar.
   * @param datos Campos a cambiar; los omitidos quedan intactos en la base.
   * @returns Observable con el usuario ya actualizado.
   */
  actualizar(idUsuario: number, datos: UsuarioActualizar): Observable<Usuario> {
    return this.http
      .put<Usuario>(`${this.baseUrl}/${idUsuario}`, datos)
      .pipe(catchError((error) => this.traducirError(error)));
  }

  /**
   * Inhabilita un usuario mediante borrado lógico.
   *
   * El backend NO borra la fila: cambia su estado a 'Inactivo' para preservar
   * la integridad referencial con ventas, movimientos de inventario y bitácora.
   *
   * @param idUsuario Clave primaria del usuario a inhabilitar.
   * @returns Observable con el mensaje de confirmación del backend.
   */
  inhabilitar(idUsuario: number): Observable<MensajeRespuesta> {
    return this.http
      .delete<MensajeRespuesta>(`${this.baseUrl}/${idUsuario}`)
      .pipe(catchError((error) => this.traducirError(error)));
  }

  // ---------------------------------------------------------------------------
  // AUXILIAR PRIVADO
  // ---------------------------------------------------------------------------

  /**
   * Convierte un error HTTP en un Error con mensaje presentable en pantalla.
   *
   * FastAPI devuelve el motivo en la clave `detail`, así que se prioriza ese
   * texto: es el que contiene los mensajes literales del CU02, como
   * "El correo electrónico ya se encuentra registrado".
   *
   * El código 401 no se traduce con detalle porque el `authInterceptor` ya lo
   * intercepta antes: cierra la sesión y redirige al login.
   *
   * @param error Error emitido por HttpClient.
   * @returns Observable que emite un Error con el mensaje traducido.
   */
  private traducirError(error: HttpErrorResponse): Observable<never> {
    let mensaje: string;

    switch (error.status) {
      case 0:
        mensaje =
          'No se pudo contactar con el servidor. Verifique que el backend esté activo.';
        break;

      case 403:
        mensaje = 'No tiene permisos para realizar esta acción.';
        break;

      case 404:
        mensaje = 'El usuario solicitado no existe.';
        break;

      case 409:
        mensaje = error.error?.detail ?? 'El usuario ya se encuentra inhabilitado.';
        break;

      case 422:
        // Error de validación de Pydantic: llega como un arreglo de detalles.
        mensaje = this.extraerErrorDeValidacion(error);
        break;

      default:
        mensaje =
          error.error?.detail ??
          'Ocurrió un error inesperado. Intente nuevamente.';
    }

    return throwError(() => new Error(mensaje));
  }

  /**
   * Extrae un texto legible del error 422 de Pydantic.
   *
   * FastAPI responde con `detail` como arreglo de objetos
   * `{ loc: [...], msg: '...' }`. Se toma el primero, que basta para orientar
   * al administrador sobre qué campo corregir.
   *
   * @param error Respuesta de error con código 422.
   * @returns Mensaje de validación legible.
   */
  private extraerErrorDeValidacion(error: HttpErrorResponse): string {
    const detalle = error.error?.detail;

    if (Array.isArray(detalle) && detalle.length > 0) {
      const primero = detalle[0];
      // `loc` es la ruta al campo, por ejemplo ['body', 'correo'].
      const campo = Array.isArray(primero.loc)
        ? primero.loc[primero.loc.length - 1]
        : 'dato';
      return `Revise el campo "${campo}": ${primero.msg ?? 'valor no válido'}.`;
    }

    return 'Los datos enviados no tienen el formato esperado.';
  }
}
