/**
 * =============================================================================
 * FASHIONSTORE - ATENCIÓN DE RESERVAS EN SUCURSAL (CU17)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Panel administrativo para que el personal de tienda:
 * 1. Escanee el código QR o ingrese el código de ticket (TKT-XXXXXX).
 * 2. Valide las prendas reservadas físicamente en la sucursal.
 * 3. Actualice el estado de atención:
 *    - "En Probador" (Preparado): el cliente está probándose las prendas.
 *    - "Cobrar en Caja" (Atendido): venta completada en mostrador.
 *    - "Liberar Stock" (Cancelado): reingresa las prendas no deseadas a inventario.
 * =============================================================================
 */

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentaService } from '../../core/services/venta.service';
import { GeografiaService } from '../../core/services/geografia.service';
import {
  EstadoReservaProbador,
  ReservaSucursalItem,
  TicketReservaRespuesta,
} from '../../core/models/venta.model';
import { Sucursal } from '../../core/models/catalogo.model';

@Component({
  selector: 'app-reservas-atencion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservas-atencion.html',
  styleUrls: ['./reservas-atencion.scss'],
})
export class ReservasAtencion implements OnInit {
  private readonly ventaService = inject(VentaService);
  private readonly geografiaService = inject(GeografiaService);

  // Estados y filtros
  readonly reservas = signal<ReservaSucursalItem[]>([]);
  readonly sucursales = signal<Sucursal[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);

  // Filtros activos
  filtroEstado = signal<string>('Todos');
  idSucursalSeleccionada = signal<number | null>(null);
  inputEscaner = signal<string>('');

  // Detalle / Modal de Ticket
  ticketSeleccionado = signal<TicketReservaRespuesta | null>(null);
  cargandoTicket = signal(false);

  ngOnInit(): void {
    this.cargarSucursales();
    this.cargarReservas();
  }

  cargarSucursales(): void {
    this.geografiaService.listarSucursales().subscribe({
      next: (suc) => this.sucursales.set(suc),
      error: () => {},
    });
  }

  cargarReservas(): void {
    this.cargando.set(true);
    this.error.set(null);

    const estadoParam =
      this.filtroEstado() === 'Todos' ? undefined : this.filtroEstado();
    const sucursalParam = this.idSucursalSeleccionada() ?? undefined;

    this.ventaService
      .listarReservasSucursal({
        id_sucursal: sucursalParam,
        estado: estadoParam,
      })
      .subscribe({
        next: (res) => {
          this.reservas.set(res);
          this.cargando.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.detail || 'Error al cargar las reservas');
          this.cargando.set(false);
        },
      });
  }

  cambiarFiltroEstado(nuevo: string): void {
    this.filtroEstado.set(nuevo);
    this.cargarReservas();
  }

  cambiarSucursal(evento: Event): void {
    const val = (evento.target as HTMLSelectElement).value;
    this.idSucursalSeleccionada.set(val ? Number(val) : null);
    this.cargarReservas();
  }

  // ── Lector / Escaneo de QR y Búsqueda por Ticket ───────────────────────────
  procesarInputEscaner(): void {
    let codigo = this.inputEscaner().trim();
    if (!codigo) return;

    // Si viene en formato QR: FASHIONSTORE|RESERVA|105|TKT-000105|Central
    if (codigo.includes('|')) {
      const partes = codigo.split('|');
      if (partes.length >= 4 && partes[3]) {
        codigo = partes[3];
      } else if (partes.length >= 3 && partes[2]) {
        codigo = partes[2];
      }
    }

    this.abrirDetalleTicket(codigo);
  }

  abrirDetalleTicket(codigoOId: string | number): void {
    this.cargandoTicket.set(true);
    this.error.set(null);

    this.ventaService.obtenerTicketReserva(codigoOId).subscribe({
      next: (ticket) => {
        this.ticketSeleccionado.set(ticket);
        this.cargandoTicket.set(false);
        this.inputEscaner.set('');
      },
      error: (err) => {
        this.error.set(
          err?.error?.detail || `No se encontró la reserva '${codigoOId}'`
        );
        this.cargandoTicket.set(false);
      },
    });
  }

  cerrarModalTicket(): void {
    this.ticketSeleccionado.set(null);
  }

  // ── Acciones de Transición de Estados (CU17) ───────────────────────────────
  cambiarEstado(
    idReserva: number,
    nuevoEstado: EstadoReservaProbador,
    motivo?: string
  ): void {
    this.cargando.set(true);
    this.error.set(null);

    this.ventaService
      .actualizarEstadoReservaProbador(idReserva, {
        nuevo_estado: nuevoEstado,
        motivo: motivo || `Cambio de estado a ${nuevoEstado} desde panel de atención`,
      })
      .subscribe({
        next: (ticketActualizado) => {
          this.cargando.set(false);
          this.mensajeExito.set(
            `Reserva #${idReserva} actualizada exitosamente a '${nuevoEstado}'`
          );
          setTimeout(() => this.mensajeExito.set(null), 3500);

          if (this.ticketSeleccionado()?.id_reserva === idReserva) {
            this.ticketSeleccionado.set(ticketActualizado);
          }
          this.cargarReservas();
        },
        error: (err) => {
          this.error.set(
            err?.error?.detail || 'Error al actualizar el estado de la reserva'
          );
          this.cargando.set(false);
        },
      });
  }
}
