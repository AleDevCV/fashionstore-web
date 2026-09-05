/**
 * =============================================================================
 * FASHIONSTORE - GESTIÓN DE USUARIOS Y ROLES (CU02)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Pantalla principal del CU02. Presenta la tabla de alta densidad con todos los
 * usuarios del sistema, un buscador rápido, indicadores de estado y las
 * acciones de alta, edición e inhabilitación lógica.
 *
 * El filtrado se resuelve en el cliente sobre la lista ya descargada: en la
 * escala de este proyecto es instantáneo y evita una petición por pulsación.
 * Cuando el volumen lo exija, habrá que mover el filtro al backend con
 * paginación (RNF02).
 * =============================================================================
 */

import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { AuthService } from '../../core/services/auth.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { Rol, Usuario } from '../../core/models/usuario.model';
import { UsuarioModal } from './usuario-modal/usuario-modal';

@Component({
  selector: 'app-usuarios',
  imports: [UsuarioModal],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss',
})
export class Usuarios implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly authService = inject(AuthService);
  private readonly notificacion = inject(NotificacionService);

  // ---------------------------------------------------------------------------
  // ESTADO
  // ---------------------------------------------------------------------------

  /** Lista completa descargada del backend. */
  private readonly usuarios = signal<Usuario[]>([]);

  /** Roles disponibles, usados por el desplegable del modal. */
  readonly roles = signal<Rol[]>([]);

  /** true mientras se descarga la lista. */
  readonly cargando = signal(true);

  /** Error de carga de la tabla; null si todo fue bien. */
  readonly errorCarga = signal<string | null>(null);

  /** Texto escrito en el buscador rápido. */
  readonly busqueda = signal('');

  /** true cuando el modal está abierto. */
  readonly modalAbierto = signal(false);

  /** Usuario que se está editando; null cuando el modal opera en modo alta. */
  readonly usuarioEnEdicion = signal<Usuario | null>(null);

  /** Identificador de la fila cuya inhabilitación está en curso. */
  readonly inhabilitandoId = signal<number | null>(null);

  /** Identificador del administrador con la sesión activa. */
  readonly idUsuarioActual = computed(
    () => this.authService.usuarioActual()?.id_usuario ?? null,
  );

  // ---------------------------------------------------------------------------
  // SEÑALES DERIVADAS
  // ---------------------------------------------------------------------------

  /**
   * Lista filtrada por el texto del buscador.
   * Busca de forma insensible a mayúsculas en el nombre completo y el correo.
   */
  readonly usuariosFiltrados = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const lista = this.usuarios();

    if (!termino) {
      return lista;
    }

    return lista.filter((u) => {
      const nombreCompleto = `${u.nombre} ${u.apellido}`.toLowerCase();
      return (
        nombreCompleto.includes(termino) || u.correo.toLowerCase().includes(termino)
      );
    });
  });

  /** Total de usuarios registrados en el sistema. */
  readonly total = computed(() => this.usuarios().length);

  /** Cantidad de cuentas en estado 'Activo'. */
  readonly activos = computed(
    () => this.usuarios().filter((u) => u.estado === 'Activo').length,
  );

  /** Cantidad de cuentas inhabilitadas. */
  readonly inactivos = computed(
    () => this.usuarios().filter((u) => u.estado === 'Inactivo').length,
  );

  // ---------------------------------------------------------------------------
  // CICLO DE VIDA
  // ---------------------------------------------------------------------------

  /**
   * Descarga la tabla de usuarios y el catálogo de roles al entrar a la vista.
   *
   * @returns void
   */
  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarRoles();
  }

  // ---------------------------------------------------------------------------
  // CARGA DE DATOS
  // ---------------------------------------------------------------------------

  /**
   * Solicita al backend la lista completa de usuarios.
   * Corresponde a los pasos 2 y 3 del flujo principal del CU02.
   *
   * @returns void
   */
  cargarUsuarios(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.usuarioService.listar().subscribe({
      next: (lista) => {
        this.usuarios.set(lista);
        this.cargando.set(false);
      },
      error: (error: Error) => {
        this.cargando.set(false);
        this.errorCarga.set(error.message);
      },
    });
  }

  /**
   * Descarga los roles que alimentan el desplegable del formulario.
   *
   * Un fallo aquí no bloquea la tabla: se avisa y la pantalla sigue siendo
   * útil para consultar, aunque el alta quede temporalmente sin opciones.
   *
   * @returns void
   */
  private cargarRoles(): void {
    this.usuarioService.listarRoles().subscribe({
      next: (lista) => this.roles.set(lista),
      error: (error: Error) =>
        this.notificacion.error(`No se pudieron cargar los roles: ${error.message}`),
    });
  }

  // ---------------------------------------------------------------------------
  // BUSCADOR
  // ---------------------------------------------------------------------------

  /**
   * Actualiza el término de búsqueda al escribir en el campo.
   *
   * @param evento Evento de entrada del campo de texto.
   * @returns void
   */
  alBuscar(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  /**
   * Vacía el buscador y restaura la lista completa.
   *
   * @returns void
   */
  limpiarBusqueda(): void {
    this.busqueda.set('');
  }

  // ---------------------------------------------------------------------------
  // MODAL
  // ---------------------------------------------------------------------------

  /**
   * Abre el modal en modo alta.
   *
   * @returns void
   */
  abrirAlta(): void {
    this.usuarioEnEdicion.set(null);
    this.modalAbierto.set(true);
  }

  /**
   * Abre el modal en modo edición con los datos del usuario indicado.
   *
   * @param usuario Fila seleccionada en la tabla.
   * @returns void
   */
  abrirEdicion(usuario: Usuario): void {
    this.usuarioEnEdicion.set(usuario);
    this.modalAbierto.set(true);
  }

  /**
   * Cierra el modal sin guardar cambios.
   *
   * @returns void
   */
  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.usuarioEnEdicion.set(null);
  }

  /**
   * Reacciona al guardado exitoso del modal: cierra la ventana, avisa al
   * usuario y recarga la tabla para reflejar el cambio (paso 10 del CU02).
   *
   * @param mensaje Texto de confirmación emitido por el modal.
   * @returns void
   */
  alGuardar(mensaje: string): void {
    this.cerrarModal();
    this.notificacion.exito(mensaje);
    this.cargarUsuarios();
  }

  // ---------------------------------------------------------------------------
  // INHABILITACIÓN LÓGICA
  // ---------------------------------------------------------------------------

  /**
   * Determina si la acción de inhabilitar debe estar bloqueada para una fila.
   *
   * Se bloquea en dos situaciones:
   *   - La fila corresponde al propio administrador conectado. El backend lo
   *     rechaza con un 400, y desactivar el botón evita que el usuario llegue
   *     a un error previsible.
   *   - La cuenta ya está inhabilitada.
   *
   * @param usuario Fila de la tabla.
   * @returns true si el botón debe mostrarse deshabilitado.
   */
  noSePuedeInhabilitar(usuario: Usuario): boolean {
    return (
      usuario.id_usuario === this.idUsuarioActual() || usuario.estado === 'Inactivo'
    );
  }

  /**
   * Ejecuta el borrado lógico de un usuario.
   *
   * Llama al endpoint DELETE, que en el backend cambia el estado a 'Inactivo'
   * sin eliminar la fila, y luego refresca la tabla.
   *
   * @param usuario Fila a inhabilitar.
   * @returns void
   */
  inhabilitar(usuario: Usuario): void {
    // Doble comprobación: la plantilla ya desactiva el botón, pero esta guarda
    // protege ante una llamada desde el código.
    if (this.noSePuedeInhabilitar(usuario)) {
      return;
    }

    this.inhabilitandoId.set(usuario.id_usuario);

    this.usuarioService.inhabilitar(usuario.id_usuario).subscribe({
      next: (respuesta) => {
        this.inhabilitandoId.set(null);
        this.notificacion.exito(respuesta.mensaje);
        this.cargarUsuarios();
      },
      error: (error: Error) => {
        this.inhabilitandoId.set(null);
        this.notificacion.error(error.message);
      },
    });
  }

  /**
   * Reactiva una cuenta inhabilitada devolviéndola al estado 'Activo'.
   *
   * @param usuario Fila a reactivar.
   * @returns void
   */
  reactivar(usuario: Usuario): void {
    this.inhabilitandoId.set(usuario.id_usuario);

    this.usuarioService
      .actualizar(usuario.id_usuario, { estado: 'Activo' })
      .subscribe({
        next: (actualizado) => {
          this.inhabilitandoId.set(null);
          this.notificacion.exito(
            `La cuenta de ${actualizado.nombre} ${actualizado.apellido} fue reactivada.`,
          );
          this.cargarUsuarios();
        },
        error: (error: Error) => {
          this.inhabilitandoId.set(null);
          this.notificacion.error(error.message);
        },
      });
  }

  // ---------------------------------------------------------------------------
  // AYUDAS DE PRESENTACIÓN
  // ---------------------------------------------------------------------------

  /**
   * Elige la variante de distintivo según el rol.
   * El Administrador se destaca en dorado siena; el resto en gris carbón.
   *
   * @param rol Nombre textual del rol.
   * @returns Clase CSS del distintivo.
   */
  claseRol(rol: string | null): string {
    return rol === 'Administrador' ? 'fs-badge--oro' : 'fs-badge--carbon';
  }

  /**
   * Elige la variante de distintivo según el estado de la cuenta.
   *
   * @param estado 'Activo' o 'Inactivo'.
   * @returns Clase CSS del distintivo.
   */
  claseEstado(estado: string): string {
    return estado === 'Activo' ? 'fs-badge--activo' : 'fs-badge--inactivo';
  }
}
