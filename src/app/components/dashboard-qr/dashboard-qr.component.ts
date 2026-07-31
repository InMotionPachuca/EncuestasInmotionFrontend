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

  encuestasQr: Encuesta[] = [];
  encuestasFiltradas: Encuesta[] = [];
  marcas: any[] = [];
  loading: boolean = true;
  refrescando: boolean = false;

  filtroMarca: string = '';

  totalRespuestas: number = 0;
  promedioExperiencia: number = 0;
  promedioAtencion: number = 0;
  porcentajeRecomienda: number = 0;

  private grafico: Chart | null = null;

  // Paleta de colores sobrios e institucionales en armonía con la página
  private paletaColoresMarcas: string[] = [
    '#C5A059', // Dorado Principal (Toyota / General)
    '#2E7D32', // Verde Esmeralda Sobrio
    '#1565C0', // Azul Cobalto Premium
    '#A88344', // Cobre / Bronce Dorado
    '#EB0A1E', // Rojo Institucional Accent
    '#4A4A4A', // Gris Plomo Metálico
    '#7B1FA2', // Púrpura Imperial Sobrio
    '#D4AF37'  // Dorado Champán
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
    setTimeout(() => this.crearGrafico(), 500);
  }

  cargarEncuestasQr(): void {
    this.loading = true;
    this.encuestaService.listarEncuestas().subscribe({
      next: (data: Encuesta[]) => {
        this.encuestasQr = (data || []).filter(e => e.tipo === 'QR' || e.serie === 'QR-GENERAL');
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener encuestas QR:', err);
        this.loading = false;
      }
    });
  }

  aplicarFiltros(): void {
    this.encuestasFiltradas = this.encuestasQr.filter(enc => {
      const matchMarca = !this.filtroMarca || enc.marcaId?.toString() === this.filtroMarca;
      return matchMarca;
    });

    this.calcularMetricasQr();
    this.crearGrafico();
  }

  calcularMetricasQr(): void {
    this.totalRespuestas = this.encuestasFiltradas.length;
    if (this.totalRespuestas === 0) {
      this.promedioExperiencia = 0;
      this.promedioAtencion = 0;
      this.porcentajeRecomienda = 0;
      return;
    }

    let sumaExp = 0;
    let sumaAtencion = 0;
    let sumaRecomienda = 0;

    this.encuestasFiltradas.forEach(e => {
      if (e.respuestas) {
        const exp = e.respuestas.find(r => r.preguntaId === 2)?.valorNumerico || 0;
        const atencion = e.respuestas.find(r => r.preguntaId === 3)?.valorNumerico || 0;
        const rec = e.respuestas.find(r => r.preguntaId === 4)?.opcionId === 1;

        sumaExp += exp;
        sumaAtencion += atencion;
        if (rec) sumaRecomienda++;
      }
    });

    this.promedioExperiencia = Number((sumaExp / this.totalRespuestas).toFixed(1));
    this.promedioAtencion = Number((sumaAtencion / this.totalRespuestas).toFixed(1));
    this.porcentajeRecomienda = Math.round((sumaRecomienda / this.totalRespuestas) * 100);
  }

  crearGrafico(): void {
    if (!this.graficoCanvas) return;
    if (this.grafico) this.grafico.destroy();

    const ctx = this.graficoCanvas.nativeElement.getContext('2d');
    const marcasConConteo = this.marcas.map(m => {
      const total = this.encuestasQr.filter(e => e.marcaId === m.id).length;
      return { nombre: m.nombre, total };
    });

    // Asignamos a cada marca un color único de la paleta institucional
    const coloresDinamicos = marcasConConteo.map((_, index) => 
      this.paletaColoresMarcas[index % this.paletaColoresMarcas.length]
    );

    this.grafico = new Chart(ctx, {
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
          legend: { 
            position: 'right',
            labels: {
              font: { family: 'Inter', size: 12, weight: 500 },
              padding: 14,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(31, 31, 31, 0.9)',
            titleFont: { size: 13, weight: 600 },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8
          }
        }
      }
    });
  }

  obtenerRespuestaTexto(encuesta: Encuesta, preguntaId: number): string {
    const resp = encuesta.respuestas?.find(r => r.preguntaId === preguntaId);
    if (!resp) return '-';
    if (resp.valorTexto) return resp.valorTexto;
    if (resp.valorNumerico) return `${resp.valorNumerico} ★`;
    if (resp.opcionId) return resp.opcionId === 1 ? 'SÍ' : 'NO';
    return '-';
  }

  exportarPDF(): void {
    if (this.encuestasFiltradas.length === 0) {
      this.notificationService.show('No hay datos QR para exportar', 'warning');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');

    doc.setFontSize(18);
    doc.setTextColor(197, 160, 89); // Color Dorado #C5A059
    doc.text('INMOTION - Reporte General de Encuestas QR', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha de emisión: ${new Date().toLocaleString('es-MX')}`, 14, 28);
    doc.text(`Total Respuestas: ${this.totalRespuestas} | Exp. Promedio: ${this.promedioExperiencia}/5 | Atención: ${this.promedioAtencion}/5 | % Recomienda: ${this.porcentajeRecomienda}%`, 14, 34);

    const tableData = this.encuestasFiltradas.map(enc => [
      this.obtenerRespuestaTexto(enc, 1),
      enc.telefono || 'Sin teléfono',
      this.obtenerRespuestaTexto(enc, 2),
      this.obtenerRespuestaTexto(enc, 3),
      this.obtenerRespuestaTexto(enc, 4),
      this.obtenerRespuestaTexto(enc, 5)
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Cliente', 'Teléfono', 'Experiencia', 'Atención', '¿Recomienda?', 'Comentarios']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [197, 160, 89],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 'auto' }
      }
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