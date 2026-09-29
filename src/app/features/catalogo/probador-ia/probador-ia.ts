import { Component, ElementRef, OnDestroy, ViewChild, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { createDecartClient, models } from '@decartai/sdk';
import { IaService } from '../../../core/services/ia.service';
import { PrendaCatalogo } from '../../../core/models/catalogo.model';
import { environment } from '../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-probador-ia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './probador-ia.html',
  styleUrl: './probador-ia.scss',
})
export class ProbadorIa implements OnDestroy {
  private readonly iaService = inject(IaService);

  readonly prenda = input.required<PrendaCatalogo>();
  readonly cerrado = output<void>();

  @ViewChild('localVideo') localVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo?: ElementRef<HTMLVideoElement>;

  readonly conectado = signal(false);
  readonly conectando = signal(false);
  readonly error = signal<string | null>(null);

  private rtClient?: any;
  private localStream?: MediaStream;
  private respaldoIntentado = false;
  private respaldoEnUso = false;
  private finalizado = false;

  private esErrorCreditos(error: unknown): boolean {
    const dato = error as { reason?: string; code?: string; message?: string; status?: number } | null;
    const texto = [dato?.reason, dato?.code, dato?.message, String(dato?.status ?? '')]
      .join(' ').toLowerCase();
    return texto.includes('insufficient_credits') || texto.includes('insufficient credits')
      || texto.includes('not enough credits') || texto.includes('out of credits')
      || texto.includes('credit balance') || dato?.status === 402;
  }

  private async conectar(useBackup: boolean): Promise<void> {
    const token = await firstValueFrom(this.iaService.obtenerRealtimeToken(useBackup));
    if (!token?.apiKey || !this.localStream || this.finalizado) {
      throw new Error('No se pudo iniciar el probador IA');
    }

    const client = createDecartClient({ apiKey: token.apiKey });
    const usandoRespaldo = useBackup || token.usandoRespaldo;
    this.respaldoEnUso = usandoRespaldo;
    const originalWorker = window.Worker;
    window.Worker = function(url: string | URL, options?: WorkerOptions) {
      if (url.toString().includes('frame-metadata-worker')) {
        throw new Error('Worker disabled intentionally to bypass Vite bundler 404');
      }
      return new originalWorker(url, options);
    } as unknown as typeof Worker;

    let imageUrl = `${environment.apiUrl}/api/ia/proxy-image?url=${encodeURIComponent(this.prenda().url_imagen || '')}`;
    if (imageUrl.startsWith('/')) imageUrl = window.location.origin + imageUrl;

    try {
      const session = await client.realtime.connect(this.localStream, {
        model: models.realtime('lucy-vton-latest'),
        initialState: {
          image: this.prenda().url_imagen ? imageUrl : '',
          prompt: {
            text: "Change the person's clothing to match the outfit in the reference image",
            enhance: true
          }
        },
        onRemoteStream: (remoteStream: MediaStream) => {
          if (this.remoteVideo?.nativeElement && !this.finalizado) {
            this.remoteVideo.nativeElement.srcObject = remoteStream;
            setTimeout(() => this.remoteVideo?.nativeElement?.play().catch(() => {}), 100);
          }
        }
      });
      if (this.finalizado) {
        session.disconnect();
        return;
      }
      this.rtClient = session;
      session.on('sessionEnded', ({ reason }) => {
        if (this.respaldoIntentado && !usandoRespaldo) return;
        if (reason === 'insufficient_credits' && !usandoRespaldo) {
          void this.activarRespaldo();
        } else if (!this.finalizado) {
          this.conectado.set(false);
          this.error.set('El probador IA no está disponible temporalmente.');
        }
      });
      session.on('error', (error) => {
        if (this.esErrorCreditos(error) && !usandoRespaldo) void this.activarRespaldo();
      });
    } finally {
      window.Worker = originalWorker;
    }
  }

  private async activarRespaldo(): Promise<void> {
    if (this.respaldoIntentado || this.finalizado) return;
    this.respaldoIntentado = true;
    this.conectado.set(false);
    this.conectando.set(true);
    this.error.set(null);
    try { this.rtClient?.disconnect(); } catch { /* La sesión principal ya terminó. */ }
    this.rtClient = undefined;
    if (this.remoteVideo?.nativeElement) this.remoteVideo.nativeElement.srcObject = null;
    try {
      await this.conectar(true);
      if (!this.finalizado) this.conectado.set(true);
    } catch {
      if (!this.finalizado) this.error.set('El probador IA no está disponible temporalmente.');
    } finally {
      this.conectando.set(false);
    }
  }

  async iniciarExperiencia() {
    try {
      this.finalizado = false;
      this.respaldoIntentado = false;
      this.respaldoEnUso = false;
      this.conectando.set(true);
      this.error.set(null);

      const rtModel = models.realtime('lucy-vton-latest');

      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: rtModel.width }, 
          height: { ideal: rtModel.height },
          frameRate: rtModel.fps,
          facingMode: "user"
        },
        audio: false
      });

      if (this.localVideo?.nativeElement) {
        const localVid = this.localVideo.nativeElement;
        localVid.srcObject = this.localStream;
        await new Promise<void>((resolve) => {
          if (localVid.readyState >= 2) {
            resolve();
          } else {
            localVid.onloadedmetadata = () => resolve();
          }
        });
      }

      try {
        await this.conectar(false);
      } catch (error) {
        if (this.esErrorCreditos(error) && !this.respaldoEnUso) {
          await this.activarRespaldo();
          return;
        }
        throw error;
      }
      
      if (!this.respaldoIntentado) this.conectado.set(true);
      this.conectando.set(false);

    } catch (e: any) {
      console.error('No se pudo iniciar el probador IA', e);
      this.error.set(e?.message || 'Error al iniciar la experiencia');
      this.conectando.set(false);
    }
  }

  cerrar() {
    this.finalizado = true;
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
    }
    if (this.rtClient) {
      try { this.rtClient.disconnect(); } catch (e) {}
    }
    this.cerrado.emit();
  }

  ngOnDestroy() {
    this.cerrar();
  }
}
