/**
 * =============================================================================
 * FASHIONSTORE - GESTIÓN DE TEMPORADAS Y COLECCIONES (CU09)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Vista principal de administración de temporadas comerciales del catálogo:
 * - Tabla reactiva ERP de alta densidad con nombres, fechas y vigencia temporal.
 * - Badges cromáticos de vigencia: Activa (verde), Próxima (oro), Pasada (carbón).
 * - Búsqueda reactiva con rebote (debounce 350ms) enviada al servidor.
 * - Modales accesibles para alta, edición y eliminación protegida.
 * =============================================================================
 */

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { TemporadaService } from '../../core/services/temporada.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import {
  Temporada,
  calcularVigenciaTemporada,
} from '../../core/models/temporada.model';
import { TemporadaModal } from './temporada-modal/temporada-modal';
import { TemporadaEliminarModal } from './temporada-eliminar-modal/temporada-eliminar-modal';

@Component({
  selector: 'app-temporadas',
  standalone: true,
  imports: [DatePipe, TemporadaModal, TemporadaEliminarModal],
  templateUrl: './temporadas.html',
  styleUrl: './temporadas.scss',
})
export class Temporadas implements OnInit, OnDestroy {
  private readonly temporadaService = inject(TemporadaService);
  private readonly notificacion = inject(NotificacionService);

  // ---------------------------------------------------------------------------
  // ESTADO REACTIVO
  // ---------------------------------------------------------------------------

  readonly temporadas = signal<Temporada[]>([]);
  readonly busqueda = signal('');
  readonly cargando = signal(true);
  readonly errorCarga = signal<string | null>(null);

  /** Control del modal de alta / edición */
  readonly modalAbierto = signal(false);
  readonly temporadaEnEdicion = signal<Temporada | null>(null);

  /** Control del diálogo de confirmación de eliminación */
  readonly modalEliminarAbierto = signal(false);
  readonly temporadaAEliminar = signal<Temporada | null>(null);

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

    this.temporadaService.listar(termino || undefined).subscribe({
      next: (lista) => {
        this.temporadas.set(lista);
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
  // VIGENCIA TEMPORAL Y BADGES
  // ---------------------------------------------------------------------------

  obtenerVigencia(temporada: Temporada): 'Activa' | 'Próxima' | 'Pasada' {
    if (temporada.vigencia) {
      if (temporada.vigencia === 'Proxima' || temporada.vigencia === 'Próxima') {
        return 'Próxima';
      }
      if (temporada.vigencia === 'Activa') {
        return 'Activa';
      }
      if (temporada.vigencia === 'Pasada') {
        return 'Pasada';
      }
    }
    const calc = calcularVigenciaTemporada(
      temporada.fecha_inicio,
      temporada.fecha_fin,
      temporada.activo ?? temporada.estado ?? true,
    );
    return calc === 'Proxima' ? 'Próxima' : calc;
  }

  // ---------------------------------------------------------------------------
  // GESTIÓN DE MODALES
  // ---------------------------------------------------------------------------

  abrirAlta(): void {
    this.temporadaEnEdicion.set(null);
    this.modalAbierto.set(true);
  }

  abrirEdicion(temporada: Temporada): void {
    this.temporadaEnEdicion.set(temporada);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.temporadaEnEdicion.set(null);
  }

  alGuardar(mensaje: string): void {
    this.cerrarModal();
    this.notificacion.exito(mensaje);
    this.cargar();
  }

  abrirEliminar(temporada: Temporada): void {
    this.temporadaAEliminar.set(temporada);
    this.modalEliminarAbierto.set(true);
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto.set(false);
    this.temporadaAEliminar.set(null);
  }

  alEliminar(mensaje: string): void {
    this.cerrarModalEliminar();
    this.notificacion.exito(mensaje);
    this.cargar();
  }
}
