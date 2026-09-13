/**
 * =============================================================================
 * FASHIONSTORE - RESTABLECIMIENTO DE CONTRASEÑA (CU04)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Pantalla pública para definir una nueva contraseña a través del enlace seguro
 * con token recibido por correo electrónico (`/restablecer-password?token=...`).
 *
 * Flujo:
 *   1. Captura y verifica la vigencia y estado del token contra el backend.
 *   2. Si el token expiró o es inválido, muestra estado de error con enlace
 *      para solicitar uno nuevo.
 *   3. Si el token es válido, habilita el formulario con validación de fortaleza
 *      de contraseña y confirmación.
 *   4. Al guardar, envía la nueva clave al endpoint seguro y confirma al usuario.
 * =============================================================================
 */

import {
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

/** Niveles de fortaleza de contraseña. */
export type NivelFortaleza = 'muy-debil' | 'debil' | 'media' | 'fuerte' | 'excelente';

@Component({
  selector: 'app-restablecer-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './restablecer-password.html',
  styleUrl: './restablecer-password.scss',
})
export class RestablecerPassword implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly rutaActiva = inject(ActivatedRoute);

  /** Token recibido como input de ruta gracias a withComponentInputBinding(). */
  readonly tokenInput = input<string>('', { alias: 'token' });

  // ---------------------------------------------------------------------------
  // ESTADO REACTIVO
  // ---------------------------------------------------------------------------

  /** Token de recuperación activo. */
  readonly token = signal<string>('');

  /** true mientras se valida el token con el backend al cargar la página. */
  readonly verificandoToken = signal(true);

  /** true si el token fue rechazado (expirado, usado o inválido). */
  readonly tokenInvalido = signal(false);

  /** Mensaje explicativo cuando el token es inválido. */
  readonly mensajeTokenInvalido = signal<string | null>(null);

  /** Correo ofuscado del usuario obtenido de la validación del token. */
  readonly correoUsuario = signal<string | null>(null);

  /** true mientras la petición de cambio de contraseña está en vuelo. */
  readonly cargando = signal(false);

  /** Mensaje de error general devuelto por la API durante el guardado. */
  readonly mensajeError = signal<string | null>(null);

  /** true cuando la contraseña ha sido actualizada con éxito. */
  readonly exito = signal(false);

  /** Visibilidad de las contraseñas. */
  readonly mostrarPassword = signal(false);
  readonly mostrarConfirmar = signal(false);

  /** Valor actual de la contraseña para calcular reactivamente la fortaleza. */
  readonly passwordValor = signal('');

  /**
   * Formulario reactivo para nueva contraseña y su confirmación.
   */
  readonly formulario: FormGroup = this.fb.group(
    {
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          this.validarRequisitosContrasena(),
        ],
      ],
      confirmarPassword: ['', [Validators.required]],
    },
    { validators: [this.validarCoincidencia()] },
  );

  // ---------------------------------------------------------------------------
  // MEDIDOR DE FORTALEZA
  // ---------------------------------------------------------------------------

  /**
   * Puntuación de fortaleza calculada a partir de los requisitos de seguridad:
   *   - Longitud mínima de 8 caracteres.
   *   - Al menos una letra mayúscula.
   *   - Al menos una letra minúscula.
   *   - Al menos un número.
   *   - Al menos un carácter especial.
   */
  readonly fortaleza = computed<{
    puntuacion: number;
    nivel: NivelFortaleza;
    etiqueta: string;
    porcentaje: number;
  }>(() => {
    const valor = this.passwordValor();
    if (!valor) {
      return { puntuacion: 0, nivel: 'muy-debil', etiqueta: 'Muy débil', porcentaje: 0 };
    }

    let puntos = 0;
    if (valor.length >= 8) puntos += 1;
    if (/[A-Z]/.test(valor)) puntos += 1;
    if (/[a-z]/.test(valor)) puntos += 1;
    if (/[0-9]/.test(valor)) puntos += 1;
    if (/[^A-Za-z0-9]/.test(valor)) puntos += 1;

    switch (puntos) {
      case 5:
        return { puntuacion: 5, nivel: 'excelente', etiqueta: 'Excelente', porcentaje: 100 };
      case 4:
        return { puntuacion: 4, nivel: 'fuerte', etiqueta: 'Fuerte', porcentaje: 80 };
      case 3:
        return { puntuacion: 3, nivel: 'media', etiqueta: 'Media', porcentaje: 60 };
      case 2:
        return { puntuacion: 2, nivel: 'debil', etiqueta: 'Débil', porcentaje: 40 };
      default:
        return { puntuacion: 1, nivel: 'muy-debil', etiqueta: 'Muy débil', porcentaje: 20 };
    }
  });

  // ---------------------------------------------------------------------------
  // CICLO DE VIDA
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    // Sincronizar el valor de la contraseña para el medidor
    this.formulario.get('password')?.valueChanges.subscribe((val) => {
      this.passwordValor.set(val || '');
    });

    // Obtener token desde input de componente o queryParamMap
    const tokenExtraido =
      this.tokenInput() ||
      this.rutaActiva.snapshot.queryParamMap.get('token') ||
      '';

    this.token.set(tokenExtraido);

    if (!tokenExtraido) {
      this.verificandoToken.set(false);
      this.tokenInvalido.set(true);
      this.mensajeTokenInvalido.set(
        'Enlace de recuperación incompleto: no se ha proporcionado ningún token en la dirección web.',
      );
      return;
    }

    this.verificarToken(tokenExtraido);
  }

  // ---------------------------------------------------------------------------
  // VERIFICACIÓN DEL TOKEN
  // ---------------------------------------------------------------------------

  /**
   * Consulta al backend si el token es válido y está dentro de los 30 minutos.
   */
  verificarToken(token: string): void {
    this.verificandoToken.set(true);
    this.tokenInvalido.set(false);
    this.mensajeTokenInvalido.set(null);

    this.authService.verificarTokenRecuperacion(token).subscribe({
      next: (respuesta) => {
        this.verificandoToken.set(false);
        if (respuesta.valido) {
          this.correoUsuario.set(respuesta.correo ?? null);
        } else {
          this.tokenInvalido.set(true);
          this.mensajeTokenInvalido.set(
            respuesta.mensaje ??
              'Este enlace de recuperación ha expirado, ya fue utilizado o es inválido.',
          );
        }
      },
      error: (error: Error) => {
        this.verificandoToken.set(false);
        this.tokenInvalido.set(true);
        this.mensajeTokenInvalido.set(
          error.message ||
            'El enlace de recuperación es inválido, ha expirado o ya fue utilizado.',
        );
      },
    });
  }

  // ---------------------------------------------------------------------------
  // VALIDACIONES DEL FORMULARIO
  // ---------------------------------------------------------------------------

  /**
   * Valida que la contraseña cumpla los requisitos de mayúscula y número.
   */
  private validarRequisitosContrasena(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (!valor) return null;

      const tieneMayuscula = /[A-Z]/.test(valor);
      const tieneNumero = /[0-9]/.test(valor);

      if (!tieneMayuscula || !tieneNumero) {
        return {
          requisitos: {
            mayuscula: !tieneMayuscula,
            numero: !tieneNumero,
          },
        };
      }

      return null;
    };
  }

  /**
   * Valida que ambas contraseñas coincidan.
   */
  private validarCoincidencia(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const form = control as FormGroup;
      const pass = form.get('password')?.value;
      const confirm = form.get('confirmarPassword')?.value;

      if (confirm && pass !== confirm) {
        form.get('confirmarPassword')?.setErrors({ noCoincide: true });
        return { noCoincide: true };
      }

      return null;
    };
  }

  // ---------------------------------------------------------------------------
  // ACCESORES Y ACCIONES
  // ---------------------------------------------------------------------------

  get password() {
    return this.formulario.controls['password'];
  }

  get confirmarPassword() {
    return this.formulario.controls['confirmarPassword'];
  }

  campoInvalido(nombreCampo: string): boolean {
    const control = this.formulario.controls[nombreCampo];
    return control.invalid && (control.touched || control.dirty);
  }

  alternarPassword(): void {
    this.mostrarPassword.update((v) => !v);
  }

  alternarConfirmar(): void {
    this.mostrarConfirmar.update((v) => !v);
  }

  /**
   * Envía la nueva contraseña junto con el token temporal al backend.
   */
  restablecer(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set(null);

    const nuevaPassword = this.password.value;

    this.authService
      .restablecerPassword(this.token(), nuevaPassword)
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.exito.set(true);
        },
        error: (error: Error) => {
          this.cargando.set(false);
          this.mensajeError.set(error.message);
        },
      });
  }
}
