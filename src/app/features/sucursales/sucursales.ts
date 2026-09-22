/**
 * =============================================================================
 * FASHIONSTORE - CIUDADES Y SUCURSALES (CU06)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Pantalla del módulo geográfico: lista las ciudades de cobertura (con alta
 * rápida) y las sucursales físicas (con modal de alta/edición que las asocia
 * a una ciudad).
 *
 * Solo el Administrador llega a esta sección: la ruta está protegida por
 * `rolGuard` y, además, el backend exige el rol para las escrituras.
 * =============================================================================
 */

import { Component, OnInit, inject, signal } from '@angular/core';

import { GeografiaService } from '../../core/services/geografia.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Ciudad, Sucursal } from '../../core/models/catalogo.model';
import { SucursalModal } from './sucursal-modal/sucursal-modal';

@Component({
  selector: 'app-sucursales',
  imports: [SucursalModal],
  templateUrl: './sucursales.html',
  styleUrl: './sucursales.scss',
})
export class Sucursales implements OnInit {
  private readonly geografiaService = inject(GeografiaService);
  private readonly notificacion = inject(NotificacionService);

  // ---------------------------------------------------------------------------
  // ESTADO
  // ---------------------------------------------------------------------------

  /** Sucursales físicas descargadas del backend. */
  readonly sucursales = signal<Sucursal[]>([]);

  /** Ciudades de cobertura, usadas por la tabla y el desplegable del modal. */
  readonly ciudades = signal<Ciudad[]>([]);

  /** true mientras se descarga la tabla de sucursales. */
  readonly cargando = signal(true);

  /** Error de carga de las sucursales; null si todo fue bien. */
  readonly errorCarga = signal<string | null>(null);

  /** true cuando el modal está abierto. */
  readonly modalAbierto = signal(false);

  /** Sucursal en edición; null en modo alta. */
  readonly sucursalEnEdicion = signal<Sucursal | null>(null);

  /** Texto del formulario de alta rápida de ciudad. */
  readonly nuevaCiudad = signal('');

  /** true mientras se registra una ciudad nueva. */
  readonly agregandoCiudad = signal(false);

  // ---------------------------------------------------------------------------
  // CICLO DE VIDA
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.cargarSucursales();
    this.cargarCiudades();
  }

  // ---------------------------------------------------------------------------
  // CARGA DE DATOS
  // ---------------------------------------------------------------------------

  /**
   * Descarga la lista de sucursales con su ciudad y encargado resueltos.
   *
   * @returns void
   */
  cargarSucursales(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.geografiaService.listarSucursales().subscribe({
      next: (lista) => {
        this.sucursales.set(lista);
        this.cargando.set(false);
      },
      error: (error: Error) => {
        this.cargando.set(false);
        this.errorCarga.set(error.message);
      },
    });
  }

  /**
   * Descarga las ciudades de cobertura para la tabla y el modal.
   * Un fallo aquí no bloquea la tabla de sucursales: se avisa y se sigue.
   *
   * @returns void
   */
  cargarCiudades(): void {
    this.geografiaService.listarCiudades().subscribe({
      next: (lista) => this.ciudades.set(lista),
      error: (error: Error) =>
        this.notificacion.error(`No se pudieron cargar las ciudades: ${error.message}`),
    });
  }

  // ---------------------------------------------------------------------------
  // ALTA RÁPIDA DE CIUDAD
  // ---------------------------------------------------------------------------

  /**
   * Captura el nombre de la ciudad en el formulario de alta rápida.
   *
   * @param evento Evento de entrada del campo de texto.
   * @returns void
   */
  alCambiarCiudad(evento: Event): void {
    this.nuevaCiudad.set((evento.target as HTMLInputElement).value);
  }

  /**
   * Registra una ciudad nueva y refresca el listado.
   *
   * @returns void
   */
  agregarCiudad(): void {
    const nombre = this.nuevaCiudad().trim();
    if (!nombre) {
      return;
    }

    this.agregandoCiudad.set(true);

    this.geografiaService.crearCiudad(nombre).subscribe({
      next: (ciudad) => {
        this.agregandoCiudad.set(false);
        this.nuevaCiudad.set('');
        this.notificacion.exito(`La ciudad ${ciudad.nombre} fue registrada.`);
        this.cargarCiudades();
      },
      error: (error: Error) => {
        this.agregandoCiudad.set(false);
        this.notificacion.error(error.message);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // MODAL
  // ---------------------------------------------------------------------------

  /** Abre el modal en modo alta. */
  abrirAlta(): void {
    this.sucursalEnEdicion.set(null);
    this.modalAbierto.set(true);
  }

  /** Abre el modal en modo edición con la sucursal indicada. */
  abrirEdicion(sucursal: Sucursal): void {
    this.sucursalEnEdicion.set(sucursal);
    this.modalAbierto.set(true);
  }

  /** Cierra el modal sin guardar cambios. */
  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.sucursalEnEdicion.set(null);
  }

  /**
   * Reacciona al guardado exitoso del modal: cierra, avisa y refresca ambas
   * tablas (la de sucursales y el conteo de ciudades).
   *
   * @param mensaje Texto de confirmación emitido por el modal.
   * @returns void
   */
  alGuardar(mensaje: string): void {
    this.cerrarModal();
    this.notificacion.exito(mensaje);
    this.cargarSucursales();
    this.cargarCiudades();
  }
}
