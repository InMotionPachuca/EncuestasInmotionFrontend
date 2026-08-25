import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { EncuestaService } from '../../services/encuesta.service';
import { Encuesta } from '../../models/encuesta.model';
import { NotificationService } from '../../services/notification.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-listar-encuestas',
  templateUrl: './listar-encuestas.component.html',
  styleUrls: ['./listar-encuestas.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ListarEncuestasComponent implements OnInit {
  pestanaActiva: 'tradicionales' | 'qr' = 'tradicionales';
  Math = Math;

  // --- ARREGLOS ENCUESTAS TRADICIONALES ---
  encuestasTradicionales: Encuesta[] = [];
  encuestasFiltradas: Encuesta[] = [];
  encuestasPaginadas: Encuesta[] = [];

  // FILTROS
  filtroTipo: 'SERVICIO' | 'VENTA' | '' = '';
  filtroTexto: string = '';
  filtroMarca: string = '';
  filtroEstado: string = '';
  filtroMes: string = '';

  // --- PAGINACIÓN ---
  paginaActual: number = 1;
  elementosPorPagina: number = 15;
  totalPaginas: number = 1;

  // --- ARREGLOS ENCUESTAS QR ---
  encuestasQr: Encuesta[] = [];
  encuestasQrFiltradas: Encuesta[] = [];
  filtroTextoQr: string = '';
  filtroMarcaQr: string = '';

  comentariosExpandidos: { [key: number]: boolean } = {};

  marcas: any[] = [];
  loading: boolean = true;
  error: string = '';

  // Modal Plantilla / Detalles
  mostrarDetalles: boolean = false;
  encuestaSeleccionada: Encuesta | null = null;
  plantillaActual: string = '';
  imagenUrl: string = '';

  // Modal Respuestas del Cliente
  mostrarModalRespuestas: boolean = false;

  imagenesMarca: { [key: string]: string } = {
    'subaru': 'assets/whatsapp/subaruPachuca.png',
    'toyota pachuca': 'assets/whatsapp/toyotaPachuca.jpeg',
    'toyota tulancingo': 'assets/whatsapp/toyotaTulancingo.jpeg',
    'carsline': 'assets/whatsapp/carsline.png',
    'gwm': 'assets/whatsapp/gwm.png',
    'comprocars': 'assets/whatsapp/comproCars.png'
  };

  emojis = {
    manosArriba: '🙌🏽',
    auto: '🚗',
    herramienta: '🧰',
    gracias: '☺️',
    bienvenida: '🙌🏽',
    punto: '👉'
  };

  constructor(
    private encuestaService: EncuestaService,
    private router: Router,
    private notificationService: NotificationService
  ) {
    this.marcas = this.encuestaService.obtenerMarcas();
  }

  ngOnInit() {
    this.cargarEncuestas();
  }

  cambiarPestana(pestana: 'tradicionales' | 'qr') {
    this.pestanaActiva = pestana;
  }

  normalizarTexto(texto: string): string {
    return texto ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';
  }

  obtenerNombreMarcaMostrar(nombreOriginal: string): string {
    if (!nombreOriginal) return 'InMotion';
    const limpio = this.normalizarTexto(nombreOriginal);
    if (limpio.includes('gwm')) return 'GWM';
    return nombreOriginal;
  }

  get conteoServicio(): number {
    return this.encuestasTradicionales.filter(e => e.tipo !== 'VENTA').length;
  }

  get conteoVenta(): number {
    return this.encuestasTradicionales.filter(e => e.tipo === 'VENTA').length;
  }

  get encuestasSegunTipo(): Encuesta[] {
    if (!this.filtroTipo) return this.encuestasTradicionales;
    if (this.filtroTipo === 'VENTA') {
      return this.encuestasTradicionales.filter(e => e.tipo === 'VENTA');
    }
    return this.encuestasTradicionales.filter(e => e.tipo !== 'VENTA');
  }

  cargarEncuestas() {
    this.loading = true;
    this.encuestaService.listarEncuestas().subscribe({
      next: (data: Encuesta[]) => {
        const listado = data || [];
        
        const listadoNormalizado = listado.map(e => {
          if (e.marcaNombre && this.normalizarTexto(e.marcaNombre).includes('gwm')) {
            e.marcaNombre = 'GWM';
          }
          return e;
        });

        // 1. Tradicionales
        this.encuestasTradicionales = listadoNormalizado.filter(e => e.tipo !== 'QR' && e.serie !== 'QR-GENERAL');
        
        // 2. QR
        this.encuestasQr = listadoNormalizado.filter(e => e.tipo === 'QR' || e.serie === 'QR-GENERAL');
        this.encuestasQrFiltradas = [...this.encuestasQr];

        this.filtrarEncuestas();
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'Error al cargar las encuestas';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  coincideMarca(marcaEncuesta: string, marcaFiltro: string): boolean {
    if (!marcaFiltro || marcaFiltro.trim() === '') return true;
    if (!marcaEncuesta || marcaEncuesta.trim() === '') return false;

    const m1 = this.normalizarTexto(marcaEncuesta);
    const m2 = this.normalizarTexto(marcaFiltro);

    if (m1 === m2 || m1.includes(m2) || m2.includes(m1)) return true;
    if (m2.includes('gwm') && m1.includes('gwm')) return true;
    if (m2.includes('toyota') && m2.includes('tulancingo') && m1.includes('tulancingo')) return true;

    return false;
  }

  cambiarFiltroTipo(tipo: 'SERVICIO' | 'VENTA' | '') {
    this.filtroTipo = tipo;
    this.filtrarEncuestas();
  }

  seleccionarMarcaRapida(nombreMarca: string) {
    this.filtroMarca = nombreMarca;
    this.filtroMes = '';
    this.filtrarEncuestas();
  }

  obtenerConteoPorMarca(nombreMarca: string): number {
    return this.encuestasSegunTipo.filter(e => this.coincideMarca(e.marcaNombre, nombreMarca)).length;
  }

  filtrarEncuestas() {
    this.encuestasFiltradas = this.encuestasTradicionales.filter(encuesta => {
      let tipoMatch = true;
      if (this.filtroTipo === 'VENTA') {
        tipoMatch = encuesta.tipo === 'VENTA';
      } else if (this.filtroTipo === 'SERVICIO') {
        tipoMatch = encuesta.tipo !== 'VENTA';
      }

      const textoSearch = this.normalizarTexto(this.filtroTexto);
      const telefonoCliente = encuesta.clienteTelefono || encuesta.telefono || '';
      const textoMatch = !this.filtroTexto ||
        this.normalizarTexto(encuesta.clienteNombre).includes(textoSearch) ||
        this.normalizarTexto(encuesta.clienteEmail).includes(textoSearch) ||
        telefonoCliente.includes(this.filtroTexto);

      const marcaMatch = this.coincideMarca(encuesta.marcaNombre, this.filtroMarca);
      const estadoMatch = !this.filtroEstado || encuesta.estado === this.filtroEstado;

      let mesMatch = true;
      if (this.filtroMes && encuesta.fechaEnvio) {
        const fecha = new Date(encuesta.fechaEnvio);
        const mesEncuesta = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        mesMatch = mesEncuesta === this.filtroMes;
      }

      return tipoMatch && textoMatch && marcaMatch && estadoMatch && mesMatch;
    });

    this.paginaActual = 1;
    this.actualizarPaginacion();
  }

  actualizarPaginacion() {
    this.totalPaginas = Math.ceil(this.encuestasFiltradas.length / this.elementosPorPagina) || 1;
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    this.encuestasPaginadas = this.encuestasFiltradas.slice(inicio, fin);
  }

  cambiarPagina(nuevaPagina: number) {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas) {
      this.paginaActual = nuevaPagina;
      this.actualizarPaginacion();
    }
  }

  limpiarFiltros() {
    this.filtroTipo = '';
    this.filtroTexto = '';
    this.filtroMarca = '';
    this.filtroEstado = '';
    this.filtroMes = '';
    this.filtrarEncuestas();
  }

  filtrarEncuestasQr() {
    this.encuestasQrFiltradas = this.encuestasQr.filter(enc => {
      const telefono = this.obtenerTelefono(enc);
      const textoMatch = !this.filtroTextoQr ||
        this.normalizarTexto(enc.clienteNombre).includes(this.normalizarTexto(this.filtroTextoQr)) ||
        telefono.includes(this.filtroTextoQr);

      const marcaMatch = this.coincideMarca(enc.marcaNombre, this.filtroMarcaQr);

      return textoMatch && marcaMatch;
    });
  }

  limpiarFiltrosQr() {
    this.filtroTextoQr = '';
    this.filtroMarcaQr = '';
    this.encuestasQrFiltradas = [...this.encuestasQr];
  }

  toggleComentario(encuestaId?: number): void {
    if (encuestaId === undefined || encuestaId === null) return;
    this.comentariosExpandidos[encuestaId] = !this.comentariosExpandidos[encuestaId];
  }

  isComentarioExpandido(encuestaId?: number): boolean {
    if (encuestaId === undefined || encuestaId === null) return false;
    return !!this.comentariosExpandidos[encuestaId];
  }

  obtenerTelefono(e: Encuesta): string {
    return e.clienteTelefono || e.telefono || 'Sin teléfono';
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
      return '';
    }
    return resp.valorTexto;
  }

  obtenerImagenMarca(nombreMarca: string): string {
    if (!nombreMarca) return 'assets/whatsapp/subaruPachuca.png';
    const nombreLimpio = this.normalizarTexto(nombreMarca);
    
    for (const key of Object.keys(this.imagenesMarca)) {
      if (nombreLimpio.includes(key)) {
        return this.imagenesMarca[key];
      }
    }
    return 'assets/whatsapp/subaruPachuca.png';
  }

  formatearFecha(fechaStr: Date | string): string {
    if (!fechaStr) return 'fecha de visita';
    const fecha = new Date(fechaStr);
    if (!isNaN(fecha.getTime())) {
      return fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return String(fechaStr) || 'fecha de visita';
  }

  generarPlantilla(encuesta: any): string {
    const nombreCliente = encuesta.clienteNombre || 'Cliente';
    const nombreAsesor = encuesta.asesor || 'Asesor de Servicio';
    const nombreMarca = this.obtenerNombreMarcaMostrar(encuesta.marcaNombre);

    const unidadReal = (encuesta.unidad && encuesta.unidad.toString().trim() !== '') 
      ? encuesta.unidad.toString().trim() 
      : 'vehículo';

    const fechaVisita = encuesta.fechaEnvio ? this.formatearFecha(encuesta.fechaEnvio) : 'fecha de visita';
    const link = this.generarLink(encuesta.token);

    let plantilla = '';

    if (encuesta.tipo === 'VENTA') {
      plantilla += 'Buen día, Sr./Srita. *' + nombreCliente + '*.\n';
      plantilla += 'Mi nombre es *Cecilia Juárez* y formo parte del área de Satisfacción a Clientes de *' + nombreMarca + '* ' + this.emojis.manosArriba + '.\n';
      plantilla += 'Agradecemos sinceramente el tiempo que nos brindó al visitarnos. Fue un placer atenderle y acompañarle durante la adquisición de su *' + unidadReal + '*.\n';
      plantilla += 'Nos gustaría conocer su opinión sobre la atención recibida tanto por parte de nuestra agencia como de su asesor *' + nombreAsesor + '*. Por ello, le invitamos a responder nuestra encuesta de satisfacción, la cual le tomará solo unos minutos.\n';
      plantilla += 'Para participar, por favor haga clic en el siguiente enlace:\n';
      plantilla += this.emojis.punto + ' ' + link + '\n';
      plantilla += 'Muchas gracias por su tiempo y confianza.\n';
      plantilla += '¡Le damos la más cordial bienvenida a la familia *' + nombreMarca + '*! ' + this.emojis.bienvenida + ' ' + this.emojis.auto;
    } else {
      plantilla += 'Buen día, Sr./Srita. *' + nombreCliente + '*.\n';
      plantilla += 'Mi nombre es *Cecilia Juárez* de Satisfacción a Clientes de *' + nombreMarca + '* ' + this.emojis.manosArriba + '.\n';
      plantilla += 'Agradecemos sinceramente el tiempo que nos brindó al visitarnos en nuestra agencia, fue un gusto atenderle y acompañarle durante su estancia.\n';
      plantilla += 'Nos gustaría conocer su opinión respecto al servicio realizado a su *' + unidadReal + '* el día *' + fechaVisita + '* ' + this.emojis.auto + this.emojis.herramienta + '.\n';
      plantilla += 'Lo invitamos a responder nuestra encuesta de satisfacción; le tomará solo unos minutos.\n\n';
      plantilla += 'Por favor, haz clic en el siguiente enlace para participar:\n';
      plantilla += this.emojis.punto + ' ' + link + '\n';
      plantilla += '¡Muchas gracias por su tiempo! ' + this.emojis.gracias + ' ' + this.emojis.auto;
    }

    return plantilla;
  }

  verDetallesYPlantilla(encuesta: Encuesta) {
    this.encuestaSeleccionada = encuesta;
    this.plantillaActual = this.generarPlantilla(encuesta);
    this.imagenUrl = this.obtenerImagenMarca(encuesta.marcaNombre || 'Subaru');
    this.mostrarDetalles = true;
  }

  cerrarDetalles() {
    this.mostrarDetalles = false;
    this.encuestaSeleccionada = null;
    this.plantillaActual = '';
  }

  // --- MÉTODOS PARA EL NUEVO MODAL DE RESPUESTAS DEL CLIENTE ---
  verRespuestasCliente(encuesta: Encuesta) {
    this.encuestaSeleccionada = encuesta;
    this.mostrarModalRespuestas = true;
  }

  cerrarModalRespuestas() {
    this.mostrarModalRespuestas = false;
    this.encuestaSeleccionada = null;
  }

  copiarPlantilla(plantilla: string) {
    navigator.clipboard.writeText(plantilla);
    this.notificationService.show('Plantilla de texto copiada al portapapeles', 'success');
  }

  async copiarImagen(imagenUrl: string) {
    try {
      const imageBlob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => blob ? resolve(blob) : reject('Error'), 'image/png');
          } else { reject('Error ctx'); }
        };
        img.onerror = (err) => reject(err);
        img.src = imagenUrl;
      });

      const clipboardItem = new ClipboardItem({ 'image/png': imageBlob });
      await navigator.clipboard.write([clipboardItem]);
      this.notificationService.show('Imagen copiada. Lista para pegar en WhatsApp', 'success');
    } catch (error) {
      this.notificationService.show('No se pudo copiar la imagen al portapapeles', 'error');
    }
  }

  eliminarEncuesta(encuesta: Encuesta) {
    if (!encuesta.id) return;
    if (confirm('¿Estas seguro de eliminar la encuesta de ' + encuesta.clienteNombre + '?')) {
      this.encuestaService.eliminarEncuesta(encuesta.id).subscribe({
        next: () => {
          this.notificationService.show('Encuesta eliminada correctamente', 'success');
          this.cargarEncuestas();
        },
        error: () => this.notificationService.show('Error al eliminar la encuesta', 'error')
      });
    }
  }

  eliminarEncuestaQr(encuesta: Encuesta) {
    if (!encuesta.id) return;
    const nombreCliente = this.obtenerRespuestaTexto(encuesta, 1);
    
    if (confirm(`¿Estás seguro de eliminar la encuesta QR de ${nombreCliente}? Esta acción no se puede deshacer.`)) {
      this.encuestaService.eliminarEncuesta(encuesta.id).subscribe({
        next: () => {
          this.notificationService.show(`Encuesta QR de ${nombreCliente} eliminada correctamente`, 'success');
          this.cargarEncuestas();
        },
        error: (error) => {
          console.error('Error al eliminar QR:', error);
          this.notificationService.show('Error al eliminar la encuesta QR', 'error');
        }
      });
    }
  }

  exportarExcel() {
    if (this.encuestasFiltradas.length === 0) {
      this.notificationService.show('No hay encuestas para exportar', 'warning');
      return;
    }

    const data = this.encuestasFiltradas.map(e => ({
      'Cliente': e.clienteNombre,
      'Área': e.tipo === 'VENTA' ? 'Ventas' : 'Postventa',
      'Email': e.clienteEmail,
      'Telefono': e.clienteTelefono || e.telefono || 'Sin teléfono',
      'Asesor': e.asesor || '',
      'Marca': this.obtenerNombreMarcaMostrar(e.marcaNombre),
      'Estado': this.getEstadoTexto(e.estado),
      'Fecha Envio': e.fechaEnvio ? new Date(e.fechaEnvio).toLocaleString('es-MX') : '',
      'Token': e.token,
      'Link': this.generarLink(e.token)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Encuestas_Servicio_Venta');
    XLSX.writeFile(wb, 'encuestas_' + (this.filtroTipo || 'general') + '_' + new Date().toISOString().split('T')[0] + '.xlsx');
    this.notificationService.show('Encuestas exportadas correctamente', 'success');
  }

  exportarExcelQr() {
    if (this.encuestasQrFiltradas.length === 0) {
      this.notificationService.show('No hay datos QR para exportar', 'warning');
      return;
    }

    const data = this.encuestasQrFiltradas.map(e => ({
      'Cliente': this.obtenerRespuestaTexto(e, 1),
      'Teléfono': this.obtenerTelefono(e),
      'Agencia': e.marcaNombre,
      'Fecha': this.formatFecha(e.fechaRespuesta || e.fechaEnvio),
      'Experiencia (★)': this.obtenerRespuestaTexto(e, 2),
      'Atención (★)': this.obtenerRespuestaTexto(e, 3),
      'Tiempo Adecuado': this.obtenerRespuestaTexto(e, 4),
      '¿Recomienda?': this.obtenerRespuestaTexto(e, 5),
      'Comentarios': this.obtenerComentario(e) || 'Sin comentarios'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Encuestas_QR');
    XLSX.writeFile(wb, 'encuestas_qr_' + new Date().toISOString().split('T')[0] + '.xlsx');
    this.notificationService.show('Archivo de encuestas QR exportado correctamente', 'success');
  }

  getEstadoClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'ENVIADA': 'badge-enviada',
      'RESPONDIDA': 'badge-respondida',
      'EXPIRADA': 'badge-expirada'
    };
    return classes[estado] || '';
  }

  getEstadoTexto(estado: string): string {
    const textos: { [key: string]: string } = {
      'ENVIADA': 'Enviada',
      'RESPONDIDA': 'Respondida',
      'EXPIRADA': 'Expirada'
    };
    return textos[estado] || estado;
  }

  formatFecha(fecha: Date | string): string {
    if (!fecha) return '-';
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  generarLink(token: string): string {
    return this.encuestaService.generarLinkEncuesta(token);
  }

  copiarLink(token: string, clienteNombre: string) {
    const link = this.generarLink(token);
    navigator.clipboard.writeText(link).then(() => {
      this.notificationService.show('Link copiado para ' + clienteNombre, 'success');
    });
  }
}