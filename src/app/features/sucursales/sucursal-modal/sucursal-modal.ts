/**
 * =============================================================================
 * FASHIONSTORE - MODAL DE ALTA Y EDICIÓN DE SUCURSALES (CU06)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Un mismo componente cubre los dos modos:
 *
 *   ALTA    (`sucursal` = null) -> POST /api/sucursales
 *   EDICIÓN (`sucursal` != null) -> PUT /api/sucursales/{id}
 *
 * El desplegable de ciudad se alimenta con las ciudades que provee el padre, de
 * modo que el modal no dispara peticiones propias. El encargado se conserva sin
 * tocarse: asignarlo corresponde a la gestión de personal (CU02).
 * =============================================================================
 */

import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { GeografiaService } from '../../../core/services/geografia.service';
import { Ciudad, Sucursal } from '../../../core/models/catalogo.model';

@Component({
  selector: 'app-sucursal-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './sucursal-modal.html',
  styleUrl: './sucursal-modal.scss',
})
export class SucursalModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly geografiaService = inject(GeografiaService);

  // ---------------------------------------------------------------------------
  // ENTRADAS Y SALIDAS
  // ---------------------------------------------------------------------------

  /** Sucursal a editar. Si es null, el modal opera en modo alta. */
  readonly sucursal = input<Sucursal | null>(null);

  /** Ciudades disponibles para el desplegable, provistas por el padre. */
  readonly ciudades = input.required<Ciudad[]>();

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

  /** true si el modal está editando una sucursal existente. */
  readonly esEdicion = signal(false);

  /** Formulario reactivo; se arma en ngOnInit según el modo de trabajo. */
  formulario!: FormGroup;

  // ---------------------------------------------------------------------------
  // CICLO DE VIDA
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    const sucursalActual = this.sucursal();
    this.esEdicion.set(sucursalActual !== null);

    this.formulario = this.fb.group({
      nombre: [
        sucursalActual?.nombre ?? '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
      ],
      direccion: [
        sucursalActual?.direccion ?? '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(255)],
      ],
      telefono: [
        sucursalActual?.telefono ?? '',
        [Validators.pattern(/^[0-9]*$/), Validators.maxLength(20)],
      ],
      id_ciudad: [sucursalActual?.id_ciudad ?? null, [Validators.required]],
    });
  }

  // ---------------------------------------------------------------------------
  // ACCESORES PARA LA PLANTILLA
  // ---------------------------------------------------------------------------

  /**
   * Indica si un campo debe pintarse como inválido (solo tras ser tocado).
   *
   * @param nombreCampo Nombre del control dentro del FormGroup.
   * @returns true si el control es inválido y ya fue tocado o modificado.
   */
  campoInvalido(nombreCampo: string): boolean {
    const control = this.formulario.controls[nombreCampo];
    return control.invalid && (control.touched || control.dirty);
  }

  // ---------------------------------------------------------------------------
  // ACCIONES
  // ---------------------------------------------------------------------------

  /**
   * Cierra el modal descartando los cambios (ignorado durante una petición).
   *
   * @returns void
   */
  cerrar(): void {
    if (!this.cargando()) {
      this.cerrado.emit();
    }
  }

  /**
   * Valida y envía el formulario al backend.
   *
   * @returns void
   */
  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set(null);

    const valores = this.formulario.value;
    const sucursalActual = this.sucursal();

    const cuerpo = {
      nombre: valores.nombre,
      direccion: valores.direccion,
      telefono: valores.telefono || null,
      id_ciudad: Number(valores.id_ciudad),
      id_encargado: sucursalActual?.id_encargado ?? null,
    };

    if (sucursalActual) {
      // ----- MODO EDICIÓN -----
      this.geografiaService
        .actualizarSucursal(sucursalActual.id_sucursal, cuerpo)
        .subscribe({
          next: (actualizada) => {
            this.cargando.set(false);
            this.guardado.emit(
              `La sucursal ${actualizada.nombre} se actualizó correctamente.`,
            );
          },
          error: (error: Error) => {
            this.cargando.set(false);
            this.mensajeError.set(error.message);
          },
        });
    } else {
      // ----- MODO ALTA -----
      this.geografiaService.crearSucursal(cuerpo).subscribe({
        next: (creada) => {
          this.cargando.set(false);
          this.guardado.emit(
            `La sucursal ${creada.nombre} fue registrada correctamente.`,
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
