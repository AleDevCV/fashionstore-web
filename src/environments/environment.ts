/**
 * Configuración de entorno para compilaciones de PRODUCCIÓN.
 *
 * Al desplegar en la nube (requisito del examen: no usar localhost en la
 * defensa) hay que reemplazar `apiUrl` por el dominio público del backend.
 */
export const environment = {
  produccion: true,

  /** URL base de la API REST de FastAPI (relativa para Nginx reverse proxy). */
  apiUrl: '',

  /** Clave con la que se guarda el token JWT en el localStorage del navegador. */
  claveTokenJwt: 'fashionstore_token',

  snapCameraKit: {
    appId: 'fe230af1-b5cd-48b6-83b0-8c3f664b71b4',
    apiToken: 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzkwMzA1MjI0LCJzdWIiOiJmZTIzMGVmMS1iNWNkLTQ4YjYtODNiMC04YzNmNjY0YjcxYjR-U1RBR0lOR35kY2Y2ODIzNi1jNjhkLTRlY2YtYjU2Ny0wYmU4YThlM2Q5ZjkifQ.UYAnPqqmMutR1mie9_QrQBuAhMOvofzMfxdfjaKWy4c',
    lensGroupId: 'f2b09303-fd4f-45d2-a95c-22e07d74d831', 
    testLensId: '05287a80-d455-4317-807b-314a336d7a59' 
  }
};
