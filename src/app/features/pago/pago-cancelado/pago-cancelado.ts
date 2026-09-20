/**
 * FASHIONSTORE - Pantalla de pago cancelado (Stripe redirect)
 */
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pago-cancelado',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="pago-cancelado">
      <div class="pago-cancelado__card">
        <div class="pago-cancelado__icono">❌</div>
        <h1>Pago cancelado</h1>
        <p>No se realizó ningún cargo. Tu reserva sigue activa por 24 horas.</p>
        <div class="pago-cancelado__acciones">
          <a routerLink="/checkout" class="btn-primario">Volver al checkout</a>
          <a routerLink="/catalogo" class="btn-secundario">Explorar catálogo</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pago-cancelado {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f8f8;
      padding: 2rem;
    }
    .pago-cancelado__card {
      background: #fff;
      border-radius: 16px;
      padding: 3rem 2.5rem;
      text-align: center;
      max-width: 480px;
      box-shadow: 0 4px 24px rgba(0,0,0,.08);
    }
    .pago-cancelado__icono { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; color: #1a1a1a; margin-bottom: 0.5rem; }
    p { color: #666; margin-bottom: 1rem; }
    .pago-cancelado__acciones { display: flex; flex-direction: column; gap: 0.8rem; margin-top: 1rem; }
    .btn-primario {
      background: #1a1a1a; color: #fff; border-radius: 8px;
      padding: 0.85rem 1.5rem; text-decoration: none; font-weight: 600;
    }
    .btn-secundario {
      background: #fff; color: #555; border: 1.5px solid #ddd;
      border-radius: 8px; padding: 0.85rem 1.5rem; text-decoration: none;
    }
  `],
})
export class PagoCancelado {}
