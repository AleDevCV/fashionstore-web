/**
 * =============================================================================
 * PRUEBAS UNITARIAS DEL SERVICIO DE AUTENTICACIÓN (CU01)
 * -----------------------------------------------------------------------------
 * Verifican la persistencia del token, la decodificación del payload JWT
 * (incluyendo caracteres acentuados), el control de expiración y la traducción
 * de los errores HTTP a mensajes legibles.
 * =============================================================================
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { PayloadJwt } from '../models/auth.model';
import { environment } from '../../../environments/environment';

/**
 * Construye un JWT de prueba con firma simulada.
 * Solo la parte del payload debe ser legible: el servicio nunca valida la firma.
 *
 * @param payload Objeto que se codificará como carga útil del token.
 * @returns Cadena con formato `cabecera.payload.firma`.
 */
function crearJwtFalso(payload: Record<string, unknown>): string {
  const codificar = (objeto: Record<string, unknown>): string => {
    const bytes = new TextEncoder().encode(JSON.stringify(objeto));
    let binario = '';
    bytes.forEach((byte) => (binario += String.fromCharCode(byte)));
    return btoa(binario)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  const cabecera = codificar({ alg: 'HS256', typ: 'JWT' });
  return `${cabecera}.${codificar(payload)}.firma-simulada`;
}

/** Devuelve una marca de tiempo Unix desplazada en minutos respecto de ahora. */
function unixEnMinutos(minutos: number): number {
  return Math.floor(Date.now() / 1000) + minutos * 60;
}

describe('AuthService', () => {
  let servicio: AuthService;
  let httpMock: HttpTestingController;

  /** Payload de ejemplo con tilde para comprobar la decodificación UTF-8. */
  const payloadAdmin = {
    id_usuario: 1,
    nombre: 'María René',
    correo: 'admin@fashionstore.com',
    rol: 'Administrador',
    exp: unixEnMinutos(60),
  };

  /** Prepara un TestBed limpio y devuelve la instancia del servicio. */
  function crearServicio(): AuthService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    httpMock?.verify();
    localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // DECODIFICACIÓN DEL TOKEN
  // ---------------------------------------------------------------------------

  it('decodifica el payload del JWT conservando los acentos', () => {
    servicio = crearServicio();
    const token = crearJwtFalso(payloadAdmin);

    const payload = servicio.decodificarToken(token) as PayloadJwt;

    expect(payload).toBeTruthy();
    expect(payload.nombre).toBe('María René');
    expect(payload.rol).toBe('Administrador');
    expect(payload.id_usuario).toBe(1);
  });

  it('devuelve null ante un token malformado', () => {
    servicio = crearServicio();

    expect(servicio.decodificarToken('esto-no-es-un-jwt')).toBeNull();
    expect(servicio.decodificarToken('a.b.c')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // EXPIRACIÓN
  // ---------------------------------------------------------------------------

  it('detecta un token vigente como no expirado', () => {
    servicio = crearServicio();
    const token = crearJwtFalso({ ...payloadAdmin, exp: unixEnMinutos(30) });

    expect(servicio.tokenExpirado(token)).toBeFalse();
  });

  it('detecta un token vencido como expirado', () => {
    servicio = crearServicio();
    const token = crearJwtFalso({ ...payloadAdmin, exp: unixEnMinutos(-5) });

    expect(servicio.tokenExpirado(token)).toBeTrue();
  });

  it('descarta al arrancar un token caducado guardado en localStorage', () => {
    // El token se siembra ANTES de instanciar el servicio, porque el estado de
    // sesión se reconstruye en el constructor.
    localStorage.setItem(
      environment.claveTokenJwt,
      crearJwtFalso({ ...payloadAdmin, exp: unixEnMinutos(-1) }),
    );

    servicio = crearServicio();

    expect(servicio.estaAutenticado()).toBeFalse();
    expect(localStorage.getItem(environment.claveTokenJwt)).toBeNull();
  });

  it('restaura la sesión si el token guardado sigue vigente', () => {
    localStorage.setItem(environment.claveTokenJwt, crearJwtFalso(payloadAdmin));

    servicio = crearServicio();

    expect(servicio.estaAutenticado()).toBeTrue();
    expect(servicio.obtenerRol()).toBe('Administrador');
  });

  // ---------------------------------------------------------------------------
  // LOGIN Y LOGOUT
  // ---------------------------------------------------------------------------

  it('guarda el token y actualiza la sesión tras un login exitoso', () => {
    servicio = crearServicio();
    const token = crearJwtFalso(payloadAdmin);

    servicio
      .login({ correo: 'admin@fashionstore.com', password: 'admin123' })
      .subscribe();

    const peticion = httpMock.expectOne(`${environment.apiUrl}/api/login/`);
    expect(peticion.request.method).toBe('POST');
    peticion.flush({ access_token: token, token_type: 'bearer' });

    expect(servicio.obtenerToken()).toBe(token);
    expect(servicio.estaAutenticado()).toBeTrue();
    expect(servicio.usuarioActual()?.correo).toBe('admin@fashionstore.com');
  });

  it('traduce el error 401 al mensaje definido en el CU01', (listo) => {
    servicio = crearServicio();

    servicio
      .login({ correo: 'admin@fashionstore.com', password: 'incorrecta' })
      .subscribe({
        error: (error: Error) => {
          expect(error.message).toBe(
            'Correo o contraseña incorrectos. Verifique sus datos.',
          );
          expect(servicio.estaAutenticado()).toBeFalse();
          listo();
        },
      });

    httpMock
      .expectOne(`${environment.apiUrl}/api/login/`)
      .flush({ detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
  });

  it('traduce el error 403 de cuenta suspendida', (listo) => {
    servicio = crearServicio();

    servicio
      .login({ correo: 'inactivo@fashionstore.com', password: 'admin123' })
      .subscribe({
        error: (error: Error) => {
          expect(error.message).toBe(
            'Su cuenta se encuentra suspendida temporalmente.',
          );
          listo();
        },
      });

    httpMock
      .expectOne(`${environment.apiUrl}/api/login/`)
      .flush({ detail: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
  });

  it('borra el token y limpia la sesión al cerrar sesión', () => {
    localStorage.setItem(environment.claveTokenJwt, crearJwtFalso(payloadAdmin));
    servicio = crearServicio();
    expect(servicio.estaAutenticado()).toBeTrue();

    servicio.logout();

    expect(servicio.estaAutenticado()).toBeFalse();
    expect(servicio.obtenerToken()).toBeNull();
    expect(servicio.obtenerRol()).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // AUTORIZACIÓN POR ROL
  // ---------------------------------------------------------------------------

  it('comprueba correctamente la pertenencia a un rol', () => {
    localStorage.setItem(environment.claveTokenJwt, crearJwtFalso(payloadAdmin));
    servicio = crearServicio();

    expect(servicio.tieneRol('Administrador')).toBeTrue();
    expect(servicio.tieneRol('Cajero (POS)', 'Administrador')).toBeTrue();
    expect(servicio.tieneRol('Cliente')).toBeFalse();
  });
});
