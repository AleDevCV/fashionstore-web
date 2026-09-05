/**
 * =============================================================================
 * FASHIONSTORE - TABLA DE RUTAS DE LA APLICACIÓN
 * -----------------------------------------------------------------------------
 * Todas las vistas se cargan de forma diferida (`loadComponent`) para que el
 * paquete inicial que descarga el navegador sea lo más liviano posible (RNF02).
 *
 * Estructura:
 *   /login              -> pantalla de acceso (CU01)
 *   /panel              -> layout administrativo, protegido por authGuard
 *     /panel/inicio     -> bienvenida
 *     /panel/usuarios   -> gestión de usuarios y roles (CU02), solo Administrador
 * =============================================================================
 */

import { Routes } from '@angular/router';

import { authGuard, invitadoGuard } from './core/guards/auth.guard';
import { rolGuard } from './core/guards/rol.guard';

export const routes: Routes = [
  {
    // Ruta por defecto: envía al login, que a su vez redirige al panel si ya
    // existe una sesión activa (gracias a invitadoGuard).
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    // CU01 - Pantalla de inicio de sesión
    path: 'login',
    canActivate: [invitadoGuard],
    title: 'Iniciar sesión · FashionStore',
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    // Layout administrativo: sidebar + cabecera. Todas sus rutas hijas quedan
    // protegidas por authGuard, que exige un token JWT vigente.
    path: 'panel',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout').then((m) => m.Layout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'inicio',
      },
      {
        path: 'inicio',
        title: 'Panel · FashionStore',
        loadComponent: () =>
          import('./features/panel/panel').then((m) => m.Panel),
      },
      {
        // CU02 - Administrar usuarios y asignar roles.
        // Doble barrera: authGuard (heredado del padre) exige sesión, y
        // rolGuard restringe la sección al rol "Administrador". El backend
        // aplica la misma regla con `requiere_rol`, que es la que realmente
        // protege los datos.
        path: 'usuarios',
        canActivate: [rolGuard(['Administrador'])],
        title: 'Usuarios y Roles · FashionStore',
        loadComponent: () =>
          import('./features/usuarios/usuarios').then((m) => m.Usuarios),
      },
    ],
  },
  {
    // Cualquier ruta desconocida vuelve al inicio.
    path: '**',
    redirectTo: '',
  },
];
