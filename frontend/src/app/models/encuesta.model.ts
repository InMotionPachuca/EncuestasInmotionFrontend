export type SegmentoOperativo = 'POSTVENTA' | 'VENTA' | 'COMPRA' | 'SERVICIO' | 'QR' | 'CLIMA_LABORAL' | 'COMPRA_AUTO';

export interface Encuesta {
  id?: number;
  token: string;
  tipo: SegmentoOperativo | string;
  segmento?: SegmentoOperativo | string;
  serie?: string;
  placas?: string;
  ordenServicio?: string;
  asesorCompraVenta?: string;
  fechaOperacion?: string;
  fechaWhatsapp?: Date | string;
  enviosWhatsapp?: number;
  estado: 'ENVIADA' | 'RESPONDIDA' | 'EXPIRADA';
  fechaEnvio: Date;
  fechaExpiracion?: Date;
  fechaRespuesta?: Date;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono?: string;
  telefono?: string;
  asesor?: string;
  unidad?: string;
  marcaNombre: string;
  marcaId?: number;
  respuestas: RespuestaDTO[];
}

export interface RespuestaDTO {
  preguntaId?: number;
  preguntaTexto?: string;
  valorTexto?: string;
  valorNumerico?: number;
  opcionId?: number;
  opcionTexto?: string;
}

export interface EncuestaRequestDTO {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  asesor?: string;
  unidad?: string;
  placas?: string;
  ordenServicio?: string;
  asesorCompraVenta?: string;
  fechaOperacion?: string;
  fechaVisita?: string;
  marcaId: number;
  tipo?: SegmentoOperativo | string;
  respuestas: EncuestaRespuestaDTO[];
}

export interface ClienteImportacionExcel {
  index: number;
  seleccionado: boolean;
  fecha: string;
  noFactura?: string;
  tipoOperativo?: string;
  serie?: string;
  placas?: string;
  unidad: string;
  anio: string;
  asesor: string;
  marcaNombre: string;
  marcaId: number;
  nombreCliente: string;
  telefono: string;
  email: string;
  procesado: boolean;
  exito: boolean;
  error?: string;
}

export interface EncuestaRespuestaDTO {
  preguntaId: number;
  valorTexto?: string;
  valorNumerico?: number;
  opcionId?: number;
}

export interface EstadisticasGenerales {
  total: number;
  enviadas: number;
  respondidas: number;
  expiradas: number;
  tasaRespuesta: number;
  promedios: {
    experiencia: number;
    asesor: number;
    recomendacion: number;
  };
  porMarca: EstadisticasPorMarca[];
}

export interface EstadisticasPorMarca {
  marcaId: number;
  marcaNombre: string;
  total: number;
  respondidas: number;
  enviadas?: number;
  expiradas?: number;
  tasaRespuesta: number;
  promedioExperiencia?: number;
  promedioAsesor?: number;
  recomendacionSi?: number;
  recomendacionNo?: number;
}

export interface Pregunta {
  id: number;
  texto: string;
  tipo: 'TEXTO' | 'NUMERICO' | 'OPCION' | 'RANGO' | 'SI_NO' | 'ESCALA';
  opciones?: Opcion[];
  obligatoria: boolean;
  orden: number;
}

export interface Opcion {
  id: number;
  texto: string;
  valor: string;
}

export interface MarcaEncuesta {
  id: number;
  nombre: string;
  preguntas: Pregunta[];
}

export interface DashboardStats {
  marcaId: number;
  marcaNombre: string;
  totalEncuestas: number;
  respondidas: number;
  pendientes: number;
  promedioGeneral: number;
  metricasPorPregunta: { [key: string]: number };
  respuestasRecientes: RespuestaReciente[];
}

export interface RespuestaReciente {
  clienteNombre: string;
  fechaRespuesta: string;
  calificacion: number;
  comentario: string;
}