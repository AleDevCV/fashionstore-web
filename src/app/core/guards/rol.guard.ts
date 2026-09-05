/**
 * =============================================================================
 * FASHIONSTORE - GUARDIÁN DE AUTORIZACIÓN POR ROL (RBAC EN EL FRONTEND)
 * -----------------------------------------------------------------------------
 * Impide que un usuario autenticado alcance una sección para la que no tiene
 * privilegios, incluso si escribe la URL directamente en el navegador.
 *
 * IMPORTANTE — ESTE GUARDIÁN NO ES UNA MEDIDA DE SEGURIDAD REAL:
 * el código de Angular vive en el navegador y cualquiera puede manipularlo. La
 * autorización que de verdad protege los datos es la del backend, donde
 * `requiere_rol(["Administrador"])` responde 403 a toda petición no autorizada.
 * Lo que aporta este guardián es EXPERIENCIA DE USUARIO: evita mostrar una
 * pantalla vacía que acabaría fallando con un error del servidor.
 * =============================================================================
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { NotificacionService } from '../services/notificacion.service';

/**
 * Fábrica de guardianes: construye un `CanActivateFn` restringido a los roles
 * indicados.
 *
 * Uso en la tabla de rutas:
 *     { path: 'usuarios', canActivate: [rolGuard(['Administrador'])], ... }
 *
 * @param rolesPermitidos Nombres de rol autorizados, tal como figuran en la
 *                        columna `rol.nombre` de PostgreSQL.
 * @returns CanActivateFn que concede o deniega el acceso a la ruta.
 */
export const rolGuard = (rolesPermitidos: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const notificacion = inject(NotificacionService);
    const router = inject(Router);

    const rol = authService.obtenerRol();

    // Acceso concedido: el rol de la sesión está en la lista de permitidos.
    if (rol !== null && rolesPermitidos.includes(rol)) {
      return true;
    }

    // Acceso denegado: se avisa al usuario y se lo devuelve al inicio del
    // panel. No se cierra la sesión, porque el problema no es la autenticación
    // sino la falta de privilegios.
    notificacion.aviso(
      'No tiene permisos para acceder a la sección "Usuarios y Roles".',
    );
    router.navigate(['/panel/inicio']);
    return false;
  };
};
