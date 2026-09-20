/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE CARRITO (CU15)
 * -----------------------------------------------------------------------------
 * Gestiona el carrito de compras del cliente usando localStorage.
 * Expone un BehaviorSubject reactivo para que todos los componentes
 * que muestren el badge del carrito se actualicen automáticamente.
 * =============================================================================
 */

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CarritoItem } from '../models/venta.model';

const STORAGE_KEY = 'fashionstore_carrito';

@Injectable({ providedIn: 'root' })
export class CarritoService {

  // BehaviorSubject que emite la lista actualizada cada vez que cambia el carrito
  private _items$ = new BehaviorSubject<CarritoItem[]>(this._cargar());

  /** Observable público del contenido del carrito. */
  readonly items$ = this._items$.asObservable();

  /** Cantidad total de unidades en el carrito (para el badge). */
  get totalUnidades(): number {
    return this._items$.value.reduce((acc, it) => acc + it.cantidad, 0);
  }

  /** Monto total del carrito en Bolivianos. */
  get totalMonto(): number {
    return this._items$.value.reduce(
      (acc, it) => acc + it.precio_unitario * it.cantidad,
      0,
    );
  }

  /** Lista snapshot de los items actuales. */
  get items(): CarritoItem[] {
    return this._items$.value;
  }

  /**
   * Agrega un producto al carrito.
   * Si ya existe la misma variante, incrementa la cantidad.
   */
  agregarItem(item: CarritoItem): void {
    const actuales = [...this._items$.value];
    const indice = actuales.findIndex(
      (i) => i.id_variante_prenda === item.id_variante_prenda,
    );
    if (indice >= 0) {
      actuales[indice] = {
        ...actuales[indice],
        cantidad: actuales[indice].cantidad + item.cantidad,
      };
    } else {
      actuales.push({ ...item });
    }
    this._actualizar(actuales);
  }

  /**
   * Cambia la cantidad de una variante específica.
   * Si la cantidad resulta en 0 o negativa, elimina el ítem.
   */
  cambiarCantidad(id_variante_prenda: number, cantidad: number): void {
    if (cantidad <= 0) {
      this.eliminarItem(id_variante_prenda);
      return;
    }
    const actuales = this._items$.value.map((it) =>
      it.id_variante_prenda === id_variante_prenda ? { ...it, cantidad } : it,
    );
    this._actualizar(actuales);
  }

  /** Elimina un ítem del carrito por su id_variante_prenda. */
  eliminarItem(id_variante_prenda: number): void {
    const actuales = this._items$.value.filter(
      (it) => it.id_variante_prenda !== id_variante_prenda,
    );
    this._actualizar(actuales);
  }

  /** Vacía por completo el carrito (ej: después de una compra exitosa). */
  vaciarCarrito(): void {
    this._actualizar([]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internos
  // ─────────────────────────────────────────────────────────────────────────

  private _actualizar(items: CarritoItem[]): void {
    this._items$.next(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  private _cargar(): CarritoItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
