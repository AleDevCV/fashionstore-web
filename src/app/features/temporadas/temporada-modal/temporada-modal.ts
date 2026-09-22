/**
 * =============================================================================
 * FASHIONSTORE - MODAL DE ALTA Y EDICIÓN DE TEMPORADA (CU09)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Permite registrar y modificar ciclos comerciales de temporadas del catálogo:
 * nombre, descripción conceptual, fecha de inicio y fecha de fin de vigencia.
 * Aplica validación cruzada reactiva requiriendo fecha_fin >= fecha_inicio.
 * =============================================================================
 */

import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { TemporadaService } from '../../../core/services/temporada.service';
import { Temporada } from '../../../core/models/temporada.model';

/**
 * Validador cruzado para verificar que la fecha de inicio sea menor o igual a la fecha de fin.
 */
function validadorRangoFechas(group: AbstractControl): ValidationErrors | null {
  const inicio = group.get('fecha_inicio')?.value;
  const fin = group.get('fecha_fin')?.value;
  if (inicio && fin && inicio > fin) {
    return { rangoFechasInvalido: true };
  }
  return null;
}

@Component({
  selector: 'app-temporada-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './temporada-modal.html',
  styleUrl: './temporada-modal.scss',
})
export class TemporadaModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly temporadaService = inject(TemporadaService);

  // ---------------------------------------------------------------------------
  // ENTRADAS Y SALIDAS
  // ---------------------------------------------------------------------------

  /** Temporada a editar. Si es null, opera en modo alta. */
  readonly temporada = input<Temporada | null>(null);

  /** Se emite cuando el usuario cierra el modal sin guardar. */
  readonly cerrado = output<void>();

  /** Se emite tras guardar con éxito con el mensaje de confirmación. */
  readonly guardado = output<string>();

  // ---------------------------------------------------------------------------
  // ESTADO DE LA VISTA
  // ---------------------------------------------------------------------------

  readonly cargando = signal(false);
  readonly mensajeError = signal<string | null>(null);
  readonly esEdicion = signal(false);

  formulario!: FormGroup;

  ngOnInit(): void {
    const actual = this.temporada();
    this.esEdicion.set(actual !== null);

    this.formulario = this.fb.group(
      {
        nombre: [
          actual?.nombre ?? '',
          [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
        ],
        descripcion: [
          actual?.descripcion ?? '',
          [Validators.maxLength(255)],
        ],
        fecha_inicio: [
          actual?.fecha_inicio ?? '',
          [Validators.required],
        ],
        fecha_fin: [
          actual?.fecha_fin ?? '',
          [Validators.required],
        ],
        activo: [
          actual ? (actual.activo ?? actual.estado ?? true) : true,
        ],
      },
      { validators: [validadorRangoFechas] },
    );
  }

  // ---------------------------------------------------------------------------
  // ACCESORES DE VALIDACIÓN
  // ---------------------------------------------------------------------------

  campoInvalido(nombreCampo: string): boolean {
    const control = this.formulario.controls[nombreCampo];
    return control.invalid && (control.touched || control.dirty);
  }

  errores(nombreCampo: string) {
    return this.formulario.controls[nombreCampo].errors;
  }

  get rangoInvalido(): boolean {
    return (
      this.formulario.hasError('rangoFechasInvalido') &&
      (this.formulario.controls['fecha_fin'].touched ||
        this.formulario.controls['fecha_inicio'].touched)
    );
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

    const val = this.formulario.value;
    const actual = this.temporada();

    const cuerpo = {
      nombre: val.nombre.trim(),
      descripcion: val.descripcion?.trim() || null,
      fecha_inicio: val.fecha_inicio,
      fecha_fin: val.fecha_fin,
      activo: Boolean(val.activo),
      estado: Boolean(val.activo),
    };

    if (actual) {
      // Edición
      this.temporadaService.actualizar(actual.id_temporada, cuerpo).subscribe({
        next: (res) => {
          this.cargando.set(false);
          this.guardado.emit(`La temporada «${res.nombre}» fue actualizada exitosamente.`);
        },
        error: (err: Error) => {
          this.cargando.set(false);
          this.mensajeError.set(err.message);
        },
      });
    } else {
      // Alta
      this.temporadaService.crear(cuerpo).subscribe({
        next: (res) => {
          this.cargando.set(false);
          this.guardado.emit(`La temporada «${res.nombre}» fue creada exitosamente.`);
        },
        error: (err: Error) => {
          this.cargando.set(false);
          this.mensajeError.set(err.message);
        },
      });
    }
  }
}
