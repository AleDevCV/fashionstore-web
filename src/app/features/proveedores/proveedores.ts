/**
 * =============================================================================
 * FASHIONSTORE - DIRECTORIO DE PROVEEDORES (CU12)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Vista principal de administración de proveedores de la cadena de suministro:
 * - Tabla ERP de alta densidad con NIT, razón social y datos de contacto.
 * - Búsqueda reactiva con rebote (debounce 350ms) enviada al servidor.
 * - Modales accesibles para alta, edición y eliminación protegida (409).
 * =============================================================================
 */

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { ProveedorService } from '../../core/services/proveedor.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Proveedor } from '../../core/models/proveedor.model';
import { ProveedorModal } from './proveedor-modal/proveedor-modal';
import { ProveedorEliminarModal } from './proveedor-eliminar-modal/proveedor-eliminar-modal';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [ProveedorModal, ProveedorEliminarModal],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.scss',
})
export class Proveedores implements OnInit, OnDestroy {
  private readonly proveedorService = inject(ProveedorService);
  private readonly notificacion = inject(NotificacionService);

  // ---------------------------------------------------------------------------
  // ESTADO REACTIVO
  // ---------------------------------------------------------------------------

  readonly proveedores = signal<Proveedor[]>([]);
  readonly busqueda = signal('');
  readonly cargando = signal(true);
  readonly errorCarga = signal<string | null>(null);

  /** Control del modal de alta / edición */
  readonly modalAbierto = signal(false);
  readonly proveedorEnEdicion = signal<Proveedor | null>(null);

  /** Control del diálogo de confirmación de eliminación */
  readonly modalEliminarAbierto = signal(false);
  readonly proveedorAEliminar = signal<Proveedor | null>(null);

  private readonly terminoBusqueda = new Subject<string>();
  private readonly destruido = new Subject<void>();

  constructor() {
    this.terminoBusqueda
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destruido))
      .subscribe((termino) => this.consultar(termino));
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destruido.next();
    this.destruido.complete();
  }

  // ---------------------------------------------------------------------------
  // CARGA DE DATOS
  // ---------------------------------------------------------------------------

  cargar(): void {
    this.consultar(this.busqueda());
  }

  private consultar(termino: string): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.proveedorService.listar(termino || undefined).subscribe({
      next: (lista) => {
        this.proveedores.set(lista);
        this.cargando.set(false);
      },
      error: (error: Error) => {
        this.cargando.set(false);
        this.errorCarga.set(error.message);
      },
    });
  }

  alBuscar(evento: Event): void {
    const termino = (evento.target as HTMLInputElement).value;
    this.busqueda.set(termino);
    this.terminoBusqueda.next(termino);
  }

  // ---------------------------------------------------------------------------
  // GESTIÓN DE MODALES
  // ---------------------------------------------------------------------------

  abrirAlta(): void {
    this.proveedorEnEdicion.set(null);
    this.modalAbierto.set(true);
  }

  abrirEdicion(proveedor: Proveedor): void {
    this.proveedorEnEdicion.set(proveedor);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.proveedorEnEdicion.set(null);
  }

  alGuardar(mensaje: string): void {
    this.cerrarModal();
    this.notificacion.exito(mensaje);
    this.cargar();
  }

  abrirEliminar(proveedor: Proveedor): void {
    this.proveedorAEliminar.set(proveedor);
    this.modalEliminarAbierto.set(true);
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto.set(false);
    this.proveedorAEliminar.set(null);
  }

  alEliminar(mensaje: string): void {
    this.cerrarModalEliminar();
    this.notificacion.exito(mensaje);
    this.cargar();
  }
}
