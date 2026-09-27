import { Component, ElementRef, OnDestroy, ViewChild, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { createDecartClient, models } from '@decartai/sdk';
import { IaService } from '../../../core/services/ia.service';
import { PrendaCatalogo } from '../../../core/models/catalogo.model';
import { environment } from '../../../../environments/environment';

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

  async iniciarExperiencia() {
    try {
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

      const videoTrack = this.localStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log('Camera dimensions resolved:', settings.width, 'x', settings.height);

      const tokenResp = await this.iaService.obtenerRealtimeToken().toPromise();
      if (!tokenResp || !tokenResp.apiKey) throw new Error('No se pudo obtener token');

      const client = createDecartClient({ apiKey: tokenResp.apiKey });

      // Disable FrameMetadataWorker synchronously to avoid asynchronous rejection in LiveKit
      const originalWorker = window.Worker;
      window.Worker = function(url: string | URL, options?: WorkerOptions) {
        if (url.toString().includes('frame-metadata-worker')) {
          throw new Error('Worker disabled intentionally to bypass Vite bundler 404');
        }
        return new originalWorker(url, options);
      } as any;

      let imageUrl = `${environment.apiUrl}/api/ia/proxy-image?url=${encodeURIComponent(this.prenda().url_imagen || '')}`;
      if (imageUrl.startsWith('/')) {
        imageUrl = window.location.origin + imageUrl;
      }

      this.rtClient = await client.realtime.connect(this.localStream, {
        model: rtModel,
        initialState: {
          image: this.prenda().url_imagen ? imageUrl : '',
          prompt: {
            text: "Change the person's clothing to match the outfit in the reference image",
            enhance: true
          }
        },
        onRemoteStream: (remoteStream: MediaStream) => {
          if (this.remoteVideo?.nativeElement) {
            this.remoteVideo.nativeElement.srcObject = remoteStream;
            setTimeout(() => this.remoteVideo?.nativeElement?.play().catch(e => console.warn('Autoplay bloqueado:', e)), 100);
          }
        }
      });

      // Restore original worker
      window.Worker = originalWorker;
      
      this.conectado.set(true);
      this.conectando.set(false);

    } catch (e: any) {
      console.error(e);
      this.error.set(e.message || 'Error al iniciar la experiencia');
      this.conectando.set(false);
    }
  }

  cerrar() {
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
