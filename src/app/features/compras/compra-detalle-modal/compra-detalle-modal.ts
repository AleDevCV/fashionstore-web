/**
 * =============================================================================
 * FASHIONSTORE - MODAL DE DETALLE DE COMPRA (CU13)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Muestra el comprobante detallado de una adquisición:
 * - Cabecera con datos del proveedor, sucursal receptora, fecha y usuario.
 * - Tabla con desglose de ítems, cantidades físicas y costos unitarios.
 * - Liquidación financiera con Subtotal, 13% IVA (Bolivia) y Total facturado.
 * =============================================================================
 */

import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';

import { CompraService } from '../../../core/services/compra.service';
import { CompraDetallada } from '../../../core/models/compra.model';

@Component({
  selector: 'app-compra-detalle-modal',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './compra-detalle-modal.html',
  styleUrl: './compra-detalle-modal.scss',
})
export class CompraDetalleModal implements OnInit {
  private readonly compraService = inject(CompraService);

  readonly idCompra = input.required<number>();
  readonly cerrado = output<void>();

  readonly compra = signal<CompraDetallada | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarDetalle();
  }

  cargarDetalle(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.compraService.obtener(this.idCompra()).subscribe({
      next: (res) => {
        this.compra.set(res);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.error.set(err.message);
      },
    });
  }

  cerrar(): void {
    this.cerrado.emit();
  }
}
