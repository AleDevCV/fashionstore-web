/**
 * =============================================================================
 * PRUEBAS DEL COMPONENTE DE RESTABLECIMIENTO DE CONTRASEÑA (CU04)
 * =============================================================================
 */

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { RestablecerPassword } from './restablecer-password';
import { AuthService } from '../../../core/services/auth.service';

describe('RestablecerPassword (CU04)', () => {
  let fixture: ComponentFixture<RestablecerPassword>;
  let componente: RestablecerPassword;
  let authSpy: jasmine.SpyObj<AuthService>;

  const crearComponenteConToken = async (tokenParam: string | null) => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'verificarTokenRecuperacion',
      'restablecerPassword',
    ]);

    await TestBed.configureTestingModule({
      imports: [RestablecerPassword],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (clave: string) => (clave === 'token' ? tokenParam : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RestablecerPassword);
    componente = fixture.componentInstance;
  };

  it('detecta ausencia de token y muestra estado de error inmediatamente', async () => {
    await crearComponenteConToken(null);
    fixture.detectChanges();

    expect(componente.tokenInvalido()).toBeTrue();
    expect(componente.verificandoToken()).toBeFalse();
    expect(authSpy.verificarTokenRecuperacion).not.toHaveBeenCalled();

    const alerta = fixture.nativeElement.querySelector('.restablecer__card-estado--error');
    expect(alerta).toBeTruthy();
    expect(alerta.textContent).toContain('No se puede restablecer la contraseña');
  });

  it('verifica token y muestra error si el backend indica que expiró o es inválido', async () => {
    await crearComponenteConToken('token-expirado');
    authSpy.verificarTokenRecuperacion.and.returnValue(
      of({ valido: false, mensaje: 'Token expirado o inválido' }),
    );
    fixture.detectChanges();

    expect(authSpy.verificarTokenRecuperacion).toHaveBeenCalledWith('token-expirado');
    expect(componente.tokenInvalido()).toBeTrue();
    expect(componente.verificandoToken()).toBeFalse();

    const card = fixture.nativeElement.querySelector('.restablecer__card-estado--error');
    expect(card).toBeTruthy();
  });

  it('habilita el formulario cuando el token es válido', async () => {
    await crearComponenteConToken('token-valido-123');
    authSpy.verificarTokenRecuperacion.and.returnValue(
      of({ valido: true, correo: 'admin@fashionstore.com' }),
    );
    fixture.detectChanges();

    expect(componente.tokenInvalido()).toBeFalse();
    expect(componente.verificandoToken()).toBeFalse();
    expect(componente.correoUsuario()).toBe('admin@fashionstore.com');

    const formulario = fixture.nativeElement.querySelector('form');
    expect(formulario).toBeTruthy();
  });

  it('calcula la fortaleza de la contraseña reactivamente', async () => {
    await crearComponenteConToken('token-valido-123');
    authSpy.verificarTokenRecuperacion.and.returnValue(of({ valido: true }));
    fixture.detectChanges();

    // Contraseña débil
    componente.password.setValue('abc');
    expect(componente.fortaleza().nivel).toBe('muy-debil');

    // Contraseña con 8+ chars, mayúscula y número
    componente.password.setValue('Fashion2026!');
    expect(componente.fortaleza().puntuacion).toBe(5);
    expect(componente.fortaleza().nivel).toBe('excelente');
  });

  it('valida que las contraseñas coincidan', async () => {
    await crearComponenteConToken('token-valido-123');
    authSpy.verificarTokenRecuperacion.and.returnValue(of({ valido: true }));
    fixture.detectChanges();

    componente.password.setValue('Fashion2026!');
    componente.confirmarPassword.setValue('OtraClave123!');
    expect(componente.formulario.valid).toBeFalse();
    expect(componente.formulario.errors?.['noCoincide']).toBeTrue();

    componente.confirmarPassword.setValue('Fashion2026!');
    expect(componente.formulario.valid).toBeTrue();
  });

  it('restablece la contraseña exitosamente al enviar el formulario válido', async () => {
    await crearComponenteConToken('token-valido-123');
    authSpy.verificarTokenRecuperacion.and.returnValue(of({ valido: true }));
    authSpy.restablecerPassword.and.returnValue(
      of({ mensaje: 'Contraseña restablecida exitosamente.' }),
    );
    fixture.detectChanges();

    componente.password.setValue('Fashion2026!');
    componente.confirmarPassword.setValue('Fashion2026!');
    componente.restablecer();
    fixture.detectChanges();

    expect(authSpy.restablecerPassword).toHaveBeenCalledWith(
      'token-valido-123',
      'Fashion2026!',
    );
    expect(componente.exito()).toBeTrue();

    const cardExito = fixture.nativeElement.querySelector('.restablecer__card-estado--exito');
    expect(cardExito).toBeTruthy();
    expect(cardExito.textContent).toContain('Contraseña restablecida');
  });

  it('muestra mensaje de error si falla el guardado de la nueva contraseña', async () => {
    await crearComponenteConToken('token-valido-123');
    authSpy.verificarTokenRecuperacion.and.returnValue(of({ valido: true }));
    authSpy.restablecerPassword.and.returnValue(
      throwError(() => new Error('El token ya no es válido.')),
    );
    fixture.detectChanges();

    componente.password.setValue('Fashion2026!');
    componente.confirmarPassword.setValue('Fashion2026!');
    componente.restablecer();
    fixture.detectChanges();

    expect(componente.exito()).toBeFalse();
    expect(componente.mensajeError()).toBe('El token ya no es válido.');
  });
});
