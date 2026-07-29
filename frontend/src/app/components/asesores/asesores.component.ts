import { Component, OnInit } from '@angular/core';
import { EncuestaService } from '../../services/encuesta.service';
import { Encuesta } from '../../models/encuesta.model';

export interface EstadisticaAsesor {
  nombre: string;
  totalEncuestas: number;
  respondidas: number;
  promedioSatisfaccion: number;
  promedioAtencion: number;
  porcentajeRecomendacion: number;
}

@Component({
  selector: 'app-asesores',
  templateUrl: './asesores.component.html',
  styleUrls: ['./asesores.component.css']
})
export class AsesoresComponent implements OnInit {
  encuestas: Encuesta[] = [];
  asesoresStats: EstadisticaAsesor[] = [];
  loading = true;
  filtroBusqueda = '';

  constructor(private encuestaService: EncuestaService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.encuestaService.listarEncuestas().subscribe({
      next: (data: Encuesta[]) => {
        this.encuestas = data;
        this.procesarEstadisticas();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar encuestas:', err);
        this.loading = false;
      }
    });
  }

  procesarEstadisticas(): void {
    const mapaAsesores = new Map<string, any>();

    this.encuestas.forEach(encuesta => {
      const nombreAsesor = encuesta.asesor ? encuesta.asesor.trim() : 'Sin Asesor Asignado';

      if (!mapaAsesores.has(nombreAsesor)) {
        mapaAsesores.set(nombreAsesor, {
          nombre: nombreAsesor,
          totalEncuestas: 0,
          respondidas: 0,
          sumaExperienciaAgencia: 0,
          conteoExperienciaAgencia: 0,
          sumaExperienciaAsesor: 0,
          conteoExperienciaAsesor: 0,
          siRecomienda: 0,
          totalRecomendacion: 0
        });
      }

      const stat = mapaAsesores.get(nombreAsesor);
      stat.totalEncuestas++;

      if (encuesta.estado === 'RESPONDIDA') {
        stat.respondidas++;

        if (encuesta.respuestas && encuesta.respuestas.length > 0) {
          encuesta.respuestas.forEach(r => {
            // Pregunta 2: Experiencia con la agencia
            if (r.preguntaId === 2 && r.valorNumerico) {
              stat.sumaExperienciaAgencia += r.valorNumerico;
              stat.conteoExperienciaAgencia++;
            }
            // Pregunta 3: Experiencia con el asesor
            if (r.preguntaId === 3 && r.valorNumerico) {
              stat.sumaExperienciaAsesor += r.valorNumerico;
              stat.conteoExperienciaAsesor++;
            }
            // Pregunta 4: Recomendación
            if (r.preguntaId === 4 && r.opcionId) {
              stat.totalRecomendacion++;
              if (r.opcionId === 1) stat.siRecomienda++; // 1 = SI
            }
          });
        }
      }
    });

    this.asesoresStats = Array.from(mapaAsesores.values()).map(s => {
      const promAgencia = s.conteoExperienciaAgencia > 0 ? (s.sumaExperienciaAgencia / s.conteoExperienciaAgencia) : 0;
      const promAsesor = s.conteoExperienciaAsesor > 0 ? (s.sumaExperienciaAsesor / s.conteoExperienciaAsesor) : 0;
      const pctRecomienda = s.totalRecomendacion > 0 ? ((s.siRecomienda / s.totalRecomendacion) * 100) : 0;

      return {
        nombre: s.nombre,
        totalEncuestas: s.totalEncuestas,
        respondidas: s.respondidas,
        promedioSatisfaccion: Math.round(promAgencia * 10) / 10,
        promedioAtencion: Math.round(promAsesor * 10) / 10,
        porcentajeRecomendacion: Math.round(pctRecomienda)
      };
    });
  }

  get asesoresFiltrados(): EstadisticaAsesor[] {
    if (!this.filtroBusqueda) return this.asesoresStats;
    return this.asesoresStats.filter(a => 
      a.nombre.toLowerCase().includes(this.filtroBusqueda.toLowerCase())
    );
  }
}