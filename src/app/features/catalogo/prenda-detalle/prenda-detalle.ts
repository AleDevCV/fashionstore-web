/**
 * =============================================================================
 * FASHIONSTORE - DETALLE DE PRENDA (CU14)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Modal que muestra la ficha de una prenda con su matriz de tallas/colores y,
 * para cada variante, la disponibilidad real de stock desglosada por sucursal.
 *
 * Consume GET /api/catalogo/{id}, que es público y devuelve solo prendas
 * activas. Una prenda retirada responde 404 y el modal lo muestra como error.
 * =============================================================================
 */

import { Component, OnInit, inject, input, output, signal } from '@angular/core';

import { CatalogoService } from '../../../core/services/catalogo.service';
import { PrendaCatalogo } from '../../../core/models/catalogo.model';

@Component({
  selector: 'app-prenda-detalle',
  imports: [],
  templateUrl: './prenda-detalle.html',
  styleUrl: './prenda-detalle.scss',
})
export class PrendaDetalle implements OnInit {
  private readonly catalogoService = inject(CatalogoService);

  // ---------------------------------------------------------------------------
  // ENTRADAS Y SALIDAS
  // ---------------------------------------------------------------------------

  /** Identificador de la prenda cuya ficha se solicita al backend. */
  readonly prendaId = input.required<number>();

  /** Se emite cuando el usuario cierra el modal. */
  readonly cerrado = output<void>();

  // ---------------------------------------------------------------------------
  // ESTADO DE LA VISTA
  // ---------------------------------------------------------------------------

  /** Ficha completa de la prenda; null mientras se descarga o si falló. */
  readonly prenda = signal<PrendaCatalogo | null>(null);

  /** true mientras se descarga la ficha. */
  readonly cargando = signal(true);

  /** Error de carga; null si todo fue bien. */
  readonly error = signal<string | null>(null);

  // ---------------------------------------------------------------------------
  // CICLO DE VIDA
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.catalogoService.obtenerFicha(this.prendaId()).subscribe({
      next: (ficha) => {
        this.prenda.set(ficha);
        this.cargando.set(false);
      },
      error: (error: Error) => {
        this.cargando.set(false);
        this.error.set(error.message);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // ACCIONES
  // ---------------------------------------------------------------------------

  /** Cierra el modal. */
  cerrar(): void {
    this.cerrado.emit();
  }

  // ---------------------------------------------------------------------------
  // AYUDAS DE PRESENTACIÓN
  // ---------------------------------------------------------------------------

  /**
   * Formatea un precio (string o número) con dos decimales.
   *
   * @param valor Precio base o precio final de una variante.
   * @returns Texto con el precio redondeado a dos decimales.
   */
  formatearPrecio(valor: string | number | null | undefined): string {
    return Number(valor ?? 0).toFixed(2);
  }
}
