/**
 * =============================================================================
 * FASHIONSTORE - LAYOUT DEL PANEL ADMINISTRATIVO
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Contenedor base de todas las vistas internas: sidebar de navegación a la
 * izquierda, cabecera superior con los datos de sesión y un área central donde
 * el enrutador inyecta la vista activa.
 *
 * Incluye además el contenedor de notificaciones emergentes, que se renderiza
 * aquí para estar disponible en cualquier sección del panel.
 * =============================================================================
 */

import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/services/auth.service';
import { NotificacionService } from '../core/services/notificacion.service';

/** Entrada del menú lateral. */
interface ItemMenu {
  /** Texto visible del enlace. */
  etiqueta: string;

  /** Caso de uso al que corresponde, mostrado como referencia académica. */
  caso: string;

  /** Ruta destino; null si la sección todavía no está implementada. */
  ruta: string | null;

  /**
   * Roles autorizados a VER la entrada. Si es null, la ve cualquier usuario
   * con sesión activa.
   */
  roles: string[] | null;
}

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  private readonly authService = inject(AuthService);
  private readonly notificacion = inject(NotificacionService);
  private readonly router = inject(Router);

  /** Datos del usuario autenticado, leídos del payload del JWT. */
  readonly usuario = this.authService.usuarioActual;

  /** Avisos emergentes activos. */
  readonly avisos = this.notificacion.avisos;

  /**
   * Definición completa del menú de la Iteración 1.
   *
   * Las secciones aún no construidas llevan `ruta: null` y se pintan
   * deshabilitadas, en lugar de enlazar a una pantalla inexistente.
   */
  private readonly menuCompleto: ItemMenu[] = [
    { etiqueta: 'Inicio', caso: '', ruta: '/panel/inicio', roles: null },
    {
      etiqueta: 'Usuarios y Roles',
      caso: 'CU02',
      ruta: '/panel/usuarios',
      // Solo el Administrador ve esta entrada (RBAC visual).
      roles: ['Administrador'],
    },
    { etiqueta: 'Clientes', caso: 'CU05', ruta: null, roles: null },
    { etiqueta: 'Sucursales', caso: 'CU06', ruta: null, roles: null },
    { etiqueta: 'Categorías', caso: 'CU07', ruta: null, roles: null },
    { etiqueta: 'Prendas', caso: 'CU08', ruta: null, roles: null },
    { etiqueta: 'Catálogo', caso: 'CU14', ruta: null, roles: null },
  ];

  /**
   * Menú filtrado según el rol de la sesión activa.
   *
   * Es una señal derivada: si el usuario cierra sesión y entra con otra cuenta,
   * el menú se recalcula solo, sin necesidad de recargar la página.
   */
  readonly menu = computed<ItemMenu[]>(() => {
    const rol = this.usuario()?.rol ?? null;

    return this.menuCompleto.filter((item) => {
      // Entrada pública dentro del panel: visible para cualquier sesión.
      if (item.roles === null) {
        return true;
      }
      return rol !== null && item.roles.includes(rol);
    });
  });

  /** Iniciales del usuario, mostradas en el distintivo circular de la cabecera. */
  readonly iniciales = computed(() => {
    const nombre = this.usuario()?.nombre ?? '';
    return nombre
      .split(' ')
      .filter((parte) => parte.length > 0)
      .slice(0, 2)
      .map((parte) => parte[0].toUpperCase())
      .join('');
  });

  /**
   * Cierra la sesión y devuelve al usuario a la pantalla de acceso.
   * Corresponde al paso 10 del flujo principal del CU01.
   *
   * @returns void
   */
  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Retira manualmente un aviso emergente.
   *
   * @param id Identificador del aviso.
   * @returns void
   */
  cerrarAviso(id: number): void {
    this.notificacion.cerrar(id);
  }
}
