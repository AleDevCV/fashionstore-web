/**
 * =============================================================================
 * FASHIONSTORE - MONITOREO DE INVENTARIO MULTISUCURSAL (CU10)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Vista de supervisión consolidada de niveles de existencias por sucursal física:
 * - 3 Tarjetas resumen de KPIs ejecutivos (Total existencias, Bajo stock 1-4, Agotadas 0).
 * - Selectores dinámicos combinados: Sucursal, Categoría, Temporada y Estado.
 * - Buscador reactivo por SKU o nombre de prenda con rebote (debounce 350ms).
 * - Grilla de alta densidad con badges cromáticos:
 *   - Verde: Óptimo (>= 5)
 *   - Amarillo: Bajo stock (1 a 4)
 *   - Rojo: Agotado (0)
 * - Enlace directo de reposición a Kardex / Movimientos de Inventario (CU11).
 * =============================================================================
 */

import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, forkJoin, takeUntil } from 'rxjs';

import { InventarioService } from '../../core/services/inventario.service';
import { GeografiaService } from '../../core/services/geografia.service';
import { CategoriaService } from '../../core/services/categoria.service';
import { TemporadaService } from '../../core/services/temporada.service';
import { Sucursal, Categoria } from '../../core/models/catalogo.model';
import { Temporada } from '../../core/models/temporada.model';
import {
  EstadoStock,
  MonitoreoItem,
  ResumenInventario,
  clasificarStock,
} from '../../core/models/inventario-monitoreo.model';

@Component({
  selector: 'app-inventario-monitoreo',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './inventario-monitoreo.html',
  styleUrl: './inventario-monitoreo.scss',
})
export class InventarioMonitoreo implements OnInit, OnDestroy {
  private readonly inventarioService = inject(InventarioService);
  private readonly geografiaService = inject(GeografiaService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly temporadaService = inject(TemporadaService);

  // ---------------------------------------------------------------------------
  // ESTADO REACTIVO
  // ---------------------------------------------------------------------------

  readonly cargando = signal(true);
  readonly errorCarga = signal<string | null>(null);

  readonly items = signal<MonitoreoItem[]>([]);
  readonly resumen = signal<ResumenInventario | null>(null);

  // Catálogos auxiliares de filtrado
  readonly sucursales = signal<Sucursal[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly temporadas = signal<Temporada[]>([]);

  // Filtros activos
  readonly filtroSucursal = signal<number | null>(null);
  readonly filtroCategoria = signal<number | null>(null);
  readonly filtroTemporada = signal<number | null>(null);
  readonly filtroEstado = signal<string>('Todos');
  readonly busqueda = signal<string>('');

  private readonly terminoBusqueda = new Subject<string>();
  private readonly destruido = new Subject<void>();

  // ---------------------------------------------------------------------------
  // COMPUTED KPIS
  // ---------------------------------------------------------------------------

  /**
   * Resumen ejecutivo derivado del backend o calculado reactivamente sobre la grilla.
   */
  readonly kpis = computed(() => {
    const r = this.resumen();
    if (r && r.total_stock !== undefined) {
      return {
        total_existencias: r.total_stock_global ?? r.total_stock ?? 0,
        variantes_stock_bajo: r.variantes_bajo_stock ?? r.total_bajo ?? 0,
        variantes_agotadas: r.variantes_agotadas ?? r.total_agotado ?? 0,
        total_variantes: r.total_variantes ?? 0,
        total_prendas: r.total_prendas_distintas ?? r.total_prendas ?? 0,
      };
    }

    // Fallback: cálculo directo desde los items
    const lista = this.items();
    const total_existencias = lista.reduce((acc, curr) => acc + (curr.stock || 0), 0);
    const variantes_stock_bajo = lista.filter(
      (i) => i.stock >= 1 && i.stock <= 4,
    ).length;
    const variantes_agotadas = lista.filter((i) => (i.stock || 0) === 0).length;

    return {
      total_existencias,
      variantes_stock_bajo,
      variantes_agotadas,
      total_variantes: lista.length,
      total_prendas: new Set(lista.map((i) => i.id_prenda)).size,
    };
  });

  constructor() {
    this.terminoBusqueda
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destruido))
      .subscribe((termino) => {
        this.busqueda.set(termino);
        this.cargarDatos();
      });
  }

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destruido.next();
    this.destruido.complete();
  }

  // ---------------------------------------------------------------------------
  // CARGA DE DATOS
  // ---------------------------------------------------------------------------

  private cargarCatalogos(): void {
    this.geografiaService.listarSucursales().subscribe({
      next: (sucursales) => this.sucursales.set(sucursales),
      error: () => {}, // Tolerancia si la lista falla
    });

    this.categoriaService.listar().subscribe({
      next: (cats) => this.categorias.set(cats),
      error: () => {},
    });

    this.temporadaService.listar().subscribe({
      next: (temps) => this.temporadas.set(temps),
      error: () => {},
    });
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    const sucursalId = this.filtroSucursal();
    const categoriaId = this.filtroCategoria();
    const temporadaId = this.filtroTemporada();
    const busq = this.busqueda();
    const estado = this.filtroEstado();

    forkJoin({
      resumen: this.inventarioService.obtenerResumen(
        sucursalId,
        categoriaId,
        temporadaId,
        busq || undefined,
      ),
      monitoreo: this.inventarioService.monitorear({
        id_sucursal: sucursalId,
        id_categoria: categoriaId,
        id_temporada: temporadaId,
        busqueda: busq || undefined,
        estado_stock: estado !== 'Todos' ? (estado as EstadoStock) : undefined,
      }),
    }).subscribe({
      next: ({ resumen, monitoreo }) => {
        this.resumen.set(resumen);
        this.items.set(monitoreo);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.errorCarga.set(err.message);
      },
    });
  }

  cargarTodo(): void {
    this.cargarCatalogos();
    this.cargarDatos();
  }

  // ---------------------------------------------------------------------------
  // CONTROLADORES DE EVENTOS
  // ---------------------------------------------------------------------------

  alBuscar(evento: Event): void {
    const termino = (evento.target as HTMLInputElement).value;
    this.terminoBusqueda.next(termino);
  }

  alCambiarSucursal(evento: Event): void {
    const val = (evento.target as HTMLSelectElement).value;
    this.filtroSucursal.set(val ? Number(val) : null);
    this.cargarDatos();
  }

  alCambiarCategoria(evento: Event): void {
    const val = (evento.target as HTMLSelectElement).value;
    this.filtroCategoria.set(val ? Number(val) : null);
    this.cargarDatos();
  }

  alCambiarTemporada(evento: Event): void {
    const val = (evento.target as HTMLSelectElement).value;
    this.filtroTemporada.set(val ? Number(val) : null);
    this.cargarDatos();
  }

  alCambiarEstado(evento: Event): void {
    const val = (evento.target as HTMLSelectElement).value;
    this.filtroEstado.set(val);
    this.cargarDatos();
  }

  // ---------------------------------------------------------------------------
  // CLASIFICACIÓN CROMÁTICA DE STOCK
  // ---------------------------------------------------------------------------

  obtenerClasificacion(stock: number) {
    return clasificarStock(stock);
  }
}
