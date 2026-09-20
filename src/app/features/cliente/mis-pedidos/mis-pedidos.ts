/**
 * FASHIONSTORE - Mis pedidos del cliente (CU15)
 */
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VentaService } from '../../../core/services/venta.service';
import { ComprobanteService } from '../../../core/services/comprobante.service';
import { VentaRespuesta } from '../../../core/models/venta.model';

@Component({
  selector: 'app-mis-pedidos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="pedidos-wrapper">
      <div class="pedidos-header">
        <a routerLink="/catalogo" class="pedidos-header__back">← Catálogo</a>
        <h1>Mis pedidos</h1>
      </div>

      @if (cargando()) {
        <p class="cargando">Cargando pedidos...</p>
      } @else if (pedidos().length === 0) {
        <div class="pedidos-vacio">
          <p>Aún no tienes pedidos.</p>
          <a routerLink="/catalogo" class="btn-primario">Explorar el catálogo</a>
        </div>
      } @else {
        <ul class="pedidos-lista">
          @for (pedido of pedidos(); track pedido.id_venta) {
            <li class="pedido-card">
              <div class="pedido-card__header">
                <span class="pedido-card__num">Pedido #{{ pedido.id_venta }}</span>
                <span class="pedido-card__fecha">{{ pedido.fecha_venta | date:'dd/MM/yyyy' }}</span>
              </div>
              <div class="pedido-card__body">
                <div class="pedido-card__info">
                  <span>Método: <strong>{{ pedido.metodo_pago }}</strong></span>
                  <span>Total: <strong>Bs {{ pedido.total.toFixed(2) }}</strong></span>
                </div>
                <div class="pedido-card__acciones">
                  <button
                    class="btn-comprobante"
                    (click)="descargarComprobante(pedido.id_venta)"
                  >
                    📄 Comprobante
                  </button>
                </div>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .pedidos-wrapper {
      min-height: 100dvh;
      background: #f8f8f8;
      padding: 2rem 1rem;
      max-width: 640px;
      margin: 0 auto;
    }
    .pedidos-header {
      margin-bottom: 1.5rem;
      &__back { color: #888; text-decoration: none; font-size: 0.9rem; }
      h1 { font-size: 1.4rem; font-weight: 700; color: #1a1a1a; margin: 0.5rem 0 0; }
    }
    .cargando { color: #888; text-align: center; padding: 3rem; }
    .pedidos-vacio { text-align: center; padding: 3rem; color: #888; }
    .pedidos-lista { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1rem; }
    .pedido-card {
      background: #fff;
      border-radius: 12px;
      padding: 1.2rem 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,.05);
      &__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }
      &__num { font-weight: 700; color: #1a1a1a; }
      &__fecha { color: #888; font-size: 0.85rem; }
      &__body { display: flex; justify-content: space-between; align-items: center; }
      &__info { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.9rem; color: #555; strong { color: #1a1a1a; } }
    }
    .btn-comprobante {
      background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;
      padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;
      transition: background 0.2s;
      &:hover { background: #dbeafe; }
    }
    .btn-primario {
      display: inline-block; background: #1a1a1a; color: #fff;
      padding: 0.85rem 1.5rem; border-radius: 8px; text-decoration: none;
      font-weight: 600; margin-top: 1rem;
    }
  `],
})
export class MisPedidos implements OnInit {
  private readonly ventaSvc = inject(VentaService);
  private readonly comprobanteSvc = inject(ComprobanteService);

  pedidos = signal<VentaRespuesta[]>([]);
  cargando = signal(true);

  ngOnInit(): void {
    const idCliente = this._idCliente();
    this.ventaSvc.misPedidos(idCliente).subscribe({
      next: (v) => { this.pedidos.set(v); this.cargando.set(false); },
      error: () => { this.cargando.set(false); },
    });
  }

  descargarComprobante(id_venta: number): void {
    this.comprobanteSvc.obtenerPorVenta(id_venta).subscribe({
      next: (c) => { if (c.url_pdf) window.open(c.url_pdf, '_blank'); },
      error: () => alert('No hay comprobante disponible para este pedido.'),
    });
  }

  private _idCliente(): number {
    try {
      const token = localStorage.getItem('fashionstore_token');
      if (!token) return 61;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id_cliente || payload.sub || 61;
    } catch { return 61; }
  }
}
