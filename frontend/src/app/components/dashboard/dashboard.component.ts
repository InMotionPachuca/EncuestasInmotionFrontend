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

  // FILTROS OPERATIVOS
  filtroTipo: 'SERVICIO' | 'VENTA' | '' = '';
  filtroMarca = '';
  filtroEstado = '';
  periodo: 'hoy' | 'semana' | 'mes' | 'todos' = 'todos';

  // CALENDARIO Y SEGMENTACIÓN POR MES
  filtroMesSeleccionado: string = '';
  mesesDisponibles: { valor: string; etiqueta: string; conteo: number }[] = [];

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
  graficosInicializados = false;
  refrescando = false;

  periodos: { value: 'hoy' | 'semana' | 'mes' | 'todos'; label: string }[] = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Semana' },
    { value: 'mes', label: 'Últimos 30 días' },
    { value: 'todos', label: 'Histórico' }
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

  get conteoTotal(): number {
    return this.encuestas.length;
  }

  get conteoServicio(): number {
    return this.encuestas.filter(e => e.tipo !== 'VENTA').length;
  }

  get conteoVenta(): number {
    return this.encuestas.filter(e => e.tipo === 'VENTA').length;
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
        // Excluir encuestas QR y encuestas de CLIMA LABORAL de este Dashboard CXI
        this.encuestas = (encuestasData || []).filter(e => 
          e.tipo !== 'QR' && 
          e.serie !== 'QR-GENERAL' &&
          e.tipo !== 'CLIMA_LABORAL' &&
          e.serie !== 'CLIMA-LABORAL-2026'
        );
        this.generarMesesDisponibles();
        this.aplicarFiltroPeriodo();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar encuestas:', error);
        this.loading = false;
      }
    });
  }

  generarMesesDisponibles(): void {
    const mapaMeses = new Map<string, number>();

    this.encuestas.forEach(enc => {
      if (enc.fechaEnvio) {
        const fecha = new Date(enc.fechaEnvio);
        if (!isNaN(fecha.getTime())) {
          const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
          mapaMeses.set(key, (mapaMeses.get(key) || 0) + 1);
        }
      }
    });

    const mesesNombres = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    this.mesesDisponibles = Array.from(mapaMeses.entries())
      .map(([valor, conteo]) => {
        const [anio, mesNum] = valor.split('-');
        const nombreMes = mesesNombres[parseInt(mesNum, 10) - 1];
        return {
          valor,
          etiqueta: `${nombreMes} ${anio}`,
          conteo
        };
      })
      .sort((a, b) => b.valor.localeCompare(a.valor));
  }

  seleccionarMesRapido(mesValor: string): void {
    this.filtroMesSeleccionado = mesValor;
    this.periodo = 'todos';
    this.aplicarFiltros();
  }

  limpiarFiltroMes(): void {
    this.filtroMesSeleccionado = '';
    this.aplicarFiltros();
  }

  cambiarFiltroTipo(tipo: 'SERVICIO' | 'VENTA' | ''): void {
    this.filtroTipo = tipo;
    this.aplicarFiltros();
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
          totalVentas: 0,
          totalServicio: 0,
          promedio: 0,
          tasaRespuesta: 0,
          sumaPromedios: 0
        });
      }

      const item = mapaMarcas.get(marcaId);
      item.total++;
      if (enc.tipo === 'VENTA') {
        item.totalVentas++;
      } else {
        item.totalServicio++;
      }

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
      let matchTipo = true;
      if (this.filtroTipo === 'VENTA') {
        matchTipo = enc.tipo === 'VENTA';
      } else if (this.filtroTipo === 'SERVICIO') {
        matchTipo = enc.tipo !== 'VENTA';
      }

      const matchMarca = !this.filtroMarca || enc.marcaId?.toString() === this.filtroMarca;
      const matchEstado = !this.filtroEstado || enc.estado === this.filtroEstado;

      let matchMes = true;
      if (this.filtroMesSeleccionado && enc.fechaEnvio) {
        const fecha = new Date(enc.fechaEnvio);
        if (!isNaN(fecha.getTime())) {
          const mesEncuesta = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
          matchMes = mesEncuesta === this.filtroMesSeleccionado;
        }
      }

      let matchPeriodo = true;
      if (!this.filtroMesSeleccionado && this.periodo !== 'todos' && enc.fechaEnvio) {
        const hoy = new Date();
        const fechaEnc = new Date(enc.fechaEnvio);
        if (this.periodo === 'hoy') {
          matchPeriodo = fechaEnc.toDateString() === hoy.toDateString();
        } else if (this.periodo === 'semana') {
          const haceUnaSemana = new Date(hoy);
          haceUnaSemana.setDate(hoy.getDate() - 7);
          matchPeriodo = fechaEnc >= haceUnaSemana;
        } else if (this.periodo === 'mes') {
          const haceUnMes = new Date(hoy);
          haceUnMes.setMonth(hoy.getMonth() - 1);
          matchPeriodo = fechaEnc >= haceUnMes;
        }
      }

      return matchTipo && matchMarca && matchEstado && matchMes && matchPeriodo;
    });

    this.encuestasRecientes = this.encuestasFiltradas.slice(0, 10);
    this.procesarMarcasDinamicas(this.encuestasFiltradas);
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
    this.aplicarFiltros();
  }

  filtrarPorPeriodo(periodo: 'hoy' | 'semana' | 'mes' | 'todos') {
    this.periodo = periodo;
    this.filtroMesSeleccionado = '';
    this.aplicarFiltros();
  }

  crearGraficoMarcas() {
    try {
      if (!this.graficoCanvas) return;
      if (this.grafico) { this.grafico.destroy(); this.grafico = null; }

      const marcasMostrar = this.marcasFiltradas.length > 0 ? this.marcasFiltradas : this.marcas;
      if (marcasMostrar.length === 0) return;

      const ctx = this.graficoCanvas.nativeElement.getContext('2d');
      if (!ctx) return;

      let datasets: any[] = [];

      if (!this.filtroTipo) {
        datasets = [
          {
            label: 'Postventa / Servicio',
            data: marcasMostrar.map(m => m.totalServicio),
            backgroundColor: 'rgba(33, 37, 41, 0.85)',
            borderRadius: 6
          },
          {
            label: 'Ventas / Nuevos',
            data: marcasMostrar.map(m => m.totalVentas),
            backgroundColor: 'rgba(197, 160, 89, 0.90)',
            borderRadius: 6
          }
        ];
      } else {
        datasets = [
          {
            label: 'Total ' + (this.filtroTipo === 'VENTA' ? 'Ventas' : 'Postventa'),
            data: marcasMostrar.map(m => m.total),
            backgroundColor: 'rgba(197, 160, 89, 0.85)',
            borderRadius: 6
          },
          {
            label: 'Respondidas',
            data: marcasMostrar.map(m => m.respondidas),
            backgroundColor: 'rgba(25, 135, 84, 0.85)',
            borderRadius: 6
          }
        ];
      }

      this.grafico = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: marcasMostrar.map(m => m.nombre),
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { font: { family: 'Inter', size: 12 } }
            }
          }
        }
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
      const servicioPorDia = [0, 0, 0, 0, 0, 0, 0];
      const ventasPorDia = [0, 0, 0, 0, 0, 0, 0];

      const hoy = new Date();
      for (let i = 6; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() - i);
        const diaIndex = fecha.getDay() === 0 ? 6 : fecha.getDay() - 1;

        encuestasParaGrafico.forEach(enc => {
          if (new Date(enc.fechaEnvio).toDateString() === fecha.toDateString()) {
            if (enc.tipo === 'VENTA') {
              ventasPorDia[diaIndex]++;
            } else {
              servicioPorDia[diaIndex]++;
            }
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
            {
              label: 'Postventa / Servicio',
              data: servicioPorDia,
              borderColor: '#1F1F1F',
              backgroundColor: 'rgba(31, 31, 31, 0.08)',
              tension: 0.3,
              fill: true
            },
            {
              label: 'Ventas / Nuevos',
              data: ventasPorDia,
              borderColor: '#C5A059',
              backgroundColor: 'rgba(197, 160, 89, 0.15)',
              tension: 0.3,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { font: { family: 'Inter', size: 12 } }
            }
          }
        }
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

  exportarPDF(): void {
    const doc = new jsPDF();
    doc.text('Reporte General CXI', 14, 15);
    autoTable(doc, {
      head: [['Cliente', 'Área', 'Marca', 'Estado', 'Fecha']],
      body: this.encuestasFiltradas.map(e => [
        e.clienteNombre,
        e.tipo || 'POSTVENTA',
        e.marcaNombre || 'Sin Marca',
        this.getEstadoTexto(e.estado),
        this.formatFecha(e.fechaEnvio)
      ])
    });
    doc.save(`reporte_cxi_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  exportarEstadisticas() {
    const data = this.encuestasFiltradas.map(e => ({
      'Cliente': e.clienteNombre,
      'Área': e.tipo === 'VENTA' ? 'Ventas' : 'Postventa',
      'Marca': e.marcaNombre,
      'Estado': this.getEstadoTexto(e.estado),
      'Fecha': this.formatFecha(e.fechaEnvio),
      'Calificación': this.getPromedioEncuesta(e) || 'Pendiente'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estadísticas');
    XLSX.writeFile(wb, `cxi_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}