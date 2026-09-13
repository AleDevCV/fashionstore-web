/**
 * =============================================================================
 * FASHIONSTORE - MATRIZ DE ROLES Y PERMISOS (CU03)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Pantalla administrativa para la configuración del control de acceso basado
 * en roles (RBAC) granular.
 *
 * Características:
 *   - Matriz interactiva que cruza los roles del sistema con los permisos
 *     agrupados por módulo funcional.
 *   - Controles de alternancia (checkboxes/toggles) para conceder o revocar permisos.
 *   - Guardado reactivo inmediato con feedback visual (spinner de celda y toasts
 *     mediante NotificacionService).
 *   - Protección del rol Administrador (acceso total por diseño para evitar auto-bloqueo).
 *   - Buscador en tiempo real y filtro por módulo del sistema.
 * =============================================================================
 */

import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { forkJoin } from 'rxjs';

import { PermisoService } from '../../../core/services/permiso.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { Permiso } from '../../../core/models/permiso.model';
import { Rol } from '../../../core/models/usuario.model';

export interface ModuloPermisosGrupo {
  nombre: string;
  permisos: Permiso[];
}

@Component({
  selector: 'app-roles-permisos',
  imports: [],
  templateUrl: './roles-permisos.html',
  styleUrl: './roles-permisos.scss',
})
export class RolesPermisos implements OnInit {
  private readonly permisoService = inject(PermisoService);
  private readonly notificacion = inject(NotificacionService);

  // ---------------------------------------------------------------------------
  // ESTADO REACTIVO
  // ---------------------------------------------------------------------------

  /** true mientras se descargan la matriz y las asignaciones iniciales. */
  readonly cargando = signal(true);

  /** Mensaje de error general de carga; null si todo fue correcto. */
  readonly errorCarga = signal<string | null>(null);

  /** Lista completa de roles disponibles en el sistema. */
  readonly roles = signal<Rol[]>([]);

  /** Catálogo maestro de permisos disponibles en el sistema. */
  readonly permisos = signal<Permiso[]>([]);

  /**
   * Mapa reactivo de asignaciones: id_rol -> conjunto de id_permiso asignados.
   */
  readonly asignaciones = signal<Record<number, number[]>>({});

  /**
   * Clave identificadora de la celda actualmente en proceso de guardado
   * Formato: `${id_rol}-${id_permiso}`, o null si ninguna petición está en vuelo.
   */
  readonly guardandoCelda = signal<string | null>(null);

  /** Texto del filtro de búsqueda rápida. */
  readonly busqueda = signal('');

  /** Filtro seleccionado por módulo ('TODOS' o el nombre del módulo). */
  readonly filtroModulo = signal('TODOS');

  // ---------------------------------------------------------------------------
  // SEÑALES DERIVADAS (COMPUTED)
  // ---------------------------------------------------------------------------

  /** Lista única y ordenada de nombres de módulos presentes en los permisos. */
  readonly modulosDisponibles = computed<string[]>(() => {
    const todos = this.permisos().map((p) => p.modulo || 'General');
    return Array.from(new Set(todos)).sort();
  });

  /** Permisos filtrados según la búsqueda de texto y el módulo seleccionado. */
  readonly permisosFiltrados = computed<Permiso[]>(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const modulo = this.filtroModulo();
    let lista = this.permisos();

    if (modulo !== 'TODOS') {
      lista = lista.filter((p) => (p.modulo || 'General') === modulo);
    }

    if (!termino) {
      return lista;
    }

    return lista.filter(
      (p) =>
        p.nombre.toLowerCase().includes(termino) ||
        p.codigo.toLowerCase().includes(termino) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(termino)) ||
        (p.modulo && p.modulo.toLowerCase().includes(termino)),
    );
  });

  /** Permisos agrupados por módulo funcional para la presentación jerárquica. */
  readonly gruposPorModulo = computed<ModuloPermisosGrupo[]>(() => {
    const filtrados = this.permisosFiltrados();
    const mapa = new Map<string, Permiso[]>();

    for (const p of filtrados) {
      const mod = p.modulo || 'General';
      if (!mapa.has(mod)) {
        mapa.set(mod, []);
      }
      mapa.get(mod)!.push(p);
    }

    const resultado: ModuloPermisosGrupo[] = [];
    mapa.forEach((perms, nombre) => {
      resultado.push({ nombre, permisos: perms });
    });

    return resultado;
  });

  /** Resumen de totales para indicadores superiores. */
  readonly totalPermisos = computed(() => this.permisos().length);
  readonly totalRoles = computed(() => this.roles().length);
  readonly totalModulos = computed(() => this.modulosDisponibles().length);

  // ---------------------------------------------------------------------------
  // CICLO DE VIDA
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.cargarDatos();
  }

  // ---------------------------------------------------------------------------
  // CARGA DE DATOS
  // ---------------------------------------------------------------------------

  /**
   * Carga en paralelo la lista de roles y permisos, y posteriormente consulta
   * las asignaciones activas de cada rol para poblar la matriz interactiva.
   */
  cargarDatos(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    forkJoin({
      roles: this.permisoService.listarRoles(),
      permisos: this.permisoService.listarPermisos(),
    }).subscribe({
      next: ({ roles, permisos }) => {
        this.roles.set(roles);
        this.permisos.set(permisos);

        if (roles.length === 0) {
          this.cargando.set(false);
          return;
        }

        // Cargar las asignaciones de cada rol
        const peticionesRoles = roles.map((r) =>
          this.permisoService.obtenerPermisosRol(r.id_rol),
        );

        forkJoin(peticionesRoles).subscribe({
          next: (respuestas) => {
            const nuevoMapa: Record<number, number[]> = {};
            for (const resp of respuestas) {
              nuevoMapa[resp.id_rol] = resp.permisos || [];
            }
            this.asignaciones.set(nuevoMapa);
            this.cargando.set(false);
          },
          error: (err: Error) => {
            this.cargando.set(false);
            this.errorCarga.set(`Error al cargar asignaciones: ${err.message}`);
          },
        });
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.errorCarga.set(`Error al conectar con el servidor: ${err.message}`);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // LÓGICA DE ASIGNACIÓN
  // ---------------------------------------------------------------------------

  /**
   * Comprueba si un rol tiene concedido un permiso determinado.
   *
   * @param idRol ID del rol evaluado.
   * @param idPermiso ID del permiso evaluado.
   * @returns true si el permiso está asignado al rol.
   */
  tienePermiso(idRol: number, idPermiso: number): boolean {
    const rol = this.roles().find((r) => r.id_rol === idRol);
    // El rol Administrador cuenta con acceso total por diseño
    if (rol?.nombre === 'Administrador') {
      return true;
    }

    const permisosRol = this.asignaciones()[idRol];
    return permisosRol ? permisosRol.includes(idPermiso) : false;
  }

  /**
   * Indica si la celda de un rol debe estar deshabilitada.
   * Los permisos del rol Administrador están bloqueados para prevenir auto-bloqueo.
   */
  esRolBloqueado(rol: Rol): boolean {
    return rol.nombre === 'Administrador';
  }

  /**
   * Determina si la celda específica está guardando en este momento.
   */
  estaGuardando(idRol: number, idPermiso: number): boolean {
    return this.guardandoCelda() === `${idRol}-${idPermiso}`;
  }

  /**
   * Alterna (asigna o revoca) un permiso para un rol y envía la sincronización al backend.
   *
   * @param rol Rol a modificar.
   * @param permiso Permiso a conceder o revocar.
   */
  alternarPermiso(rol: Rol, permiso: Permiso): void {
    if (this.esRolBloqueado(rol)) {
      return;
    }

    const idRol = rol.id_rol;
    const idPermiso = permiso.id_permiso;
    const asignadosActuales = this.asignaciones()[idRol] || [];
    const yaAsignado = asignadosActuales.includes(idPermiso);

    const nuevosAsignados = yaAsignado
      ? asignadosActuales.filter((id) => id !== idPermiso)
      : [...asignadosActuales, idPermiso];

    // Actualización optimista local
    const mapaPrevio = { ...this.asignaciones() };
    this.asignaciones.set({
      ...mapaPrevio,
      [idRol]: nuevosAsignados,
    });

    const celdaClave = `${idRol}-${idPermiso}`;
    this.guardandoCelda.set(celdaClave);

    this.permisoService.actualizarPermisosRol(idRol, nuevosAsignados).subscribe({
      next: () => {
        this.guardandoCelda.set(null);
        const accion = yaAsignado ? 'revocado de' : 'asignado a';
        this.notificacion.exito(
          `Permiso «${permiso.nombre}» ${accion} ${rol.nombre}.`,
        );
      },
      error: (error: Error) => {
        // Revertir ante fallo
        this.asignaciones.set(mapaPrevio);
        this.guardandoCelda.set(null);
        this.notificacion.error(
          `No se pudo actualizar el permiso: ${error.message}`,
        );
      },
    });
  }

  /**
   * Concede o revoca todos los permisos de un módulo para un rol específico.
   *
   * @param rol Rol a actualizar.
   * @param grupo Grupo del módulo con sus permisos.
   * @param conceder true para asignar todos; false para revocar todos.
   */
  alternarModuloCompleto(
    rol: Rol,
    grupo: ModuloPermisosGrupo,
    conceder: boolean,
  ): void {
    if (this.esRolBloqueado(rol)) {
      return;
    }

    const idRol = rol.id_rol;
    const idsModulo = grupo.permisos.map((p) => p.id_permiso);
    const asignadosActuales = this.asignaciones()[idRol] || [];

    let nuevosAsignados: number[];
    if (conceder) {
      nuevosAsignados = Array.from(new Set([...asignadosActuales, ...idsModulo]));
    } else {
      nuevosAsignados = asignadosActuales.filter((id) => !idsModulo.includes(id));
    }

    const mapaPrevio = { ...this.asignaciones() };
    this.asignaciones.set({
      ...mapaPrevio,
      [idRol]: nuevosAsignados,
    });

    this.cargando.set(true);

    this.permisoService.actualizarPermisosRol(idRol, nuevosAsignados).subscribe({
      next: () => {
        this.cargando.set(false);
        const accion = conceder ? 'asignados a' : 'revocados de';
        this.notificacion.exito(
          `Todos los permisos de «${grupo.nombre}» fueron ${accion} ${rol.nombre}.`,
        );
      },
      error: (error: Error) => {
        this.cargando.set(false);
        this.asignaciones.set(mapaPrevio);
        this.notificacion.error(
          `Error al sincronizar módulo: ${error.message}`,
        );
      },
    });
  }

  // ---------------------------------------------------------------------------
  // FILTROS
  // ---------------------------------------------------------------------------

  alBuscar(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  limpiarBusqueda(): void {
    this.busqueda.set('');
  }

  seleccionarModulo(modulo: string): void {
    this.filtroModulo.set(modulo);
  }

  // ---------------------------------------------------------------------------
  // ESTILOS
  // ---------------------------------------------------------------------------

  claseRolBadge(rol: Rol): string {
    return rol.nombre === 'Administrador' ? 'fs-badge--oro' : 'fs-badge--carbon';
  }
}
