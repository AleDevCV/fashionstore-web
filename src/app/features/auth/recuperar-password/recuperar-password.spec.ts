/**
 * =============================================================================
 * PRUEBAS DEL COMPONENTE DE RECUPERACIÓN DE CONTRASEÑA (CU04)
 * =============================================================================
 */

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { RecuperarPassword } from './recuperar-password';
import { AuthService } from '../../../core/services/auth.service';
import { RespuestaRecuperarPassword } from '../../../core/models/auth.model';

describe('RecuperarPassword (CU04)', () => {
  let fixture: ComponentFixture<RecuperarPassword>;
  let componente: RecuperarPassword;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'solicitarRecuperacionPassword',
    ]);

    await TestBed.configureTestingModule({
      imports: [RecuperarPassword],
      providers: [provideRouter([]), { provide: AuthService, useValue: authSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(RecuperarPassword);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('inicia con el formulario vacío e inválido', () => {
    expect(componente.formulario.valid).toBeFalse();
    expect(componente.correo.value).toBe('');
    expect(componente.exito()).toBeFalse();
  });

  it('valida el formato del correo electrónico', () => {
    componente.correo.setValue('invalido');
    expect(componente.correo.invalid).toBeTrue();
    expect(componente.correo.errors?.['email']).toBeTruthy();

    componente.correo.setValue('usuario@fashionstore.com');
    expect(componente.correo.valid).toBeTrue();
  });

  it('no ejecuta la petición si el formulario es inválido', () => {
    componente.solicitarRecuperacion();
    expect(authSpy.solicitarRecuperacionPassword).not.toHaveBeenCalled();
    expect(componente.correo.touched).toBeTrue();
  });

  it('muestra estado de carga durante el envío de la solicitud', () => {
    const enCurso = new Subject<RespuestaRecuperarPassword>();
    authSpy.solicitarRecuperacionPassword.and.returnValue(enCurso.asObservable());

    componente.correo.setValue('usuario@fashionstore.com');
    componente.solicitarRecuperacion();
    fixture.detectChanges();

    expect(componente.cargando()).toBeTrue();
    const boton: HTMLButtonElement =
      fixture.nativeElement.querySelector('button[type="submit"]');
    expect(boton.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('.fs-spinner')).toBeTruthy();

    enCurso.complete();
  });

  it('muestra la tarjeta de confirmación tras un envío exitoso', () => {
    authSpy.solicitarRecuperacionPassword.and.returnValue(
      of({ mensaje: 'Enlace enviado correctamente.' }),
    );

    componente.correo.setValue('usuario@fashionstore.com');
    componente.solicitarRecuperacion();
    fixture.detectChanges();

    expect(componente.cargando()).toBeFalse();
    expect(componente.exito()).toBeTrue();
    expect(componente.mensajeExito()).toBe('Enlace enviado correctamente.');

    const exitoCard = fixture.nativeElement.querySelector('.recuperar__exito-card');
    expect(exitoCard).toBeTruthy();
    expect(exitoCard.textContent).toContain('Revise su bandeja de entrada');
  });

  it('muestra el mensaje de error si el backend rechaza la solicitud', () => {
    authSpy.solicitarRecuperacionPassword.and.returnValue(
      throwError(() => new Error('Error al conectar con el servidor.')),
    );

    componente.correo.setValue('usuario@fashionstore.com');
    componente.solicitarRecuperacion();
    fixture.detectChanges();

    expect(componente.cargando()).toBeFalse();
    expect(componente.exito()).toBeFalse();
    expect(componente.mensajeError()).toBe('Error al conectar con el servidor.');

    const alerta = fixture.nativeElement.querySelector('.fs-alert--error');
    expect(alerta).toBeTruthy();
    expect(alerta.textContent).toContain('Error al conectar con el servidor.');
  });

  it('permite reintentar y restablece el formulario', () => {
    componente.exito.set(true);
    componente.mensajeExito.set('Enlace enviado');
    componente.reintentar();

    expect(componente.exito()).toBeFalse();
    expect(componente.mensajeExito()).toBeNull();
    expect(componente.correo.value).toBeNull();
  });
});
