/**
 * =============================================================================
 * FASHIONSTORE - CHECKOUT DIGITAL (CU15 + CU20 + CU21)
 * Wizard de 4 pasos: Resumen → Datos fiscales → Pago → Confirmación
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
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CarritoService } from '../../core/services/carrito.service';
import { VentaService } from '../../core/services/venta.service';
import { PagoService } from '../../core/services/pago.service';
import { ComprobanteService } from '../../core/services/comprobante.service';
import { AuthService } from '../../core/services/auth.service';
import { ReservaRespuesta, VentaDetalladaRespuesta, ComprobanteRespuesta } from '../../core/models/venta.model';

type Paso = 1 | 2 | 3 | 4;
type MetodoPago = 'Stripe' | 'QR';

@Component({
  selector: 'app-checkout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.scss'],
})
export class Checkout implements OnInit {
  readonly carrito = inject(CarritoService);
  private readonly venta = inject(VentaService);
  private readonly pago = inject(PagoService);
  private readonly comprobante = inject(ComprobanteService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // Estado del wizard
  pasoActual = signal<Paso>(1);
  cargando = signal(false);
  error = signal<string | null>(null);

  // Datos del proceso
  reserva = signal<ReservaRespuesta | null>(null);
  venta_confirmada = signal<VentaDetalladaRespuesta | null>(null);
  comprobante_generado = signal<ComprobanteRespuesta | null>(null);
  qrBase64 = signal<string | null>(null);
  qrReferencia = signal<string | null>(null);
  metodoPagoSeleccionado = signal<MetodoPago>('QR');

  // ID de sucursal por defecto (la primera) — puede mejorarse con selección
  readonly ID_SUCURSAL = 1;

  // Formulario de datos fiscales
  readonly formFiscal = this.fb.group({
    nit_ci: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(20)]],
    razon_social: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    enviar_email: [true],
  });

  ngOnInit(): void {
    if (this.carrito.items.length === 0) {
      this.router.navigate(['/catalogo']);
    }
    // Pre-rellenar con datos del cliente si están disponibles
    const nombre = localStorage.getItem('fashionstore_nombre') || '';
    if (nombre) {
      this.formFiscal.patchValue({ razon_social: nombre });
    }
  }

  get subtotal(): number {
    return this.carrito.totalMonto;
  }

  get pasos(): { numero: number; label: string }[] {
    return [
      { numero: 1, label: 'Resumen' },
      { numero: 2, label: 'Datos' },
      { numero: 3, label: 'Pago' },
      { numero: 4, label: 'Listo' },
    ];
  }

  irAPaso(paso: number): void {
    if (paso < this.pasoActual() && (paso === 1 || paso === 2 || paso === 3 || paso === 4)) {
      this.pasoActual.set(paso as Paso);
    }
  }

  // ── PASO 1 → 2: Crear Reserva ─────────────────────────────────────────────
  async confirmarResumen(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const idCliente = this._obtenerIdCliente();
      const reserva = await this.venta.crearReserva({
        id_cliente: idCliente,
        id_sucursal: this.ID_SUCURSAL,
        items: this.carrito.items.map((it) => ({
          id_variante_prenda: it.id_variante_prenda,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
        })),
      }).toPromise();
      this.reserva.set(reserva!);
      this.pasoActual.set(2);
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al crear la reserva. Intenta nuevamente.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ── PASO 2 → 3: Datos fiscales ────────────────────────────────────────────
  confirmarDatos(): void {
    if (this.formFiscal.invalid) {
      this.formFiscal.markAllAsTouched();
      return;
    }
    this.pasoActual.set(3);
  }

  seleccionarMetodo(metodo: MetodoPago): void {
    this.metodoPagoSeleccionado.set(metodo);
  }

  // ── PASO 3: Iniciar pago ──────────────────────────────────────────────────
  async iniciarPago(): Promise<void> {
    const metodo = this.metodoPagoSeleccionado();
    const reservaActual = this.reserva();
    if (!reservaActual) return;

    this.cargando.set(true);
    this.error.set(null);

    try {
      const idCliente = this._obtenerIdCliente();

      if (metodo === 'Stripe') {
        const res = await this.pago.crearSesionStripe({
          id_reserva: reservaActual.id_reserva,
          id_cliente: idCliente,
          url_exito: `${window.location.origin}/pago/exitoso?reserva=${reservaActual.id_reserva}`,
          url_cancelacion: `${window.location.origin}/pago/cancelado?reserva=${reservaActual.id_reserva}`,
        }).toPromise();
        // Redirigir al portal de Stripe
        window.location.href = res!.url_pago;

      } else {
        // QR Bolivia
        const qrRes = await this.pago.generarQR({
          id_reserva: reservaActual.id_reserva,
          id_cliente: idCliente,
          monto: reservaActual.total,
          concepto: `Pedido FashionStore #${reservaActual.id_reserva}`,
        }).toPromise();
        this.qrBase64.set(qrRes!.qr_base64);
        this.qrReferencia.set(qrRes!.referencia);
      }
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al iniciar el pago. Intenta nuevamente.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ── Confirmar pago QR ─────────────────────────────────────────────────────
  async confirmarPagoQR(): Promise<void> {
    const ref = this.qrReferencia();
    const reservaActual = this.reserva();
    if (!ref || !reservaActual) return;

    this.cargando.set(true);
    this.error.set(null);

    try {
      const idCliente = this._obtenerIdCliente();
      const ventaRes = await this.pago.confirmarQR({
        referencia: ref,
        id_reserva: reservaActual.id_reserva,
        id_cliente: idCliente,
        id_sucursal: this.ID_SUCURSAL,
      }).toPromise();

      this.venta_confirmada.set(ventaRes as VentaDetalladaRespuesta);
      await this._generarComprobante(ventaRes.id_venta);
      this.carrito.vaciarCarrito();
      this.pasoActual.set(4);
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al confirmar el pago QR.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async _generarComprobante(id_venta: number): Promise<void> {
    try {
      const fiscal = this.formFiscal.value;
      const comp = await this.comprobante.generarComprobante({
        id_venta,
        nit_ci: fiscal.nit_ci!,
        razon_social: fiscal.razon_social!,
        enviar_email: fiscal.enviar_email!,
      }).toPromise();
      this.comprobante_generado.set(comp!);
    } catch {
      // El comprobante falla silenciosamente — la venta ya está confirmada
    }
  }

  descargarComprobante(): void {
    const url = this.comprobante_generado()?.url_pdf;
    if (url) window.open(url, '_blank');
  }

  volverAlCatalogo(): void {
    this.router.navigate(['/catalogo']);
  }

  private _obtenerIdCliente(): number {
    // Obtener el id_cliente del token JWT almacenado
    try {
      const token = localStorage.getItem('fashionstore_token');
      if (!token) throw new Error('Sin token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id_cliente || payload.sub || 61; // fallback
    } catch {
      return 61; // fallback de desarrollo
    }
  }
}
