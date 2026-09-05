/**
 * =============================================================================
 * FASHIONSTORE - CATÁLOGO PÚBLICO (CU14)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Vitrina pública de prendas: cuadrícula de tarjetas y panel lateral de
 * filtros dinámicos. Vive FUERA del layout administrativo y consume el
 * endpoint /api/catalogo SIN token, de modo que cualquier visitante puede
 * explorar la colección antes de autenticarse.
 *
 * El detalle de disponibilidad por sucursal se abre en un modal que consume
 * GET /api/catalogo/{id} y adjunta el desglose de stock por talla, color y
 * tienda.
 * =============================================================================
 */

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { CatalogoService } from '../../core/services/catalogo.service';
import {
  FiltrosDisponibles,
  PrendaCatalogo,
} from '../../core/models/catalogo.model';
import { PrendaDetalle } from './prenda-detalle/prenda-detalle';

/** Tamaño de página de la vitrina. */
const TAMANO_PAGINA = 12;

@Component({
  selector: 'app-catalogo',
  imports: [RouterLink, PrendaDetalle],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss',
})
export class Catalogo implements OnInit, OnDestroy {
  private readonly catalogoService = inject(CatalogoService);

  // ---------------------------------------------------------------------------
  // ESTADO
  // ---------------------------------------------------------------------------

  /** Opciones para construir la barra de filtros (categorías, tallas…). */
  readonly filtros = signal<FiltrosDisponibles | null>(null);

  /** Página actual de prendas. */
  readonly prendas = signal<PrendaCatalogo[]>([]);

  /** Total de prendas que cumplen los filtros, sin paginar. */
  readonly total = signal(0);

  /** true mientras se descarga la vitrina. */
  readonly cargando = signal(true);

  /** Error de carga; null si todo fue bien. */
  readonly errorCarga = signal<string | null>(null);

  // Filtros activos
  readonly busqueda = signal('');
  readonly idCategoria = signal<number | null>(null);
  readonly genero = signal<string | null>(null);
  readonly idTalla = signal<number | null>(null);
  readonly idColor = signal<number | null>(null);
  readonly precioMin = signal<number | null>(null);
  readonly precioMax = signal<number | null>(null);
  readonly desplazamiento = signal(0);

  /** Tamaño de página fijo. */
  readonly limite = TAMANO_PAGINA;

  /** id de la prenda cuyo detalle se muestra en el modal. */
  readonly prendaSeleccionada = signal<number | null>(null);

  /** Flujo del buscador con espera antirrebote. */
  private readonly terminoBusqueda = new Subject<string>();

  /** Señal de cierre que cancela la suscripción del buscador. */
  private readonly destruido = new Subject<void>();

  // ---------------------------------------------------------------------------
  // CONSTRUCTOR
  // ---------------------------------------------------------------------------

  constructor() {
    this.terminoBusqueda
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destruido))
      .subscribe(() => {
        this.desplazamiento.set(0);
        this.consultar();
      });
  }

  // ---------------------------------------------------------------------------
  // CICLO DE VIDA
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.cargarFiltros();
    this.consultar();
  }

  ngOnDestroy(): void {
    this.destruido.next();
    this.destruido.complete();
  }

  // ---------------------------------------------------------------------------
  // CARGA DE DATOS
  // ---------------------------------------------------------------------------

  /**
   * Descarga las opciones de la barra de filtros en una sola llamada.
   *
   * @returns void
   */
  private cargarFiltros(): void {
    this.catalogoService.obtenerFiltros().subscribe({
      next: (filtros) => this.filtros.set(filtros),
      error: (error: Error) => this.errorCarga.set(error.message),
    });
  }

  /**
   * Consulta la página actual del catálogo aplicando los filtros activos.
   *
   * @returns void
   */
  consultar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.catalogoService
      .consultar({
        busqueda: this.busqueda() || undefined,
        id_categoria: this.idCategoria(),
        genero: this.genero(),
        id_talla: this.idTalla(),
        id_color: this.idColor(),
        precio_min: this.precioMin(),
        precio_max: this.precioMax(),
        limite: this.limite,
        desplazamiento: this.desplazamiento(),
      })
      .subscribe({
        next: (respuesta) => {
          this.prendas.set(respuesta.prendas);
          this.total.set(respuesta.total);
          this.cargando.set(false);
        },
        error: (error: Error) => {
          this.cargando.set(false);
          this.errorCarga.set(error.message);
        },
      });
  }

  // ---------------------------------------------------------------------------
  // INTERACCIONES DE LOS FILTROS
  // ---------------------------------------------------------------------------

  /**
   * Captura la escritura del buscador y encola el término con antirrebote.
   *
   * @param evento Evento de entrada del campo de texto.
   * @returns void
   */
  alBuscar(evento: Event): void {
    const termino = (evento.target as HTMLInputElement).value;
    this.busqueda.set(termino);
    this.terminoBusqueda.next(termino);
  }

  /** Aplica el filtro de categoría y reinicia la paginación. */
  cambiarCategoria(evento: Event): void {
    this.idCategoria.set(this.leerNumero(evento));
    this.aplicar();
  }

  /** Aplica el filtro de género y reinicia la paginación. */
  cambiarGenero(evento: Event): void {
    this.genero.set(this.leerTexto(evento));
    this.aplicar();
  }

  /** Aplica el filtro de talla y reinicia la paginación. */
  cambiarTalla(evento: Event): void {
    this.idTalla.set(this.leerNumero(evento));
    this.aplicar();
  }

  /** Aplica el filtro de color y reinicia la paginación. */
  cambiarColor(evento: Event): void {
    this.idColor.set(this.leerNumero(evento));
    this.aplicar();
  }

  /** Aplica el precio mínimo y reinicia la paginación. */
  cambiarPrecioMin(evento: Event): void {
    this.precioMin.set(this.leerNumero(evento));
    this.aplicar();
  }

  /** Aplica el precio máximo y reinicia la paginación. */
  cambiarPrecioMax(evento: Event): void {
    this.precioMax.set(this.leerNumero(evento));
    this.aplicar();
  }

  /**
   * Restaura todos los filtros a su estado inicial y recarga la vitrina.
   *
   * @returns void
   */
  limpiarFiltros(): void {
    this.busqueda.set('');
    this.idCategoria.set(null);
    this.genero.set(null);
    this.idTalla.set(null);
    this.idColor.set(null);
    this.precioMin.set(null);
    this.precioMax.set(null);
    this.desplazamiento.set(0);
    this.consultar();
  }

  /**
   * Reinicia la paginación y vuelve a consultar.
   *
   * @returns void
   */
  private aplicar(): void {
    this.desplazamiento.set(0);
    this.consultar();
  }

  // ---------------------------------------------------------------------------
  // PAGINACIÓN
  // ---------------------------------------------------------------------------

  /** true si existe una página anterior. */
  get hayPaginaAnterior(): boolean {
    return this.desplazamiento() > 0;
  }

  /** true si existe una página siguiente. */
  get hayPaginaSiguiente(): boolean {
    return this.desplazamiento() + this.limite < this.total();
  }

  /** Retrocede una página. */
  paginaAnterior(): void {
    if (!this.hayPaginaAnterior) {
      return;
    }
    this.desplazamiento.update((v) => Math.max(0, v - this.limite));
    this.consultar();
  }

  /** Avanza una página. */
  paginaSiguiente(): void {
    if (!this.hayPaginaSiguiente) {
      return;
    }
    this.desplazamiento.update((v) => v + this.limite);
    this.consultar();
  }

  /**
   * Texto del rango visible para el paginador, p. ej. "1–12 de 37".
   *
   * @returns Texto con el rango de resultados actuales.
   */
  rangoActual(): string {
    if (this.total() === 0) {
      return '0 de 0';
    }
    const desde = this.desplazamiento() + 1;
    const hasta = Math.min(this.desplazamiento() + this.limite, this.total());
    return `${desde}–${hasta} de ${this.total()}`;
  }

  // ---------------------------------------------------------------------------
  // DETALLE
  // ---------------------------------------------------------------------------

  /**
   * Abre el modal de detalle de una prenda.
   *
   * @param idPrenda Prenda seleccionada en la cuadrícula.
   * @returns void
   */
  abrirDetalle(idPrenda: number): void {
    this.prendaSeleccionada.set(idPrenda);
  }

  /** Cierra el modal de detalle. */
  cerrarDetalle(): void {
    this.prendaSeleccionada.set(null);
  }

  // ---------------------------------------------------------------------------
  // AYUDAS DE PRESENTACIÓN Y LECTURA
  // ---------------------------------------------------------------------------

  /**
   * Formatea un precio (string o número) con dos decimales.
   *
   * @param valor Precio de la prenda o variante.
   * @returns Texto con el precio redondeado a dos decimales.
   */
  formatearPrecio(valor: string | number | null | undefined): string {
    return Number(valor ?? 0).toFixed(2);
  }

  /**
   * Lee un valor numérico de un control; devuelve null si está vacío.
   *
   * @param evento Evento de cambio del control.
   * @returns Número leído o null.
   */
  private leerNumero(evento: Event): number | null {
    const valor = (evento.target as HTMLSelectElement | HTMLInputElement).value;
    return valor === '' || valor === null ? null : Number(valor);
  }

  /**
   * Lee un texto de un desplegable; devuelve null si está vacío.
   *
   * @param evento Evento de cambio del desplegable.
   * @returns Texto leído o null.
   */
  private leerTexto(evento: Event): string | null {
    const valor = (evento.target as HTMLSelectElement).value;
    return valor === '' ? null : valor;
  }
}
