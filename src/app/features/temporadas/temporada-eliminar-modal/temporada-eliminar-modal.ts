/**
 * =============================================================================
 * FASHIONSTORE - DIÁLOGO DE ELIMINACIÓN DE TEMPORADA (CU09)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Diálogo modal para confirmar la eliminación de una temporada. Maneja la
 * excepción devuelta por el backend cuando la temporada tiene prendas asociadas.
 * =============================================================================
 */

import { Component, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { TemporadaService } from '../../../core/services/temporada.service';
import { Temporada } from '../../../core/models/temporada.model';

@Component({
  selector: 'app-temporada-eliminar-modal',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './temporada-eliminar-modal.html',
  styleUrl: './temporada-eliminar-modal.scss',
})
export class TemporadaEliminarModal {
  private readonly temporadaService = inject(TemporadaService);

  readonly temporada = input.required<Temporada>();
  readonly cerrado = output<void>();
  readonly eliminado = output<string>();

  readonly cargando = signal(false);
  readonly mensajeError = signal<string | null>(null);

  cerrar(): void {
    if (!this.cargando()) {
      this.cerrado.emit();
    }
  }

  confirmar(): void {
    this.cargando.set(true);
    this.mensajeError.set(null);

    const target = this.temporada();
    this.temporadaService.eliminar(target.id_temporada).subscribe({
      next: (res) => {
        this.cargando.set(false);
        this.eliminado.emit(
          res.mensaje || `La temporada «${target.nombre}» fue eliminada correctamente.`,
        );
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.mensajeError.set(err.message);
      },
    });
  }
}
