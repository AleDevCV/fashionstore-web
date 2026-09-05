/**
 * =============================================================================
 * FASHIONSTORE - PANTALLA DE INICIO DEL PANEL
 * -----------------------------------------------------------------------------
 * Vista de bienvenida a la que se llega tras iniciar sesión. Muestra los datos
 * decodificados del token JWT, lo que sirve de comprobación visual del CU01.
 *
 * La cabecera y el cierre de sesión los aporta el LayoutComponent, por lo que
 * este componente solo se ocupa de su contenido.
 *
 * Será reemplazada por el dashboard gerencial con KPIs del CU24.
 * =============================================================================
 */

import { Component, inject } from '@angular/core';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-panel',
  imports: [],
  templateUrl: './panel.html',
  styleUrl: './panel.scss',
})
export class Panel {
  private readonly authService = inject(AuthService);

  /** Señal con el payload del JWT del usuario autenticado. */
  readonly usuario = this.authService.usuarioActual;

  /**
   * Convierte el claim `exp` del JWT en una fecha legible.
   *
   * @param exp Marca de tiempo Unix en segundos.
   * @returns Fecha y hora local formateada, o un guion si no hay dato.
   */
  formatearExpiracion(exp: number | undefined): string {
    if (!exp) {
      return '—';
    }
    return new Date(exp * 1000).toLocaleString('es-BO');
  }
}
