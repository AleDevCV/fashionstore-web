/**
 * =============================================================================
 * FASHIONSTORE - TERMINAL DE CAJA DE VENTAS PRESENCIALES POS (CU19)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Componente principal de la terminal POS para cajeros en sucursales físicas:
 * 1. Búsqueda rápida por SKU / Código de barras o descripción con stock local.
 * 2. Carga directa de reservas de probador (CU16, CU17).
 * 3. Gestión ágil de ticket de venta con cálculo de subtotales y descuentos.
 * 4. Modal de cobro multimétodo con cálculo automático de vuelto para efectivo.
 * 5. Emisión instantánea de comprobante fiscal digital PDF (CU21).
 * =============================================================================
 */

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PosService } from '../../core/services/pos.service';
import { GeografiaService } from '../../core/services/geografia.service';
import { CategoriaService } from '../../core/services/categoria.service';
import { ClienteService } from '../../core/services/cliente.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ItemCarritoPOS,
  POSProductoVariante,
  POSReservaCargadaRespuesta,
  POSVentaCrear,
  POSVentaRespuesta,
} from '../../core/models/pos.model';
import { Categoria, Cliente, Sucursal } from '../../core/models/catalogo.model';

@Component({
  selector: 'app-pos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, FormsModule],
  templateUrl: './pos.html',
  styleUrls: ['./pos.scss'],
})
export class Pos implements OnInit {
  private readonly posService = inject(PosService);
  private readonly geografiaService = inject(GeografiaService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly clienteService = inject(ClienteService);
  private readonly authService = inject(AuthService);

  // Estados de datos
  readonly sucursales = signal<Sucursal[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly clientes = signal<Cliente[]>([]);
  readonly productos = signal<POSProductoVariante[]>([]);

  // Sucursal activa de la caja
  readonly idSucursalSeleccionada = signal<number>(1);
  readonly sucursalActiva = computed(() =>
    this.sucursales().find((s) => s.id_sucursal === this.idSucursalSeleccionada()),
  );

  // Filtros de búsqueda en catálogo
  busquedaQuery = signal<string>('');
  categoriaFiltro = signal<number | null>(null);
  soloConStock = signal<boolean>(false);
  cargandoProductos = signal<boolean>(false);

  // Ticket / Carrito POS
  readonly itemsCarrito = signal<ItemCarritoPOS[]>([]);
  descuento = signal<number>(0);

  // Cliente y Facturación
  clienteSeleccionadoId = signal<number | null>(null);
  nitCi = signal<string>('0');
  razonSocial = signal<string>('Sin Nombre');
  enviarEmail = signal<boolean>(false);

  // Reserva de probador cargada
  idReservaVinculada = signal<number | null>(null);
  codigoTicketVinculado = signal<string | null>(null);

  // Modal de Cargar Reserva
  mostrarModalReserva = signal<boolean>(false);
  inputCodigoReserva = signal<string>('');
  cargandoReserva = signal<boolean>(false);
  errorReserva = signal<string | null>(null);

  // Modal de Cobro (Pago)
  mostrarModalCobro = signal<boolean>(false);
  metodoPago = signal<'Efectivo' | 'Tarjeta' | 'QR' | 'Transferencia'>('Efectivo');
  montoRecibido = signal<number>(0);
  procesandoVenta = signal<boolean>(false);
  errorCobro = signal<string | null>(null);

  // Modal de Venta Exitosa / Comprobante
  mostrarModalExito = signal<boolean>(false);
  ventaCompletada = signal<POSVentaRespuesta | null>(null);

  // Alertas / Mensajes
  errorGeneral = signal<string | null>(null);
  mensajeAlerta = signal<string | null>(null);

  // Cálculos reactivos de importes
  readonly subtotal = computed(() => {
    return this.itemsCarrito().reduce(
      (acc, item) => acc + item.precio_unitario * item.cantidad,
      0,
    );
  });

  readonly total = computed(() => {
    const sub = this.subtotal();
    const desc = this.descuento() || 0;
    return Math.max(0, sub - desc);
  });

  readonly cambioVuelto = computed(() => {
    if (this.metodoPago() !== 'Efectivo') return 0;
    const recibido = this.montoRecibido() || 0;
    const tot = this.total();
    return Math.max(0, recibido - tot);
  });

  readonly esMontoInsuficiente = computed(() => {
    if (this.metodoPago() !== 'Efectivo') return false;
    return (this.montoRecibido() || 0) < this.total();
  });

  readonly usuarioActivo = computed(() => this.authService.usuarioActual());

  ngOnInit(): void {
    this.cargarDatosIniciales();
    this.cargarProductos();
  }

  cargarDatosIniciales(): void {
    this.geografiaService.listarSucursales().subscribe({
      next: (sucs) => {
        this.sucursales.set(sucs);
        if (sucs && sucs.length > 0) {
          this.idSucursalSeleccionada.set(sucs[0].id_sucursal);
          this.cargarProductos();
        }
      },
      error: () => this.errorGeneral.set('Error al cargar sucursales'),
    });

    this.categoriaService.listar().subscribe({
      next: (cats) => this.categorias.set(cats),
      error: () => {},
    });

    this.clienteService.listar(undefined, 'Activo').subscribe({
      next: (res) => this.clientes.set(res || []),
      error: () => {},
    });
  }

  cambiarSucursal(idSuc: number): void {
    this.idSucursalSeleccionada.set(idSuc);
    // Si cambia de sucursal se limpian los items para evitar inconsistencia de stock
    if (this.itemsCarrito().length > 0) {
      if (confirm('Cambiar de sucursal reiniciará el ticket actual. ¿Deseas continuar?')) {
        this.limpiarTicket();
        this.cargarProductos();
      }
    } else {
      this.cargarProductos();
    }
  }

  cargarProductos(): void {
    const idSuc = this.idSucursalSeleccionada();
    if (!idSuc) return;

    this.cargandoProductos.set(true);
    this.posService
      .listarProductos(
        idSuc,
        this.busquedaQuery(),
        this.categoriaFiltro() ?? undefined,
        this.soloConStock(),
      )
      .subscribe({
        next: (items) => {
          this.productos.set(items);
          this.cargandoProductos.set(false);
        },
        error: (err) => {
          this.errorGeneral.set('Error al cargar catálogo de sucursal');
          this.cargandoProductos.set(false);
        },
      });
  }

  filtrarPorCategoria(idCat: number | null): void {
    this.categoriaFiltro.set(idCat);
    this.cargarProductos();
  }

  onBuscar(): void {
    this.cargarProductos();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GESTIÓN DEL TICKET / CARRITO
  // ─────────────────────────────────────────────────────────────────────────────

  agregarAlTicket(variante: POSProductoVariante): void {
    if (variante.stock_disponible <= 0) {
      this.mensajeAlerta.set(`La variante ${variante.sku} no tiene stock disponible.`);
      setTimeout(() => this.mensajeAlerta.set(null), 3000);
      return;
    }

    const items = [...this.itemsCarrito()];
    const index = items.findIndex(
      (it) => it.variante.id_variante_prenda === variante.id_variante_prenda,
    );

    if (index >= 0) {
      const itemExistente = items[index];
      if (itemExistente.cantidad >= variante.stock_disponible) {
        this.mensajeAlerta.set(
          `No puedes agregar más de ${variante.stock_disponible} unidades de ${variante.sku}`,
        );
        setTimeout(() => this.mensajeAlerta.set(null), 3000);
        return;
      }
      items[index] = {
        ...itemExistente,
        cantidad: itemExistente.cantidad + 1,
      };
    } else {
      items.push({
        variante,
        cantidad: 1,
        precio_unitario: Number(variante.precio_unitario),
      });
    }

    this.itemsCarrito.set(items);
  }

  incrementarCantidad(item: ItemCarritoPOS): void {
    if (item.cantidad >= item.variante.stock_disponible) {
      this.mensajeAlerta.set(`Stock máximo alcanzado (${item.variante.stock_disponible})`);
      setTimeout(() => this.mensajeAlerta.set(null), 2500);
      return;
    }
    const items = this.itemsCarrito().map((it) =>
      it.variante.id_variante_prenda === item.variante.id_variante_prenda
        ? { ...it, cantidad: it.cantidad + 1 }
        : it,
    );
    this.itemsCarrito.set(items);
  }

  decrementarCantidad(item: ItemCarritoPOS): void {
    if (item.cantidad <= 1) {
      this.eliminarDelTicket(item);
      return;
    }
    const items = this.itemsCarrito().map((it) =>
      it.variante.id_variante_prenda === item.variante.id_variante_prenda
        ? { ...it, cantidad: it.cantidad - 1 }
        : it,
    );
    this.itemsCarrito.set(items);
  }

  eliminarDelTicket(item: ItemCarritoPOS): void {
    const items = this.itemsCarrito().filter(
      (it) => it.variante.id_variante_prenda !== item.variante.id_variante_prenda,
    );
    this.itemsCarrito.set(items);
  }

  limpiarTicket(): void {
    this.itemsCarrito.set([]);
    this.descuento.set(0);
    this.idReservaVinculada.set(null);
    this.codigoTicketVinculado.set(null);
    this.clienteSeleccionadoId.set(null);
    this.nitCi.set('0');
    this.razonSocial.set('Sin Nombre');
    this.enviarEmail.set(false);
  }

  onSeleccionarCliente(idCli: number | null): void {
    this.clienteSeleccionadoId.set(idCli);
    if (idCli) {
      const cli = this.clientes().find((c) => c.id_cliente === idCli);
      if (cli) {
        this.nitCi.set(cli.ci || '0');
        this.razonSocial.set(cli.nombre_completo || 'Sin Nombre');
      }
    } else {
      this.nitCi.set('0');
      this.razonSocial.set('Sin Nombre');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CARGA DE RESERVAS DE PROBADOR (CU16, CU17)
  // ─────────────────────────────────────────────────────────────────────────────

  abrirModalReserva(): void {
    this.inputCodigoReserva.set('');
    this.errorReserva.set(null);
    this.mostrarModalReserva.set(true);
  }

  cerrarModalReserva(): void {
    this.mostrarModalReserva.set(false);
  }

  ejecutarCargarReserva(): void {
    const cod = this.inputCodigoReserva().trim();
    if (!cod) {
      this.errorReserva.set('Por favor ingresa el código o ID de la reserva.');
      return;
    }

    this.cargandoReserva.set(true);
    this.errorReserva.set(null);

    this.posService.cargarReserva(cod).subscribe({
      next: (res: POSReservaCargadaRespuesta) => {
        // Asignar sucursal de la reserva
        if (res.id_sucursal !== this.idSucursalSeleccionada()) {
          this.idSucursalSeleccionada.set(res.id_sucursal);
        }

        // Asignar datos del cliente
        this.clienteSeleccionadoId.set(res.id_cliente);
        this.nitCi.set(res.cliente_ci || '0');
        this.razonSocial.set(res.cliente_nombre || 'Sin Nombre');

        // Asignar ID de reserva vinculada
        this.idReservaVinculada.set(res.id_reserva);
        this.codigoTicketVinculado.set(res.codigo_ticket);

        // Convertir items a itemsCarrito
        const nuevosItems: ItemCarritoPOS[] = res.items.map((it) => ({
          variante: {
            id_variante_prenda: it.id_variante_prenda,
            sku: it.sku,
            id_prenda: 0,
            prenda_nombre: it.prenda_nombre,
            talla: it.talla,
            color: it.color,
            precio_unitario: Number(it.precio_unitario),
            stock_disponible: it.cantidad + 10,
          },
          cantidad: it.cantidad,
          precio_unitario: Number(it.precio_unitario),
        }));

        this.itemsCarrito.set(nuevosItems);
        this.cargandoReserva.set(false);
        this.cerrarModalReserva();
        this.mensajeAlerta.set(
          `Reserva ${res.codigo_ticket} cargada con éxito para ${res.cliente_nombre}`,
        );
        setTimeout(() => this.mensajeAlerta.set(null), 4000);
      },
      error: (err) => {
        this.cargandoReserva.set(false);
        const msg = err.error?.detail || 'No se pudo cargar la reserva especificada.';
        this.errorReserva.set(msg);
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COBRO Y FINALIZACIÓN DE VENTA
  // ─────────────────────────────────────────────────────────────────────────────

  abrirModalCobro(): void {
    if (this.itemsCarrito().length === 0) {
      this.mensajeAlerta.set('El ticket de venta está vacío.');
      setTimeout(() => this.mensajeAlerta.set(null), 3000);
      return;
    }
    this.metodoPago.set('Efectivo');
    this.montoRecibido.set(this.total());
    this.errorCobro.set(null);
    this.mostrarModalCobro.set(true);
  }

  cerrarModalCobro(): void {
    this.mostrarModalCobro.set(false);
  }

  setMetodoPago(metodo: 'Efectivo' | 'Tarjeta' | 'QR' | 'Transferencia'): void {
    this.metodoPago.set(metodo);
    if (metodo === 'Efectivo') {
      this.montoRecibido.set(this.total());
    }
  }

  setMontoRapido(adicional: number): void {
    if (adicional === 0) {
      this.montoRecibido.set(this.total());
    } else {
      const redondear = Math.ceil(this.total() / adicional) * adicional;
      this.montoRecibido.set(redondear >= this.total() ? redondear : this.total() + adicional);
    }
  }

  confirmarVenta(): void {
    if (this.esMontoInsuficiente()) {
      this.errorCobro.set('El monto recibido no cubre el total de la venta.');
      return;
    }

    this.procesandoVenta.set(true);
    this.errorCobro.set(null);

    const payload: POSVentaCrear = {
      id_sucursal: this.idSucursalSeleccionada(),
      id_cliente: this.clienteSeleccionadoId(),
      id_reserva: this.idReservaVinculada(),
      metodo_pago: this.metodoPago(),
      monto_recibido: this.metodoPago() === 'Efectivo' ? this.montoRecibido() : this.total(),
      descuento: this.descuento(),
      nit_ci: this.nitCi().trim() || '0',
      razon_social: this.razonSocial().trim() || 'Sin Nombre',
      enviar_email: this.enviarEmail(),
      items: this.itemsCarrito().map((it) => ({
        id_variante_prenda: it.variante.id_variante_prenda,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
      })),
    };

    this.posService.procesarVenta(payload).subscribe({
      next: (res) => {
        this.procesandoVenta.set(false);
        this.ventaCompletada.set(res);
        this.cerrarModalCobro();
        this.limpiarTicket();
        this.cargarProductos(); // Actualiza stocks visualmente
        this.mostrarModalExito.set(true);
      },
      error: (err) => {
        this.procesandoVenta.set(false);
        const msg = err.error?.detail || 'Error al procesar la venta en caja.';
        this.errorCobro.set(msg);
      },
    });
  }

  cerrarModalExito(): void {
    this.mostrarModalExito.set(false);
    this.ventaCompletada.set(null);
  }

  verComprobantePDF(url: string | undefined): void {
    if (!url) return;
    const urlCompleta = url.startsWith('http') ? url : `http://localhost:8000${url}`;
    window.open(urlCompleta, '_blank');
  }
}
