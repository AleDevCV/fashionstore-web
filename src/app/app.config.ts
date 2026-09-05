/**
 * =============================================================================
 * FASHIONSTORE - CONFIGURACIÓN RAÍZ DE LA APLICACIÓN
 * -----------------------------------------------------------------------------
 * Registra los proveedores globales que necesita el panel administrativo:
 * enrutador, cliente HTTP e interceptor de autenticación JWT.
 * =============================================================================
 */

import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Enrutador con enlace automático de parámetros de ruta a inputs del
    // componente, útil para las vistas de detalle de los próximos casos de uso.
    provideRouter(routes, withComponentInputBinding()),

    // Cliente HTTP con el interceptor que inyecta la cabecera
    // `Authorization: Bearer <token>` en cada petición saliente.
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
