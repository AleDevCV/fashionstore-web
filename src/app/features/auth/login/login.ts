/**
 * =============================================================================
 * FASHIONSTORE - COMPONENTE DE INICIO DE SESIÓN (CU01)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Pantalla de acceso al panel administrativo. Implementa el flujo principal del
 * CU01: captura las credenciales, las valida con formularios reactivos, las
 * envía al AuthService y redirige al panel según el resultado.
 *
 * El estado de la vista (carga, error, visibilidad de la contraseña) se maneja
 * con señales de Angular, que actualizan la plantilla automáticamente.
 * =============================================================================
 */

import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  // ---------------------------------------------------------------------------
  // DEPENDENCIAS
  // ---------------------------------------------------------------------------
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rutaActiva = inject(ActivatedRoute);

  // ---------------------------------------------------------------------------
  // ESTADO REACTIVO DE LA VISTA
  // ---------------------------------------------------------------------------

  /** true mientras la petición HTTP de login está en curso. */
  readonly cargando = signal(false);

  /** Mensaje de error a mostrar en pantalla; null si no hay ninguno. */
  readonly mensajeError = signal<string | null>(null);

  /** Alterna entre mostrar la contraseña en texto plano o enmascarada. */
  readonly mostrarPassword = signal(false);

  /**
   * Formulario reactivo con las validaciones nativas de Angular:
   *   - correo:   obligatorio y con formato de email válido.
   *   - password: obligatorio, con una longitud mínima razonable.
   */
  readonly formulario: FormGroup = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  // ---------------------------------------------------------------------------
  // ACCESORES DE CONVENIENCIA PARA LA PLANTILLA
  // ---------------------------------------------------------------------------

  /** Control del campo de correo, usado para leer su estado de validación. */
  get correo() {
    return this.formulario.controls['correo'];
  }

  /** Control del campo de contraseña. */
  get password() {
    return this.formulario.controls['password'];
  }

  /**
   * Determina si un campo debe pintarse como inválido.
   * Solo se marca en rojo después de que el usuario lo haya tocado o de que
   * haya intentado enviar el formulario, para no castigarlo mientras escribe.
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
   * Cambia la visibilidad del campo de contraseña (opción "Ver Contraseña"
   * descrita en el prototipo de interfaz del CU01).
   *
   * @returns void
   */
  alternarPassword(): void {
    this.mostrarPassword.update((visible) => !visible);
  }

  /**
   * Envía las credenciales al backend de FastAPI.
   *
   * Flujo:
   *   1. Si el formulario es inválido, marca todos los campos como tocados
   *      para que se muestren los mensajes de validación, y aborta.
   *   2. Activa el estado de carga y limpia cualquier error anterior.
   *   3. Llama a AuthService.login(), que persiste el JWT si todo va bien.
   *   4. En caso de éxito redirige a la URL solicitada originalmente
   *      (`returnUrl`) o, en su defecto, al panel principal.
   *   5. En caso de error muestra el mensaje ya traducido por el servicio.
   *
   * @returns void
   */
  iniciarSesion(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set(null);

    this.authService.login(this.formulario.getRawValue()).subscribe({
      next: () => {
        this.cargando.set(false);

        // Si el guardián interceptó una ruta protegida, se vuelve a ella.
        const returnUrl =
          this.rutaActiva.snapshot.queryParamMap.get('returnUrl') ?? '/panel';
        this.router.navigateByUrl(returnUrl);
      },
      error: (error: Error) => {
        this.cargando.set(false);
        this.mensajeError.set(error.message);

        // Se limpia la contraseña por seguridad, conservando el correo escrito.
        this.password.reset();
      },
    });
  }
}
