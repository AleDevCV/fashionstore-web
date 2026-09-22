/**
 * =============================================================================
 * PRUEBAS DEL COMPONENTE DE INICIO DE SESIÓN (CU01)
 * -----------------------------------------------------------------------------
 * Verifican las validaciones reactivas, el estado de carga del botón y la
 * aparición del mensaje de error ante credenciales inválidas (excepción A).
 * =============================================================================
 */

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, throwError, of } from 'rxjs';

import { Login } from './login';
import { AuthService } from '../../../core/services/auth.service';
import { RespuestaLogin } from '../../../core/models/auth.model';

describe('Login (CU01)', () => {
  let fixture: ComponentFixture<Login>;
  let componente: Login;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    // Doble de prueba del servicio: aísla el componente de la red real.
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'login',
      'logout',
      'obtenerToken',
      'tokenExpirado',
      'estaAutenticado',
    ]);

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: authSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ---------------------------------------------------------------------------
  // VALIDACIONES REACTIVAS
  // ---------------------------------------------------------------------------

  it('arranca con el formulario inválido y vacío', () => {
    expect(componente.formulario.valid).toBeFalse();
    expect(componente.correo.value).toBe('');
  });

  it('rechaza un correo con formato inválido', () => {
    componente.correo.setValue('correo-sin-arroba');
    expect(componente.correo.errors?.['email']).toBeTruthy();

    componente.correo.setValue('admin@fashionstore.com');
    expect(componente.correo.valid).toBeTrue();
  });

  it('no envía la petición si el formulario es inválido', () => {
    componente.iniciarSesion();

    expect(authSpy.login).not.toHaveBeenCalled();
    // Los campos quedan marcados para que se muestren los mensajes en pantalla.
    expect(componente.correo.touched).toBeTrue();
  });

  it('marca el campo como inválido solo después de tocarlo', () => {
    expect(componente.campoInvalido('correo')).toBeFalse();

    componente.correo.markAsTouched();
    expect(componente.campoInvalido('correo')).toBeTrue();
  });

  // ---------------------------------------------------------------------------
  // ESTADO DE CARGA
  // ---------------------------------------------------------------------------

  it('activa el estado de carga y deshabilita el botón durante la petición', () => {
    // Subject sin emitir: simula una petición HTTP todavía en curso.
    const enCurso = new Subject<RespuestaLogin>();
    authSpy.login.and.returnValue(enCurso.asObservable());

    componente.formulario.setValue({
      correo: 'admin@fashionstore.com',
      password: 'admin123',
    });
    componente.iniciarSesion();
    fixture.detectChanges();

    expect(componente.cargando()).toBeTrue();

    const boton: HTMLButtonElement =
      fixture.nativeElement.querySelector('button[type="submit"]');
    expect(boton.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('.fs-spinner')).toBeTruthy();

    // Se completa la petición para no dejar la suscripción abierta.
    enCurso.complete();
  });

  it('desactiva el estado de carga tras un login exitoso', () => {
    authSpy.login.and.returnValue(
      of({ access_token: 'token.de.prueba', token_type: 'bearer' }),
    );

    componente.formulario.setValue({
      correo: 'admin@fashionstore.com',
      password: 'admin123',
    });
    componente.iniciarSesion();

    expect(componente.cargando()).toBeFalse();
    expect(componente.mensajeError()).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // MANEJO DE ERRORES (EXCEPCIÓN A DEL CU01)
  // ---------------------------------------------------------------------------

  it('muestra en pantalla el mensaje de credenciales inválidas', () => {
    authSpy.login.and.returnValue(
      throwError(() => new Error('Correo o contraseña incorrectos. Verifique sus datos.')),
    );

    componente.formulario.setValue({
      correo: 'admin@fashionstore.com',
      password: 'incorrecta',
    });
    componente.iniciarSesion();
    fixture.detectChanges();

    expect(componente.cargando()).toBeFalse();
    expect(componente.mensajeError()).toBe(
      'Correo o contraseña incorrectos. Verifique sus datos.',
    );

    const alerta: HTMLElement = fixture.nativeElement.querySelector('.fs-alert--error');
    expect(alerta).toBeTruthy();
    expect(alerta.textContent).toContain('Correo o contraseña incorrectos');
  });

  it('limpia la contraseña pero conserva el correo tras un error', () => {
    authSpy.login.and.returnValue(throwError(() => new Error('Credenciales inválidas.')));

    componente.formulario.setValue({
      correo: 'admin@fashionstore.com',
      password: 'incorrecta',
    });
    componente.iniciarSesion();

    expect(componente.correo.value).toBe('admin@fashionstore.com');
    expect(componente.password.value).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // VISIBILIDAD DE LA CONTRASEÑA
  // ---------------------------------------------------------------------------

  it('alterna el tipo del campo de contraseña', () => {
    const campo = (): HTMLInputElement =>
      fixture.nativeElement.querySelector('#password');

    expect(campo().type).toBe('password');

    componente.alternarPassword();
    fixture.detectChanges();
    expect(campo().type).toBe('text');

    componente.alternarPassword();
    fixture.detectChanges();
    expect(campo().type).toBe('password');
  });
});
