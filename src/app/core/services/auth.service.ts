/**
 * =============================================================================
 * FASHIONSTORE - SERVICIO DE AUTENTICACIÓN (CU01)
 * Sistemas de Información II - UAGRM
 * -----------------------------------------------------------------------------
 * Centraliza toda la lógica de sesión del panel administrativo:
 *   - Envía las credenciales al endpoint POST /api/login/ de FastAPI.
 *   - Persiste el token JWT recibido en el localStorage del navegador.
 *   - Decodifica el payload del token para conocer el nombre y el rol.
 *   - Verifica la expiración del token antes de considerar la sesión válida.
 *   - Destruye el token al cerrar sesión.
 *
 * Se registra en la raíz de la aplicación (`providedIn: 'root'`), por lo que
 * Angular crea una única instancia compartida por todos los componentes.
 * =============================================================================
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PayloadJwt, RespuestaLogin, SolicitudLogin } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Cliente HTTP de Angular, inyectado con la API funcional `inject()`. */
  private readonly http = inject(HttpClient);

  /** Clave bajo la cual se almacena el JWT en el localStorage. */
  private readonly claveToken = environment.claveTokenJwt;

  /**
   * Estado reactivo con el usuario de la sesión actual.
   * Se inicializa leyendo el token que pudiera haber quedado guardado de una
   * sesión previa, de modo que al recargar la página la sesión se conserve.
   */
  private readonly _usuarioActual = signal<PayloadJwt | null>(this.leerSesionGuardada());

  /** Señal de solo lectura para que los componentes observen el usuario activo. */
  readonly usuarioActual = this._usuarioActual.asReadonly();

  /** Señal derivada: indica si hay una sesión válida y no expirada. */
  readonly estaAutenticado = computed(() => this._usuarioActual() !== null);

  /** Señal derivada: rol jerárquico del usuario activo, o null si no hay sesión. */
  readonly rolActual = computed(() => this._usuarioActual()?.rol ?? null);

  // ---------------------------------------------------------------------------
  // OPERACIONES PÚBLICAS DE SESIÓN
  // ---------------------------------------------------------------------------

  /**
   * Autentica al usuario contra el backend de FastAPI.
   *
   * @param credenciales Objeto con el correo y la contraseña escritos en el
   *                     formulario de login.
   * @returns Observable que emite la respuesta con el token JWT. Si las
   *          credenciales son incorrectas, el Observable emite un Error cuyo
   *          mensaje ya viene traducido a lenguaje legible para el usuario.
   *
   * Efecto secundario: al recibir un token válido lo guarda automáticamente en
   * el localStorage y actualiza la señal `usuarioActual`.
   */
  login(credenciales: SolicitudLogin): Observable<RespuestaLogin> {
    return this.http
      .post<RespuestaLogin>(`${environment.apiUrl}/api/login/`, credenciales)
      .pipe(
        // `tap` no altera el flujo: solo aprovecha la respuesta exitosa para
        // persistir el token antes de que llegue al componente.
        tap((respuesta) => this.guardarToken(respuesta.access_token)),
        catchError((error: HttpErrorResponse) => this.traducirError(error)),
      );
  }

  /**
   * Cierra la sesión del usuario.
   *
   * Borra el token del localStorage y limpia la señal de usuario activo. El
   * JWT es un token sin estado, por lo que basta con destruirlo en el cliente
   * (paso 10 del flujo principal del CU01).
   *
   * @returns void
   */
  logout(): void {
    try {
      localStorage.removeItem(this.claveToken);
    } catch {
      // El navegador puede bloquear el almacenamiento en modo privado.
      // No es un fallo crítico: la señal igualmente se limpia abajo.
    }
    this._usuarioActual.set(null);
  }

  // ---------------------------------------------------------------------------
  // GESTIÓN DEL TOKEN
  // ---------------------------------------------------------------------------

  /**
   * Guarda el token JWT en el localStorage y refresca el estado de sesión.
   *
   * @param token Cadena JWT devuelta por el backend.
   * @returns void
   */
  guardarToken(token: string): void {
    try {
      localStorage.setItem(this.claveToken, token);
    } catch {
      // Si el almacenamiento no está disponible, la sesión vivirá solo en
      // memoria hasta que se recargue la página.
    }
    this._usuarioActual.set(this.decodificarToken(token));
  }

  /**
   * Recupera el token JWT almacenado.
   *
   * @returns La cadena del token, o null si no hay ninguna sesión guardada.
   */
  obtenerToken(): string | null {
    try {
      return localStorage.getItem(this.claveToken);
    } catch {
      return null;
    }
  }

  /**
   * Decodifica el payload de un token JWT sin verificar su firma.
   *
   * IMPORTANTE: la verificación criptográfica de la firma es responsabilidad
   * exclusiva del backend. Aquí solo se lee la información para mostrarla en la
   * interfaz (nombre y rol), nunca para tomar decisiones de seguridad reales.
   *
   * @param token Token a decodificar. Si se omite, usa el del localStorage.
   * @returns El payload tipado, o null si el token no existe o está malformado.
   */
  decodificarToken(token?: string): PayloadJwt | null {
    const jwt = token ?? this.obtenerToken();
    if (!jwt) {
      return null;
    }

    // Un JWT tiene tres segmentos separados por puntos: cabecera.payload.firma
    const segmentos = jwt.split('.');
    if (segmentos.length !== 3) {
      return null;
    }

    try {
      return JSON.parse(this.decodificarBase64Url(segmentos[1])) as PayloadJwt;
    } catch {
      // Token corrupto o manipulado manualmente en el navegador.
      return null;
    }
  }

  /**
   * Indica si un token ya superó su fecha de expiración.
   *
   * @param token Token a evaluar. Si se omite, usa el del localStorage.
   * @returns true si el token no existe, no tiene claim `exp` o ya expiró.
   *          Se devuelve true ante la duda para forzar un nuevo inicio de sesión.
   */
  tokenExpirado(token?: string): boolean {
    const payload = this.decodificarToken(token);
    if (!payload?.exp) {
      return true;
    }

    // El claim `exp` viaja en SEGUNDOS y Date.now() devuelve MILISEGUNDOS.
    const expiracionMs = payload.exp * 1000;
    return Date.now() >= expiracionMs;
  }

  /**
   * Devuelve el rol jerárquico del usuario autenticado.
   *
   * @returns El nombre del rol (ej: "Administrador"), o null si no hay sesión.
   */
  obtenerRol(): string | null {
    return this._usuarioActual()?.rol ?? null;
  }

  /**
   * Comprueba si el usuario activo posee alguno de los roles indicados.
   * Útil para ocultar opciones del menú o proteger rutas por rol.
   *
   * @param roles Lista de roles permitidos.
   * @returns true si el rol de la sesión está dentro de la lista.
   */
  tieneRol(...roles: string[]): boolean {
    const rol = this.obtenerRol();
    return rol !== null && roles.includes(rol);
  }

  // ---------------------------------------------------------------------------
  // AUXILIARES PRIVADOS
  // ---------------------------------------------------------------------------

  /**
   * Reconstruye el estado de sesión al arrancar la aplicación.
   *
   * @returns El payload del token guardado si sigue vigente; null si no hay
   *          token o si este ya expiró (en cuyo caso además lo elimina).
   */
  private leerSesionGuardada(): PayloadJwt | null {
    const token = this.obtenerToken();
    if (!token) {
      return null;
    }

    // Un token caducado se descarta de inmediato para no dejar basura.
    if (this.tokenExpirado(token)) {
      try {
        localStorage.removeItem(this.claveToken);
      } catch {
        /* almacenamiento no disponible */
      }
      return null;
    }

    return this.decodificarToken(token);
  }

  /**
   * Decodifica una cadena en Base64Url (variante usada por el estándar JWT).
   *
   * Base64Url reemplaza los caracteres `+` y `/` por `-` y `_`, y suprime el
   * relleno `=`. Además se decodifica como UTF-8 para que los nombres con
   * tildes o eñes se lean correctamente.
   *
   * @param segmento Segmento del JWT codificado en Base64Url.
   * @returns La cadena JSON original en texto plano.
   */
  private decodificarBase64Url(segmento: string): string {
    let base64 = segmento.replace(/-/g, '+').replace(/_/g, '/');

    // Restituye el relleno `=` que exige atob().
    const resto = base64.length % 4;
    if (resto) {
      base64 += '='.repeat(4 - resto);
    }

    const binario = atob(base64);
    const bytes = Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  }

  /**
   * Convierte un error HTTP de la API en un mensaje entendible para el usuario.
   *
   * Los textos de los códigos 401 y 403 son los definidos literalmente en la
   * tabla de excepciones del CU01.
   *
   * @param error Error emitido por HttpClient.
   * @returns Observable que emite un Error con el mensaje ya traducido.
   */
  private traducirError(error: HttpErrorResponse): Observable<never> {
    let mensaje: string;

    switch (error.status) {
      case 0:
        // status 0 = el navegador no logró contactar al servidor (API apagada
        // o petición bloqueada por CORS).
        mensaje =
          'No se pudo contactar con el servidor. Verifique que el backend esté activo.';
        break;

      case 401:
        mensaje = 'Correo o contraseña incorrectos. Verifique sus datos.';
        break;

      case 403:
        mensaje = 'Su cuenta se encuentra suspendida temporalmente.';
        break;

      case 404:
        mensaje =
          'El servicio de inicio de sesión aún no está disponible en el servidor.';
        break;

      case 422:
        mensaje = 'Los datos enviados no tienen el formato esperado.';
        break;

      default:
        // El backend de FastAPI devuelve los mensajes de error en la clave
        // `detail`; si viene, se prioriza sobre un texto genérico.
        mensaje =
          error.error?.detail ??
          'Ocurrió un error inesperado al iniciar sesión. Intente nuevamente.';
    }

    return throwError(() => new Error(mensaje));
  }
}
