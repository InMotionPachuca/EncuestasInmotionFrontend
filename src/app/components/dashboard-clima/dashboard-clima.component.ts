import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { EncuestaService } from '../../services/encuesta.service';
import { Encuesta } from '../../models/encuesta.model';
import { Chart, registerables } from 'chart.js';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

Chart.register(...registerables);

export interface DimensionStat {
  id: number;
  label: string;
  promedio: number;
  preguntasIds: number[];
}

export interface DimensionAcordeon {
  id: number;
  label: string;
  promedio: number;
  abierto: boolean;
  preguntas: PreguntaDesglose[];
}

export interface PreguntaDesglose {
  id: number;
  dimension: string;
  dimensionId: number;
  titulo: string;
  preguntaCompleta: string;
  promedio: number;
  distribucion: number[];
  porcentajes: number[];
}

export interface RiesgoRotacion {
  departamento: string;
  nivelRiesgo: 'ALTO' | 'MEDIO' | 'BAJO';
  promedioLiderazgo: number;
  promedioReconocimiento: number;
  respuestasCount: number;
}

export interface AntiguedadComparativa {
  rango: string;
  promedio: number;
  total: number;
}

export interface HeatmapFila {
  departamento: string;
  respuestasCount: number;
  valores: { [dimId: number]: number };
}

export interface PriorizacionItem {
  nombre: string;
  votos: number;
  porcentaje: number;
}

export interface PalabraClave {
  texto: string;
  peso: number;
  frecuencia: number;
  tipo: 'positivo' | 'mejora';
}

@Component({
  selector: 'app-dashboard-clima',
  templateUrl: './dashboard-clima.component.html',
  styleUrls: ['./dashboard-clima.component.css']
})
export class DashboardClimaComponent implements OnInit, AfterViewInit {
  @ViewChild('graficoAgencias') canvasAgencias!: ElementRef;
  @ViewChild('graficoDimensiones') canvasDimensiones!: ElementRef;
  @ViewChild('graficoInsatisfaccion') canvasInsatisfaccion!: ElementRef;
  @ViewChild('graficoPrioridades') canvasPrioridades!: ElementRef;

  encuestasClima: Encuesta[] = [];
  encuestasFiltradas: Encuesta[] = [];
  loading = true;

  readonly META_SLA = 4.2;

  // Filtros
  filtroAgencia = '';
  filtroDepto = '';
  filtroAntiguedad = '';
  filtroSegmento = '';
  filtroDimensionComentario = '';
  busquedaComentario = '';
  palabraSeleccionadaFiltro = '';

  readonly agencias = [
    'Toyota Pachuca',
    'Toyota Tulancingo',
    'Centro de Servicio Toyota Pachuca',
    'Carsline Pachuca',
    'Subaru'
  ];

  readonly departamentos = [
    'Ventas',
    'Postventa / Taller de Servicio',
    'Hojalatería y Pintura (B&P)',
    'Refacciones / Almacén',
    'Administración / Finanzas / Facturación',
    'Recursos Humanos',
    'CXI / Calidad',
    'Dirección / Gerencia'
  ];

  readonly antiguedades = [
    'Menos de 6 meses',
    '6 meses a 1 año',
    '1 a 3 años',
    '3 a 5 años',
    'Más de 5 años'
  ];

  readonly dimensionesDefinicion: DimensionStat[] = [
    { id: 1, label: 'Herramientas y Recursos', promedio: 0, preguntasIds: [1, 2, 3] },
    { id: 2, label: 'Ambiente y Equipo', promedio: 0, preguntasIds: [4, 5, 6] },
    { id: 3, label: 'Liderazgo y Comunicación', promedio: 0, preguntasIds: [7, 8, 9] },
    { id: 4, label: 'Reconocimiento y Valoración', promedio: 0, preguntasIds: [10, 11, 12] },
    { id: 5, label: 'Instalaciones y Seguridad', promedio: 0, preguntasIds: [13, 14, 15] },
    { id: 6, label: 'Sentido de Pertenencia', promedio: 0, preguntasIds: [16, 17, 18] },
    { id: 7, label: 'Desarrollo y Crecimiento', promedio: 0, preguntasIds: [19, 20, 21] },
    { id: 8, label: 'Equidad y Respeto', promedio: 0, preguntasIds: [22, 23, 24] },
    { id: 9, label: 'Carga de Trabajo y Bienestar', promedio: 0, preguntasIds: [25, 26, 27] },
    { id: 10, label: 'Participación y Escucha', promedio: 0, preguntasIds: [28, 29, 30] },
    { id: 11, label: 'Seguridad Psicológica', promedio: 0, preguntasIds: [31, 32, 33] },
    { id: 12, label: 'Motivación y Compromiso', promedio: 0, preguntasIds: [34, 35, 36] }
  ];

  readonly preguntasDefinicion = [
    { id: 1, dimensionId: 1, dimension: 'Herramientas y Recursos', titulo: 'Herramientas de trabajo', preguntaCompleta: '¿Cuentas con las herramientas y recursos necesarios para realizar tu trabajo de manera eficiente?' },
    { id: 2, dimensionId: 1, dimension: 'Herramientas y Recursos', titulo: 'Equipos y sistemas', preguntaCompleta: '¿Los equipos, sistemas y materiales que utilizas funcionan adecuadamente?' },
    { id: 3, dimensionId: 1, dimension: 'Herramientas y Recursos', titulo: 'Oportunidad de recursos', preguntaCompleta: '¿Recibes oportunamente los recursos que necesitas para cumplir con tus responsabilidades?' },
    { id: 4, dimensionId: 2, dimension: 'Ambiente y Equipo', titulo: 'Respeto y compañerismo', preguntaCompleta: '¿Consideras que existe un ambiente de respeto y compañerismo entre los colaboradores?' },
    { id: 5, dimensionId: 2, dimension: 'Ambiente y Equipo', titulo: 'Colaboración en el área', preguntaCompleta: '¿Existe una buena colaboración entre los integrantes de tu equipo?' },
    { id: 6, dimensionId: 2, dimension: 'Ambiente y Equipo', titulo: 'Disposición de apoyo', preguntaCompleta: '¿Consideras que tus compañeros están dispuestos a apoyarte cuando lo necesitas?' },
    { id: 7, dimensionId: 3, dimension: 'Liderazgo y Comunicación', titulo: 'Comunicación con líder', preguntaCompleta: '¿La comunicación con tu líder directo o gerencia es clara y constructiva?' },
    { id: 8, dimensionId: 3, dimension: 'Liderazgo y Comunicación', titulo: 'Claridad en objetivos', preguntaCompleta: '¿Tu líder comunica de manera clara las prioridades, objetivos y expectativas de tu trabajo?' },
    { id: 9, dimensionId: 3, dimension: 'Liderazgo y Comunicación', titulo: 'Disponibilidad de escucha', preguntaCompleta: '¿Consideras que tu líder está disponible para escuchar y atender tus inquietudes?' },
    { id: 10, dimensionId: 4, dimension: 'Reconocimiento', titulo: 'Valoración del esfuerzo', preguntaCompleta: '¿Sientes que tu esfuerzo, dedicación y contribución son valorados?' },
    { id: 11, dimensionId: 4, dimension: 'Reconocimiento', titulo: 'Reconocimiento a resultados', preguntaCompleta: '¿Recibes reconocimiento cuando realizas un buen trabajo o alcanzas resultados importantes?' },
    { id: 12, dimensionId: 4, dimension: 'Reconocimiento', titulo: 'Reconocimiento institucional', preguntaCompleta: '¿Consideras que la empresa reconoce adecuadamente las aportaciones de sus colaboradores?' },
    { id: 13, dimensionId: 5, dimension: 'Instalaciones y Seguridad', titulo: 'Instalaciones adecuadas', preguntaCompleta: '¿Las instalaciones donde trabajas son adecuadas para realizar tus actividades?' },
    { id: 14, dimensionId: 5, dimension: 'Instalaciones y Seguridad', titulo: 'Sanitarios, comedores y limpieza', preguntaCompleta: '¿Consideras que la limpieza, higiene e insumos en sanitarios, comedores y áreas comunes son adecuados y suficientes?' },
    { id: 15, dimensionId: 5, dimension: 'Instalaciones y Seguridad', titulo: 'Seguridad en el trabajo', preguntaCompleta: '¿Consideras que existen medidas suficientes para garantizar tu seguridad durante la jornada laboral?' },
    { id: 16, dimensionId: 6, dimension: 'Sentido de Pertenencia', titulo: 'Orgullo institucional', preguntaCompleta: '¿Te sientes orgulloso/a de pertenecer a Grupo InMotion?' },
    { id: 17, dimensionId: 6, dimension: 'Sentido de Pertenencia', titulo: 'Coherencia de valores', preguntaCompleta: '¿Consideras que los valores de la empresa son coherentes con la manera en que se trabaja día a día?' },
    { id: 18, dimensionId: 6, dimension: 'Sentido de Pertenencia', titulo: 'Recomendación laboral', preguntaCompleta: '¿Recomendarías Grupo InMotion como un buen lugar para trabajar?' },
    { id: 19, dimensionId: 7, dimension: 'Desarrollo y Crecimiento', titulo: 'Nuevas habilidades', preguntaCompleta: '¿Consideras que tienes oportunidades para aprender y desarrollar nuevas habilidades?' },
    { id: 20, dimensionId: 7, dimension: 'Desarrollo y Crecimiento', titulo: 'Capacitación recibida', preguntaCompleta: '¿La empresa te proporciona capacitación adecuada para mejorar tu desempeño?' },
    { id: 21, dimensionId: 7, dimension: 'Desarrollo y Crecimiento', titulo: 'Oportunidad de crecimiento', preguntaCompleta: '¿Consideras que existen oportunidades reales de crecimiento y desarrollo profesional dentro de la empresa?' },
    { id: 22, dimensionId: 8, dimension: 'Equidad y Justicia', titulo: 'Trato justo', preguntaCompleta: '¿Consideras que los colaboradores reciben un trato justo y respetuoso?' },
    { id: 23, dimensionId: 8, dimension: 'Equidad y Justicia', titulo: 'Equidad de oportunidades', preguntaCompleta: '¿Percibes que las oportunidades de crecimiento, reconocimiento y desarrollo se asignan de manera justa?' },
    { id: 24, dimensionId: 8, dimension: 'Equidad y Justicia', titulo: 'Políticas consistentes', preguntaCompleta: '¿Consideras que las reglas y políticas de la empresa se aplican de manera consistente para todos?' },
    { id: 25, dimensionId: 9, dimension: 'Bienestar y Carga', titulo: 'Carga de trabajo', preguntaCompleta: '¿Consideras que tu carga de trabajo es adecuada para el tiempo disponible?' },
    { id: 26, dimensionId: 9, dimension: 'Bienestar y Carga', titulo: 'Balance vida-trabajo', preguntaCompleta: '¿Consideras que tienes un equilibrio saludable entre tus responsabilidades laborales y tu vida personal?' },
    { id: 27, dimensionId: 9, dimension: 'Bienestar y Carga', titulo: 'Interés por el bienestar', preguntaCompleta: '¿La empresa muestra interés por el bienestar y las necesidades de sus colaboradores?' },
    { id: 28, dimensionId: 10, dimension: 'Participación y Escucha', titulo: 'Opiniones tomadas en cuenta', preguntaCompleta: '¿Sientes que tus opiniones y sugerencias son escuchadas por tus líderes?' },
    { id: 29, dimensionId: 10, dimension: 'Participación y Escucha', titulo: 'Propuestas de mejora', preguntaCompleta: '¿Tienes oportunidades para proponer ideas o mejoras relacionadas con tu trabajo?' },
    { id: 30, dimensionId: 10, dimension: 'Participación y Escucha', titulo: 'Mejora con base en escucha', preguntaCompleta: '¿Consideras que la empresa toma en cuenta las opiniones de los colaboradores para mejorar?' },
    { id: 31, dimensionId: 11, dimension: 'Seguridad Psicológica', titulo: 'Libertad de expresión', preguntaCompleta: '¿Te sientes con la confianza de expresar tus ideas, dudas o desacuerdos?' },
    { id: 32, dimensionId: 11, dimension: 'Seguridad Psicológica', titulo: 'Comunicación sin temor', preguntaCompleta: '¿Consideras que puedes comunicar un problema o error sin temor a recibir un trato negativo?' },
    { id: 33, dimensionId: 11, dimension: 'Seguridad Psicológica', titulo: 'Ambiente de respeto libre', preguntaCompleta: '¿Sientes que existe un ambiente donde las personas pueden expresar sus opiniones con respeto y libertad?' },
    { id: 34, dimensionId: 12, dimension: 'Motivación y Compromiso', titulo: 'Motivación diaria', preguntaCompleta: '¿Te sientes motivado/a para realizar tu trabajo y alcanzar tus objetivos?' },
    { id: 35, dimensionId: 12, dimension: 'Motivación y Compromiso', titulo: 'Contribución a metas', preguntaCompleta: '¿Consideras que tu trabajo contribuye de manera importante a los objetivos de Grupo InMotion?' },
    { id: 36, dimensionId: 12, dimension: 'Motivación y Compromiso', titulo: 'Permanencia a futuro', preguntaCompleta: '¿Te gustaría continuar desarrollándote y trabajando en Grupo InMotion durante los próximos años?' },
    { id: 37, dimensionId: 12, dimension: 'Evaluación General', titulo: 'Satisfacción general', preguntaCompleta: 'En términos generales, ¿qué tan satisfecho/a estás trabajando en Grupo InMotion?' },
    { id: 38, dimensionId: 12, dimension: 'Evaluación General', titulo: 'Evaluación del clima global', preguntaCompleta: 'En términos generales, ¿cómo evaluarías el clima laboral de Grupo InMotion?' },
    { id: 39, dimensionId: 12, dimension: 'Evaluación General', titulo: 'Reelección de empresa', preguntaCompleta: 'Si tuvieras la oportunidad de elegir nuevamente, ¿volverías a elegir trabajar en Grupo InMotion?' },
    { id: 40, dimensionId: 12, dimension: 'Evaluación General', titulo: 'eNPS Recomendación', preguntaCompleta: '¿Qué tan probable es que recomiendes Grupo InMotion como lugar de trabajo a un familiar, amigo o conocido?' }
  ];

  totalRespuestas = 0;
  promedioGlobal = 0;
  promedioLiderazgo = 0;
  promedioAmbiente = 0;
  promedioRecomendacion = 0;

  porcentajeSaludOrg = 0;
  estadoSaludOrg = 'Sin datos';

  enpsScore = 0;
  promotoresPct = 0;
  neutrosPct = 0;
  detractoresPct = 0;

  mayorFortaleza: DimensionStat = { id: 0, label: 'Sin datos', promedio: 0, preguntasIds: [] };
  areaOportunidad: DimensionStat = { id: 0, label: 'Sin datos', promedio: 0, preguntasIds: [] };

  dimensionesCalculadas: DimensionStat[] = [];
  acordeonesDimensiones: DimensionAcordeon[] = [];
  riesgoRotacionLista: RiesgoRotacion[] = [];
  antiguedadComparativa: AntiguedadComparativa[] = [];
  preguntasDesglose: PreguntaDesglose[] = [];
  heatmapFilas: HeatmapFila[] = [];
  rankingPrioridades: PriorizacionItem[] = [];

  palabrasClave: PalabraClave[] = [];
  private readonly STOP_WORDS = new Set([
    'de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'del', 'un', 'una', 'unos', 'unas',
    'por', 'para', 'con', 'sin', 'sobre', 'que', 'es', 'son', 'al', 'se', 'su', 'sus',
    'mi', 'mis', 'como', 'pero', 'mas', 'más', 'lo', 'le', 'les', 'esta', 'este', 'estos',
    'estas', 'todo', 'toda', 'todos', 'todas', 'muy', 'nos', 'me', 'te', 'yo', 'tu', 'prueba',
    'sin comentarios', 'sin propuestas', 'ninguno', 'ninguna', 'nada', 'ningun'
  ]);

  private chartAgencias: Chart | null = null;
  private chartDimensiones: Chart | null = null;
  private chartInsatisfaccion: Chart | null = null;
  private chartPrioridades: Chart | null = null;
  private graficosInicializados = false;

  constructor(private encuestaService: EncuestaService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngAfterViewInit(): void {
    this.graficosInicializados = true;
  }

  cargarDatos(): void {
    this.loading = true;
    this.encuestaService.listarEncuestas().subscribe({
      next: (data: Encuesta[]) => {
        this.encuestasClima = (data || []).filter(e => e.tipo === 'CLIMA_LABORAL' || e.serie === 'CLIMA-LABORAL-2026');
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar datos de clima laboral:', err);
        this.loading = false;
      }
    });
  }

  obtenerAgenciaEncuesta(e: Encuesta): string {
    if (e.marcaNombre && e.marcaNombre.trim() !== '') {
      return e.marcaNombre;
    }
    const nombre = e.clienteNombre || '';
    if (nombre.includes('[') && nombre.includes(']')) {
      return nombre.substring(nombre.indexOf('[') + 1, nombre.indexOf(']'));
    }
    return 'General';
  }

  aplicarFiltros(): void {
    this.encuestasFiltradas = this.encuestasClima.filter(e => {
      const agencia = this.obtenerAgenciaEncuesta(e);
      const matchAgencia = !this.filtroAgencia || agencia.toLowerCase().includes(this.filtroAgencia.toLowerCase());
      const matchDepto = !this.filtroDepto || e.asesor === this.filtroDepto;
      const matchAntiguedad = !this.filtroAntiguedad || e.unidad === this.filtroAntiguedad;
      
      const rRecom = e.respuestas?.find(r => r.preguntaId === 40)?.valorNumerico || 
                     e.respuestas?.find(r => r.preguntaId === 18)?.valorNumerico || 
                     e.respuestas?.find(r => r.preguntaId === 6)?.valorNumerico || 0;
      
      let matchSegmento = true;
      if (this.filtroSegmento === 'PROMOTORES') matchSegmento = rRecom === 5;
      else if (this.filtroSegmento === 'NEUTROS') matchSegmento = rRecom === 4;
      else if (this.filtroSegmento === 'DETRACTORES') matchSegmento = rRecom >= 1 && rRecom <= 3;

      let matchDimension = true;
      if (this.filtroDimensionComentario) {
        const dimId = parseInt(this.filtroDimensionComentario, 10);
        if (dimId === 41) matchDimension = !!this.obtenerTextoRespuesta(e, 41) || !!this.obtenerTextoRespuesta(e, 7);
        else if (dimId === 42) matchDimension = !!this.obtenerTextoRespuesta(e, 42);
        else if (dimId === 43) matchDimension = !!this.obtenerTextoRespuesta(e, 43) || !!this.obtenerTextoRespuesta(e, 8);
        else if (dimId === 44) matchDimension = !!this.obtenerTextoRespuesta(e, 44);
        else if (dimId === 45) matchDimension = !!this.obtenerTextoRespuesta(e, 45);
        else if (dimId === 46) matchDimension = !!this.obtenerTextoRespuesta(e, 46);
        else if (dimId === 47) matchDimension = !!this.obtenerTextoRespuesta(e, 47);
      }

      let matchBusqueda = true;
      if (this.busquedaComentario.trim()) {
        const query = this.busquedaComentario.toLowerCase();
        const comentarios = (e.respuestas || [])
          .filter(r => r.valorTexto)
          .map(r => (r.valorTexto || '').toLowerCase())
          .join(' ');
        matchBusqueda = comentarios.includes(query);
      }

      return matchAgencia && matchDepto && matchAntiguedad && matchSegmento && matchDimension && matchBusqueda;
    });

    this.calcularKPIs();
    this.calcularDesglosePreguntas();
    this.calcularRiesgoRotacion();
    this.calcularComparativaAntiguedad();
    this.calcularHeatmap();
    this.calcularPrioridades();
    this.generarNubePalabras();

    if (this.graficosInicializados) {
      setTimeout(() => {
        this.renderGraficoAgencias();
        this.renderGraficoDimensiones();
        this.renderGraficoInsatisfaccion();
        this.renderGraficoPrioridades();
      }, 200);
    }
  }

  calcularKPIs(): void {
    this.totalRespuestas = this.encuestasFiltradas.length;

    if (this.totalRespuestas === 0) {
      this.promedioGlobal = 0;
      this.promedioLiderazgo = 0;
      this.promedioAmbiente = 0;
      this.promedioRecomendacion = 0;
      this.porcentajeSaludOrg = 0;
      this.estadoSaludOrg = 'Sin datos';
      this.enpsScore = 0;
      this.promotoresPct = 0;
      this.neutrosPct = 0;
      this.detractoresPct = 0;
      this.mayorFortaleza = { id: 0, label: 'Sin datos', promedio: 0, preguntasIds: [] };
      this.areaOportunidad = { id: 0, label: 'Sin datos', promedio: 0, preguntasIds: [] };
      this.dimensionesCalculadas = [];
      return;
    }

    let sumaTotal = 0;
    let countTotal = 0;
    let sumaLiderazgo = 0;
    let countLiderazgo = 0;
    let sumaAmbiente = 0;
    let countAmbiente = 0;
    let sumaRecom = 0;
    let countRecom = 0;

    let promotores = 0;
    let neutros = 0;
    let detractores = 0;

    this.dimensionesCalculadas = this.dimensionesDefinicion.map(dim => {
      let sumaDim = 0;
      let countDim = 0;

      this.encuestasFiltradas.forEach(enc => {
        enc.respuestas?.forEach(r => {
          if (r.valorNumerico && r.preguntaId !== undefined && dim.preguntasIds.includes(r.preguntaId)) {
            sumaDim += r.valorNumerico;
            countDim++;
          }
        });
      });

      return {
        id: dim.id,
        label: dim.label,
        promedio: countDim > 0 ? Number((sumaDim / countDim).toFixed(2)) : 0,
        preguntasIds: dim.preguntasIds
      };
    });

    this.encuestasFiltradas.forEach(enc => {
      if (enc.respuestas && enc.respuestas.length > 0) {
        enc.respuestas.forEach(r => {
          if (r.valorNumerico !== undefined && r.valorNumerico !== null) {
            const pId = Number(r.preguntaId);
            sumaTotal += r.valorNumerico;
            countTotal++;

            if (pId === 7 || pId === 8 || pId === 9 || pId === 3) {
              sumaLiderazgo += r.valorNumerico;
              countLiderazgo++;
            }

            if (pId === 4 || pId === 5 || pId === 6 || pId === 2) {
              sumaAmbiente += r.valorNumerico;
              countAmbiente++;
            }

            if (pId === 40 || pId === 18 || (pId === 6 && !enc.respuestas.some(x => x.preguntaId === 40))) {
              sumaRecom += r.valorNumerico;
              countRecom++;
              if (r.valorNumerico === 5) promotores++;
              else if (r.valorNumerico === 4) neutros++;
              else detractores++;
            }
          }
        });
      }
    });

    this.promedioGlobal = countTotal > 0 ? Number((sumaTotal / countTotal).toFixed(2)) : 0;
    this.promedioLiderazgo = countLiderazgo > 0 ? Number((sumaLiderazgo / countLiderazgo).toFixed(1)) : 0;
    this.promedioAmbiente = countAmbiente > 0 ? Number((sumaAmbiente / countAmbiente).toFixed(1)) : 0;
    this.promedioRecomendacion = countRecom > 0 ? Number((sumaRecom / countRecom).toFixed(1)) : 0;

    this.porcentajeSaludOrg = Math.round((this.promedioGlobal / 5) * 100);
    if (this.porcentajeSaludOrg >= 84) this.estadoSaludOrg = 'Cultura Saludable & Óptima';
    else if (this.porcentajeSaludOrg >= 70) this.estadoSaludOrg = 'Cultura Estable (En Seguimiento)';
    else this.estadoSaludOrg = 'Alerta de Clima (Intervención Requerida)';

    if (countRecom > 0) {
      this.promotoresPct = Math.round((promotores / countRecom) * 100);
      this.neutrosPct = Math.round((neutros / countRecom) * 100);
      this.detractoresPct = Math.round((detractores / countRecom) * 100);
      this.enpsScore = this.promotoresPct - this.detractoresPct;
    }

    const dimensionesOrdenadas = [...this.dimensionesCalculadas].filter(d => d.promedio > 0).sort((a, b) => b.promedio - a.promedio);
    if (dimensionesOrdenadas.length > 0) {
      this.mayorFortaleza = dimensionesOrdenadas[0];
      this.areaOportunidad = dimensionesOrdenadas[dimensionesOrdenadas.length - 1];
    }
  }

  calcularDesglosePreguntas(): void {
    this.preguntasDesglose = this.preguntasDefinicion.map(p => {
      const dist = [0, 0, 0, 0, 0];
      let suma = 0;
      let total = 0;

      this.encuestasFiltradas.forEach(e => {
        const resp = e.respuestas?.find(r => r.preguntaId === p.id);
        if (resp && resp.valorNumerico && resp.valorNumerico >= 1 && resp.valorNumerico <= 5) {
          dist[resp.valorNumerico - 1]++;
          suma += resp.valorNumerico;
          total++;
        }
      });

      const porcentajes = dist.map(count => total > 0 ? Math.round((count / total) * 100) : 0);
      const promedio = total > 0 ? Number((suma / total).toFixed(2)) : 0;

      return {
        id: p.id,
        dimension: p.dimension,
        dimensionId: p.dimensionId,
        titulo: p.titulo,
        preguntaCompleta: p.preguntaCompleta,
        promedio: promedio,
        distribucion: dist,
        porcentajes: porcentajes
      };
    });

    this.acordeonesDimensiones = this.dimensionesCalculadas.map((d, index) => ({
      id: d.id,
      label: d.label,
      promedio: d.promedio,
      abierto: index === 0,
      preguntas: this.preguntasDesglose.filter(p => d.preguntasIds.includes(p.id))
    }));
  }

  toggleAcordeon(acordeon: DimensionAcordeon): void {
    acordeon.abierto = !acordeon.abierto;
  }

  expandirTodosAcordeones(estado: boolean): void {
    this.acordeonesDimensiones.forEach(a => a.abierto = estado);
  }

  calcularHeatmap(): void {
    this.heatmapFilas = this.departamentos.map(dep => {
      const encDep = this.encuestasFiltradas.filter(e => e.asesor === dep);
      const valores: { [dimId: number]: number } = {};

      this.dimensionesDefinicion.forEach(dim => {
        let suma = 0;
        let count = 0;
        encDep.forEach(e => {
          e.respuestas?.forEach(r => {
            if (r.preguntaId !== undefined && dim.preguntasIds.includes(r.preguntaId) && r.valorNumerico) {
              suma += r.valorNumerico;
              count++;
            }
          });
        });
        valores[dim.id] = count > 0 ? Number((suma / count).toFixed(2)) : 0;
      });

      return {
        departamento: dep,
        respuestasCount: encDep.length,
        valores: valores
      };
    }).filter(f => f.respuestasCount > 0);
  }

  calcularPrioridades(): void {
    const conteo: { [key: string]: number } = {};
    let totalEncuestasConPrioridad = 0;

    this.encuestasFiltradas.forEach(e => {
      const texto = this.obtenerTextoRespuesta(e, 47);
      if (texto) {
        totalEncuestasConPrioridad++;
        const partes = texto.split('|').map(p => p.trim()).filter(p => p.length > 0);
        partes.forEach(p => {
          conteo[p] = (conteo[p] || 0) + 1;
        });
      }
    });

    const items: PriorizacionItem[] = Object.keys(conteo).map(k => ({
      nombre: k,
      votos: conteo[k],
      porcentaje: totalEncuestasConPrioridad > 0 ? Math.round((conteo[k] / totalEncuestasConPrioridad) * 100) : 0
    }));

    items.sort((a, b) => b.votos - a.votos);
    this.rankingPrioridades = items.slice(0, 10);
  }

  calcularRiesgoRotacion(): void {
    this.riesgoRotacionLista = this.departamentos.map((dep): RiesgoRotacion => {
      const encDep = this.encuestasFiltradas.filter(e => e.asesor === dep);
      if (encDep.length === 0) {
        return {
          departamento: dep,
          nivelRiesgo: 'BAJO',
          promedioLiderazgo: 0,
          promedioReconocimiento: 0,
          respuestasCount: 0
        };
      }

      let sumaLider = 0;
      let countLider = 0;
      let sumaRecon = 0;
      let countRecon = 0;

      encDep.forEach(e => {
        const rLider = e.respuestas?.filter(r => r.preguntaId !== undefined && [7, 8, 9, 3].includes(r.preguntaId));
        const rRecon = e.respuestas?.filter(r => r.preguntaId !== undefined && [10, 11, 12, 4].includes(r.preguntaId));

        rLider?.forEach(r => { if (r.valorNumerico) { sumaLider += r.valorNumerico; countLider++; } });
        rRecon?.forEach(r => { if (r.valorNumerico) { sumaRecon += r.valorNumerico; countRecon++; } });
      });

      const avgLider = countLider > 0 ? Number((sumaLider / countLider).toFixed(1)) : 0;
      const avgRecon = countRecon > 0 ? Number((sumaRecon / countRecon).toFixed(1)) : 0;
      const combinado = (avgLider + avgRecon) / 2;

      let riesgo: 'ALTO' | 'MEDIO' | 'BAJO' = 'BAJO';
      if (combinado < 3.2 && encDep.length > 0) riesgo = 'ALTO';
      else if (combinado < 4.0 && encDep.length > 0) riesgo = 'MEDIO';

      return {
        departamento: dep,
        nivelRiesgo: riesgo,
        promedioLiderazgo: avgLider,
        promedioReconocimiento: avgRecon,
        respuestasCount: encDep.length
      };
    }).filter(d => d.respuestasCount > 0);

    this.riesgoRotacionLista.sort((a, b) => {
      const peso: Record<'ALTO' | 'MEDIO' | 'BAJO', number> = { ALTO: 3, MEDIO: 2, BAJO: 1 };
      return peso[b.nivelRiesgo] - peso[a.nivelRiesgo];
    });
  }

  calcularComparativaAntiguedad(): void {
    this.antiguedadComparativa = this.antiguedades.map(rango => {
      const encRango = this.encuestasFiltradas.filter(e => e.unidad === rango);
      let suma = 0;
      let count = 0;

      encRango.forEach(e => {
        e.respuestas?.forEach(r => {
          if (r.valorNumerico) { suma += r.valorNumerico; count++; }
        });
      });

      return {
        rango: rango,
        promedio: count > 0 ? Number((suma / count).toFixed(2)) : 0,
        total: encRango.length
      };
    });
  }

  generarNubePalabras(): void {
    const conteoPositivo: { [key: string]: number } = {};
    const conteoMejora: { [key: string]: number } = {};

    this.encuestasFiltradas.forEach(enc => {
      const pos = [
        this.obtenerTextoRespuesta(enc, 41),
        this.obtenerTextoRespuesta(enc, 42),
        this.obtenerTextoRespuesta(enc, 7)
      ].join(' ');

      const mej = [
        this.obtenerTextoRespuesta(enc, 43),
        this.obtenerTextoRespuesta(enc, 44),
        this.obtenerTextoRespuesta(enc, 45),
        this.obtenerTextoRespuesta(enc, 46),
        this.obtenerTextoRespuesta(enc, 47),
        this.obtenerTextoRespuesta(enc, 8)
      ].join(' ');

      this.extraerPalabras(pos).forEach(p => conteoPositivo[p] = (conteoPositivo[p] || 0) + 1);
      this.extraerPalabras(mej).forEach(p => conteoMejora[p] = (conteoMejora[p] || 0) + 1);
    });

    const palabras: PalabraClave[] = [];

    Object.keys(conteoPositivo).forEach(txt => {
      if (conteoPositivo[txt] >= 1) {
        palabras.push({ texto: txt, frecuencia: conteoPositivo[txt], peso: 1, tipo: 'positivo' });
      }
    });

    Object.keys(conteoMejora).forEach(txt => {
      if (conteoMejora[txt] >= 1) {
        palabras.push({ texto: txt, frecuencia: conteoMejora[txt], peso: 1, tipo: 'mejora' });
      }
    });

    palabras.sort((a, b) => b.frecuencia - a.frecuencia);
    const maxFrec = palabras.length > 0 ? palabras[0].frecuencia : 1;

    palabras.forEach(p => {
      p.peso = Math.min(5, Math.max(1, Math.ceil((p.frecuencia / maxFrec) * 5)));
    });

    this.palabrasClave = palabras.slice(0, 30);
  }

  private extraerPalabras(texto: string): string[] {
    if (!texto) return [];
    return texto
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !this.STOP_WORDS.has(w));
  }

  filtrarPorPalabraNube(palabra: string): void {
    if (this.palabraSeleccionadaFiltro === palabra) {
      this.palabraSeleccionadaFiltro = '';
      this.busquedaComentario = '';
    } else {
      this.palabraSeleccionadaFiltro = palabra;
      this.busquedaComentario = palabra;
    }
    this.aplicarFiltros();
  }

  renderGraficoAgencias(): void {
    if (!this.canvasAgencias) return;
    if (this.chartAgencias) this.chartAgencias.destroy();

    const promediosPorAgencia = this.agencias.map(ag => {
      const encAg = this.encuestasFiltradas.filter(e => this.obtenerAgenciaEncuesta(e).toLowerCase().includes(ag.toLowerCase()));
      let suma = 0;
      let totalP = 0;
      encAg.forEach(e => {
        e.respuestas?.forEach(r => {
          if (r.valorNumerico) { suma += r.valorNumerico; totalP++; }
        });
      });
      return totalP > 0 ? Number((suma / totalP).toFixed(2)) : 0;
    });

    const ctx = this.canvasAgencias.nativeElement.getContext('2d');
    this.chartAgencias = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Toyota Pachuca', 'Tulancingo', 'C. Servicio', 'Carsline', 'Subaru'],
        datasets: [{
          label: 'Satisfacción Promedio',
          data: promediosPorAgencia,
          backgroundColor: '#8A6D3B',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 0, max: 5, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  renderGraficoDimensiones(): void {
    if (!this.canvasDimensiones) return;
    if (this.chartDimensiones) this.chartDimensiones.destroy();

    const labels = this.dimensionesCalculadas.map(d => d.label);
    const data = this.dimensionesCalculadas.map(d => d.promedio);

    const ctx = this.canvasDimensiones.nativeElement.getContext('2d');
    this.chartDimensiones = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Evaluación por Dimensión (1 a 5)',
          data: data,
          backgroundColor: 'rgba(138, 109, 59, 0.25)',
          borderColor: '#8A6D3B',
          pointBackgroundColor: '#1F1F1F',
          pointBorderColor: '#8A6D3B',
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: { min: 0, max: 5, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  renderGraficoInsatisfaccion(): void {
    if (!this.canvasInsatisfaccion) return;
    if (this.chartInsatisfaccion) this.chartInsatisfaccion.destroy();

    const pctsInsatisfaccion = this.dimensionesCalculadas.map(dim => {
      let countCriticos = 0;
      let total = 0;
      this.encuestasFiltradas.forEach(e => {
        e.respuestas?.forEach(r => {
          if (r.preguntaId !== undefined && dim.preguntasIds.includes(r.preguntaId) && r.valorNumerico) {
            total++;
            if (r.valorNumerico <= 2) countCriticos++;
          }
        });
      });
      return total > 0 ? Math.round((countCriticos / total) * 100) : 0;
    });

    const ctx = this.canvasInsatisfaccion.nativeElement.getContext('2d');
    this.chartInsatisfaccion = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.dimensionesCalculadas.map(d => d.label),
        datasets: [{
          label: '% Inconformidad / Foco Rojo (1 y 2 ★)',
          data: pctsInsatisfaccion,
          backgroundColor: '#DC2626',
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` } }
        }
      }
    });
  }

  renderGraficoPrioridades(): void {
    if (!this.canvasPrioridades) return;
    if (this.chartPrioridades) this.chartPrioridades.destroy();

    const labels = this.rankingPrioridades.map(p => p.nombre);
    const data = this.rankingPrioridades.map(p => p.votos);

    const ctx = this.canvasPrioridades.nativeElement.getContext('2d');
    this.chartPrioridades = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total de Votos (P47)',
          data: data,
          backgroundColor: '#C5A059',
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { stepSize: 1 } }
        }
      }
    });
  }

  obtenerTextoRespuesta(enc: Encuesta, preguntaId: number): string {
    const r = enc.respuestas?.find(resp => resp.preguntaId === preguntaId);
    return r?.valorTexto && r.valorTexto !== 'Sin comentarios' && r.valorTexto !== 'Sin propuestas' && r.valorTexto !== 'Sin selección' ? r.valorTexto : '';
  }

  exportarExcel(): void {
    if (this.encuestasFiltradas.length === 0) {
      alert('No hay respuestas para exportar.');
      return;
    }

    const data = this.encuestasFiltradas.map(e => {
      const row: any = {
        'Agencia': this.obtenerAgenciaEncuesta(e),
        'Departamento': e.asesor || '',
        'Antigüedad': e.unidad || '',
        'Fecha': e.fechaEnvio ? new Date(e.fechaEnvio).toLocaleDateString('es-MX') : ''
      };

      this.preguntasDefinicion.forEach(p => {
        row[`P${p.id}. ${p.titulo}`] = e.respuestas?.find(r => r.preguntaId === p.id)?.valorNumerico || 0;
      });

      row['P41. Valoración'] = this.obtenerTextoRespuesta(e, 41) || this.obtenerTextoRespuesta(e, 7);
      row['P42. Lo mejor de la empresa'] = this.obtenerTextoRespuesta(e, 42);
      row['P43. Principal mejora'] = this.obtenerTextoRespuesta(e, 43) || this.obtenerTextoRespuesta(e, 8);
      row['P44. Cambio deseado'] = this.obtenerTextoRespuesta(e, 44);
      row['P45. Apoyo de líder'] = this.obtenerTextoRespuesta(e, 45);
      row['P46. Comentario adicional'] = this.obtenerTextoRespuesta(e, 46);
      row['P47. Prioridades'] = this.obtenerTextoRespuesta(e, 47);

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clima_Laboral_2026');
    XLSX.writeFile(wb, `clima_laboral_inmotion_47p_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportarPDF(): void {
    if (this.encuestasFiltradas.length === 0) {
      alert('No hay información para exportar a PDF.');
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. ENCABEZADO
    doc.setFillColor(31, 31, 31);
    doc.rect(0, 0, pageWidth, 24, 'F');
    doc.setFillColor(138, 109, 59);
    doc.rect(0, 24, pageWidth, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('GRUPO INMOTION | REPORTE DE CLIMA LABORAL 2026', 14, 15);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth - 14, 15, { align: 'right' });

    // 2. FILTROS Y RESUMEN
    let yPos = 34;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const filtroTxt = `Filtros: [Agencia: ${this.filtroAgencia || 'Todas'}] [Area: ${this.filtroDepto || 'Todas'}] [Antiguedad: ${this.filtroAntiguedad || 'Todas'}] [Segmento: ${this.filtroSegmento || 'Todos'}]`;
    doc.text(filtroTxt, 14, yPos);

    yPos += 6;
    autoTable(doc, {
      startY: yPos,
      head: [['Muestra Evaluada', 'Indice General', 'Salud Cultural', 'eNPS Score', 'Top Fortaleza', 'Foco Rojo']],
      body: [[
        `${this.totalRespuestas} Colaboradores`,
        `${this.promedioGlobal} / 5`,
        `${this.porcentajeSaludOrg}%`,
        `${this.enpsScore > 0 ? '+' : ''}${this.enpsScore}`,
        `${this.mayorFortaleza.label} (${this.mayorFortaleza.promedio})`,
        `${this.areaOportunidad.label} (${this.areaOportunidad.promedio})`
      ]],
      theme: 'grid',
      headStyles: { fillColor: [138, 109, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
      bodyStyles: { fontSize: 8, halign: 'center', textColor: [33, 37, 41] },
      margin: { left: 14, right: 14 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // 3. GRÁFICAS
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 31, 31);
    doc.text('ANALISIS GRAFICO: SUCURSALES Y DIMENSIONES', 14, yPos);
    yPos += 4;

    try {
      if (this.canvasAgencias && this.canvasDimensiones) {
        const imgAgencias = this.canvasAgencias.nativeElement.toDataURL('image/png', 1.0);
        const imgDimensiones = this.canvasDimensiones.nativeElement.toDataURL('image/png', 1.0);
        const imgWidth = 88;
        const imgHeight = 52;
        doc.addImage(imgAgencias, 'PNG', 14, yPos, imgWidth, imgHeight);
        doc.addImage(imgDimensiones, 'PNG', 108, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 8;
      }
    } catch (e) {}

    // 4. TABLA RESUMEN POR LAS 12 DIMENSIONES
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('EVALUACION POR DIMENSIONES CORPORATIVAS', 14, yPos);

    const tablaDims = this.dimensionesCalculadas.map(d => [
      d.label,
      `${d.promedio} / 5 ★`,
      d.promedio >= 4.2 ? 'Excelente' : (d.promedio >= 3.5 ? 'Aceptable' : 'Critico')
    ]);

    autoTable(doc, {
      startY: yPos + 3,
      head: [['Dimension Psicometrica', 'Promedio General', 'Estado SLA']],
      body: tablaDims,
      theme: 'grid',
      headStyles: { fillColor: [31, 31, 31], textColor: [255, 255, 255], fontSize: 7.5, halign: 'center' },
      bodyStyles: { fontSize: 7.5, halign: 'center' },
      columnStyles: { 0: { halign: 'left', cellWidth: 90 } },
      margin: { left: 14, right: 14 }
    });

    // 5. SECCIÓN CUALITATIVA (PÁGINA 2)
    const comentariosConTexto = this.encuestasFiltradas.filter(
      e => [41, 42, 43, 44, 45, 46, 47, 7, 8].some(id => this.obtenerTextoRespuesta(e, id))
    );

    if (comentariosConTexto.length > 0) {
      doc.addPage();
      doc.setFillColor(31, 31, 31);
      doc.rect(0, 0, pageWidth, 16, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('GRUPO INMOTION | RETROALIMENTACION Y PROPUESTAS DE COLABORADORES', 14, 11);

      const comentariosData = comentariosConTexto.map(e => {
        const val = this.obtenerTextoRespuesta(e, 41) || this.obtenerTextoRespuesta(e, 7) || 'N/A';
        const mej = this.obtenerTextoRespuesta(e, 43) || this.obtenerTextoRespuesta(e, 8) || 'N/A';
        const prior = this.obtenerTextoRespuesta(e, 47) || 'N/A';

        return [
          `${this.obtenerAgenciaEncuesta(e)}\n(${e.asesor || 'Area general'})`,
          `Positivo:\n${val}\n\nMejora Sugerida:\n${mej}`,
          `Prioridades seleccionadas:\n${prior}`
        ];
      });

      autoTable(doc, {
        startY: 24,
        head: [['Agencia / Area', 'Comentarios Abiertos (Positivos y Oportunidades)', 'Priorizacion']],
        body: comentariosData,
        theme: 'grid',
        headStyles: { fillColor: [138, 109, 59], textColor: [255, 255, 255], fontSize: 8 },
        bodyStyles: { fontSize: 7.5, cellPadding: 3, textColor: [33, 37, 41] },
        columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' }, 1: { cellWidth: 85 }, 2: { cellWidth: 55 } },
        margin: { left: 14, right: 14 }
      });
    }

    doc.save(`reporte_ejecutivo_clima_47p_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}