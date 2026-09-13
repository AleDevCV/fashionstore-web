/**
 * =============================================================================
 * FASHIONSTORE - DIÁLOGO DE ELIMINACIÓN DE PROVEEDOR (CU12)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Diálogo modal para confirmar la eliminación de un proveedor. Maneja la
 * excepción HTTP 409 cuando el proveedor cuenta con compras registradas.
 * =============================================================================
 */

import { Component, inject, input, output, signal } from '@angular/core';

import { ProveedorService } from '../../../core/services/proveedor.service';
import { Proveedor } from '../../../core/models/proveedor.model';

@Component({
  selector: 'app-proveedor-eliminar-modal',
  standalone: true,
  templateUrl: './proveedor-eliminar-modal.html',
  styleUrl: './proveedor-eliminar-modal.scss',
})
export class ProveedorEliminarModal {
  private readonly proveedorService = inject(ProveedorService);

  readonly proveedor = input.required<Proveedor>();
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

    const target = this.proveedor();
    this.proveedorService.eliminar(target.id_proveedor).subscribe({
      next: (res) => {
        this.cargando.set(false);
        this.eliminado.emit(res.mensaje || `Proveedor «${target.razon_social}» eliminado.`);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.mensajeError.set(err.message);
      },
    });
  }
}
