import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BitacoraService } from '../../core/services/bitacora.service';
import { BitacoraItem } from '../../core/models/bitacora.model';

@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './bitacora.html',
  styleUrl: './bitacora.scss',
})
export class Bitacora implements OnInit {
  private readonly bitacoraService = inject(BitacoraService);

  readonly items = signal<BitacoraItem[]>([]);
  readonly total = signal<number>(0);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  // Filtros
  paginaActual = 1;
  limite = 50;
  accionSeleccionada = '';
  tablaSeleccionada = '';
  busqueda = '';

  readonly accionesDisponibles = [
    'LOGIN_EXITOSO',
    'LOGIN_FALLIDO',
    'INSERT',
    'UPDATE',
    'DELETE',
    'INACTIVAR',
    'IA_RECOMENDACION',
    'IA_ANALITICA_VOZ',
    'SOLICITUD_RECUPERACION_PASSWORD',
    'RESTABLECER_PASSWORD_EXITOSO',
  ];

  readonly tablasDisponibles = [
    'usuario',
    'cliente',
    'prenda',
    'categoria',
    'sucursal',
    'ciudad',
    'reserva',
    'venta',
    'compra',
    'proveedor',
    'movimiento_inventario',
    'rol_permiso',
  ];

  ngOnInit(): void {
    this.cargarBitacora();
  }

  cargarBitacora(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.bitacoraService
      .listar(
        this.paginaActual,
        this.limite,
        this.accionSeleccionada || undefined,
        this.tablaSeleccionada || undefined,
        this.busqueda.trim() || undefined,
      )
      .subscribe({
        next: (resp) => {
          this.items.set(resp.items);
          this.total.set(resp.total);
          this.cargando.set(false);
        },
        error: (err) => {
          console.error('Error al cargar bitácora:', err);
          this.error.set('No se pudieron recuperar los registros de auditoría.');
          this.cargando.set(false);
        },
      });
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina < 1 || nuevaPagina > this.totalPaginas) return;
    this.paginaActual = nuevaPagina;
    this.cargarBitacora();
  }

  get totalPaginas(): number {
    return Math.ceil(this.total() / this.limite) || 1;
  }

  obtenerClaseBadgeAccion(accion: string): string {
    switch (accion) {
      case 'LOGIN_EXITOSO':
        return 'badge--login-exito';
      case 'LOGIN_FALLIDO':
        return 'badge--login-fallo';
      case 'INSERT':
        return 'badge--insert';
      case 'UPDATE':
        return 'badge--update';
      case 'DELETE':
      case 'INACTIVAR':
        return 'badge--danger';
      case 'IA_RECOMENDACION':
      case 'IA_ANALITICA_VOZ':
        return 'badge--ia';
      default:
        return 'badge--default';
    }
  }
}
