/**
 * =============================================================================
 * FASHIONSTORE - INTERCEPTOR HTTP DE AUTENTICACIÓN
 * -----------------------------------------------------------------------------
 * Intercepta todas las peticiones salientes de HttpClient e inyecta el token
 * JWT en la cabecera `Authorization: Bearer <token>`, evitando tener que
 * añadirlo manualmente en cada servicio del panel administrativo.
 *
 * Se implementa como interceptor funcional (`HttpInterceptorFn`), el enfoque
 * recomendado en Angular moderno con componentes standalone.
 * =============================================================================
 */

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

/**
 * Añade la cabecera de autorización a las peticiones que la necesiten.
 *
 * @param solicitud Petición HTTP saliente generada por HttpClient.
 * @param siguiente Función que continúa la cadena de interceptores.
 * @returns Observable con el evento HTTP resultante.
 *
 * Reglas aplicadas:
 *   1. La petición de login se deja pasar intacta: todavía no existe token.
 *   2. Si no hay token guardado, o si está expirado, la petición sale sin
 *      cabecera de autorización.
 *   3. Ante una respuesta 401 del servidor se cierra la sesión y se redirige
 *      al login, cubriendo el caso de un token vencido en pleno uso.
 */
export const authInterceptor: HttpInterceptorFn = (solicitud, siguiente) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. Los endpoints públicos (login y recuperación de contraseñas CU04) quedan
  //    excluidos: no requieren token saliente y no deben forzar logout ante un 401.
  const esPeticionDeLogin = solicitud.url.includes('/api/login');
  const esPeticionRecuperacion =
    solicitud.url.includes('/api/auth/recuperar-password') ||
    solicitud.url.includes('/api/auth/verificar-token-recuperacion') ||
    solicitud.url.includes('/api/auth/restablecer-password');

  const esPeticionExcluida = esPeticionDeLogin || esPeticionRecuperacion;

  const token = authService.obtenerToken();

  // 2. Solo se clona la petición si hay un token vigente que adjuntar y no es excluida.
  //    Las peticiones de HttpClient son inmutables: para modificarlas hay que
  //    crear una copia con clone().
  const solicitudFinal =
    !esPeticionExcluida && token && !authService.tokenExpirado(token)
      ? solicitud.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        })
      : solicitud;

  return siguiente(solicitudFinal).pipe(
    catchError((error: HttpErrorResponse) => {
      // 3. Un 401 fuera de los endpoints públicos significa que el token dejó
      //    de ser válido (expiró o fue revocado): se limpia la sesión y se vuelve al login.
      if (error.status === 401 && !esPeticionExcluida) {
        authService.logout();
        router.navigate(['/login']);
      }

      // El error se vuelve a lanzar para que cada servicio pueda manejarlo.
      return throwError(() => error);
    }),
  );
};
