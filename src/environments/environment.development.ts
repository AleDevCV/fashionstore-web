/**
 * Configuración de entorno para DESARROLLO local.
 *
 * Apunta al contenedor Docker del backend de FastAPI, publicado por
 * docker-compose en el puerto 8000 de la máquina anfitriona.
 *
 * Angular sustituye automáticamente environment.ts por este archivo cuando se
 * compila con la configuración `development` (ver fileReplacements en
 * angular.json).
 */
export const environment = {
  produccion: false,

  /** URL base de la API REST de FastAPI levantada con docker compose. */
  apiUrl: 'http://localhost:8000',

  /** Clave con la que se guarda el token JWT en el localStorage del navegador. */
  claveTokenJwt: 'fashionstore_token',
};
