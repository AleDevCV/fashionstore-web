/**
 * =============================================================================
 * FASHIONSTORE - HISTORIAL DE COMPRAS (CU13)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Módulo de consulta de compras a proveedores:
 * - Tabla ERP de adquisiciones con montos totales e impuestos resueltos.
 * - Acceso a nuevo comprobante de compra (/panel/compras/nueva).
 * - Modal para consultar el desglose íntegro de prendas y costos ingresados.
 * =============================================================================
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';

import { CompraService } from '../../core/services/compra.service';
import { ProveedorService } from '../../core/services/proveedor.service';
import { GeografiaService } from '../../core/services/geografia.service';
import { Compra, FiltrosCompras } from '../../core/models/compra.model';
import { Proveedor } from '../../core/models/proveedor.model';
import { Sucursal } from '../../core/models/catalogo.model';
import { CompraDetalleModal } from './compra-detalle-modal/compra-detalle-modal';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, CompraDetalleModal],
  templateUrl: './compras.html',
  styleUrl: './compras.scss',
})
export class Compras implements OnInit {
  private readonly compraService = inject(CompraService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly geografiaService = inject(GeografiaService);

  readonly compras = signal<Compra[]>([]);
  readonly proveedores = signal<Proveedor[]>([]);
  readonly sucursales = signal<Sucursal[]>([]);
  readonly cargando = signal(true);
  readonly errorCarga = signal<string | null>(null);

  /** Filtros activos */
  readonly filtroProveedor = signal<number | null>(null);
  readonly filtroSucursal = signal<number | null>(null);

  /** Control del modal de detalle */
  readonly modalDetalleAbierto = signal(false);
  readonly idCompraSeleccionada = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargar();
  }

  cargarCatalogos(): void {
    this.proveedorService.listar().subscribe({
      next: (provs) => this.proveedores.set(provs),
      error: () => {},
    });

    this.geografiaService.listarSucursales().subscribe({
      next: (sucs) => this.sucursales.set(sucs),
      error: () => {},
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    const filtros: FiltrosCompras = {
      id_proveedor: this.filtroProveedor(),
      id_sucursal: this.filtroSucursal(),
      limit: 100,
    };

    this.compraService.listar(filtros).subscribe({
      next: (lista) => {
        this.compras.set(lista);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.errorCarga.set(err.message);
      },
    });
  }

  alCambiarProveedor(evento: Event): void {
    const val = (evento.target as HTMLSelectElement).value;
    this.filtroProveedor.set(val === '' ? null : Number(val));
    this.cargar();
  }

  alCambiarSucursal(evento: Event): void {
    const val = (evento.target as HTMLSelectElement).value;
    this.filtroSucursal.set(val === '' ? null : Number(val));
    this.cargar();
  }

  abrirDetalle(idCompra: number): void {
    this.idCompraSeleccionada.set(idCompra);
    this.modalDetalleAbierto.set(true);
  }

  cerrarDetalle(): void {
    this.modalDetalleAbierto.set(false);
    this.idCompraSeleccionada.set(null);
  }
}
