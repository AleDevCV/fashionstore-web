/**
 * =============================================================================
 * FASHIONSTORE - TABLA DE RUTAS DE LA APLICACIÓN
 * -----------------------------------------------------------------------------
 * Todas las vistas se cargan de forma diferida (`loadComponent`) para que el
 * paquete inicial que descarga el navegador sea lo más liviano posible (RNF02).
 * =============================================================================
 */

import { Routes } from '@angular/router';

import { authGuard, invitadoGuard } from './core/guards/auth.guard';

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
    // Panel administrativo (provisional). Protegido: exige token JWT vigente.
    path: 'panel',
    canActivate: [authGuard],
    title: 'Panel · FashionStore',
    loadComponent: () =>
      import('./features/panel/panel').then((m) => m.Panel),
  },
  {
    // Cualquier ruta desconocida vuelve al inicio.
    path: '**',
    redirectTo: '',
  },
];
