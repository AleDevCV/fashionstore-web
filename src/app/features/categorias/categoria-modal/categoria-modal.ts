/**
 * =============================================================================
 * FASHIONSTORE - MODAL DE ALTA Y EDICIÓN DE CATEGORÍAS (CU07)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Un mismo componente cubre los dos modos:
 *
 *   ALTA    (`categoria` = null) -> POST /api/categorias/
 *   EDICIÓN (`categoria` != null) -> PUT /api/categorias/{id}; muestra además
 *                                    el estado para permitir reactivar/inactivar.
 *
 * El desplegable de «categoría padre» se calcula excluyendo la propia categoría
 * y sus descendientes, para que la jerarquía no pueda cerrar un ciclo (una
 * categoría no puede colgar de sí misma ni de una de sus hijas).
 * =============================================================================
 */

import {
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { CategoriaService } from '../../../core/services/categoria.service';
import { Categoria } from '../../../core/models/catalogo.model';

@Component({
  selector: 'app-categoria-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './categoria-modal.html',
  styleUrl: './categoria-modal.scss',
})
export class CategoriaModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly categoriaService = inject(CategoriaService);

  // ---------------------------------------------------------------------------
  // ENTRADAS Y SALIDAS
  // ---------------------------------------------------------------------------

  /** Categoría a editar. Si es null, el modal opera en modo alta. */
  readonly categoria = input<Categoria | null>(null);

  /** Árbol completo, usado para poblar el desplegable de categoría padre. */
  readonly categorias = input.required<Categoria[]>();

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

  /** true si el modal está editando una categoría existente. */
  readonly esEdicion = signal(false);

  /** Formulario reactivo; se arma en ngOnInit según el modo de trabajo. */
  formulario!: FormGroup;

  /**
   * Categorías elegibles como padre: todas, salvo la que se está editando y sus
   * descendientes, para no permitir ciclos en la jerarquía.
   */
  readonly padresDisponibles = computed<Categoria[]>(() => {
    const idActual = this.categoria()?.id_categoria ?? null;

    if (idActual === null) {
      return this.categorias();
    }

    const excluir = this.obtenerDescendientes(idActual);
    excluir.add(idActual);

    return this.categorias().filter((c) => !excluir.has(c.id_categoria));
  });

  // ---------------------------------------------------------------------------
  // CICLO DE VIDA
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    const categoriaActual = this.categoria();
    this.esEdicion.set(categoriaActual !== null);

    this.formulario = this.fb.group({
      nombre: [
        categoriaActual?.nombre ?? '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
      ],
      descripcion: [
        categoriaActual?.descripcion ?? '',
        [Validators.maxLength(255)],
      ],
      id_categoria_padre: [categoriaActual?.id_categoria_padre ?? null],
      estado: [categoriaActual?.estado ?? 'Activo'],
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
    const categoriaActual = this.categoria();

    if (categoriaActual) {
      // ----- MODO EDICIÓN -----
      this.categoriaService
        .actualizar(categoriaActual.id_categoria, {
          nombre: valores.nombre,
          descripcion: valores.descripcion || null,
          id_categoria_padre: valores.id_categoria_padre ?? null,
          estado: valores.estado,
        })
        .subscribe({
          next: (actualizada) => {
            this.cargando.set(false);
            this.guardado.emit(
              `La categoría ${actualizada.nombre} se actualizó correctamente.`,
            );
          },
          error: (error: Error) => {
            this.cargando.set(false);
            this.mensajeError.set(error.message);
          },
        });
    } else {
      // ----- MODO ALTA -----
      this.categoriaService
        .crear({
          nombre: valores.nombre,
          descripcion: valores.descripcion || null,
          id_categoria_padre: valores.id_categoria_padre ?? null,
        })
        .subscribe({
          next: (creada) => {
            this.cargando.set(false);
            this.guardado.emit(
              `La categoría ${creada.nombre} fue registrada correctamente.`,
            );
          },
          error: (error: Error) => {
            this.cargando.set(false);
            this.mensajeError.set(error.message);
          },
        });
    }
  }

  // ---------------------------------------------------------------------------
  // AYUDAS
  // ---------------------------------------------------------------------------

  /**
   * Recolecta los identificadores de todas las categorías descendientes de la
   * indicada, recorriendo la lista plana en anchura.
   *
   * @param id Identificador de la categoría raíz.
   * @returns Conjunto de identificadores descendientes.
   */
  private obtenerDescendientes(id: number): Set<number> {
    const porPadre = new Map<number, number[]>();

    for (const categoria of this.categorias()) {
      if (categoria.id_categoria_padre !== null) {
        const lista = porPadre.get(categoria.id_categoria_padre) ?? [];
        lista.push(categoria.id_categoria);
        porPadre.set(categoria.id_categoria_padre, lista);
      }
    }

    const resultado = new Set<number>();
    const pila = [...(porPadre.get(id) ?? [])];

    while (pila.length > 0) {
      const actual = pila.pop()!;
      if (resultado.has(actual)) {
        continue;
      }
      resultado.add(actual);
      pila.push(...(porPadre.get(actual) ?? []));
    }

    return resultado;
  }
}
