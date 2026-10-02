import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { EncuestaService } from '../../services/encuesta.service';
import { Encuesta } from '../../models/encuesta.model';
import { NotificationService } from '../../services/notification.service';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-qr',
  templateUrl: './dashboard-qr.component.html',
  styleUrls: ['./dashboard-qr.component.css']
})
export class DashboardQrComponent implements OnInit, AfterViewInit {
  @ViewChild('graficoMarcasQr') graficoCanvas!: ElementRef;
  @ViewChild('graficoEstrellasCanvas') graficoEstrellasCanvas!: ElementRef;

  encuestasQr: Encuesta[] = [];
  encuestasFiltradas: Encuesta[] = [];
  encuestasTablaFiltradas: Encuesta[] = [];
  marcas: any[] = [];
  loading: boolean = true;
  refrescando: boolean = false;

  filtroMarca: string = '';
  filtroTextoTabla: string = '';

  // CALENDARIO Y SEGMENTACIÓN POR MES
  filtroMesSeleccionado: string = '';
  mesesDisponibles: { valor: string; etiqueta: string; conteo: number }[] = [];

  // Métricas Principales
  totalRespuestas: number = 0;
  promedioExperiencia: number = 0;
  promedioAtencion: number = 0;
  porcentajeRecomienda: number = 0;
  porcentajeTiempoAdecuado: number = 0;

  // NPS QR
  npsData = {
    score: 0,
    promotores: 0,
    pasivos: 0,
    detractores: 0,
    label: 'Excelente'
  };

  // Tabla Comparativa por Agencia
  resumenAgencias: { id: number; nombre: string; total: number; exp: number; atencion: number; rec: number }[] = [];

  private graficoDona: Chart | null = null;
  private graficoEstrellas: Chart | null = null;

  private paletaColoresMarcas: string[] = [
    '#C5A059', '#2E7D32', '#1565C0', '#A88344', '#EB0A1E', '#4A4A4A', '#7B1FA2', '#D4AF37'
  ];

  constructor(
    private encuestaService: EncuestaService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.marcas = this.encuestaService.obtenerMarcas();
    this.cargarEncuestasQr();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.crearGraficos(), 500);
  }

  cargarEncuestasQr(): void {
    this.loading = true;
    this.encuestaService.listarEncuestas().subscribe({
      next: (data: Encuesta[]) => {
        this.encuestasQr = (data || []).filter(e => e.tipo === 'QR' || e.serie === 'QR-GENERAL');
        this.generarMesesDisponibles();
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener encuestas QR:', err);
        this.loading = false;
      }
    });
  }

  generarMesesDisponibles(): void {
    const mapaMeses = new Map<string, number>();

    this.encuestasQr.forEach(enc => {
      const fechaBase = enc.fechaRespuesta || enc.fechaEnvio;
      if (fechaBase) {
        const fecha = new Date(fechaBase);
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
    this.aplicarFiltros();
  }

  limpiarFiltroMes(): void {
    this.filtroMesSeleccionado = '';
    this.aplicarFiltros();
  }

  obtenerTelefono(e: Encuesta): string {
    const enc = e as any;
    return enc.clienteTelefono || enc.telefono || 'Sin teléfono';
  }

  aplicarFiltros(): void {
    this.encuestasFiltradas = this.encuestasQr.filter(enc => {
      const matchMarca = !this.filtroMarca || enc.marcaId?.toString() === this.filtroMarca;

      let matchMes = true;
      if (this.filtroMesSeleccionado) {
        const fechaBase = enc.fechaRespuesta || enc.fechaEnvio;
        if (fechaBase) {
          const fecha = new Date(fechaBase);
          if (!isNaN(fecha.getTime())) {
            const mesEncuesta = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            matchMes = mesEncuesta === this.filtroMesSeleccionado;
          }
        }
      }

      return matchMarca && matchMes;
    });

    // Filtro para el buscador de la tabla detallada
    this.encuestasTablaFiltradas = this.encuestasFiltradas.filter(enc => {
      if (!this.filtroTextoTabla) return true;
      const txt = this.filtroTextoTabla.toLowerCase();
      const cliente = this.obtenerRespuestaTexto(enc, 1).toLowerCase();
      const tel = this.obtenerTelefono(enc).toLowerCase();
      const comentario = this.obtenerComentario(enc).toLowerCase();
      return cliente.includes(txt) || tel.includes(txt) || comentario.includes(txt);
    });

    this.calcularMetricasQr();
    this.crearGraficos();
  }

  calcularMetricasQr(): void {
    this.totalRespuestas = this.encuestasFiltradas.length;
    if (this.totalRespuestas === 0) {
      this.promedioExperiencia = 0;
      this.promedioAtencion = 0;
      this.porcentajeRecomienda = 0;
      this.porcentajeTiempoAdecuado = 0;
      this.npsData = { score: 0, promotores: 0, pasivos: 0, detractores: 0, label: 'Sin Datos' };
      this.resumenAgencias = [];
      return;
    }

    let sumaExp = 0;
    let sumaAtencion = 0;
    let sumaRecomienda = 0;
    let sumaTiempo = 0;

    let promotores = 0;
    let pasivos = 0;
    let detractores = 0;

    this.encuestasFiltradas.forEach(e => {
      if (e.respuestas) {
        const exp = e.respuestas.find(r => r.preguntaId === 2)?.valorNumerico || 0;
        const atencion = e.respuestas.find(r => r.preguntaId === 3)?.valorNumerico || 0;
        const tiempo = e.respuestas.find(r => r.preguntaId === 4)?.opcionId === 1;
        
        const respRec = e.respuestas.find(r => r.preguntaId === 5);
        const rec = respRec && (respRec.opcionId === 1 || respRec.opcionTexto === 'SI' || respRec.opcionTexto === 'SÍ' || respRec.valorTexto === 'SI' || respRec.valorTexto === 'SÍ');

        sumaExp += exp;
        sumaAtencion += atencion;
        if (tiempo) sumaTiempo++;
        if (rec) sumaRecomienda++;

        // Cálculo NPS
        if (exp === 5) promotores++;
        else if (exp === 4) pasivos++;
        else if (exp > 0) detractores++;
      }
    });

    this.promedioExperiencia = Number((sumaExp / this.totalRespuestas).toFixed(1));
    this.promedioAtencion = Number((sumaAtencion / this.totalRespuestas).toFixed(1));
    this.porcentajeTiempoAdecuado = Math.round((sumaTiempo / this.totalRespuestas) * 100);
    this.porcentajeRecomienda = Math.round((sumaRecomienda / this.totalRespuestas) * 100);

    const npsScore = Math.round(((promotores - detractores) / this.totalRespuestas) * 100);
    this.npsData = {
      score: npsScore,
      promotores,
      pasivos,
      detractores,
      label: npsScore >= 60 ? 'Excelente' : npsScore >= 30 ? 'Bueno' : npsScore >= 0 ? 'Regular' : 'Atención Requerida'
    };

    this.calcularResumenAgencias();
  }

  calcularResumenAgencias(): void {
    const mapa = new Map<number, { id: number; nombre: string; total: number; sumaExp: number; sumaAtencion: number; sumaRec: number }>();

    this.encuestasFiltradas.forEach(e => {
      const mId = e.marcaId || 0;
      const mNombre = e.marcaNombre || 'Sin Agencia';

      if (!mapa.has(mId)) {
        mapa.set(mId, { id: mId, nombre: mNombre, total: 0, sumaExp: 0, sumaAtencion: 0, sumaRec: 0 });
      }

      const item = mapa.get(mId)!;
      item.total++;

      if (e.respuestas && e.respuestas.length > 0) {
        item.sumaExp += e.respuestas.find(r => r.preguntaId === 2)?.valorNumerico || 0;
        item.sumaAtencion += e.respuestas.find(r => r.preguntaId === 3)?.valorNumerico || 0;

        const respRec = e.respuestas.find(r => r.preguntaId === 5);
        if (respRec) {
          const esSi = respRec.opcionId === 1 || 
                       respRec.opcionTexto === 'SI' || 
                       respRec.opcionTexto === 'SÍ' || 
                       respRec.valorTexto === 'SI' || 
                       respRec.valorTexto === 'SÍ';
          if (esSi) {
            item.sumaRec++;
          }
        }
      }
    });

    this.resumenAgencias = Array.from(mapa.values()).map(item => {
      const promedioExp = item.total > 0 ? Number((item.sumaExp / item.total).toFixed(1)) : 0;
      const promedioAtencion = item.total > 0 ? Number((item.sumaAtencion / item.total).toFixed(1)) : 0;
      const porcentajeRec = item.total > 0 ? Math.round((item.sumaRec / item.total) * 100) : 0;

      return {
        id: item.id,
        nombre: item.nombre,
        total: item.total,
        exp: promedioExp,
        atencion: promedioAtencion,
        rec: porcentajeRec
      };
    });

    this.resumenAgencias.sort((a, b) => b.total - a.total);
  }

  crearGraficos(): void {
    this.crearGraficoMarcas();
    this.crearGraficoEstrellas();
  }

  crearGraficoMarcas(): void {
    if (!this.graficoCanvas) return;
    if (this.graficoDona) this.graficoDona.destroy();

    const ctx = this.graficoCanvas.nativeElement.getContext('2d');
    const marcasConConteo = this.marcas.map(m => {
      const total = this.encuestasFiltradas.filter(e => e.marcaId === m.id).length;
      return { nombre: m.nombre, total };
    });

    const coloresDinamicos = marcasConConteo.map((_, index) => 
      this.paletaColoresMarcas[index % this.paletaColoresMarcas.length]
    );

    this.graficoDona = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: marcasConConteo.map(m => m.nombre),
        datasets: [{
          data: marcasConConteo.map(m => m.total),
          backgroundColor: coloresDinamicos,
          borderColor: '#FFFFFF',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { font: { family: 'Inter', size: 12 }, padding: 12, usePointStyle: true } }
        }
      }
    });
  }

  crearGraficoEstrellas(): void {
    if (!this.graficoEstrellasCanvas) return;
    if (this.graficoEstrellas) this.graficoEstrellas.destroy();

    const ctx = this.graficoEstrellasCanvas.nativeElement.getContext('2d');
    const estrellasConteo = [0, 0, 0, 0, 0];

    this.encuestasFiltradas.forEach(e => {
      const exp = e.respuestas?.find(r => r.preguntaId === 2)?.valorNumerico || 0;
      if (exp >= 1 && exp <= 5) {
        estrellasConteo[exp - 1]++;
      }
    });

    this.graficoEstrellas = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'],
        datasets: [{
          label: 'Cantidad de Clientes',
          data: estrellasConteo,
          backgroundColor: ['#DC3545', '#FD7E14', '#FFC107', '#0D6EFD', '#198754'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }

  // HELPERS PARA LA TABLA ENTERPRISE
  obtenerIniciales(nombre: string): string {
    if (!nombre || nombre === '-') return 'CL';
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2) {
      return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
    }
    return partes[0].substring(0, 2).toUpperCase();
  }

  obtenerCalificacionNum(encuesta: Encuesta, preguntaId: number): number {
    return encuesta.respuestas?.find(r => r.preguntaId === preguntaId)?.valorNumerico || 0;
  }

  getRatingClass(val: number): string {
    if (val >= 4.5) return 'high';
    if (val >= 3.5) return 'medium';
    return 'low';
  }

  obtenerRespuestaTexto(encuesta: Encuesta, preguntaId: number): string {
    const resp = encuesta.respuestas?.find(r => r.preguntaId === preguntaId);
    if (!resp) return '-';
    if (resp.valorTexto) return resp.valorTexto;
    if (resp.valorNumerico) return `${resp.valorNumerico} ★`;
    if (resp.opcionId) return resp.opcionId === 1 ? 'SÍ' : 'NO';
    return '-';
  }

  obtenerComentario(encuesta: Encuesta): string {
    const resp = encuesta.respuestas?.find(r => r.preguntaId === 6);
    if (!resp || !resp.valorTexto || resp.valorTexto.trim() === '') {
      return 'Sin comentarios';
    }
    return resp.valorTexto;
  }

  formatFechaRelativa(fecha: Date | string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  exportarPDF(): void {
    if (this.encuestasFiltradas.length === 0) {
      this.notificationService.show('No hay datos QR para exportar', 'warning');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');

    doc.setFontSize(18);
    doc.setTextColor(197, 160, 89);
    doc.text('INMOTION - Reporte General de Encuestas QR', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha de emisión: ${new Date().toLocaleString('es-MX')}`, 14, 28);
    const periodoTexto = this.filtroMesSeleccionado ? `Mes filtrado: ${this.filtroMesSeleccionado}` : 'Período: Histórico General';
    doc.text(`${periodoTexto} | Total Respuestas: ${this.totalRespuestas} | Exp. Promedio: ${this.promedioExperiencia}/5 | Atención: ${this.promedioAtencion}/5 | NPS Score: ${this.npsData.score}`, 14, 34);

    const tableData = this.encuestasFiltradas.map(enc => [
      this.obtenerRespuestaTexto(enc, 1),
      this.obtenerTelefono(enc),
      this.obtenerRespuestaTexto(enc, 2),
      this.obtenerRespuestaTexto(enc, 3),
      this.obtenerRespuestaTexto(enc, 4),
      this.obtenerRespuestaTexto(enc, 5),
      this.obtenerComentario(enc)
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Cliente', 'Teléfono', 'Experiencia', 'Atención', 'Tiempo Ad.', '¿Recomienda?', 'Comentarios']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [197, 160, 89], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    doc.save(`reporte_encuestas_qr_${new Date().toISOString().split('T')[0]}.pdf`);
    this.notificationService.show('PDF generado correctamente', 'success');
  }

  refrescar(): void {
    this.refrescando = true;
    this.cargarEncuestasQr();
    setTimeout(() => {
      this.refrescando = false;
      this.notificationService.show('Datos QR actualizados', 'info');
    }, 800);
  }
}