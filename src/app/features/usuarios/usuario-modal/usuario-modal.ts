/**
 * =============================================================================
 * FASHIONSTORE - MODAL DE ALTA Y EDICIÓN DE USUARIOS (CU02)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Ventana emergente con el formulario reactivo del CU02. Un mismo componente
 * cubre los dos modos de trabajo:
 *
 *   ALTA    (`usuario` = null) -> POST /api/usuarios/. Exige contraseña.
 *   EDICIÓN (`usuario` != null) -> PUT /api/usuarios/{id}. Oculta la contraseña
 *                                  y bloquea el correo, porque el backend no
 *                                  admite cambiar ninguno de los dos por esta
 *                                  vía (el correo es la identidad de acceso y
 *                                  la contraseña se restablece con el CU04).
 * =============================================================================
 */

import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { UsuarioService } from '../../../core/services/usuario.service';
import { Rol, Usuario } from '../../../core/models/usuario.model';

@Component({
  selector: 'app-usuario-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './usuario-modal.html',
  styleUrl: './usuario-modal.scss',
})
export class UsuarioModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);

  // ---------------------------------------------------------------------------
  // ENTRADAS Y SALIDAS
  // ---------------------------------------------------------------------------

  /** Usuario a editar. Si es null, el modal opera en modo alta. */
  readonly usuario = input<Usuario | null>(null);

  /** Roles disponibles para el menú desplegable, provistos por el componente padre. */
  readonly roles = input.required<Rol[]>();

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

  /** true si el modal está editando un usuario existente. */
  readonly esEdicion = signal(false);

  /** Formulario reactivo; se arma en ngOnInit según el modo de trabajo. */
  formulario!: FormGroup;

  // ---------------------------------------------------------------------------
  // CICLO DE VIDA
  // ---------------------------------------------------------------------------

  /**
   * Construye el formulario adaptado al modo de trabajo.
   *
   * El componente se crea de nuevo cada vez que se abre el modal (el padre lo
   * envuelve en un bloque @if), por lo que basta con leer las entradas aquí:
   * no hace falta reaccionar a cambios posteriores.
   *
   * @returns void
   */
  ngOnInit(): void {
    const usuarioActual = this.usuario();
    this.esEdicion.set(usuarioActual !== null);

    this.formulario = this.fb.group({
      nombre: [
        usuarioActual?.nombre ?? '',
        [Validators.required, Validators.maxLength(100)],
      ],
      apellido: [
        usuarioActual?.apellido ?? '',
        [Validators.required, Validators.maxLength(100)],
      ],
      correo: [
        { value: usuarioActual?.correo ?? '', disabled: this.esEdicion() },
        [Validators.required, Validators.email],
      ],
      telefono: [
        usuarioActual?.telefono ?? '',
        // Solo dígitos: el patrón admite el campo vacío porque es opcional.
        [Validators.pattern(/^[0-9]*$/), Validators.maxLength(20)],
      ],
      id_role: [usuarioActual?.id_role ?? null, [Validators.required]],
      // La contraseña solo existe y es obligatoria al dar de alta.
      password: [
        '',
        this.esEdicion()
          ? []
          : [Validators.required, Validators.minLength(6), Validators.maxLength(72)],
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // ACCESORES PARA LA PLANTILLA
  // ---------------------------------------------------------------------------

  /**
   * Indica si un campo debe pintarse como inválido.
   * Solo se marca en rojo tras ser tocado, para no castigar al usuario mientras
   * todavía está escribiendo.
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
   * Cierra el modal descartando los cambios.
   * Se ignora la orden mientras hay una petición en curso, para no dejar una
   * operación a medias sin que el usuario sepa si se guardó.
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
   * Según el modo, invoca `crear` o `actualizar` del UsuarioService. En caso de
   * error (por ejemplo, el 400 de correo duplicado de la excepción A del CU02)
   * el mensaje del backend se muestra en el banner del propio modal, sin
   * cerrarlo, para que el administrador pueda corregir y reintentar.
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

    // getRawValue() incluye los controles deshabilitados (el correo en modo
    // edición), a diferencia de .value.
    const valores = this.formulario.getRawValue();
    const usuarioActual = this.usuario();

    if (usuarioActual) {
      // ----- MODO EDICIÓN -----
      // El correo y la contraseña quedan fuera del cuerpo: el endpoint PUT no
      // los admite.
      this.usuarioService
        .actualizar(usuarioActual.id_usuario, {
          nombre: valores.nombre,
          apellido: valores.apellido,
          telefono: valores.telefono || null,
          id_role: Number(valores.id_role),
        })
        .subscribe({
          next: (actualizado) => {
            this.cargando.set(false);
            this.guardado.emit(
              `Los datos de ${actualizado.nombre} ${actualizado.apellido} se actualizaron correctamente.`,
            );
          },
          error: (error: Error) => {
            this.cargando.set(false);
            this.mensajeError.set(error.message);
          },
        });
    } else {
      // ----- MODO ALTA -----
      this.usuarioService
        .crear({
          nombre: valores.nombre,
          apellido: valores.apellido,
          correo: valores.correo,
          password: valores.password,
          telefono: valores.telefono || null,
          id_role: Number(valores.id_role),
        })
        .subscribe({
          next: (creado) => {
            this.cargando.set(false);
            this.guardado.emit(
              `El usuario ${creado.nombre} ${creado.apellido} fue registrado correctamente.`,
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
