/**
 * =============================================================================
 * FASHIONSTORE - MOVIMIENTOS DE INVENTARIO (CU11)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Pantalla principal del historial del kardex y registro de ajustes físicos:
 * - Tabla ERP con badges por tipo de movimiento (Entrada, Salida, Traspaso).
 * - Filtros combinados por sucursal y tipo de operación.
 * - Modal reactivo para registrar movimientos con validación previa de stock.
 * =============================================================================
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { MovimientoInventarioService } from '../../core/services/movimiento-inventario.service';
import { GeografiaService } from '../../core/services/geografia.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import {
  FiltrosMovimientos,
  MovimientoInventario,
  TipoMovimiento,
} from '../../core/models/movimiento.model';
import { Sucursal } from '../../core/models/catalogo.model';
import { MovimientoModal } from './movimiento-modal/movimiento-modal';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [DatePipe, MovimientoModal],
  templateUrl: './movimientos.html',
  styleUrl: './movimientos.scss',
})
export class Movimientos implements OnInit {
  private readonly movimientoService = inject(MovimientoInventarioService);
  private readonly geografiaService = inject(GeografiaService);
  private readonly notificacion = inject(NotificacionService);

  // ---------------------------------------------------------------------------
  // ESTADO REACTIVO
  // ---------------------------------------------------------------------------

  readonly movimientos = signal<MovimientoInventario[]>([]);
  readonly sucursales = signal<Sucursal[]>([]);
  readonly cargando = signal(true);
  readonly errorCarga = signal<string | null>(null);

  /** Filtros activos */
  readonly filtroSucursal = signal<number | null>(null);
  readonly filtroTipo = signal<TipoMovimiento | ''>('');

  /** Control del modal */
  readonly modalAbierto = signal(false);

  ngOnInit(): void {
    this.cargarSucursales();
    this.cargar();
  }

  cargarSucursales(): void {
    this.geografiaService.listarSucursales().subscribe({
      next: (sucursales) => this.sucursales.set(sucursales),
      error: () => {},
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    const filtros: FiltrosMovimientos = {
      id_sucursal: this.filtroSucursal(),
      tipo: this.filtroTipo() || null,
      limit: 100,
    };

    this.movimientoService.listar(filtros).subscribe({
      next: (lista) => {
        this.movimientos.set(lista);
        this.cargando.set(false);
      },
      error: (error: Error) => {
        this.cargando.set(false);
        this.errorCarga.set(error.message);
      },
    });
  }

  alCambiarFiltroSucursal(evento: Event): void {
    const val = (evento.target as HTMLSelectElement).value;
    this.filtroSucursal.set(val === '' ? null : Number(val));
    this.cargar();
  }

  alCambiarFiltroTipo(evento: Event): void {
    const val = (evento.target as HTMLSelectElement).value as TipoMovimiento | '';
    this.filtroTipo.set(val);
    this.cargar();
  }

  abrirNuevo(): void {
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  alGuardar(mensaje: string): void {
    this.cerrarModal();
    this.notificacion.exito(mensaje);
    this.cargar();
  }
}
