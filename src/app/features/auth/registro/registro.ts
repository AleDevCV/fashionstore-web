/**
 * =============================================================================
 * FASHIONSTORE - COMPONENTE DE AUTO-REGISTRO DE CLIENTES (CU05 / CU01)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Permite a cualquier visitante o cliente potencial darse de alta de forma
 * autónoma en la plataforma:
 *   - Crea la ficha de cliente en PostgreSQL (CU05)
 *   - Crea la cuenta de usuario con rol 'Cliente' (id_rol=4) y password bcrypt (CU01)
 *   - Audita la operación en la bitácora del sistema (CU25)
 *   - Inicia sesión automáticamente devolviendo y guardando el JWT
 * =============================================================================
 */

import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { SolicitudRegistroCliente } from '../../../core/models/auth.model';

function validadorCoincidenciaPassword(grupo: AbstractControl): ValidationErrors | null {
  const password = grupo.get('password')?.value;
  const confirmarPassword = grupo.get('confirmarPassword')?.value;
  if (password && confirmarPassword && password !== confirmarPassword) {
    return { passwordsNoCoinciden: true };
  }
  return null;
}

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class Registro {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly mensajeError = signal<string | null>(null);
  readonly registroCompletado = signal(false);
  readonly clienteRegistrado = signal<string>('');
  readonly mostrarPassword = signal(false);
  readonly mostrarConfirmarPassword = signal(false);

  readonly formulario: FormGroup = this.fb.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      ci: [
        '',
        [
          Validators.required,
          Validators.minLength(4),
          Validators.maxLength(20),
          Validators.pattern(/^[0-9a-zA-Z\-_]+$/),
        ],
      ],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      telefono: ['', [Validators.pattern(/^[0-9+() -]*$/), Validators.maxLength(20)]],
      direccion_envio: ['', [Validators.maxLength(255)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]],
      confirmarPassword: ['', [Validators.required]],
    },
    { validators: validadorCoincidenciaPassword },
  );

  get nombre() {
    return this.formulario.controls['nombre'];
  }
  get apellido() {
    return this.formulario.controls['apellido'];
  }
  get ci() {
    return this.formulario.controls['ci'];
  }
  get correo() {
    return this.formulario.controls['correo'];
  }
  get telefono() {
    return this.formulario.controls['telefono'];
  }
  get direccion_envio() {
    return this.formulario.controls['direccion_envio'];
  }
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

  get errorPasswordsNoCoinciden(): boolean {
    return (
      this.formulario.hasError('passwordsNoCoinciden') &&
      (this.confirmarPassword.touched || this.confirmarPassword.dirty)
    );
  }

  alternarPassword(): void {
    this.mostrarPassword.update((v) => !v);
  }

  alternarConfirmarPassword(): void {
    this.mostrarConfirmarPassword.update((v) => !v);
  }

  registrar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set(null);

    const val = this.formulario.getRawValue();
    const datosRegistro: SolicitudRegistroCliente = {
      nombre: val.nombre.trim(),
      apellido: val.apellido.trim(),
      ci: val.ci.trim(),
      correo: val.correo.trim().toLowerCase(),
      password: val.password,
      telefono: val.telefono?.trim() || undefined,
      direccion_envio: val.direccion_envio?.trim() || undefined,
    };

    this.authService.registrarCliente(datosRegistro).subscribe({
      next: (resp) => {
        this.cargando.set(false);
        this.clienteRegistrado.set(resp.nombre_completo || val.nombre + ' ' + val.apellido);
        this.registroCompletado.set(true);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.mensajeError.set(err.message);
      },
    });
  }

  irAlCatalogo(): void {
    this.router.navigate(['/catalogo']);
  }
}
