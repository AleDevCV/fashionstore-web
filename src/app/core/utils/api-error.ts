/**
 * =============================================================================
 * FASHIONSTORE - TRADUCTOR DE ERRORES DE LA API
 * -----------------------------------------------------------------------------
 * Convierte una HttpErrorResponse de FastAPI en un Error con un mensaje que se
 * puede mostrar tal cual en pantalla.
 *
 * Se centraliza aquí para que los cinco servicios de la Iteración 1 no repitan
 * la misma cadena de `switch` y para que los textos sean coherentes en toda la
 * aplicación.
 * =============================================================================
 */

import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

/**
 * Extrae un texto legible del error 422 de validación de Pydantic.
 *
 * FastAPI responde con `detail` como arreglo de objetos
 * `{ loc: [...], msg: '...' }`. Se toma el primero, que basta para orientar al
 * usuario sobre qué campo debe corregir.
 *
 * @param error Respuesta de error con código 422.
 * @returns Mensaje de validación legible.
 */
function extraerErrorDeValidacion(error: HttpErrorResponse): string {
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

/**
 * Traduce un error HTTP a un Error con mensaje presentable.
 *
 * Se prioriza siempre la clave `detail` del backend: ahí viajan los textos
 * literales de las excepciones de cada caso de uso (cédula duplicada, SKU
 * repetido, categoría con subcategorías activas, etc.).
 *
 * El código 401 no recibe tratamiento especial porque el `authInterceptor` ya
 * lo intercepta antes: cierra la sesión y redirige al login.
 *
 * @param error Error emitido por HttpClient.
 * @returns Observable que emite un Error con el mensaje ya traducido.
 */
export function traducirErrorApi(error: HttpErrorResponse): Observable<never> {
  let mensaje: string;

  switch (error.status) {
    case 0:
      // status 0 = el navegador no logró contactar al servidor (API apagada
      // o petición bloqueada por CORS).
      mensaje =
        'No se pudo contactar con el servidor. Verifique que el backend esté activo.';
      break;

    case 403:
      mensaje =
        error.error?.detail ?? 'No tiene permisos para realizar esta acción.';
      break;

    case 404:
      mensaje = error.error?.detail ?? 'El registro solicitado no existe.';
      break;

    case 400:
    case 409:
      // El backend explica aquí la regla de negocio que se incumplió.
      mensaje = error.error?.detail ?? 'La operación no pudo completarse.';
      break;

    case 422:
      mensaje = extraerErrorDeValidacion(error);
      break;

    default:
      mensaje =
        error.error?.detail ??
        'Ocurrió un error inesperado. Intente nuevamente.';
  }

  return throwError(() => new Error(mensaje));
}
