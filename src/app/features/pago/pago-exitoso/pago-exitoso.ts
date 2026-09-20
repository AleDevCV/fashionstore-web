/**
 * FASHIONSTORE - Pantalla de pago exitoso (Stripe redirect)
 */
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pago-exitoso',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="pago-exitoso">
      <div class="pago-exitoso__card">
        <div class="pago-exitoso__icono">🎉</div>
        <h1>¡Pago exitoso!</h1>
        <p>Tu compra ha sido confirmada. Pronto recibirás tu comprobante por correo.</p>
        @if (idVenta()) {
          <p class="pago-exitoso__detalle">Venta #{{ idVenta() }}</p>
        }
        <div class="pago-exitoso__acciones">
          <a routerLink="/catalogo" class="btn-primario">Continuar comprando</a>
          <a routerLink="/mi-cuenta/pedidos" class="btn-secundario">Ver mis pedidos</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pago-exitoso {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f8f8;
      padding: 2rem;
    }
    .pago-exitoso__card {
      background: #fff;
      border-radius: 16px;
      padding: 3rem 2.5rem;
      text-align: center;
      max-width: 480px;
      box-shadow: 0 4px 24px rgba(0,0,0,.08);
    }
    .pago-exitoso__icono { font-size: 3.5rem; margin-bottom: 1rem; }
    h1 { font-size: 1.6rem; color: #1a1a1a; margin-bottom: 0.5rem; }
    p { color: #666; margin-bottom: 0.5rem; }
    .pago-exitoso__detalle { font-weight: 600; color: #1a1a1a; }
    .pago-exitoso__acciones { display: flex; flex-direction: column; gap: 0.8rem; margin-top: 1.5rem; }
    .btn-primario {
      background: #1a1a1a; color: #fff; border-radius: 8px;
      padding: 0.85rem 1.5rem; text-decoration: none; font-weight: 600;
      transition: background 0.2s;
      &:hover { background: #333; }
    }
    .btn-secundario {
      background: #fff; color: #555; border: 1.5px solid #ddd;
      border-radius: 8px; padding: 0.85rem 1.5rem; text-decoration: none;
    }
  `],
})
export class PagoExitoso implements OnInit {
  private readonly route = inject(ActivatedRoute);
  idVenta = signal<number | null>(null);

  ngOnInit(): void {
    const reserva = this.route.snapshot.queryParamMap.get('reserva');
    if (reserva) this.idVenta.set(parseInt(reserva));
  }
}
