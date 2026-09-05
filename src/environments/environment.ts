/**
 * Configuración de entorno para compilaciones de PRODUCCIÓN.
 *
 * Al desplegar en la nube (requisito del examen: no usar localhost en la
 * defensa) hay que reemplazar `apiUrl` por el dominio público del backend.
 */
export const environment = {
  produccion: true,

  /** URL base de la API REST de FastAPI. */
  apiUrl: 'https://api.fashionstore.example.com',

  /** Clave con la que se guarda el token JWT en el localStorage del navegador. */
  claveTokenJwt: 'fashionstore_token',
};
