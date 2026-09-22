/**
 * =============================================================================
 * FASHIONSTORE - MODAL DE ALTA Y EDICIÓN DE PRENDAS (CU08)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Formulario reactivo con un `FormArray` de variantes:
 *
 *   ALTA    (`prenda` = null) -> POST /api/prendas/. Muestra la matriz de
 *                                variantes (talla, color, stock_inicial y
 *                                recargo) para crearla en la MISMA transacción.
 *   EDICIÓN (`prenda` != null) -> PUT /api/prendas/{id}. Las variantes NO se
 *                                tocan por esta vía: alterarlas afectaría al
 *                                inventario ya registrado en las sucursales.
 * =============================================================================
 */

import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { PrendaService } from '../../../core/services/prenda.service';
import {
  Categoria,
  Color,
  Prenda,
  Talla,
  VarianteCrear,
} from '../../../core/models/catalogo.model';

/** Forma de una fila de variante dentro del FormArray. */
interface FilaVariante {
  id_talla: number;
  id_color: number;
  stock_inicial: number;
  precio_adicional: number;
}

@Component({
  selector: 'app-prenda-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './prenda-modal.html',
  styleUrl: './prenda-modal.scss',
})
export class PrendaModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly prendaService = inject(PrendaService);

  // ---------------------------------------------------------------------------
  // ENTRADAS Y SALIDAS
  // ---------------------------------------------------------------------------

  /** Prenda a editar. Si es null, el modal opera en modo alta. */
  readonly prenda = input<Prenda | null>(null);

  /** Catálogos auxiliares para los desplegables, provistos por el padre. */
  readonly categorias = input.required<Categoria[]>();
  readonly tallas = input.required<Talla[]>();
  readonly colores = input.required<Color[]>();

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

  /** true si el modal está editando una prenda existente. */
  readonly esEdicion = signal(false);

  /** Formulario reactivo; se arma en ngOnInit según el modo de trabajo. */
  formulario!: FormGroup;

  // ---------------------------------------------------------------------------
  // CICLO DE VIDA
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    const prendaActual = this.prenda();
    this.esEdicion.set(prendaActual !== null);

    this.formulario = this.fb.group({
      sku: [
        prendaActual?.sku ?? '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(50)],
      ],
      nombre: [
        prendaActual?.nombre ?? '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(150)],
      ],
      descripcion: [prendaActual?.descripcion ?? ''],
      marca: [prendaActual?.marca ?? 'FashionStore', [Validators.maxLength(100)]],
      genero: [prendaActual?.genero ?? 'Unisex', [Validators.required]],
      precio_base: [
        prendaActual?.precio_base ?? null,
        [Validators.required, Validators.min(0)],
      ],
      id_categoria: [prendaActual?.id_categoria ?? null, [Validators.required]],
      url_imagen: [prendaActual?.url_imagen ?? '', [Validators.maxLength(255)]],
      estado: [prendaActual?.estado ?? 'Activo'],
      variantes: this.fb.array([]),
    });

    // En modo alta se parte con una fila vacía para guiar al usuario.
    if (!this.esEdicion()) {
      this.agregarVariante();
    }
  }

  // ---------------------------------------------------------------------------
  // MATRIZ DE VARIANTES (FormArray)
  // ---------------------------------------------------------------------------

  /** Acceso al FormArray de variantes desde la plantilla. */
  get variantes(): FormArray {
    return this.formulario.get('variantes') as FormArray;
  }

  /**
   * Construye una fila vacía de variante.
   *
   * @returns FormGroup con talla, color, stock inicial y recargo.
   */
  nuevaVariante(): FormGroup {
    return this.fb.group({
      id_talla: [null, [Validators.required]],
      id_color: [null, [Validators.required]],
      stock_inicial: [0, [Validators.required, Validators.min(0)]],
      precio_adicional: [0, [Validators.min(0)]],
    });
  }

  /** Añade una fila de variante a la matriz. */
  agregarVariante(): void {
    this.variantes.push(this.nuevaVariante());
  }

  /**
   * Retira la fila de variante indicada.
   *
   * @param indice Posición de la fila dentro del FormArray.
   * @returns void
   */
  quitarVariante(indice: number): void {
    this.variantes.removeAt(indice);
  }

  // ---------------------------------------------------------------------------
  // ACCESORES PARA LA PLANTILLA
  // ---------------------------------------------------------------------------

  /**
   * Indica si un campo maestro debe pintarse como inválido.
   *
   * @param nombreCampo Nombre del control dentro del FormGroup.
   * @returns true si el control es inválido y ya fue tocado o modificado.
   */
  campoInvalido(nombreCampo: string): boolean {
    const control = this.formulario.controls[nombreCampo];
    return control.invalid && (control.touched || control.dirty);
  }

  /**
   * Indica si un campo de una fila de variantes es inválido.
   *
   * @param indice Fila dentro del FormArray.
   * @param nombreCampo Nombre del control dentro de la fila.
   * @returns true si el control es inválido y ya fue tocado o modificado.
   */
  varianteInvalida(indice: number, nombreCampo: string): boolean {
    const control = this.variantes.at(indice).get(nombreCampo);
    return !!control && control.invalid && (control.touched || control.dirty);
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
    const prendaActual = this.prenda();

    if (prendaActual) {
      // ----- MODO EDICIÓN: datos maestros sin variantes -----
      this.prendaService
        .actualizar(prendaActual.id_prenda, {
          sku: valores.sku,
          nombre: valores.nombre,
          descripcion: valores.descripcion || null,
          marca: valores.marca || null,
          genero: valores.genero,
          precio_base: Number(valores.precio_base),
          id_categoria: Number(valores.id_categoria),
          url_imagen: valores.url_imagen || null,
          estado: valores.estado,
        })
        .subscribe({
          next: (actualizada) => {
            this.cargando.set(false);
            this.guardado.emit(
              `La prenda ${actualizada.nombre} se actualizó correctamente.`,
            );
          },
          error: (error: Error) => {
            this.cargando.set(false);
            this.mensajeError.set(error.message);
          },
        });
    } else {
      // ----- MODO ALTA: datos maestros + matriz de variantes -----
      const variantes: VarianteCrear[] = valores.variantes.map((fila: FilaVariante) => ({
        id_talla: Number(fila.id_talla),
        id_color: Number(fila.id_color),
        stock_inicial: Number(fila.stock_inicial ?? 0),
        precio_adicional: Number(fila.precio_adicional ?? 0),
      }));

      this.prendaService
        .crear({
          sku: valores.sku,
          nombre: valores.nombre,
          descripcion: valores.descripcion || null,
          marca: valores.marca || null,
          genero: valores.genero,
          precio_base: Number(valores.precio_base),
          id_categoria: Number(valores.id_categoria),
          url_imagen: valores.url_imagen || null,
          variantes,
        })
        .subscribe({
          next: (creada) => {
            this.cargando.set(false);
            this.guardado.emit(
              `La prenda ${creada.nombre} fue registrada con ${creada.variantes.length} variante(s).`,
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
