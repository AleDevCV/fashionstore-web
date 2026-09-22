/**
 * =============================================================================
 * FASHIONSTORE - INICIO DE SESIÓN PARA CLIENTES (CU01 / CU14)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Pantalla de acceso orientada a los compradores y clientes de FashionStore:
 *   - Entorno editorial de alta costura enfocado al cliente.
 *   - Autenticación con credenciales vía AuthService (POST /api/login/).
 *   - Enlace directo al auto-registro de nuevos clientes (/registro).
 *   - Redirección automática al Catálogo (/catalogo) tras autenticarse con éxito.
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
  selector: 'app-login-cliente',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-cliente.html',
  styleUrl: './login-cliente.scss',
})
export class LoginCliente {
  // ---------------------------------------------------------------------------
  // DEPENDENCIAS
  // ---------------------------------------------------------------------------
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rutaActiva = inject(ActivatedRoute);

  // ---------------------------------------------------------------------------
  // ESTADO REACTIVO
  // ---------------------------------------------------------------------------
  readonly cargando = signal(false);
  readonly mensajeError = signal<string | null>(null);
  readonly mostrarPassword = signal(false);

  readonly formulario: FormGroup = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  // ---------------------------------------------------------------------------
  // ACCESORES
  // ---------------------------------------------------------------------------
  get correo() {
    return this.formulario.controls['correo'];
  }

  get password() {
    return this.formulario.controls['password'];
  }

  campoInvalido(nombreCampo: string): boolean {
    const control = this.formulario.controls[nombreCampo];
    return control.invalid && (control.touched || control.dirty);
  }

  alternarPassword(): void {
    this.mostrarPassword.update((visible) => !visible);
  }

  // ---------------------------------------------------------------------------
  // ACCIONES
  // ---------------------------------------------------------------------------
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

        const rol = this.authService.obtenerRol();
        // Si es cliente va al catálogo de compras
        if (rol === 'Cliente') {
          const returnUrl = this.rutaActiva.snapshot.queryParamMap.get('returnUrl') ?? '/catalogo';
          this.router.navigateByUrl(returnUrl);
          return;
        }

        // Si es personal administrativo se redirige al panel
        this.router.navigateByUrl('/panel');
      },
      error: (error: Error) => {
        this.cargando.set(false);
        this.mensajeError.set(error.message);
        this.password.reset();
      },
    });
  }
}
