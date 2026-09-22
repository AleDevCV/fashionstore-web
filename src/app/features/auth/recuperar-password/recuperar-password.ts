/**
 * =============================================================================
 * FASHIONSTORE - SOLICITUD DE RECUPERACIÓN DE CONTRASEÑA (CU04)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Pantalla pública para iniciar el proceso de recuperación de acceso.
 * Captura el correo electrónico del usuario, lo valida con formularios reactivos
 * y solicita el envío de un enlace temporal al backend de FastAPI.
 *
 * Muestra retroalimentación clara ante éxito o error, manteniendo la estética
 * editorial de alta costura de FashionStore.
 * =============================================================================
 */

import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-recuperar-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './recuperar-password.html',
  styleUrl: './recuperar-password.scss',
})
export class RecuperarPassword {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  // ---------------------------------------------------------------------------
  // ESTADO REACTIVO DE LA VISTA
  // ---------------------------------------------------------------------------

  /** true mientras la petición HTTP está en curso. */
  readonly cargando = signal(false);

  /** Mensaje de error a mostrar en pantalla; null si no hay ninguno. */
  readonly mensajeError = signal<string | null>(null);

  /** true cuando el enlace de recuperación ha sido enviado con éxito. */
  readonly exito = signal(false);

  /** Mensaje de confirmación emitido por el servidor. */
  readonly mensajeExito = signal<string | null>(null);

  /**
   * Formulario reactivo con validación de correo electrónico.
   */
  readonly formulario: FormGroup = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
  });

  // ---------------------------------------------------------------------------
  // ACCESORES DE CONVENIENCIA
  // ---------------------------------------------------------------------------

  /** Control del campo de correo electrónico. */
  get correo() {
    return this.formulario.controls['correo'];
  }

  /**
   * Determina si un campo debe pintarse como inválido.
   *
   * @param nombreCampo Nombre del control dentro del FormGroup.
   * @returns true si el control es inválido y ya fue tocado o modificado.
   */
  campoInvalido(nombreCampo: string): boolean {
    const control = this.formulario.controls[nombreCampo];
    return control.invalid && (control.touched || control.dirty);
  }

  // ---------------------------------------------------------------------------
  // ACCIONES DEL USUARIO
  // ---------------------------------------------------------------------------

  /**
   * Envía la solicitud de recuperación al backend.
   */
  solicitarRecuperacion(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set(null);

    const correo = this.formulario.get('correo')?.value;

    this.authService.solicitarRecuperacionPassword(correo).subscribe({
      next: (respuesta) => {
        this.cargando.set(false);
        this.exito.set(true);
        this.mensajeExito.set(
          respuesta.mensaje ??
            'Si el correo existe en el sistema, se ha enviado un enlace de recuperación.',
        );
      },
      error: (error: Error) => {
        this.cargando.set(false);
        this.mensajeError.set(error.message);
      },
    });
  }

  /**
   * Restablece el formulario para permitir un nuevo intento si fuera necesario.
   */
  reintentar(): void {
    this.exito.set(false);
    this.mensajeExito.set(null);
    this.mensajeError.set(null);
    this.formulario.reset();
  }
}
