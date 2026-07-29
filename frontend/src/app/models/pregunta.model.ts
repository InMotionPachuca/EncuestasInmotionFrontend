export interface Pregunta {
  id: number;
  texto: string;
  tipo: 'TEXTO' | 'NUMERICO' | 'OPCION' | 'RANGO';
  opciones?: Opcion[];
  obligatoria: boolean;
  orden: number;
}

export interface Opcion {
  id: number;
  texto: string;
  valor: string;
}