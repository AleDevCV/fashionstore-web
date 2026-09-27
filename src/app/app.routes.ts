/**
 * =============================================================================
 * FASHIONSTORE - TABLA DE RUTAS DE LA APLICACIÃ“N
 * -----------------------------------------------------------------------------
 * Todas las vistas se cargan de forma diferida (`loadComponent`) para que el
 * paquete inicial que descarga el navegador sea lo mÃ¡s liviano posible (RNF02).
 *
 * Estructura:
 *   /login              -> pantalla de acceso (CU01)
 *   /panel              -> layout administrativo, protegido por authGuard
 *     /panel/inicio     -> bienvenida
 *     /panel/usuarios   -> gestiÃ³n de usuarios y roles (CU02), solo Administrador
 * =============================================================================
 */

import { Routes } from '@angular/router';

import { authGuard, invitadoGuard } from './core/guards/auth.guard';
import { rolGuard } from './core/guards/rol.guard';
import { ROLES } from './core/models/auth.model';

export const routes: Routes = [
    {
      path: 'probador-mobile/:id',
      loadComponent: () => import('./features/probador-mobile').then(m => m.ProbadorMobile)
    },
  {
    // Ruta por defecto: envÃ­a al login, que a su vez redirige al panel si ya
    // existe una sesiÃ³n activa (gracias a invitadoGuard).
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    // CU01 - Pantalla de inicio de sesiÃ³n
    path: 'login',
    canActivate: [invitadoGuard],
    title: 'Iniciar sesiÃ³n Â· FashionStore',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    // CU04 - Solicitud de recuperaciÃ³n de contraseÃ±a ("OlvidÃ© mi contraseÃ±a")
    path: 'recuperar-password',
    canActivate: [invitadoGuard],
    title: 'Recuperar contraseÃ±a Â· FashionStore',
    loadComponent: () =>
      import('./features/auth/recuperar-password/recuperar-password').then(
        (m) => m.RecuperarPassword,
      ),
  },
  {
    // CU04 - Restablecimiento de contraseÃ±a mediante token temporal
    path: 'restablecer-password',
    canActivate: [invitadoGuard],
    title: 'Restablecer contraseÃ±a Â· FashionStore',
    loadComponent: () =>
      import('./features/auth/restablecer-password/restablecer-password').then(
        (m) => m.RestablecerPassword,
      ),
  },
  {
    // CU05 / CU01 - Registro de nuevo cliente (auto-registro pÃºblico)
    path: 'registro',
    canActivate: [invitadoGuard],
    title: 'Crear cuenta Â· FashionStore',
    loadComponent: () => import('./features/auth/registro/registro').then((m) => m.Registro),
  },
  {
    // Alias de conveniencia para la ruta de registro
    path: 'registro-cliente',
    redirectTo: 'registro',
  },
  {
    // CU01 / CU14 - Inicio de sesiÃ³n exclusivo para clientes
    path: 'login-cliente',
    canActivate: [invitadoGuard],
    title: 'Iniciar sesiÃ³n Â· FashionStore Clientes',
    loadComponent: () =>
      import('./features/auth/login-cliente/login-cliente').then((m) => m.LoginCliente),
  },
  {
    // Alias alternativo para inicio de sesiÃ³n de clientes
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
        redirectTo: 'dashboard',
      },
      {
        path: 'inicio',
        title: 'Panel Â· FashionStore',
        loadComponent: () => import('./features/panel/panel').then((m) => m.Panel),
      },
      {
        // CU24 - Dashboard de Indicadores y KPIs Gerenciales
        path: 'dashboard',
        canActivate: [rolGuard(['Administrador', 'Encargado de Sucursal'], 'Dashboard Gerencial')],
        title: 'Dashboard de Indicadores y KPIs Â· FashionStore',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'kpis',
        redirectTo: 'dashboard',
      },
      {
        // CU25 - BitÃ¡cora de AuditorÃ­a del Sistema (Trazabilidad Forense)
        path: 'bitacora',
        canActivate: [rolGuard(['Administrador'], 'BitÃ¡cora de AuditorÃ­a')],
        title: 'BitÃ¡cora de AuditorÃ­a Â· FashionStore',
        loadComponent: () => import('./features/bitacora/bitacora').then((m) => m.Bitacora),
      },
      {
        // CU02 - Administrar usuarios y asignar roles.
        // Doble barrera: authGuard (heredado del padre) exige sesiÃ³n, y
        // rolGuard restringe la secciÃ³n al rol "Administrador". El backend
        // aplica la misma regla con `requiere_rol`, que es la que realmente
        // protege los datos.
        path: 'usuarios',
        canActivate: [rolGuard(['Administrador'], 'Usuarios y Roles')],
        title: 'Usuarios y Roles Â· FashionStore',
        loadComponent: () => import('./features/usuarios/usuarios').then((m) => m.Usuarios),
      },
      {
        // CU03 - Matriz de Roles y Permisos (RBAC granular).
        // Restringido exclusivamente al Administrador.
        path: 'roles-permisos',
        canActivate: [rolGuard(['Administrador'], 'Roles y Permisos')],
        title: 'Roles y Permisos Â· FashionStore',
        loadComponent: () =>
          import('./features/admin/roles-permisos/roles-permisos').then((m) => m.RolesPermisos),
      },
      {
        // CU05 - El personal autorizado usa la gestiÃ³n administrativa y el
        // Cliente accede a la misma ruta en modo de autogestiÃ³n de su ficha.
        path: 'clientes',
        canActivate: [
          rolGuard(
            [ROLES.ADMINISTRADOR, ROLES.ENCARGADO, ROLES.CAJERO, ROLES.CLIENTE],
            'Fichas de Clientes',
          ),
        ],
        title: 'Clientes Â· FashionStore',
        loadComponent: () => import('./features/clientes/clientes').then((m) => m.Clientes),
      },
      {
        // CU06 - Ciudades y sucursales. Solo el Administrador ve la secciÃ³n:
        // las altas y ediciones exigen ese rol en el backend.
        path: 'sucursales',
        canActivate: [rolGuard(['Administrador'], 'Sucursales')],
        title: 'Sucursales Â· FashionStore',
        loadComponent: () => import('./features/sucursales/sucursales').then((m) => m.Sucursales),
      },
      {
        // CU07 - GestiÃ³n administrativa de categorÃ­as, exclusiva del Administrador.
        // El catÃ¡logo pÃºblico obtiene sus filtros desde /api/catalogo/filtros.
        path: 'categorias',
        canActivate: [rolGuard([ROLES.ADMINISTRADOR], 'CategorÃ­as de Prendas')],
        title: 'CategorÃ­as Â· FashionStore',
        loadComponent: () => import('./features/categorias/categorias').then((m) => m.Categorias),
      },
      {
        // CU08 - Prendas del catÃ¡logo. Solo el Administrador edita el catÃ¡logo
        // maestro y su matriz de variantes.
        path: 'prendas',
        canActivate: [rolGuard(['Administrador'], 'Prendas')],
        title: 'Prendas Â· FashionStore',
        loadComponent: () => import('./features/prendas/prendas').then((m) => m.Prendas),
      },
      {
        // CU09 - GestiÃ³n de Temporadas y Colecciones
        path: 'temporadas',
        canActivate: [rolGuard(['Administrador', 'Encargado de Sucursal'], 'Temporadas')],
        title: 'Temporadas y Colecciones Â· FashionStore',
        loadComponent: () => import('./features/temporadas/temporadas').then((m) => m.Temporadas),
      },
      {
        // CU10 - Monitoreo de Inventario Multisucursal
        path: 'inventario/monitoreo',
        canActivate: [
          rolGuard(['Administrador', 'Encargado de Sucursal'], 'Monitoreo de Inventario'),
        ],
        title: 'Monitoreo de Inventario Â· FashionStore',
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
        title: 'Proveedores Â· FashionStore',
        loadComponent: () =>
          import('./features/proveedores/proveedores').then((m) => m.Proveedores),
      },
      {
        // CU11 - Movimientos de Inventario
        path: 'movimientos-inventario',
        canActivate: [
          rolGuard(['Administrador', 'Encargado de Sucursal'], 'Movimientos de Inventario'),
        ],
        title: 'Movimientos de Inventario Â· FashionStore',
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
        title: 'Compras Â· FashionStore',
        loadComponent: () => import('./features/compras/compras').then((m) => m.Compras),
      },
      {
        // CU13 - Formulario de AdquisiciÃ³n Transaccional
        path: 'compras/nueva',
        canActivate: [rolGuard(['Administrador', 'Encargado de Sucursal'], 'Registro de Compras')],
        title: 'Nueva Compra Â· FashionStore',
        loadComponent: () =>
          import('./features/compras/compra-nueva/compra-nueva').then((m) => m.CompraNueva),
      },
      {
        // CU22 - Asistente y Recomendador Virtual de Moda con IA (Gemini)
        path: 'ia/asistente-moda',
        title: 'Asistente de Moda IA Â· FashionStore',
        loadComponent: () =>
          import('./features/ia/asistente-moda/asistente-moda').then((m) => m.AsistenteModa),
      },
      {
        // CU22 - Alias de ruta
        path: 'ia/recomendador',
        redirectTo: 'ia/asistente-moda',
      },
      {
        // CU23 - Consultas AnalÃ­ticas Ejecutivas por Voz con IA
        path: 'ia/analitica-voz',
        canActivate: [rolGuard(['Administrador', 'Encargado de Sucursal'], 'AnalÃ­tica por Voz')],
        title: 'AnalÃ­tica por Voz Â· FashionStore',
        loadComponent: () =>
          import('./features/ia/analitica-voz/analitica-voz').then((m) => m.AnaliticaVoz),
      },
      {
        // CU17 - AtenciÃ³n de Reservas en Sucursal y Probadores FÃ­sicos
        path: 'reservas-atencion',
        canActivate: [
          rolGuard(['Administrador', 'Encargado de Sucursal', 'Cajero'], 'AtenciÃ³n de Reservas'),
        ],
        title: 'AtenciÃ³n de Reservas Â· FashionStore',
        loadComponent: () =>
          import('./features/reservas-atencion/reservas-atencion').then((m) => m.ReservasAtencion),
      },
      {
        path: 'reservas',
        redirectTo: 'reservas-atencion',
      },
      {
        // CU19 - Terminal POS de Ventas Presenciales y Caja
        path: 'pos',
        canActivate: [
          rolGuard(['Administrador', 'Encargado de Sucursal', 'Cajero'], 'Terminal POS'),
        ],
        title: 'Terminal POS Â· FashionStore',
        loadComponent: () => import('./features/pos/pos').then((m) => m.Pos),
      },
      {
        path: 'caja',
        redirectTo: 'pos',
      },
    ],
  },
  {
    // CU14 - CatÃ¡logo pÃºblico. Vive FUERA del layout administrativo y sin
    // guardiÃ¡n de sesiÃ³n: un visitante puede explorar la vitrina antes de
    // autenticarse. El endpoint /api/catalogo no exige token.
    path: 'catalogo',
    title: 'CatÃ¡logo Â· FashionStore',
    loadComponent: () => import('./features/catalogo/catalogo').then((m) => m.Catalogo),
  },
  {
    // CU15 - Checkout Digital (carrito â†’ reserva â†’ pago â†’ comprobante)
    path: 'checkout',
    title: 'Checkout Â· FashionStore',
    loadComponent: () => import('./features/checkout/checkout').then((m) => m.Checkout),
  },
  {
    // CU20 - Retorno exitoso de Stripe
    path: 'pago/exitoso',
    title: 'Pago Confirmado Â· FashionStore',
    loadComponent: () =>
      import('./features/pago/pago-exitoso/pago-exitoso').then((m) => m.PagoExitoso),
  },
  {
    // CU20 - Retorno cancelado de Stripe
    path: 'pago/cancelado',
    title: 'Pago Cancelado Â· FashionStore',
    loadComponent: () =>
      import('./features/pago/pago-cancelado/pago-cancelado').then((m) => m.PagoCancelado),
  },
  {
    // CU15 - Historial de pedidos del cliente
    path: 'mi-cuenta/pedidos',
    title: 'Mis Pedidos Â· FashionStore',
    loadComponent: () =>
      import('./features/cliente/mis-pedidos/mis-pedidos').then((m) => m.MisPedidos),
  },
  {
    // Cualquier ruta desconocida vuelve al inicio.
    path: '**',
    redirectTo: '',
  },
];

