/**
 * =============================================================================
 * FASHIONSTORE - PANEL PROVISIONAL POSTERIOR AL LOGIN (CU01)
 * -----------------------------------------------------------------------------
 * Vista mínima a la que se redirige tras un inicio de sesión exitoso. Su único
 * propósito en esta etapa es demostrar el cierre del CU01: mostrar los datos
 * decodificados del token JWT y permitir cerrar la sesión.
 *
 * Será reemplazada por el dashboard gerencial definitivo (CU24) y por el
 * layout con sidebar del panel administrativo.
 * =============================================================================
 */

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-panel',
  imports: [],
  templateUrl: './panel.html',
  styleUrl: './panel.scss',
})
export class Panel {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /** Señal con el payload del JWT del usuario autenticado. */
  readonly usuario = this.authService.usuarioActual;

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
