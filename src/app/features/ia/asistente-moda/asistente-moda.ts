/**
 * =============================================================================
 * FASHIONSTORE - ASISTENTE DE MODA IA (CU22)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Interfaz tipo chat: el usuario define sus preferencias, el estilista IA
 * (Gemini 2.5 Flash) responde con un mensaje y un carrusel de prendas
 * recomendadas, validadas contra el stock físico real por el backend.
 * =============================================================================
 */

import { Component, inject, signal } from '@angular/core';

import { IaService } from '../../../core/services/ia.service';
import {
  ClimaModa,
  EstiloModa,
  GeneroModa,
  OcasionModa,
  RecomendadorPayload,
  RespuestaRecomendador,
  TallaModa,
} from '../../../core/models/ia.model';

@Component({
  selector: 'app-asistente-moda',
  standalone: true,
  templateUrl: './asistente-moda.html',
  styleUrl: './asistente-moda.scss',
})
export class AsistenteModa {
  private readonly iaService = inject(IaService);

  readonly estilos: EstiloModa[] = ['Casual', 'Formal', 'Deportivo', 'Elegante'];
  readonly ocasiones: OcasionModa[] = ['Trabajo', 'Fiesta', 'Cita', 'Deporte', 'Diario'];
  readonly generos: GeneroModa[] = ['Femenino', 'Masculino', 'Unisex'];
  readonly tallas: TallaModa[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  readonly climas: ClimaModa[] = ['Calido', 'Templado', 'Frio'];

  readonly estilo = signal<EstiloModa>('Casual');
  readonly ocasion = signal<OcasionModa>('Diario');
  readonly genero = signal<GeneroModa>('Unisex');
  readonly talla = signal<TallaModa>('M');
  readonly clima = signal<ClimaModa>('Templado');

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly respuesta = signal<RespuestaRecomendador | null>(null);

  /** Historial de mensajes tipo chat de la sesión actual. */
  readonly mensajes = signal<{ autor: 'usuario' | 'ia'; texto: string }[]>([]);

  obtenerRecomendaciones(): void {
    this.cargando.set(true);
    this.error.set(null);

    const resumenPeticion =
      `Estilo ${this.estilo()} para ${this.ocasion()}, talla ${this.talla()}, clima ${this.clima()}.`;
    this.mensajes.update((lista) => [...lista, { autor: 'usuario', texto: resumenPeticion }]);

    const payload: RecomendadorPayload = {
      estilo: this.estilo(),
      ocasion: this.ocasion(),
      genero: this.genero(),
      talla: this.talla(),
      temporada: null,
      clima: this.clima(),
      limite: 8,
    };

    this.iaService.recomendar(payload).subscribe({
      next: (resp) => {
        this.respuesta.set(resp);
        this.mensajes.update((lista) => [...lista, { autor: 'ia', texto: resp.mensaje_estilista }]);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.cargando.set(false);
      },
    });
  }
}
