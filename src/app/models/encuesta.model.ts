export interface Encuesta {
  id?: number;
  token: string;
  tipo: string;
  serie?: string;
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
  fechaVisita?: string;
  marcaId: number;
  tipo?: string;
  respuestas: EncuestaRespuestaDTO[];
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