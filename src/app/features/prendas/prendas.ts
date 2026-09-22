/**
 * =============================================================================
 * FASHIONSTORE - ADMINISTRACIÓN DE PRENDAS (CU08)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Panel administrativo del catálogo maestro: tabla compacta con foto, código,
 * precio, categoría y stock, más el modal de alta/edición. El alta construye
 * una matriz de variantes (talla/color) mediante un FormArray.
 *
 * El listado NO carga las variantes de cada prenda: el backend las omite en el
 * GET general para no disparar una consulta por fila (RNF02). El detalle se
 * obtiene con GET /api/prendas/{id}, pero aquí no es necesario pintarlo.
 * =============================================================================
 */

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { PrendaService } from '../../core/services/prenda.service';
import { CategoriaService } from '../../core/services/categoria.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import {
  Categoria,
  Color,
  Prenda,
  Talla,
} from '../../core/models/catalogo.model';
import { PrendaModal } from './prenda-modal/prenda-modal';

@Component({
  selector: 'app-prendas',
  imports: [PrendaModal],
  templateUrl: './prendas.html',
  styleUrl: './prendas.scss',
})
export class Prendas implements OnInit, OnDestroy {
  private readonly prendaService = inject(PrendaService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly notificacion = inject(NotificacionService);

  // ---------------------------------------------------------------------------
  // ESTADO
  // ---------------------------------------------------------------------------

  /** Prendas descargadas del backend (sin sus variantes). */
  readonly prendas = signal<Prenda[]>([]);

  /** Catálogos auxiliares que alimentan el formulario del modal. */
  readonly categorias = signal<Categoria[]>([]);
  readonly tallas = signal<Talla[]>([]);
  readonly colores = signal<Color[]>([]);

  /** Texto del buscador (SKU o nombre). */
  readonly busqueda = signal('');

  /** true mientras se descarga la tabla. */
  readonly cargando = signal(true);

  /** Error de carga de la tabla; null si todo fue bien. */
  readonly errorCarga = signal<string | null>(null);

  /** true cuando el modal está abierto. */
  readonly modalAbierto = signal(false);

  /** Prenda en edición; null en modo alta. */
  readonly prendaEnEdicion = signal<Prenda | null>(null);

  /** Fila cuya inhabilitación o reactivación está en curso. */
  readonly inhabilitandoId = signal<number | null>(null);

  /** Flujo del buscador con espera antirrebote. */
  private readonly terminoBusqueda = new Subject<string>();

  /** Señal de cierre que cancela la suscripción del buscador. */
  private readonly destruido = new Subject<void>();

  // ---------------------------------------------------------------------------
  // CONSTRUCTOR
  // ---------------------------------------------------------------------------

  constructor() {
    this.terminoBusqueda
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destruido))
      .subscribe((termino) => this.consultar(termino));
  }

  // ---------------------------------------------------------------------------
  // CICLO DE VIDA
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.cargar();
    this.cargarAuxiliares();
  }

  ngOnDestroy(): void {
    this.destruido.next();
    this.destruido.complete();
  }

  // ---------------------------------------------------------------------------
  // CARGA DE DATOS
  // ---------------------------------------------------------------------------

  /**
   * Recarga la tabla con el filtro actual.
   *
   * @returns void
   */
  cargar(): void {
    this.consultar(this.busqueda());
  }

  /**
   * Consulta las prendas al backend aplicando el texto de búsqueda.
   *
   * @param termino Texto libre sobre SKU o nombre.
   * @returns void
   */
  private consultar(termino: string): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.prendaService.listar(termino || undefined).subscribe({
      next: (lista) => {
        this.prendas.set(lista);
        this.cargando.set(false);
      },
      error: (error: Error) => {
        this.cargando.set(false);
        this.errorCarga.set(error.message);
      },
    });
  }

  /**
   * Descarga categorías, tallas y colores para el formulario del modal.
   * Un fallo aquí no bloquea la tabla: se avisa y la pantalla sigue siendo
   * útil para consultar.
   *
   * @returns void
   */
  private cargarAuxiliares(): void {
    this.categoriaService.listar().subscribe({
      next: (lista) => this.categorias.set(lista),
      error: (error: Error) =>
        this.notificacion.error(`No se pudieron cargar las categorías: ${error.message}`),
    });

    this.prendaService.listarTallas().subscribe({
      next: (lista) => this.tallas.set(lista),
      error: (error: Error) =>
        this.notificacion.error(`No se pudieron cargar las tallas: ${error.message}`),
    });

    this.prendaService.listarColores().subscribe({
      next: (lista) => this.colores.set(lista),
      error: (error: Error) =>
        this.notificacion.error(`No se pudieron cargar los colores: ${error.message}`),
    });
  }

  // ---------------------------------------------------------------------------
  // BUSCADOR
  // ---------------------------------------------------------------------------

  /**
   * Captura la escritura del buscador y encola el término para su consulta
   * antirrebote.
   *
   * @param evento Evento de entrada del campo de texto.
   * @returns void
   */
  alBuscar(evento: Event): void {
    const termino = (evento.target as HTMLInputElement).value;
    this.busqueda.set(termino);
    this.terminoBusqueda.next(termino);
  }

  // ---------------------------------------------------------------------------
  // MODAL
  // ---------------------------------------------------------------------------

  /** Abre el modal en modo alta. */
  abrirAlta(): void {
    this.prendaEnEdicion.set(null);
    this.modalAbierto.set(true);
  }

  /** Abre el modal en modo edición con la prenda indicada. */
  abrirEdicion(prenda: Prenda): void {
    this.prendaEnEdicion.set(prenda);
    this.modalAbierto.set(true);
  }

  /** Cierra el modal sin guardar cambios. */
  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.prendaEnEdicion.set(null);
  }

  /**
   * Reacciona al guardado exitoso del modal: cierra la ventana, avisa y
   * recarga la tabla.
   *
   * @param mensaje Texto de confirmación emitido por el modal.
   * @returns void
   */
  alGuardar(mensaje: string): void {
    this.cerrarModal();
    this.notificacion.exito(mensaje);
    this.cargar();
  }

  // ---------------------------------------------------------------------------
  // INHABILITACIÓN / REACTIVACIÓN LÓGICA
  // ---------------------------------------------------------------------------

  /**
   * Retira una prenda del catálogo mediante baja lógica.
   *
   * @param prenda Prenda a retirar.
   * @returns void
   */
  inhabilitar(prenda: Prenda): void {
    this.inhabilitandoId.set(prenda.id_prenda);

    this.prendaService.inhabilitar(prenda.id_prenda).subscribe({
      next: (respuesta) => {
        this.inhabilitandoId.set(null);
        this.notificacion.exito(respuesta.mensaje);
        this.cargar();
      },
      error: (error: Error) => {
        this.inhabilitandoId.set(null);
        this.notificacion.error(error.message);
      },
    });
  }

  /**
   * Reactiva una prenda devolviéndola al estado 'Activo'.
   *
   * @param prenda Prenda a reactivar.
   * @returns void
   */
  reactivar(prenda: Prenda): void {
    this.inhabilitandoId.set(prenda.id_prenda);

    this.prendaService.actualizar(prenda.id_prenda, { estado: 'Activo' }).subscribe({
      next: (actualizada) => {
        this.inhabilitandoId.set(null);
        this.notificacion.exito(
          `La prenda ${actualizada.nombre} fue reactivada.`,
        );
        this.cargar();
      },
      error: (error: Error) => {
        this.inhabilitandoId.set(null);
        this.notificacion.error(error.message);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // AYUDAS DE PRESENTACIÓN
  // ---------------------------------------------------------------------------

  /**
   * Formatea un precio (que puede llegar como string o número) con dos decimales.
   *
   * @param valor Precio base de la prenda.
   * @returns Texto con el precio redondeado a dos decimales.
   */
  formatearPrecio(valor: string | number | null): string {
    return Number(valor ?? 0).toFixed(2);
  }
}
