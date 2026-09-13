/**
 * =============================================================================
 * FASHIONSTORE - FORMULARIO DE NUEVA COMPRA (CU13)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Formulario para registrar adquisiciones transaccionales a proveedores:
 * - Selección de proveedor emisor y sucursal física de destino.
 * - FormArray dinámico para múltiples líneas de variantes de prendas.
 * - Motor de cálculo reactivo en tiempo real:
 *     Subtotal = SUM(cantidad * costo_unitario)
 *     IVA = Subtotal * 0.13 (Ley 843 Bolivia)
 *     Total = Subtotal + IVA
 * - Transacción atómica en backend: incrementa inventario mediante el disparador
 *   o ejecuta rollback total ante cualquier inconsistencia.
 * =============================================================================
 */

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { CompraService } from '../../../core/services/compra.service';
import { ProveedorService } from '../../../core/services/proveedor.service';
import { GeografiaService } from '../../../core/services/geografia.service';
import { PrendaService } from '../../../core/services/prenda.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { Proveedor } from '../../../core/models/proveedor.model';
import { Sucursal } from '../../../core/models/catalogo.model';

export interface VarianteOpcionCompra {
  id_variante_prenda: number;
  sku_variante: string;
  nombre_prenda: string;
  talla: string;
  color: string;
  etiqueta: string;
}

@Component({
  selector: 'app-compra-nueva',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './compra-nueva.html',
  styleUrl: './compra-nueva.scss',
})
export class CompraNueva implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly compraService = inject(CompraService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly geografiaService = inject(GeografiaService);
  private readonly prendaService = inject(PrendaService);
  private readonly notificacion = inject(NotificacionService);
  private readonly router = inject(Router);

  // ---------------------------------------------------------------------------
  // ESTADO REACTIVO
  // ---------------------------------------------------------------------------

  readonly cargandoCatalogos = signal(true);
  readonly guardando = signal(false);
  readonly mensajeError = signal<string | null>(null);

  readonly proveedores = signal<Proveedor[]>([]);
  readonly sucursales = signal<Sucursal[]>([]);
  readonly variantes = signal<VarianteOpcionCompra[]>([]);

  /** Cálculos reactivos de liquidación */
  readonly subtotal = signal<number>(0);
  readonly iva = signal<number>(0);
  readonly total = signal<number>(0);

  formulario!: FormGroup;

  private readonly destruido = new Subject<void>();

  ngOnInit(): void {
    this.formulario = this.fb.group({
      id_proveedor: [null, [Validators.required]],
      id_sucursal: [null, [Validators.required]],
      detalles: this.fb.array([]),
    });

    // Monitorear cambios para recalcular subtotales, IVA y total en tiempo real
    this.formulario.valueChanges
      .pipe(takeUntil(this.destruido))
      .subscribe(() => this.recalcularTotales());

    this.cargarCatalogos();
  }

  ngOnDestroy(): void {
    this.destruido.next();
    this.destruido.complete();
  }

  get detalles(): FormArray {
    return this.formulario.get('detalles') as FormArray;
  }

  private cargarCatalogos(): void {
    this.cargandoCatalogos.set(true);

    this.proveedorService.listar().subscribe({
      next: (provs) => {
        this.proveedores.set(provs);
        if (provs.length > 0 && !this.formulario.value.id_proveedor) {
          this.formulario.patchValue({ id_proveedor: provs[0].id_proveedor });
        }
      },
      error: () => {},
    });

    this.geografiaService.listarSucursales().subscribe({
      next: (sucs) => {
        this.sucursales.set(sucs);
        if (sucs.length > 0 && !this.formulario.value.id_sucursal) {
          this.formulario.patchValue({ id_sucursal: sucs[0].id_sucursal });
        }
      },
      error: () => {},
    });

    this.prendaService.listar().subscribe({
      next: (prendas) => {
        const opciones: VarianteOpcionCompra[] = [];
        for (const p of prendas) {
          if (p.variantes && p.variantes.length > 0) {
            for (const v of p.variantes) {
              const talla = v.talla || 'Sin talla';
              const color = v.color || 'Sin color';
              opciones.push({
                id_variante_prenda: v.id_variante_prenda,
                sku_variante: v.sku_variante,
                nombre_prenda: p.nombre,
                talla,
                color,
                etiqueta: `${v.sku_variante} — ${p.nombre} (${talla} / ${color})`,
              });
            }
          }
        }
        this.variantes.set(opciones);
        this.cargandoCatalogos.set(false);

        // Inicializar con la primera fila si aún no hay detalles
        if (this.detalles.length === 0) {
          this.agregarItem();
        }
      },
      error: () => {
        this.cargandoCatalogos.set(false);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // GESTIÓN DEL FORMARRAY DE ÍTEMS
  // ---------------------------------------------------------------------------

  crearFilaItem(): FormGroup {
    const primeraVariante = this.variantes()[0]?.id_variante_prenda ?? null;
    return this.fb.group({
      id_variante_prenda: [primeraVariante, [Validators.required]],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      costo_unitario: [10.0, [Validators.required, Validators.min(0.01)]],
    });
  }

  agregarItem(): void {
    this.detalles.push(this.crearFilaItem());
    this.recalcularTotales();
  }

  removerItem(index: number): void {
    if (this.detalles.length > 1) {
      this.detalles.removeAt(index);
      this.recalcularTotales();
    }
  }

  subtotalFila(index: number): number {
    const item = this.detalles.at(index)?.value;
    if (!item) return 0;
    const cant = Number(item.cantidad) || 0;
    const costo = Number(item.costo_unitario) || 0;
    return cant * costo;
  }

  private recalcularTotales(): void {
    let sub = 0;
    for (let i = 0; i < this.detalles.length; i++) {
      sub += this.subtotalFila(i);
    }
    const ivaCalc = sub * 0.13;
    const totCalc = sub + ivaCalc;

    this.subtotal.set(Math.round(sub * 100) / 100);
    this.iva.set(Math.round(ivaCalc * 100) / 100);
    this.total.set(Math.round(totCalc * 100) / 100);
  }

  // ---------------------------------------------------------------------------
  // ENVÍO TRANSACCIONAL
  // ---------------------------------------------------------------------------

  guardar(): void {
    if (this.formulario.invalid || this.detalles.length === 0) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.mensajeError.set(null);

    const val = this.formulario.value;
    const items = val.detalles.map((d: { id_variante_prenda: number; cantidad: number; costo_unitario: number }) => ({
      id_variante_prenda: Number(d.id_variante_prenda),
      cantidad: Number(d.cantidad),
      costo_unitario: Number(d.costo_unitario),
    }));

    const payload = {
      id_proveedor: Number(val.id_proveedor),
      id_sucursal: Number(val.id_sucursal),
      items,
      detalles: items,
    };

    this.compraService.crear(payload).subscribe({
      next: (compraCreada) => {
        this.guardando.set(false);
        this.notificacion.exito(
          `Compra #${compraCreada.id_compra} registrada exitosamente por Bs. ${compraCreada.total.toFixed(2)}. El stock físico de la sucursal fue actualizado.`,
        );
        this.router.navigate(['/panel/compras']);
      },
      error: (error: Error) => {
        this.guardando.set(false);
        this.mensajeError.set(error.message);
      },
    });
  }
}
