/**
 * =============================================================================
 * FASHIONSTORE - PROBADOR VIRTUAL FOTOREALISTA CON IA (Fase 2)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Modal interactivo de alta fidelidad que permite a los clientes capturar
 * una foto estática (vía cámara web HTML5 o archivo local) y procesar una
 * composición fotorealista de la prenda elegida con IA generativa y visión.
 *
 * Características:
 * - Pestaña 1: Cámara web en vivo con <video>, <canvas> y guía de torso.
 * - Pestaña 2: Carga de fotografía local con soporte drag-and-drop.
 * - Barra de progreso animada de 3 fases con telemetría visual.
 * - Visualizador comparativo interactivo (slider dividido y lado a lado).
 * - Descarga directa de la composición generada.
 * - Flujo integrado de "Reservar en Tienda (CU16)" con ticket y código QR.
 * =============================================================================
 */

import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IaService } from '../../../core/services/ia.service';
import { VentaService } from '../../../core/services/venta.service';
import { GeografiaService } from '../../../core/services/geografia.service';
import {
  PrendaCatalogo,
  Sucursal,
  VarianteCatalogo,
} from '../../../core/models/catalogo.model';
import { TryOnRespuesta } from '../../../core/models/ia.model';
import { TicketReservaRespuesta } from '../../../core/models/venta.model';

export type ModoCaptura = 'webcam' | 'archivo';
export type EstadoTryOn = 'CAPTURA' | 'PROCESANDO' | 'RESULTADO' | 'RESERVA_CU16';
export type ModoComparacion = 'slider' | 'lado_a_lado';

@Component({
  selector: 'app-probador-ia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './probador-ia.html',
  styleUrl: './probador-ia.scss',
})
export class ProbadorIa implements OnInit, OnDestroy {
  private readonly iaService = inject(IaService);
  private readonly ventaService = inject(VentaService);
  private readonly geografiaService = inject(GeografiaService);

  // ---------------------------------------------------------------------------
  // ENTRADAS Y SALIDAS
  // ---------------------------------------------------------------------------

  /** Ficha de la prenda seleccionada para la prueba virtual. */
  readonly prenda = input.required<PrendaCatalogo>();

  /** Evento emitido al cerrar el modal. */
  readonly cerrado = output<void>();

  // ---------------------------------------------------------------------------
  // ELEMENTOS DOM
  // ---------------------------------------------------------------------------

  @ViewChild('videoPlayer') videoPlayer?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasCapture') canvasCapture?: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  // ---------------------------------------------------------------------------
  // ESTADO GENERAL
  // ---------------------------------------------------------------------------

  readonly estado = signal<EstadoTryOn>('CAPTURA');
  readonly modoCaptura = signal<ModoCaptura>('webcam');
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  // ---------------------------------------------------------------------------
  // ESTADO DE CÁMARA WEB
  // ---------------------------------------------------------------------------

  readonly camaraIniciada = signal(false);
  readonly camaraError = signal<string | null>(null);
  private mediaStream: MediaStream | null = null;

  // ---------------------------------------------------------------------------
  // FOTOGRAFÍAS Y RESULTADO
  // ---------------------------------------------------------------------------

  readonly fotoOriginalBase64 = signal<string | null>(null);
  readonly respuestaTryOn = signal<TryOnRespuesta | null>(null);
  readonly posicionSlider = signal(50); // 0 a 100%
  readonly modoComparacion = signal<ModoComparacion>('slider');
  readonly isDraggingFile = signal(false);

  // ---------------------------------------------------------------------------
  // BARRA DE PROGRESO MULTI-FASE
  // ---------------------------------------------------------------------------

  readonly mensajeProgreso = signal('Detectando silueta y puntos de anclaje anatómicos...');
  readonly porcentajeProgreso = signal(15);
  readonly faseActiva = signal<1 | 2 | 3>(1);
  private timerFase2?: ReturnType<typeof setTimeout>;
  private timerFase3?: ReturnType<typeof setTimeout>;

  // ---------------------------------------------------------------------------
  // RESERVA EN TIENDA (CU16)
  // ---------------------------------------------------------------------------

  readonly sucursales = signal<Sucursal[]>([]);
  readonly sucursalSeleccionadaId = signal<number | null>(null);
  readonly varianteSeleccionada = signal<VarianteCatalogo | null>(null);
  readonly reservando = signal(false);
  readonly ticketReserva = signal<TicketReservaRespuesta | null>(null);
  readonly errorReserva = signal<string | null>(null);

  // ---------------------------------------------------------------------------
  // CICLO DE VIDA
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    if (this.modoCaptura() === 'webcam') {
      // Pequeño timeout para permitir renderizado del elemento <video>
      setTimeout(() => this.iniciarCamara(), 50);
    }
    const variantes = this.prenda().variantes;
    if (variantes && variantes.length > 0) {
      this.varianteSeleccionada.set(variantes[0]);
    }
    // Poblado inicial local a partir de la disponibilidad de las variantes
    // sin realizar peticiones HTTP para evitar 401 en usuarios no autenticados
    const sucursalesLocales = this.extraerSucursalesDeVariantes();
    if (sucursalesLocales.length > 0) {
      this.sucursales.set(sucursalesLocales);
      if (!this.sucursalSeleccionadaId()) {
        this.sucursalSeleccionadaId.set(sucursalesLocales[0].id_sucursal);
      }
    }
  }

  ngOnDestroy(): void {
    this.detenerCamara();
    this.limpiarTimersProgreso();
  }

  // ---------------------------------------------------------------------------
  // GESTIÓN DE PESTAÑAS DE CAPTURA
  // ---------------------------------------------------------------------------

  cambiarModoCaptura(modo: ModoCaptura): void {
    this.modoCaptura.set(modo);
    this.error.set(null);
    if (modo === 'webcam') {
      setTimeout(() => this.iniciarCamara(), 50);
    } else {
      this.detenerCamara();
    }
  }

  // ---------------------------------------------------------------------------
  // CÁMARA WEB HTML5
  // ---------------------------------------------------------------------------

  async iniciarCamara(): Promise<void> {
    this.camaraError.set(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.camaraError.set(
        'El navegador no admite acceso a la cámara o no se encuentra en contexto seguro (HTTPS/localhost).',
      );
      this.camaraIniciada.set(false);
      return;
    }

    try {
      this.detenerCamara();
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      if (this.videoPlayer?.nativeElement) {
        this.videoPlayer.nativeElement.srcObject = this.mediaStream;
        await this.videoPlayer.nativeElement.play();
      }
      this.camaraIniciada.set(true);
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado por el usuario. Puedes usar la pestaña "Subir Fotografía".'
          : 'No se pudo acceder a la cámara web. Verifica tu dispositivo o sube una fotografía.';
      this.camaraError.set(msg);
      this.camaraIniciada.set(false);
    }
  }

  detenerCamara(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    this.camaraIniciada.set(false);
  }

  capturarFotoWebcam(): void {
    const video = this.videoPlayer?.nativeElement;
    const canvas = this.canvasCapture?.nativeElement;
    if (!video || !canvas) return;

    const width = video.videoWidth || 720;
    const height = video.videoHeight || 960;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Efecto espejo horizontal para correspondencia visual natural
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    const base64 = canvas.toDataURL('image/jpeg', 0.92);
    this.fotoOriginalBase64.set(base64);
    this.detenerCamara();
    this.procesarConBackend(base64);
  }

  // ---------------------------------------------------------------------------
  // CARGA DE FOTOGRAFÍA LOCAL (ARCHIVO / DRAG & DROP)
  // ---------------------------------------------------------------------------

  abrirSelectorArchivo(): void {
    this.fileInput?.nativeElement?.click();
  }

  onArchivoSeleccionado(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.procesarArchivoLocal(input.files[0]);
  }

  onDragOver(evento: DragEvent): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.isDraggingFile.set(true);
  }

  onDragLeave(evento: DragEvent): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.isDraggingFile.set(false);
  }

  onFileDrop(evento: DragEvent): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.isDraggingFile.set(false);

    if (evento.dataTransfer?.files && evento.dataTransfer.files.length > 0) {
      this.procesarArchivoLocal(evento.dataTransfer.files[0]);
    }
  }

  private procesarArchivoLocal(file: File): void {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.error.set('Formato no soportado. Por favor seleccione un archivo JPG, PNG o WEBP.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      this.error.set('La imagen excede el tamaño máximo permitido de 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.fotoOriginalBase64.set(base64);
      this.procesarConBackend(base64);
    };
    reader.onerror = () => {
      this.error.set('Ocurrió un error al leer el archivo de imagen.');
    };
    reader.readAsDataURL(file);
  }

  // ---------------------------------------------------------------------------
  // PIPELINE DE COMUNICACIÓN CON BACKEND Y PROGRESO ANIMADO
  // ---------------------------------------------------------------------------

  private procesarConBackend(fotoBase64: string): void {
    this.estado.set('PROCESANDO');
    this.cargando.set(true);
    this.error.set(null);
    this.limpiarTimersProgreso();

    // Fase 1: Silueta y puntos de anclaje anatómicos
    this.faseActiva.set(1);
    this.porcentajeProgreso.set(20);
    this.mensajeProgreso.set('Detectando silueta y puntos de anclaje...');

    // Fase 2: Adaptando tejido y caída
    this.timerFase2 = setTimeout(() => {
      this.faseActiva.set(2);
      this.porcentajeProgreso.set(55);
      this.mensajeProgreso.set('Adaptando tejido y caída...');
    }, 1100);

    // Fase 3: Componiendo sombras realistas
    this.timerFase3 = setTimeout(() => {
      this.faseActiva.set(3);
      this.porcentajeProgreso.set(85);
      this.mensajeProgreso.set('Componiendo sombras realistas...');
    }, 2200);

    this.iaService
      .generarTryOn({
        foto_usuario: fotoBase64,
        id_prenda: this.prenda().id_prenda,
        url_prenda: this.prenda().url_imagen,
        usar_ia_generativa: true,
        ajuste_holgura: 1.0,
      })
      .subscribe({
        next: (resp) => {
          this.limpiarTimersProgreso();
          this.porcentajeProgreso.set(100);
          this.mensajeProgreso.set('¡Composición fotorealista completada con éxito!');
          this.respuestaTryOn.set(resp);

          setTimeout(() => {
            this.estado.set('RESULTADO');
            this.cargando.set(false);
          }, 400);
        },
        error: (err: Error) => {
          this.limpiarTimersProgreso();
          this.error.set(err.message || 'Error al procesar la prueba virtual con IA.');
          this.estado.set('CAPTURA');
          this.cargando.set(false);
          if (this.modoCaptura() === 'webcam') {
            setTimeout(() => this.iniciarCamara(), 50);
          }
        },
      });
  }

  private limpiarTimersProgreso(): void {
    if (this.timerFase2) clearTimeout(this.timerFase2);
    if (this.timerFase3) clearTimeout(this.timerFase3);
  }

  // ---------------------------------------------------------------------------
  // INTERACCIÓN CON RESULTADOS (SLIDER / MODO COMPARACIÓN / DESCARGA)
  // ---------------------------------------------------------------------------

  actualizarSlider(evento: Event): void {
    const valor = Number((evento.target as HTMLInputElement).value);
    this.posicionSlider.set(valor);
  }

  alternarModoComparacion(): void {
    this.modoComparacion.set(
      this.modoComparacion() === 'slider' ? 'lado_a_lado' : 'slider',
    );
  }

  descargarResultado(): void {
    const dataUrl = this.respuestaTryOn()?.imagen_resultado;
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.href = dataUrl;
    const nombreArchivo = `fashionstore-tryon-${this.prenda().id_prenda}.jpg`;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  reintentarCaptura(): void {
    this.estado.set('CAPTURA');
    this.fotoOriginalBase64.set(null);
    this.respuestaTryOn.set(null);
    this.posicionSlider.set(50);
    this.error.set(null);
    if (this.modoCaptura() === 'webcam') {
      setTimeout(() => this.iniciarCamara(), 50);
    }
  }

  // ---------------------------------------------------------------------------
  // FLUJO DE RESERVA EN TIENDA FÍSICA (CU16)
  // ---------------------------------------------------------------------------

  iniciarReserva(): void {
    this.errorReserva.set(null);
    this.ticketReserva.set(null);
    this.estado.set('RESERVA_CU16');
    this.cargarSucursales();
  }

  volverAResultado(): void {
    this.estado.set('RESULTADO');
  }

  cargarSucursales(): void {
    // Si el usuario no está autenticado en el catálogo público, evitamos la llamada a /api/sucursales
    // (endpoint protegido) para prevenir que authInterceptor capture un 401 y redirija a /login.
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('fashionstore_token') : null;
    if (!token) {
      if (this.sucursales().length === 0) {
        const sucursalesLocales = this.extraerSucursalesDeVariantes();
        if (sucursalesLocales.length > 0) {
          this.sucursales.set(sucursalesLocales);
          if (!this.sucursalSeleccionadaId()) {
            this.sucursalSeleccionadaId.set(sucursalesLocales[0].id_sucursal);
          }
        }
      }
      return;
    }

    this.geografiaService.listarSucursales().subscribe({
      next: (lista) => {
        if (lista && lista.length > 0) {
          this.sucursales.set(lista);
          if (!this.sucursalSeleccionadaId() || !lista.some((s) => s.id_sucursal === this.sucursalSeleccionadaId())) {
            this.sucursalSeleccionadaId.set(lista[0].id_sucursal);
          }
        } else if (this.sucursales().length === 0) {
          const sucursalesLocales = this.extraerSucursalesDeVariantes();
          if (sucursalesLocales.length > 0) {
            this.sucursales.set(sucursalesLocales);
            if (!this.sucursalSeleccionadaId()) {
              this.sucursalSeleccionadaId.set(sucursalesLocales[0].id_sucursal);
            }
          }
        }
      },
      error: (err) => {
        // En caso de fallo de red o error de permisos en sucursales, no bloquear el probador
        console.warn('No se pudieron obtener sucursales desde la API:', err);
        if (this.sucursales().length === 0) {
          const sucursalesLocales = this.extraerSucursalesDeVariantes();
          if (sucursalesLocales.length > 0) {
            this.sucursales.set(sucursalesLocales);
            if (!this.sucursalSeleccionadaId()) {
              this.sucursalSeleccionadaId.set(sucursalesLocales[0].id_sucursal);
            }
          }
        }
      },
    });
  }

  private extraerSucursalesDeVariantes(): Sucursal[] {
    const mapa = new Map<number, Sucursal>();
    const variantes = this.prenda()?.variantes ?? [];
    for (const v of variantes) {
      if (v.disponibilidad && Array.isArray(v.disponibilidad)) {
        for (const d of v.disponibilidad) {
          if (d.id_sucursal && !mapa.has(d.id_sucursal)) {
            mapa.set(d.id_sucursal, {
              id_sucursal: d.id_sucursal,
              nombre: d.sucursal || `Sucursal #${d.id_sucursal}`,
              direccion: d.direccion || 'Dirección de sucursal',
              telefono: null,
              id_ciudad: null,
              ciudad: d.ciudad || null,
              id_encargado: null,
              encargado: null,
              created_at: null,
            });
          }
        }
      }
    }
    return Array.from(mapa.values());
  }

  confirmarReserva(): void {
    const variante = this.varianteSeleccionada();
    const sucursalId = this.sucursalSeleccionadaId();

    if (!variante || !sucursalId) {
      this.errorReserva.set('Por favor selecciona una talla/color y una sucursal de retiro.');
      return;
    }

    this.reservando.set(true);
    this.errorReserva.set(null);

    this.ventaService
      .crearReservaProbador({
        id_cliente: this.obtenerIdCliente(),
        id_sucursal: sucursalId,
        items: [
          {
            id_variante_prenda: variante.id_variante_prenda,
            cantidad: 1,
            precio_unitario: Number(variante.precio),
          },
        ],
        horas_vigencia: 24,
      })
      .subscribe({
        next: (ticket) => {
          this.ticketReserva.set(ticket);
          this.reservando.set(false);
        },
        error: (err: Error) => {
          this.errorReserva.set(err.message || 'Error al procesar la reserva en sucursal.');
          this.reservando.set(false);
        },
      });
  }

  private obtenerIdCliente(): number {
    try {
      const token = localStorage.getItem('fashionstore_token');
      if (!token) return 61;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id_cliente || payload.sub || 61;
    } catch {
      return 61;
    }
  }

  // ---------------------------------------------------------------------------
  // CIERRE DEL MODAL
  // ---------------------------------------------------------------------------

  cerrarModal(): void {
    this.detenerCamara();
    this.limpiarTimersProgreso();
    this.cerrado.emit();
  }

  formatearCalce(confianza?: number): string {
    if (!confianza && confianza !== 0) return '96%';
    return `${Math.round(confianza * 100)}%`;
  }
}
