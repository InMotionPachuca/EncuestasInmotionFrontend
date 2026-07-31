import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { EncuestaService } from '../../services/encuesta.service';
import { Encuesta, EstadisticasGenerales } from '../../models/encuesta.model';
import { NotificationService } from '../../services/notification.service';
import { Chart, registerables } from 'chart.js';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('graficoMarcas') graficoCanvas!: ElementRef;
  @ViewChild('graficoEvolucion') evolucionCanvas!: ElementRef;

  encuestas: Encuesta[] = [];
  encuestasRecientes: Encuesta[] = [];
  encuestasFiltradas: Encuesta[] = [];
  marcas: any[] = [];
  marcasFiltradas: any[] = [];

  estadisticas: EstadisticasGenerales = {
    total: 0,
    enviadas: 0,
    respondidas: 0,
    expiradas: 0,
    tasaRespuesta: 0,
    promedios: {
      experiencia: 0,
      asesor: 0,
      recomendacion: 0
    },
    porMarca: []
  };

  loading = true;
  error = '';
  encuestaSeleccionada: Encuesta | null = null;
  mostrarDetalles = false;
  copiando = false;
  periodo: 'hoy' | 'semana' | 'mes' | 'todos' = 'todos';
  graficosInicializados = false;
  refrescando = false;
  filtroMarca = '';
  filtroEstado = '';

  periodos: { value: 'hoy' | 'semana' | 'mes' | 'todos'; label: string }[] = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Semana' },
    { value: 'mes', label: 'Mes' },
    { value: 'todos', label: 'Todos' }
  ];

  npsData = {
    score: 0,
    promoters: 0,
    detractors: 0,
    pasives: 0,
    total: 0,
    label: 'Excelente'
  };

  get Math() {
    return Math;
  }

  logos: { [key: number]: string } = {
    1: 'Toyota.png',
    2: 'carsline.png',
    3: 'carsline.png',
    4: 'gwm.png',
    5: 'subaru.webp',
    6: 'comprocars.png',
    7: 'comprocars.png'
  };

  private grafico: Chart | null = null;
  private graficoEvolucion: Chart | null = null;

  constructor(
    private encuestaService: EncuestaService,
    private router: Router,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.cargarDatosCompletos();

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        this.refrescarDatos();
      }
    });
  }

  ngAfterViewInit() {
    this.graficosInicializados = true;
  }

  normalizarTexto(texto: string): string {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  cargarDatosCompletos() {
    this.loading = true;

    this.encuestaService.listarEncuestas().subscribe({
      next: (encuestasData: Encuesta[]) => {
        // --- FILTRO CLAVE: EXCLUIR ENCUESTAS QR DE ESTE DASHBOARD ---
        this.encuestas = (encuestasData || []).filter(e => e.tipo !== 'QR' && e.serie !== 'QR-GENERAL');
        
        this.encuestasRecientes = this.encuestas.slice(0, 10);
        this.encuestasFiltradas = [...this.encuestas];
        
        // Recalcular marcas y métricas dinámicamente según solo encuestas normales
        this.procesarMarcasDinamicas(this.encuestasFiltradas);
        this.aplicarFiltroPeriodo();
        this.calcularNPS(this.encuestasFiltradas);
        this.loading = false;

        if (this.graficosInicializados) {
          setTimeout(() => {
            this.crearGraficoMarcas();
            this.crearGraficoEvolucion();
          }, 300);
        }
      },
      error: (error) => {
        console.error('Error al cargar encuestas:', error);
        this.loading = false;
      }
    });
  }

  procesarMarcasDinamicas(encuestasList: Encuesta[]) {
    const mapaMarcas = new Map();

    encuestasList.forEach(enc => {
      const marcaId = enc.marcaId || 0;
      const marcaNombre = enc.marcaNombre || 'Sin Marca';

      if (!mapaMarcas.has(marcaId)) {
        mapaMarcas.set(marcaId, {
          id: marcaId,
          nombre: marcaNombre,
          total: 0,
          respondidas: 0,
          pendientes: 0,
          promedio: 0,
          tasaRespuesta: 0,
          sumaPromedios: 0
        });
      }

      const item = mapaMarcas.get(marcaId);
      item.total++;
      if (enc.estado === 'RESPONDIDA') {
        item.respondidas++;
        item.sumaPromedios += this.getPromedioEncuesta(enc);
      } else {
        item.pendientes++;
      }
    });

    this.marcas = Array.from(mapaMarcas.values()).map(item => {
      item.promedio = item.respondidas > 0 ? Number((item.sumaPromedios / item.respondidas).toFixed(1)) : 0;
      item.tasaRespuesta = item.total > 0 ? Math.round((item.respondidas / item.total) * 100) : 0;
      return item;
    });

    this.marcas.sort((a, b) => a.nombre.localeCompare(b.nombre));
    this.marcasFiltradas = [...this.marcas];
  }

  calcularNPS(encuestas: Encuesta[]): void {
    const respondidas = encuestas.filter(e => e.estado === 'RESPONDIDA' && e.respuestas && e.respuestas.length > 0);

    let promoters = 0;
    let detractors = 0;
    let pasives = 0;

    respondidas.forEach(enc => {
      const calificacion = this.getPromedioEncuesta(enc);
      if (calificacion >= 4.5) promoters++;
      else if (calificacion >= 3.8) pasives++;
      else if (calificacion > 0) detractors++;
    });

    const total = respondidas.length;
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    this.npsData = {
      score: nps,
      promoters,
      detractors,
      pasives,
      total: respondidas.length,
      label: nps >= 60 ? 'Excelente' : nps >= 30 ? 'Bueno' : nps >= 0 ? 'Regular' : 'Necesita Mejorar'
    };
  }

  aplicarFiltros(): void {
    this.encuestasFiltradas = this.encuestas.filter(enc => {
      const marcaMatch = !this.filtroMarca || enc.marcaId?.toString() === this.filtroMarca;
      const estadoMatch = !this.filtroEstado || enc.estado === this.filtroEstado;
      return marcaMatch && estadoMatch;
    });

    this.encuestasRecientes = this.encuestasFiltradas.slice(0, 10);
    this.calcularNPS(this.encuestasFiltradas);

    this.estadisticas.total = this.encuestasFiltradas.length;
    this.estadisticas.respondidas = this.encuestasFiltradas.filter(e => e.estado === 'RESPONDIDA').length;
    this.estadisticas.enviadas = this.encuestasFiltradas.filter(e => e.estado === 'ENVIADA').length;
    this.estadisticas.tasaRespuesta = this.estadisticas.total > 0
      ? Math.round((this.estadisticas.respondidas / this.estadisticas.total) * 100)
      : 0;

    if (this.graficosInicializados) {
      setTimeout(() => {
        this.crearGraficoMarcas();
        this.crearGraficoEvolucion();
      }, 300);
    }
  }

  aplicarFiltroPeriodo() {
    const hoy = new Date();
    let fechaInicio = new Date();

    switch (this.periodo) {
      case 'hoy':
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        break;
      case 'semana':
        fechaInicio = new Date(hoy);
        fechaInicio.setDate(hoy.getDate() - 7);
        break;
      case 'mes':
        fechaInicio = new Date(hoy);
        fechaInicio.setMonth(hoy.getMonth() - 1);
        break;
      case 'todos':
      default:
        fechaInicio = new Date(0);
        break;
    }

    this.encuestasFiltradas = this.encuestas.filter(enc => {
      const fechaEnc = new Date(enc.fechaEnvio);
      return fechaEnc >= fechaInicio;
    });

    this.aplicarFiltros();
  }

  filtrarPorPeriodo(periodo: 'hoy' | 'semana' | 'mes' | 'todos') {
    this.periodo = periodo;
    this.aplicarFiltroPeriodo();
  }

  crearGraficoMarcas() {
    try {
      if (!this.graficoCanvas) return;
      if (this.grafico) { this.grafico.destroy(); this.grafico = null; }

      const marcasMostrar = this.marcasFiltradas.length > 0 ? this.marcasFiltradas : this.marcas;
      if (marcasMostrar.length === 0) return;

      const ctx = this.graficoCanvas.nativeElement.getContext('2d');
      if (!ctx) return;

      this.grafico = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: marcasMostrar.map(m => m.nombre),
          datasets: [
            { label: 'Total', data: marcasMostrar.map(m => m.total), backgroundColor: 'rgba(235, 10, 30, 0.85)', borderRadius: 6 },
            { label: 'Respondidas', data: marcasMostrar.map(m => m.respondidas), backgroundColor: 'rgba(46, 125, 50, 0.85)', borderRadius: 6 },
            { label: 'Pendientes', data: marcasMostrar.map(m => m.pendientes), backgroundColor: 'rgba(21, 101, 192, 0.85)', borderRadius: 6 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    } catch (error) { console.error(error); }
  }

  crearGraficoEvolucion() {
    try {
      if (!this.evolucionCanvas) return;
      if (this.graficoEvolucion) { this.graficoEvolucion.destroy(); this.graficoEvolucion = null; }

      const encuestasParaGrafico = this.encuestasFiltradas;
      if (encuestasParaGrafico.length === 0) return;

      const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      const encuestasPorDia = [0, 0, 0, 0, 0, 0, 0];
      const respondidasPorDia = [0, 0, 0, 0, 0, 0, 0];

      const hoy = new Date();
      for (let i = 6; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() - i);
        const diaIndex = fecha.getDay() === 0 ? 6 : fecha.getDay() - 1;

        encuestasParaGrafico.forEach(enc => {
          if (new Date(enc.fechaEnvio).toDateString() === fecha.toDateString()) {
            encuestasPorDia[diaIndex]++;
            if (enc.estado === 'RESPONDIDA') respondidasPorDia[diaIndex]++;
          }
        });
      }

      const ctx = this.evolucionCanvas.nativeElement.getContext('2d');
      if (!ctx) return;

      this.graficoEvolucion = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dias,
          datasets: [
            { label: 'Enviadas', data: encuestasPorDia, borderColor: '#EB0A1E', fill: true },
            { label: 'Respondidas', data: respondidasPorDia, borderColor: '#2E7D32', fill: true }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    } catch (error) { console.error(error); }
  }

  obtenerLogo(marcaId: number): string { return this.logos[marcaId] || 'default.svg'; }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  getEstadoClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'ENVIADA': 'badge-enviada',
      'RESPONDIDA': 'badge-respondida',
      'EXPIRADA': 'badge-expirada'
    };
    return classes[estado] || '';
  }

  formatFecha(fecha: Date | string): string {
    if (!fecha) return '-';
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  getPromedioEncuesta(encuesta: Encuesta): number {
    if (!encuesta.respuestas || encuesta.respuestas.length === 0) return 0;
    let total = 0, count = 0;
    for (const r of encuesta.respuestas) {
      if (r.valorNumerico) { total += r.valorNumerico; count++; }
    }
    return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
  }

  getEstadoTexto(estado: string): string {
    const textos: { [key: string]: string } = {
      'ENVIADA': 'Enviada',
      'RESPONDIDA': 'Respondida',
      'EXPIRADA': 'Expirada'
    };
    return textos[estado] || estado;
  }

  generarLink(token: string): string { return this.encuestaService.generarLinkEncuesta(token); }

  copiarLink(token: string) {
    this.copiando = true;
    navigator.clipboard.writeText(this.generarLink(token)).then(() => {
      this.notificationService.show('Link copiado al portapapeles', 'success');
      this.copiando = false;
    });
  }

  verDetalles(encuesta: Encuesta) {
    this.encuestaSeleccionada = encuesta;
    this.mostrarDetalles = true;
  }

  cerrarDetalles() {
    this.mostrarDetalles = false;
    this.encuestaSeleccionada = null;
  }

  refrescarDatos() {
    this.cargarDatosCompletos();
    this.notificationService.show('Datos actualizados', 'info');
  }

  exportarPDF(): void { /* Mantener tu lógica de PDF intacta */ }
  exportarEstadisticas() { /* Mantener tu lógica de Excel intacta */ }
}