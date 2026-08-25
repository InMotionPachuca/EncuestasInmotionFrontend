import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Encuesta, Pregunta } from '../models/encuesta.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EncuestaService {
  private apiUrl = `${environment.apiUrl}/encuestas`;

  private get frontendUrl(): string {
    return window.location.origin;
  }

  // LOGOS ALINEADOS EXACTAMENTE A LOS IDS DE LA BASE DE DATOS DE PRODUCCIÓN
  logos: { [key: number]: string } = {
    1: 'Toyota.png',       // Toyota Pachuca
    2: 'carsline.png',     // Carsline Pachuca
    3: 'carsline.png',     // Carsline Queretaro
    4: 'gwm.png',          // GWM (ID 4)
    5: 'subaru.webp',      // Subaru (ID 5)
    6: 'comprocars.png',   // ComproCars Queretaro (ID 6)
    7: 'comprocars.png',   // Compro Pachuca (ID 7)
    8: 'Toyota.png'        // Toyota Tulancingo (ID 8)
  };

  // CATÁLOGO OFICIAL COINCIDENTE CON LA BD DE PRODUCCIÓN
  marcas = [
    { id: 1, nombre: 'Toyota Pachuca' },
    { id: 2, nombre: 'Carsline Pachuca' },
    { id: 3, nombre: 'Carsline Querétaro' },
    { id: 4, nombre: 'GWM' },
    { id: 5, nombre: 'Subaru' },
    { id: 6, nombre: 'ComproCars Querétaro' },
    { id: 7, nombre: 'ComproCars Pachuca' },
    { id: 8, nombre: 'Toyota Tulancingo' }
  ];

  preguntas: Pregunta[] = [
    { id: 1, texto: 'Nombre completo', tipo: 'TEXTO', obligatoria: true, orden: 1 },
    { id: 2, texto: 'Como evaluaria su experiencia con la agencia?', tipo: 'ESCALA', obligatoria: true, orden: 2 },
    { id: 3, texto: 'Como calificaria su experiencia con el asesor de servicio?', tipo: 'ESCALA', obligatoria: true, orden: 3 },
    { id: 4, texto: 'Recomendaria nuestro servicio?', tipo: 'SI_NO', obligatoria: true, orden: 4 },
    { id: 5, texto: 'Que podriamos mejorar durante su estancia?', tipo: 'TEXTO', obligatoria: false, orden: 5 }
  ];

  constructor(private http: HttpClient) {}

  obtenerMarcas(): any[] {
    return this.marcas;
  }

  obtenerLogo(marcaId: number): string {
    return this.logos[marcaId] || 'default.svg';
  }

  obtenerPreguntas(): Pregunta[] {
    return this.preguntas;
  }

  listarEncuestas(): Observable<Encuesta[]> {
    return this.http.get<Encuesta[]>(`${this.apiUrl}/listar`);
  }

  obtenerEstadisticasGenerales(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estadisticas/generales`);
  }

  generarLinkEncuesta(token: string): string {
    return `${this.frontendUrl}/responder/${token}`;
  }

  obtenerEncuestaPorToken(token: string): Observable<Encuesta> {
    return this.http.get<Encuesta>(`${this.apiUrl}/token/${token}`);
  }

  crearEncuesta(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/crear`, data);
  }

  responderEncuesta(token: string, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/responder/${token}`, data);
  }

  eliminarEncuesta(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/eliminar/${id}`);
  }
}