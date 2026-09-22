/**
 * =============================================================================
 * FASHIONSTORE - GESTIÓN DE CATEGORÍAS DE PRENDAS (CU07)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Pantalla del CU07: administra la clasificación jerárquica del catálogo.
 * El backend devuelve el árbol como una lista plana ordenada (raíces primero,
 * luego sus hijas), por lo que aquí se dibuja una tabla con un marcador visual
 * para distinguir las subcategorías.
 *
 * SEGURIDAD: la ruta exige sesión activa (authGuard heredado del panel), pero
 * no restringe el rol, porque el Encargado de Sucursal también organiza la
 * clasificación del inventario que gestiona.
 * =============================================================================
 */

import { Component, OnInit, inject, signal } from '@angular/core';

import { CategoriaService } from '../../core/services/categoria.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Categoria } from '../../core/models/catalogo.model';
import { CategoriaModal } from './categoria-modal/categoria-modal';

@Component({
  selector: 'app-categorias',
  imports: [CategoriaModal],
  templateUrl: './categorias.html',
  styleUrl: './categorias.scss',
})
export class Categorias implements OnInit {
  private readonly categoriaService = inject(CategoriaService);
  private readonly notificacion = inject(NotificacionService);

  // ---------------------------------------------------------------------------
  // ESTADO
  // ---------------------------------------------------------------------------

  /** Árbol de categorías descargado del backend (lista plana ordenada). */
  readonly categorias = signal<Categoria[]>([]);

  /** true mientras se descarga la tabla. */
  readonly cargando = signal(true);

  /** Error de carga de la tabla; null si todo fue bien. */
  readonly errorCarga = signal<string | null>(null);

  /** true cuando el modal está abierto. */
  readonly modalAbierto = signal(false);

  /** Categoría en edición; null cuando el modal opera en modo alta. */
  readonly categoriaEnEdicion = signal<Categoria | null>(null);

  /** Fila cuya inhabilitación o reactivación está en curso. */
  readonly inhabilitandoId = signal<number | null>(null);

  // ---------------------------------------------------------------------------
  // CICLO DE VIDA
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.cargar();
  }

  // ---------------------------------------------------------------------------
  // CARGA DE DATOS
  // ---------------------------------------------------------------------------

  /**
   * Recarga el árbol de categorías.
   * Se usa al entrar a la vista y tras cada guardado o baja lógica.
   *
   * @returns void
   */
  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.categoriaService.listar().subscribe({
      next: (lista) => {
        this.categorias.set(lista);
        this.cargando.set(false);
      },
      error: (error: Error) => {
        this.cargando.set(false);
        this.errorCarga.set(error.message);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // MODAL
  // ---------------------------------------------------------------------------

  /** Abre el modal en modo alta. */
  abrirAlta(): void {
    this.categoriaEnEdicion.set(null);
    this.modalAbierto.set(true);
  }

  /** Abre el modal en modo edición con la categoría indicada. */
  abrirEdicion(categoria: Categoria): void {
    this.categoriaEnEdicion.set(categoria);
    this.modalAbierto.set(true);
  }

  /** Cierra el modal sin guardar cambios. */
  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.categoriaEnEdicion.set(null);
  }

  /**
   * Reacciona al guardado exitoso del modal: cierra la ventana, avisa y
   * recarga el árbol.
   *
   * @param mensaje Texto de confirmación emitido por el modal.
   * @returns void
   */
  alGuardar(mensaje: string): void {
    this.cerrarModal();
    this.notificacion.exito(mensaje);
    this.cargar();
  }

  // ---------------------------------------------------------------------------
  // INHABILITACIÓN / REACTIVACIÓN LÓGICA
  // ---------------------------------------------------------------------------

  /**
   * Da de baja lógica a una categoría.
   * El backend responde 409 si todavía tiene subcategorías activas.
   *
   * @param categoria Categoría a inhabilitar.
   * @returns void
   */
  inhabilitar(categoria: Categoria): void {
    this.inhabilitandoId.set(categoria.id_categoria);

    this.categoriaService.inhabilitar(categoria.id_categoria).subscribe({
      next: (respuesta) => {
        this.inhabilitandoId.set(null);
        this.notificacion.exito(respuesta.mensaje);
        this.cargar();
      },
      error: (error: Error) => {
        this.inhabilitandoId.set(null);
        this.notificacion.error(error.message);
      },
    });
  }

  /**
   * Reactiva una categoría devolviéndola al estado 'Activo'.
   *
   * @param categoria Categoría a reactivar.
   * @returns void
   */
  reactivar(categoria: Categoria): void {
    this.inhabilitandoId.set(categoria.id_categoria);

    this.categoriaService
      .actualizar(categoria.id_categoria, { estado: 'Activo' })
      .subscribe({
        next: (actualizada) => {
          this.inhabilitandoId.set(null);
          this.notificacion.exito(
            `La categoría ${actualizada.nombre} fue reactivada.`,
          );
          this.cargar();
        },
        error: (error: Error) => {
          this.inhabilitandoId.set(null);
          this.notificacion.error(error.message);
        },
      });
  }
}
