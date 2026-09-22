/**
 * Pruebas unitarias del componente raíz.
 *
 * El componente App solo aloja el <router-outlet>, por lo que la prueba se
 * limita a verificar que se instancia correctamente. Requiere los proveedores
 * del enrutador porque la plantilla usa RouterOutlet.
 */
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('debería crearse el componente raíz', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
