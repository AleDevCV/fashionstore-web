/**
 * =============================================================================
 * FASHIONSTORE - PANEL LATERAL DEL CARRITO (CU15)
 * =============================================================================
 */

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CarritoService } from '../../../core/services/carrito.service';

@Component({
  selector: 'app-carrito-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink],
  template: `
    <div class="carrito-overlay" (click)="cerrar.emit()"></div>
    <aside class="carrito-panel">
      <!-- Cabecera -->
      <div class="carrito-panel__header">
        <h2 class="carrito-panel__titulo">
          <span>🛍️</span> Mi Carrito
        </h2>
        <button class="carrito-panel__cerrar" (click)="cerrar.emit()" aria-label="Cerrar carrito">
          ✕
        </button>
      </div>

      <!-- Lista de items -->
      <div class="carrito-panel__body">
        @if ((items$ | async)?.length === 0) {
          <div class="carrito-panel__vacio">
            <p>Tu carrito está vacío</p>
            <button class="btn-explorar" (click)="cerrar.emit()" routerLink="/catalogo">
              Explorar el catálogo
            </button>
          </div>
        } @else {
          <ul class="carrito-lista">
            @for (item of items$ | async; track item.id_variante_prenda) {
              <li class="carrito-item">
                <div class="carrito-item__info">
                  <span class="carrito-item__nombre">{{ item.prenda_nombre }}</span>
                  <span class="carrito-item__detalle">
                    Talla: {{ item.talla }} · Color: {{ item.color }}
                  </span>
                </div>
                <div class="carrito-item__controles">
                  <button
                    class="qty-btn"
                    (click)="cambiarCantidad(item.id_variante_prenda, item.cantidad - 1)"
                    aria-label="Restar">−</button>
                  <span class="qty-valor">{{ item.cantidad }}</span>
                  <button
                    class="qty-btn"
                    (click)="cambiarCantidad(item.id_variante_prenda, item.cantidad + 1)"
                    aria-label="Sumar">+</button>
                  <button
                    class="eliminar-btn"
                    (click)="eliminar(item.id_variante_prenda)"
                    aria-label="Eliminar">🗑</button>
                </div>
                <div class="carrito-item__precio">
                  Bs {{ (item.precio_unitario * item.cantidad).toFixed(2) }}
                </div>
              </li>
            }
          </ul>
        }
      </div>

      <!-- Footer con totales -->
      @if ((items$ | async)?.length! > 0) {
        <div class="carrito-panel__footer">
          <div class="carrito-total">
            <span>Total</span>
            <strong>Bs {{ carrito.totalMonto.toFixed(2) }}</strong>
          </div>
          <button class="btn-checkout" (click)="irAlCheckout()">
            Proceder al Pago →
          </button>
          <button class="btn-vaciar" (click)="carrito.vaciarCarrito()">
            Vaciar carrito
          </button>
        </div>
      }
    </aside>
  `,
  styleUrls: ['./carrito-sidebar.scss'],
})
export class CarritoSidebar {
  @Output() cerrar = new EventEmitter<void>();

  readonly carrito = inject(CarritoService);
  readonly items$ = this.carrito.items$;
  private readonly router = inject(Router);

  cambiarCantidad(id: number, qty: number): void {
    this.carrito.cambiarCantidad(id, qty);
  }

  eliminar(id: number): void {
    this.carrito.eliminarItem(id);
  }

  irAlCheckout(): void {
    this.cerrar.emit();
    this.router.navigate(['/checkout']);
  }
}
