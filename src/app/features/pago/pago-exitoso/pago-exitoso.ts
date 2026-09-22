/**
 * FASHIONSTORE - Pantalla de pago exitoso (Stripe redirect)
 */
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { VentaService } from '../../../core/services/venta.service';
import { ComprobanteService } from '../../../core/services/comprobante.service';
import { CarritoService } from '../../../core/services/carrito.service';
import { VentaDetalladaRespuesta, ComprobanteRespuesta } from '../../../core/models/venta.model';

@Component({
  selector: 'app-pago-exitoso',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="pago-exitoso">
      <div class="pago-exitoso__card">
        @if (estado() === 'verificando') {
          <div class="spinner"></div>
          <h1>Verificando pago...</h1>
          <p>Estamos confirmando la transacción con el procesador de pagos. Esto puede tomar unos segundos.</p>
        } @else if (estado() === 'exito') {
          <div class="pago-exitoso__icono">🎉</div>
          <h1>¡Pago confirmado!</h1>
          <p>Tu pedido ha sido procesado exitosamente.</p>
          @if (idReserva()) {
            <p class="pago-exitoso__detalle">Reserva #{{ idReserva() }}</p>
          }

          @if (venta_confirmada()) {
            <div class="exito-detalles" style="margin-top: 1rem; text-align: left; background: #fafafa; padding: 1rem; border-radius: 8px;">
              <p>N° de venta: <strong>#{{ venta_confirmada()!.id_venta }}</strong></p>
              <p>Total pagado: <strong>Bs {{ venta_confirmada()!.total | number:'1.2-2' }}</strong></p>
              <p>Método: <strong>{{ venta_confirmada()!.metodo_pago }} / Stripe</strong></p>
            </div>
          }

          @if (comprobante_generado()) {
            <div class="comprobante-info" style="margin-top: 1rem; text-align: left; background: #eef2ff; padding: 1rem; border-radius: 8px; border: 1px solid #c7d2fe;">
              <p style="color: #3730a3;">📄 Comprobante: <strong>{{ comprobante_generado()!.numero_comprobante }}</strong></p>
              @if (comprobante_generado()!.url_pdf) {
                <button (click)="descargarComprobante()" style="margin-top: 0.5rem; width: 100%; padding: 0.75rem; background: #4f46e5; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
                  ⬇️ Descargar comprobante PDF
                </button>
              }
            </div>
          }

          <div class="pago-exitoso__acciones">
            <a routerLink="/catalogo" class="btn-primario">Continuar explorando →</a>
            <a routerLink="/mi-cuenta/pedidos" class="btn-secundario">Ver mis pedidos</a>
          </div>
        } @else {
          <div class="pago-exitoso__icono">⚠️</div>
          <h1>Pago pendiente o no confirmado</h1>
          <p>El procesador de pagos no nos ha confirmado tu transacción aún, o fue cancelada.</p>
          <div class="pago-exitoso__acciones">
            <a routerLink="/mi-cuenta/reservas" class="btn-secundario">Ir a mis reservas</a>
          </div>
        }
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
    .spinner {
      margin: 1rem auto;
      width: 40px; height: 40px;
      border: 4px solid #f3f3f3; border-top: 4px solid #1a1a1a;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  `],
})
export class PagoExitoso implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly ventaService = inject(VentaService);
  private readonly comprobanteService = inject(ComprobanteService);
  private readonly carritoService = inject(CarritoService);
  
  idReserva = signal<number | null>(null);
  estado = signal<'verificando' | 'exito' | 'error'>('verificando');
  venta_confirmada = signal<VentaDetalladaRespuesta | null>(null);
  comprobante_generado = signal<ComprobanteRespuesta | null>(null);
  private pollInterval: any;

  ngOnInit(): void {
    const reserva = this.route.snapshot.queryParamMap.get('reserva');
    if (reserva) {
      this.idReserva.set(parseInt(reserva));
      this.verificarPago();
    } else {
      this.estado.set('error');
    }
  }

  verificarPago(): void {
    const id = this.idReserva();
    if (!id) return;
    
    let intentos = 0;
    this.pollInterval = setInterval(() => {
      this.ventaService.obtenerReserva(id).subscribe({
        next: async (res) => {
          if (res.estado === 'Atendido') {
            this.estado.set('exito');
            clearInterval(this.pollInterval);
            
            // Obtener venta y comprobante
            if (res.id_venta) {
              try {
                const ventaRes = await this.ventaService.obtenerVenta(res.id_venta).toPromise();
                this.venta_confirmada.set(ventaRes || null);
                
                // Limpiar solo los ítems efectivamente comprados
                if (ventaRes && ventaRes.items) {
                  this.carritoService.limpiarComprados(
                    ventaRes.items.map(i => ({
                      id_variante_prenda: i.id_variante_prenda,
                      cantidad: i.cantidad
                    }))
                  );
                }
                
                const compRes = await this.comprobanteService.obtenerPorVenta(res.id_venta).toPromise();
                this.comprobante_generado.set(compRes || null);
              } catch (e) {
                console.error("Error al obtener detalle de venta o comprobante", e);
              }
            }
          } else {
            intentos++;
            if (intentos >= 10) {
              this.estado.set('error');
              clearInterval(this.pollInterval);
            }
          }
        },
        error: () => {
          this.estado.set('error');
          clearInterval(this.pollInterval);
        }
      });
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  descargarComprobante(): void {
    const url = this.comprobante_generado()?.url_pdf;
    if (url) window.open(url, '_blank');
  }
}
