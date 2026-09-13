/**
 * =============================================================================
 * FASHIONSTORE - MODAL DE ALTA Y EDICIÓN DE PROVEEDORES (CU12)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Permite registrar y modificar datos comerciales del proveedor:
 * NIT, Razón Social, persona de contacto, teléfono, correo y dirección.
 * Valida unicidad de NIT y maneja errores de conflicto devueltos por el backend.
 * =============================================================================
 */

import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ProveedorService } from '../../../core/services/proveedor.service';
import { Proveedor } from '../../../core/models/proveedor.model';

@Component({
  selector: 'app-proveedor-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './proveedor-modal.html',
  styleUrl: './proveedor-modal.scss',
})
export class ProveedorModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly proveedorService = inject(ProveedorService);

  // ---------------------------------------------------------------------------
  // ENTRADAS Y SALIDAS
  // ---------------------------------------------------------------------------

  /** Proveedor a editar. Si es null, opera en modo alta. */
  readonly proveedor = input<Proveedor | null>(null);

  /** Se emite cuando el usuario cierra el modal sin guardar. */
  readonly cerrado = output<void>();

  /** Se emite tras guardar con éxito; lleva el mensaje de confirmación. */
  readonly guardado = output<string>();

  // ---------------------------------------------------------------------------
  // ESTADO DE LA VISTA
  // ---------------------------------------------------------------------------

  /** true mientras la petición HTTP está en curso. */
  readonly cargando = signal(false);

  /** Mensaje de error devuelto por el backend; null si no hay ninguno. */
  readonly mensajeError = signal<string | null>(null);

  /** true si el modal está editando un proveedor existente. */
  readonly esEdicion = signal(false);

  /** Formulario reactivo. */
  formulario!: FormGroup;

  // ---------------------------------------------------------------------------
  // CICLO DE VIDA
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    const proveedorActual = this.proveedor();
    this.esEdicion.set(proveedorActual !== null);

    this.formulario = this.fb.group({
      nit: [
        proveedorActual?.nit ?? '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(30)],
      ],
      razon_social: [
        proveedorActual?.razon_social ?? '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(150)],
      ],
      contacto: [
        proveedorActual?.contacto ?? '',
        [Validators.maxLength(100)],
      ],
      telefono: [
        proveedorActual?.telefono ?? '',
        [Validators.maxLength(20)],
      ],
      correo: [
        proveedorActual?.correo ?? '',
        [Validators.email, Validators.maxLength(150)],
      ],
      direccion: [
        proveedorActual?.direccion ?? '',
        [Validators.maxLength(255)],
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // ACCESORES
  // ---------------------------------------------------------------------------

  campoInvalido(nombreCampo: string): boolean {
    const control = this.formulario.controls[nombreCampo];
    return control.invalid && (control.touched || control.dirty);
  }

  errores(nombreCampo: string) {
    return this.formulario.controls[nombreCampo].errors;
  }

  // ---------------------------------------------------------------------------
  // ACCIONES
  // ---------------------------------------------------------------------------

  cerrar(): void {
    if (!this.cargando()) {
      this.cerrado.emit();
    }
  }

  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set(null);

    const valores = this.formulario.value;
    const proveedorActual = this.proveedor();

    const cuerpo = {
      nit: valores.nit.trim(),
      razon_social: valores.razon_social.trim(),
      contacto: valores.contacto?.trim() || null,
      telefono: valores.telefono?.trim() || null,
      correo: valores.correo?.trim() || null,
      direccion: valores.direccion?.trim() || null,
    };

    if (proveedorActual) {
      // Modo Edición
      this.proveedorService
        .actualizar(proveedorActual.id_proveedor, cuerpo)
        .subscribe({
          next: (actualizado) => {
            this.cargando.set(false);
            this.guardado.emit(
              `El proveedor «${actualizado.razon_social}» fue actualizado correctamente.`,
            );
          },
          error: (error: Error) => {
            this.cargando.set(false);
            this.mensajeError.set(error.message);
          },
        });
    } else {
      // Modo Alta
      this.proveedorService.crear(cuerpo).subscribe({
        next: (creado) => {
          this.cargando.set(false);
          this.guardado.emit(
            `El proveedor «${creado.razon_social}» fue registrado exitosamente.`,
          );
        },
        error: (error: Error) => {
          this.cargando.set(false);
          this.mensajeError.set(error.message);
        },
      });
    }
  }
}
