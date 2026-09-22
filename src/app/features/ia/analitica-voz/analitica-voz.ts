/**
 * =============================================================================
 * FASHIONSTORE - CONSULTAS ANALÍTICAS POR VOZ (CU23)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Integra la Web Speech API nativa del navegador para transcribir comandos de
 * voz de gerencia y enviarlos como texto al backend (Gemini interpreta la
 * consulta y ejecuta SQL real sobre PostgreSQL). Permite descargar el reporte
 * ejecutivo generado en PDF.
 * =============================================================================
 */

import { Component, inject, signal } from '@angular/core';

import { IaService } from '../../../core/services/ia.service';
import { RespuestaAnaliticaVoz } from '../../../core/models/ia.model';

/** Contrato mínimo de la Web Speech API (no incluido en los tipos DOM estándar de TS). */
interface SpeechRecognitionResultEvent extends Event {
  results: { [index: number]: { [index: number]: { transcript: string } } } & { length: number };
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

@Component({
  selector: 'app-analitica-voz',
  standalone: true,
  templateUrl: './analitica-voz.html',
  styleUrl: './analitica-voz.scss',
})
export class AnaliticaVoz {
  private readonly iaService = inject(IaService);
  private reconocimiento: SpeechRecognitionLike | null = null;

  readonly soportaVoz = signal(this.detectarSoporteVoz());
  readonly escuchando = signal(false);
  readonly textoVoz = signal('');
  readonly generarPdf = signal(false);

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly respuesta = signal<RespuestaAnaliticaVoz | null>(null);

  private detectarSoporteVoz(): boolean {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  /** Inicia el reconocimiento de voz nativo del navegador (botón de micrófono). */
  alternarEscucha(): void {
    if (this.escuchando()) {
      this.reconocimiento?.stop();
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      this.error.set('Este navegador no soporta reconocimiento de voz. Escribe tu consulta manualmente.');
      return;
    }

    this.error.set(null);
    this.reconocimiento = new Ctor();
    this.reconocimiento.lang = 'es-BO';
    this.reconocimiento.interimResults = false;
    this.reconocimiento.continuous = false;

    this.reconocimiento.onresult = (event: SpeechRecognitionResultEvent) => {
      const transcripcion = event.results[0]?.[0]?.transcript ?? '';
      this.textoVoz.set(transcripcion);
    };

    this.reconocimiento.onerror = () => {
      this.error.set('No se pudo capturar el audio. Intenta nuevamente o escribe la consulta.');
      this.escuchando.set(false);
    };

    this.reconocimiento.onend = () => {
      this.escuchando.set(false);
    };

    this.escuchando.set(true);
    this.reconocimiento.start();
  }

  actualizarTexto(valor: string): void {
    this.textoVoz.set(valor);
  }

  alternarGenerarPdf(valor: boolean): void {
    this.generarPdf.set(valor);
  }

  consultar(): void {
    const texto = this.textoVoz().trim();
    if (!texto) {
      this.error.set('Escribe o dicta una consulta antes de continuar.');
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    this.iaService
      .analiticaVoz({ texto_voz: texto, generar_pdf: this.generarPdf() })
      .subscribe({
        next: (resp) => {
          this.respuesta.set(resp);
          this.cargando.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.cargando.set(false);
        },
      });
  }

  /** Decodifica el PDF Base64 devuelto por el backend y dispara su descarga. */
  descargarPdf(): void {
    const resp = this.respuesta();
    if (!resp?.pdf_base64) {
      return;
    }

    const bytes = atob(resp.pdf_base64);
    const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      buffer[i] = bytes.charCodeAt(i);
    }

    const blob = new Blob([buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `reporte-fashionstore-${Date.now()}.pdf`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
