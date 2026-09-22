/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE NOTIFICACIONES EMERGENTES
 * -----------------------------------------------------------------------------
 * Publica avisos breves que el layout administrativo renderiza como un "toast"
 * discreto en la esquina inferior derecha.
 *
 * Cubre dos necesidades concretas:
 *   - El mensaje de confirmación tras crear, editar o inhabilitar un usuario
 *     (paso 10 del flujo principal del CU02).
 *   - La alerta de acceso denegado que emite el `rolGuard` al bloquear una ruta.
 *
 * Se implementa con señales para que cualquier componente pueda emitir un aviso
 * sin necesidad de comunicación entre componentes ni librerías externas.
 * =============================================================================
 */

import { Injectable, signal } from '@angular/core';

/** Naturaleza del aviso; determina el color del borde lateral del toast. */
export type TipoNotificacion = 'exito' | 'error' | 'aviso';

/** Aviso mostrado en pantalla. */
export interface Notificacion {
  /** Identificador único, usado para cerrar el aviso correcto. */
  id: number;

  /** Texto que lee el usuario. */
  mensaje: string;

  /** Determina el acento visual del aviso. */
  tipo: TipoNotificacion;
}

/** Milisegundos que un aviso permanece visible antes de desaparecer solo. */
const DURACION_MS = 4500;

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  /** Contador incremental para asignar identificadores únicos. */
  private contador = 0;

  /** Lista interna de avisos activos. */
  private readonly _avisos = signal<Notificacion[]>([]);

  /** Señal de solo lectura que consume el layout para renderizar los avisos. */
  readonly avisos = this._avisos.asReadonly();

  /**
   * Publica un aviso de operación exitosa (acento verde esmeralda).
   *
   * @param mensaje Texto a mostrar.
   * @returns void
   */
  exito(mensaje: string): void {
    this.publicar(mensaje, 'exito');
  }

  /**
   * Publica un aviso de error (acento vino).
   *
   * @param mensaje Texto a mostrar.
   * @returns void
   */
  error(mensaje: string): void {
    this.publicar(mensaje, 'error');
  }

  /**
   * Publica una advertencia (acento dorado). Lo usa el `rolGuard` al denegar
   * el acceso a una ruta restringida.
   *
   * @param mensaje Texto a mostrar.
   * @returns void
   */
  aviso(mensaje: string): void {
    this.publicar(mensaje, 'aviso');
  }

  /**
   * Cierra manualmente un aviso concreto.
   *
   * @param id Identificador del aviso a retirar.
   * @returns void
   */
  cerrar(id: number): void {
    this._avisos.update((lista) => lista.filter((aviso) => aviso.id !== id));
  }

  /**
   * Añade un aviso a la lista y programa su retirada automática.
   *
   * @param mensaje Texto del aviso.
   * @param tipo Naturaleza del aviso.
   * @returns void
   */
  private publicar(mensaje: string, tipo: TipoNotificacion): void {
    const id = ++this.contador;
    this._avisos.update((lista) => [...lista, { id, mensaje, tipo }]);

    // Retirada automática: evita que los avisos se acumulen en pantalla.
    setTimeout(() => this.cerrar(id), DURACION_MS);
  }
}
