/**
 * =============================================================================
 * FASHIONSTORE - GESTIÓN DE FICHAS DE CLIENTES (CU05)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Pantalla principal del CU05: tabla de alta densidad, buscador reactivo en
 * tiempo real (por CI o nombre) y modal de alta/edición con borrado lógico.
 *
 * El buscador se resuelve EN EL SERVIDOR mediante el parámetro `busqueda` de
 * GET /api/clientes/. Para no disparar una petición por pulsación, el texto se
 * canaliza por un Subject con `debounceTime`: solo la escritura "asentada"
 * llega al backend (RNF02).
 * =============================================================================
 */

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { ClienteService } from '../../core/services/cliente.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Cliente } from '../../core/models/catalogo.model';
import { ClienteModal } from './cliente-modal/cliente-modal';

@Component({
  selector: 'app-clientes',
  imports: [ClienteModal],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss',
})
export class Clientes implements OnInit, OnDestroy {
  private readonly clienteService = inject(ClienteService);
  private readonly notificacion = inject(NotificacionService);

  // ---------------------------------------------------------------------------
  // ESTADO
  // ---------------------------------------------------------------------------

  /** Fichas descargadas del backend. */
  readonly clientes = signal<Cliente[]>([]);

  /** Texto del buscador reactivo (CI o nombre). */
  readonly busqueda = signal('');

  /** Filtro de estado; null muestra todas las fichas. */
  readonly estado = signal<string | null>(null);

  /** true mientras se descarga la tabla. */
  readonly cargando = signal(true);

  /** Error de carga de la tabla; null si todo fue bien. */
  readonly errorCarga = signal<string | null>(null);

  /** true cuando el modal está abierto. */
  readonly modalAbierto = signal(false);

  /** Cliente en edición; null cuando el modal opera en modo alta. */
  readonly clienteEnEdicion = signal<Cliente | null>(null);

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
  }

  ngOnDestroy(): void {
    this.destruido.next();
    this.destruido.complete();
  }

  // ---------------------------------------------------------------------------
  // CARGA Y CONSULTA
  // ---------------------------------------------------------------------------

  /**
   * Recarga la tabla con el filtro actual.
   * Se usa al entrar a la vista y tras cada guardado o baja lógica.
   *
   * @returns void
   */
  cargar(): void {
    this.consultar(this.busqueda());
  }

  /**
   * Consulta al backend aplicando término de búsqueda y filtro de estado.
   *
   * @param termino Texto libre sobre cédula o nombre completo.
   * @returns void
   */
  private consultar(termino: string): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.clienteService
      .listar(termino || undefined, this.estado() ?? undefined)
      .subscribe({
        next: (lista) => {
          this.clientes.set(lista);
          this.cargando.set(false);
        },
        error: (error: Error) => {
          this.cargando.set(false);
          this.errorCarga.set(error.message);
        },
      });
  }

  // ---------------------------------------------------------------------------
  // BUSCADOR Y FILTRO
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

  /**
   * Aplica el filtro de estado seleccionado en el desplegable.
   *
   * @param evento Evento de cambio del desplegable.
   * @returns void
   */
  alCambiarEstado(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.estado.set(valor === '' ? null : valor);
    this.consultar(this.busqueda());
  }

  // ---------------------------------------------------------------------------
  // MODAL
  // ---------------------------------------------------------------------------

  /** Abre el modal en modo alta. */
  abrirAlta(): void {
    this.clienteEnEdicion.set(null);
    this.modalAbierto.set(true);
  }

  /** Abre el modal en modo edición con la ficha indicada. */
  abrirEdicion(cliente: Cliente): void {
    this.clienteEnEdicion.set(cliente);
    this.modalAbierto.set(true);
  }

  /** Cierra el modal sin guardar cambios. */
  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.clienteEnEdicion.set(null);
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
   * Da de baja lógica a un cliente.
   * El backend no borra la fila: cambia su estado a 'Inactivo'.
   *
   * @param cliente Ficha a inhabilitar.
   * @returns void
   */
  inhabilitar(cliente: Cliente): void {
    this.inhabilitandoId.set(cliente.id_cliente);

    this.clienteService.inhabilitar(cliente.id_cliente).subscribe({
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
   * Reactiva una ficha devolviéndola al estado 'Activo'.
   *
   * @param cliente Ficha a reactivar.
   * @returns void
   */
  reactivar(cliente: Cliente): void {
    this.inhabilitandoId.set(cliente.id_cliente);

    this.clienteService
      .actualizar(cliente.id_cliente, { estado: 'Activo' })
      .subscribe({
        next: (actualizado) => {
          this.inhabilitandoId.set(null);
          this.notificacion.exito(
            `La ficha de ${actualizado.nombre_completo} fue reactivada.`,
          );
          this.cargar();
        },
        error: (error: Error) => {
          this.inhabilitandoId.set(null);
          this.notificacion.error(error.message);
        },
      });
  }
}
