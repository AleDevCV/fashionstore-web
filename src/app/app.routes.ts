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
    // CU04 - Solicitud de recuperación de contraseña ("Olvidé mi contraseña")
    path: 'recuperar-password',
    canActivate: [invitadoGuard],
    title: 'Recuperar contraseña · FashionStore',
    loadComponent: () =>
      import('./features/auth/recuperar-password/recuperar-password').then(
        (m) => m.RecuperarPassword,
      ),
  },
  {
    // CU04 - Restablecimiento de contraseña mediante token temporal
    path: 'restablecer-password',
    canActivate: [invitadoGuard],
    title: 'Restablecer contraseña · FashionStore',
    loadComponent: () =>
      import('./features/auth/restablecer-password/restablecer-password').then(
        (m) => m.RestablecerPassword,
      ),
  },
  {
    // CU05 / CU01 - Registro de nuevo cliente (auto-registro público)
    path: 'registro',
    canActivate: [invitadoGuard],
    title: 'Crear cuenta · FashionStore',
    loadComponent: () =>
      import('./features/auth/registro/registro').then((m) => m.Registro),
  },
  {
    // Alias de conveniencia para la ruta de registro
    path: 'registro-cliente',
    redirectTo: 'registro',
  },
  {
    // CU01 / CU14 - Inicio de sesión exclusivo para clientes
    path: 'login-cliente',
    canActivate: [invitadoGuard],
    title: 'Iniciar sesión · FashionStore Clientes',
    loadComponent: () =>
      import('./features/auth/login-cliente/login-cliente').then((m) => m.LoginCliente),
  },
  {
    // Alias alternativo para inicio de sesión de clientes
    path: 'cliente-login',
    redirectTo: 'login-cliente',
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
        canActivate: [rolGuard(['Administrador'], 'Usuarios y Roles')],
        title: 'Usuarios y Roles · FashionStore',
        loadComponent: () =>
          import('./features/usuarios/usuarios').then((m) => m.Usuarios),
      },
      {
        // CU03 - Matriz de Roles y Permisos (RBAC granular).
        // Restringido exclusivamente al Administrador.
        path: 'roles-permisos',
        canActivate: [rolGuard(['Administrador'], 'Roles y Permisos')],
        title: 'Roles y Permisos · FashionStore',
        loadComponent: () =>
          import('./features/admin/roles-permisos/roles-permisos').then(
            (m) => m.RolesPermisos,
          ),
      },
      {
        // CU05 - Fichas de clientes. Accesible para cualquier sesión activa:
        // el Cajero registra y consulta fichas en el mostrador, por lo que
        // esta sección no restringe el rol en el frontend.
        path: 'clientes',
        title: 'Clientes · FashionStore',
        loadComponent: () =>
          import('./features/clientes/clientes').then((m) => m.Clientes),
      },
      {
        // CU06 - Ciudades y sucursales. Solo el Administrador ve la sección:
        // las altas y ediciones exigen ese rol en el backend.
        path: 'sucursales',
        canActivate: [rolGuard(['Administrador'], 'Sucursales')],
        title: 'Sucursales · FashionStore',
        loadComponent: () =>
          import('./features/sucursales/sucursales').then((m) => m.Sucursales),
      },
      {
        // CU07 - Categorías de prendas. Accesible para cualquier sesión activa:
        // el Encargado de Sucursal también organiza la clasificación del
        // inventario que gestiona, por lo que no se restringe el rol.
        path: 'categorias',
        title: 'Categorías · FashionStore',
        loadComponent: () =>
          import('./features/categorias/categorias').then((m) => m.Categorias),
      },
      {
        // CU08 - Prendas del catálogo. Solo el Administrador edita el catálogo
        // maestro y su matriz de variantes.
        path: 'prendas',
        canActivate: [rolGuard(['Administrador'], 'Prendas')],
        title: 'Prendas · FashionStore',
        loadComponent: () =>
          import('./features/prendas/prendas').then((m) => m.Prendas),
      },
      {
        // CU09 - Gestión de Temporadas y Colecciones
        path: 'temporadas',
        canActivate: [rolGuard(['Administrador', 'Encargado de Sucursal'], 'Temporadas')],
        title: 'Temporadas y Colecciones · FashionStore',
        loadComponent: () =>
          import('./features/temporadas/temporadas').then((m) => m.Temporadas),
      },
      {
        // CU10 - Monitoreo de Inventario Multisucursal
        path: 'inventario/monitoreo',
        canActivate: [rolGuard(['Administrador', 'Encargado de Sucursal'], 'Monitoreo de Inventario')],
        title: 'Monitoreo de Inventario · FashionStore',
        loadComponent: () =>
          import('./features/inventario-monitoreo/inventario-monitoreo').then(
            (m) => m.InventarioMonitoreo,
          ),
      },
      {
        // CU10 - Alias alternativo
        path: 'monitoreo-inventario',
        redirectTo: 'inventario/monitoreo',
      },
      {
        // CU12 - Directorio de Proveedores
        path: 'proveedores',
        canActivate: [rolGuard(['Administrador', 'Encargado de Sucursal'], 'Proveedores')],
        title: 'Proveedores · FashionStore',
        loadComponent: () =>
          import('./features/proveedores/proveedores').then((m) => m.Proveedores),
      },
      {
        // CU11 - Movimientos de Inventario
        path: 'movimientos-inventario',
        canActivate: [rolGuard(['Administrador', 'Encargado de Sucursal'], 'Movimientos de Inventario')],
        title: 'Movimientos de Inventario · FashionStore',
        loadComponent: () =>
          import('./features/inventario-movimientos/movimientos').then((m) => m.Movimientos),
      },
      {
        // CU11 - Alias alternativo para concordancia exacta de URLs
        path: 'inventario/movimientos',
        redirectTo: 'movimientos-inventario',
      },
      {
        // CU13 - Historial de Compras
        path: 'compras',
        canActivate: [rolGuard(['Administrador', 'Encargado de Sucursal'], 'Compras')],
        title: 'Compras · FashionStore',
        loadComponent: () =>
          import('./features/compras/compras').then((m) => m.Compras),
      },
      {
        // CU13 - Formulario de Adquisición Transaccional
        path: 'compras/nueva',
        canActivate: [rolGuard(['Administrador', 'Encargado de Sucursal'], 'Registro de Compras')],
        title: 'Nueva Compra · FashionStore',
        loadComponent: () =>
          import('./features/compras/compra-nueva/compra-nueva').then((m) => m.CompraNueva),
      },
      {
        // CU22 - Asistente y Recomendador Virtual de Moda con IA (Gemini)
        path: 'ia/asistente-moda',
        title: 'Asistente de Moda IA · FashionStore',
        loadComponent: () =>
          import('./features/ia/asistente-moda/asistente-moda').then((m) => m.AsistenteModa),
      },
      {
        // CU22 - Alias de ruta
        path: 'ia/recomendador',
        redirectTo: 'ia/asistente-moda',
      },
      {
        // CU23 - Consultas Analíticas Ejecutivas por Voz con IA
        path: 'ia/analitica-voz',
        canActivate: [rolGuard(['Administrador', 'Encargado de Sucursal'], 'Analítica por Voz')],
        title: 'Analítica por Voz · FashionStore',
        loadComponent: () =>
          import('./features/ia/analitica-voz/analitica-voz').then((m) => m.AnaliticaVoz),
      },
    ],
  },
  {
    // CU14 - Catálogo público. Vive FUERA del layout administrativo y sin
    // guardián de sesión: un visitante puede explorar la vitrina antes de
    // autenticarse. El endpoint /api/catalogo no exige token.
    path: 'catalogo',
    title: 'Catálogo · FashionStore',
    loadComponent: () =>
      import('./features/catalogo/catalogo').then((m) => m.Catalogo),
  },
  {
    // Cualquier ruta desconocida vuelve al inicio.
    path: '**',
    redirectTo: '',
  },
];
