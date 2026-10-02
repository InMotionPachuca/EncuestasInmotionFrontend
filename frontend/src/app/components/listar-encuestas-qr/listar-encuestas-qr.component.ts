import { Component, OnInit } from '@angular/core';
import { EncuestaService } from '../../services/encuesta.service';
import { Encuesta } from '../../models/encuesta.model';
import { NotificationService } from '../../services/notification.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-listar-encuestas-qr',
  templateUrl: './listar-encuestas-qr.component.html',
  styleUrls: ['./listar-encuestas-qr.component.css']
})
export class ListarEncuestasQrComponent implements OnInit {
  encuestas: Encuesta[] = [];
  encuestasFiltradas: Encuesta[] = [];
  marcas: any[] = [];
  loading: boolean = true;
  error: string = '';

  filtroTexto: string = '';
  filtroMarca: string = '';

  constructor(
    private encuestaService: EncuestaService,
    private notificationService: NotificationService
  ) {
    this.marcas = this.encuestaService.obtenerMarcas();
  }

  ngOnInit() {
    this.cargarEncuestasQr();
  }

  cargarEncuestasQr() {
    this.loading = true;
    this.encuestaService.listarEncuestas().subscribe({
      next: (data: Encuesta[]) => {
        // Exclusivo Encuestas QR
        const soloQr = (data || []).filter(e => e.tipo === 'QR' || e.serie === 'QR-GENERAL');
        this.encuestas = soloQr;
        this.encuestasFiltradas = soloQr;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar encuestas QR';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  obtenerTelefono(e: Encuesta): string {
    const enc = e as any;
    return enc.clienteTelefono || enc.telefono || 'Sin teléfono';
  }

  filtrarEncuestas() {
    this.encuestasFiltradas = this.encuestas.filter(e => {
      const telefono = this.obtenerTelefono(e);
      const matchTexto = !this.filtroTexto || 
        (e.clienteNombre && e.clienteNombre.toLowerCase().includes(this.filtroTexto.toLowerCase())) ||
        (telefono && telefono.includes(this.filtroTexto));
      const matchMarca = !this.filtroMarca || e.marcaNombre === this.filtroMarca;
      return matchTexto && matchMarca;
    });
  }

  limpiarFiltros() {
    this.filtroTexto = '';
    this.filtroMarca = '';
    this.encuestasFiltradas = this.encuestas;
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

  formatFecha(fecha: Date | string): string {
    if (!fecha) return '-';
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  exportarExcel() {
    if (this.encuestasFiltradas.length === 0) {
      this.notificationService.show('No hay datos QR para exportar', 'warning');
      return;
    }

    const data = this.encuestasFiltradas.map(e => ({
      'Cliente': this.obtenerRespuestaTexto(e, 1),
      'Teléfono': this.obtenerTelefono(e),
      'Agencia / Marca': e.marcaNombre,
      'Fecha': this.formatFecha(e.fechaRespuesta || e.fechaEnvio),
      'Experiencia (★)': this.obtenerRespuestaTexto(e, 2),
      'Atención (★)': this.obtenerRespuestaTexto(e, 3),
      'Tiempo Adecuado': this.obtenerRespuestaTexto(e, 4),
      '¿Recomienda?': this.obtenerRespuestaTexto(e, 5),
      'Comentarios / Sugerencias': this.obtenerComentario(e)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Encuestas_QR');
    XLSX.writeFile(wb, `encuestas_qr_${new Date().toISOString().split('T')[0]}.xlsx`);
    this.notificationService.show('Archivo de encuestas QR exportado correctamente', 'success');
  }
}