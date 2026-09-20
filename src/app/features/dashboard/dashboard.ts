import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardKPIsRespuesta } from '../../core/models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly datos = signal<DashboardKPIsRespuesta | null>(null);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly ultimaActualizacion = signal<Date>(new Date());

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.dashboardService.obtenerKPIs().subscribe({
      next: (resp) => {
        this.datos.set(resp);
        this.ultimaActualizacion.set(new Date());
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar dashboard de KPIs:', err);
        this.error.set('No se pudieron obtener los datos analíticos del servidor.');
        this.cargando.set(false);
      },
    });
  }

  formatearMoneda(monto: number | undefined): string {
    if (monto === undefined || monto === null) return 'Bs 0.00';
    return `Bs ${monto.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  obtenerMaxIngresoVentas(): number {
    const list = this.datos()?.ventas_recientes || [];
    if (list.length === 0) return 1;
    const max = Math.max(...list.map((v) => v.total_ingresos));
    return max > 0 ? max : 1;
  }

  calcularAlturaBarra(ingreso: number): number {
    const max = this.obtenerMaxIngresoVentas();
    const pct = Math.round((ingreso / max) * 100);
    return Math.max(pct, 6); // mínimo 6% de altura para visualización
  }

  obtenerIconoMetodo(metodo: string): string {
    const m = metodo.toLowerCase();
    if (m.includes('efectivo')) return 'payments';
    if (m.includes('tarjeta') || m.includes('stripe')) return 'credit_card';
    if (m.includes('qr')) return 'qr_code_2';
    return 'account_balance_wallet';
  }
}
