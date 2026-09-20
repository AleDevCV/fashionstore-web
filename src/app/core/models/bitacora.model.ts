export interface BitacoraItem {
  id_bitacora: number;
  id_usuario?: number;
  nombre_usuario?: string;
  correo_usuario?: string;
  rol_usuario?: string;
  accion: string;
  tabla_afectada?: string;
  registro_id?: number;
  detalle: string;
  ip_address?: string;
  fecha: string;
}

export interface BitacoraListadoRespuesta {
  total: number;
  pagina: number;
  limite: number;
  items: BitacoraItem[];
}
