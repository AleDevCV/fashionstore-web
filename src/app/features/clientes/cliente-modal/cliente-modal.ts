/**
 * =============================================================================
 * FASHIONSTORE - MODAL DE ALTA Y EDICIÓN DE CLIENTES (CU05)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Un mismo componente cubre los dos modos:
 *
 *   ALTA    (`cliente` = null) -> POST /api/clientes/
 *   EDICIÓN (`cliente` != null) -> PUT /api/clientes/{id}; muestra además el
 *                                  estado para permitir reactivar/inactivar.
 *
 * Los errores del backend (cédula o correo duplicados) llegan traducidos por el
 * servicio y se muestran en el banner del propio modal sin cerrarlo.
 * =============================================================================
 */

import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ClienteService } from '../../../core/services/cliente.service';
import { Cliente } from '../../../core/models/catalogo.model';

@Component({
  selector: 'app-cliente-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './cliente-modal.html',
  styleUrl: './cliente-modal.scss',
})
export class ClienteModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clienteService = inject(ClienteService);

  // ---------------------------------------------------------------------------
  // ENTRADAS Y SALIDAS
  // ---------------------------------------------------------------------------

  /** Cliente a editar. Si es null, el modal opera en modo alta. */
  readonly cliente = input<Cliente | null>(null);

  /** Se emite cuando el usuario cierra el modal sin guardar. */
  readonly cerrado = output<void>();

  /** Se emite tras guardar con éxito; lleva el mensaje de confirmación. */
  readonly guardado = output<string>();

  // ---------------------------------------------------------------------------
  // ESTADO DE LA VISTA
  // ---------------------------------------------------------------------------

  /** true mientras la petición HTTP está en curso. */
  readonly cargando = signal(false);

  /** Mensaje de error devuelto por el backend; null si no hay ninguno. */
  readonly mensajeError = signal<string | null>(null);

  /** true si el modal está editando una ficha existente. */
  readonly esEdicion = signal(false);

  /** Formulario reactivo; se arma en ngOnInit según el modo de trabajo. */
  formulario!: FormGroup;

  // ---------------------------------------------------------------------------
  // CICLO DE VIDA
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    const clienteActual = this.cliente();
    this.esEdicion.set(clienteActual !== null);

    this.formulario = this.fb.group({
      ci: [
        clienteActual?.ci ?? '',
        [Validators.required, Validators.minLength(4), Validators.maxLength(20)],
      ],
      nombre_completo: [
        clienteActual?.nombre_completo ?? '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(200)],
      ],
      telefono: [
        clienteActual?.telefono ?? '',
        // Solo dígitos; el patrón admite vacío porque el campo es opcional.
        [Validators.pattern(/^[0-9]*$/), Validators.maxLength(20)],
      ],
      correo: [clienteActual?.correo ?? '', [Validators.email]],
      direccion_envio: [
        clienteActual?.direccion_envio ?? '',
        [Validators.maxLength(255)],
      ],
      estado: [clienteActual?.estado ?? 'Activo'],
    });
  }

  // ---------------------------------------------------------------------------
  // ACCESORES PARA LA PLANTILLA
  // ---------------------------------------------------------------------------

  /**
   * Indica si un campo debe pintarse como inválido (solo tras ser tocado).
   *
   * @param nombreCampo Nombre del control dentro del FormGroup.
   * @returns true si el control es inválido y ya fue tocado o modificado.
   */
  campoInvalido(nombreCampo: string): boolean {
    const control = this.formulario.controls[nombreCampo];
    return control.invalid && (control.touched || control.dirty);
  }

  /**
   * Devuelve los errores de un control para mostrarlos en la plantilla.
   *
   * @param nombreCampo Nombre del control.
   * @returns Objeto de errores de Angular, o null si el control es válido.
   */
  errores(nombreCampo: string) {
    return this.formulario.controls[nombreCampo].errors;
  }

  // ---------------------------------------------------------------------------
  // ACCIONES
  // ---------------------------------------------------------------------------

  /**
   * Cierra el modal descartando los cambios (ignorado durante una petición).
   *
   * @returns void
   */
  cerrar(): void {
    if (!this.cargando()) {
      this.cerrado.emit();
    }
  }

  /**
   * Valida y envía el formulario al backend.
   *
   * @returns void
   */
  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set(null);

    const valores = this.formulario.value;
    const clienteActual = this.cliente();

    const cuerpo = {
      ci: valores.ci,
      nombre_completo: valores.nombre_completo,
      telefono: valores.telefono || null,
      correo: valores.correo || null,
      direccion_envio: valores.direccion_envio || null,
    };

    if (clienteActual) {
      // ----- MODO EDICIÓN -----
      this.clienteService
        .actualizar(clienteActual.id_cliente, { ...cuerpo, estado: valores.estado })
        .subscribe({
          next: (actualizado) => {
            this.cargando.set(false);
            this.guardado.emit(
              `La ficha de ${actualizado.nombre_completo} se actualizó correctamente.`,
            );
          },
          error: (error: Error) => {
            this.cargando.set(false);
            this.mensajeError.set(error.message);
          },
        });
    } else {
      // ----- MODO ALTA -----
      this.clienteService.crear(cuerpo).subscribe({
        next: (creado) => {
          this.cargando.set(false);
          this.guardado.emit(
            `El cliente ${creado.nombre_completo} fue registrado correctamente.`,
          );
        },
        error: (error: Error) => {
          this.cargando.set(false);
          this.mensajeError.set(error.message);
        },
      });
    }
  }
}
