import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
import { firstValueFrom } from 'rxjs';
import { EncuestaService } from '../../services/encuesta.service';
import { PlantillaService } from '../../services/plantilla.service';
import { ClienteImportacionExcel } from '../../models/encuesta.model';

@Component({
  selector: 'app-importar-encuestas',
  templateUrl: './importar-encuestas.component.html',
  styleUrls: ['./importar-encuestas.component.css']
})
export class ImportarEncuestasComponent {
  archivoSeleccionado: File | null = null;
  datosExcel: ClienteImportacionExcel[] = [];
  loading = false;
  procesando = false;
  encuestasGeneradas: any[] = [];
  errores: string[] = [];
  mostrarResultados = false;
  totalRegistros = 0;
  exitosos = 0;
  fallidos = 0;
  mensajeToast = '';
  tipoToast = '';
  tipoPlantilla: 'POSTVENTA' | 'VENTA' | 'COMPRA' = 'POSTVENTA';
  mostrarSelectorPlantilla = false;
  esSegmentoComprasDetectado = false;
  isDragging = false;
  copiadoTokens: { [key: string]: boolean } = {};
  copiadoPlantillaIdx: number | null = null;

  constructor(
    private encuestaService: EncuestaService,
    public plantillaService: PlantillaService
  ) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.archivoSeleccionado = event.dataTransfer.files[0];
      this.procesarArchivo();
    }
  }

  onFileChange(event: any) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.archivoSeleccionado = target.files[0];
      this.procesarArchivo();
    }
  }

  mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'warning' | 'info') {
    this.mensajeToast = mensaje;
    this.tipoToast = tipo;
    setTimeout(() => { this.mensajeToast = ''; }, 4000);
  }

  get totalSeleccionados(): number {
    return this.datosExcel.filter(d => d.seleccionado).length;
  }

  get todosSeleccionados(): boolean {
    return this.datosExcel.length > 0 && this.datosExcel.every(d => d.seleccionado);
  }

  toggleSeleccionarTodos() {
    const nuevoEstado = !this.todosSeleccionados;
    this.datosExcel.forEach(d => {
      if (!d.procesado) {
        d.seleccionado = nuevoEstado;
      }
    });
  }

  seleccionarTodos() {
    this.datosExcel.forEach(d => {
      if (!d.procesado) d.seleccionado = true;
    });
  }

  invertirSeleccion() {
    this.datosExcel.forEach(d => {
      if (!d.procesado) d.seleccionado = !d.seleccionado;
    });
  }

  deseleccionarSinTelefono() {
    let descartados = 0;
    this.datosExcel.forEach(d => {
      const tel = (d.telefono || '').replace(/\D/g, '');
      if (tel.length < 10) {
        d.seleccionado = false;
        descartados++;
      }
    });
    this.mostrarMensaje(`Se desmarcaron ${descartados} registros sin teléfono válido de 10 dígitos`, 'info');
  }

  obtenerMarcaId(nombreMarca: string, esCompras: boolean = false): number {
    if (!nombreMarca) return esCompras ? 7 : 2;
    const limpio = this.plantillaService.normalizarTexto(nombreMarca);

    if (esCompras) {
      if (limpio.includes('queretaro') || limpio.includes('qro')) return 6; // ComproCars Querétaro
      return 7; // ComproCars Pachuca por defecto
    }

    if (limpio.includes('toyota') && limpio.includes('tulancingo')) return 8;
    if (limpio.includes('toyota')) return 1;
    if (limpio.includes('carsline') && (limpio.includes('queretaro') || limpio.includes('qro'))) return 3;
    if (limpio.includes('carsline')) return 2;
    if (limpio.includes('gwm')) return 4;
    if (limpio.includes('subaru')) return 5;
    if (limpio.includes('compro') && (limpio.includes('queretaro') || limpio.includes('qro'))) return 6;
    if (limpio.includes('compro')) return 7;

    return 2;
  }

  normalizarNombreMarcaOficial(nombreMarcaRaw: string, esCompras: boolean = false): string {
    const limpio = this.plantillaService.normalizarTexto(nombreMarcaRaw);

    if (esCompras) {
      if (limpio.includes('queretaro') || limpio.includes('qro')) return 'ComproCars Querétaro';
      return 'ComproCars Pachuca';
    }

    if (limpio.includes('toyota') && limpio.includes('tulancingo')) return 'Toyota Tulancingo';
    if (limpio.includes('toyota')) return 'Toyota Pachuca';
    if (limpio.includes('carsline') && (limpio.includes('queretaro') || limpio.includes('qro'))) return 'Carsline Querétaro';
    if (limpio.includes('carsline')) return 'Carsline Pachuca';
    if (limpio.includes('gwm')) return 'GWM';
    if (limpio.includes('subaru')) return 'Subaru';
    if (limpio.includes('compro') && (limpio.includes('queretaro') || limpio.includes('qro'))) return 'ComproCars Querétaro';
    if (limpio.includes('compro')) return 'ComproCars Pachuca';

    return 'Carsline Pachuca';
  }

  procesarArchivo() {
    if (!this.archivoSeleccionado) {
      this.mostrarMensaje('Seleccione un archivo Excel', 'warning');
      return;
    }

    this.loading = true;
    this.errores = [];
    this.datosExcel = [];
    this.encuestasGeneradas = [];

    const nombreArchivo = this.archivoSeleccionado.name.toLowerCase();
    const esComprasPorNombre = nombreArchivo.includes('comprocars') || nombreArchivo.includes('compro');

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) {
          this.loading = false;
          this.mostrarMensaje('El archivo cargado está vacío', 'warning');
          return;
        }

        // Detectar si alguna columna corresponde a COMPRA
        let tieneColumnaCompras = false;
        const primerFila: any = jsonData[0] || {};
        for (const k in primerFila) {
          const kNorm = this.plantillaService.normalizarTexto(k);
          if (kNorm.includes('fecha de compra') || kNorm.includes('asesor compra') || kNorm.includes('comprocars')) {
            tieneColumnaCompras = true;
            break;
          }
        }

        this.esSegmentoComprasDetectado = esComprasPorNombre || tieneColumnaCompras;
        if (this.esSegmentoComprasDetectado) {
          this.tipoPlantilla = 'COMPRA';
        } else {
          this.tipoPlantilla = 'POSTVENTA';
        }

        jsonData.forEach((rowRaw: any, index: number) => {
          // Normalizar las claves eliminando espacios residuales, tildes y a mayúsculas
          const row: any = {};
          for (const key in rowRaw) {
            if (Object.prototype.hasOwnProperty.call(rowRaw, key)) {
              const cleanKey = key.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              row[cleanKey] = rowRaw[key];
            }
          }

          // 1. FECHA DE OPERACIÓN
          let fechaRaw = '';
          const posiblesNombresFecha = [
            'FECHA DE COMPRA',
            'FECHA DE FACTURACION',
            'FECHA DE FACTURACIÓN',
            'FECHA ORDEN',
            'FECHA',
            'FECHA ENTREGA',
            'FECHA VENTA',
            'A'
          ];
          for (const nombre of posiblesNombresFecha) {
            if (row[nombre] !== undefined && row[nombre] !== null && String(row[nombre]).trim() !== '') {
              fechaRaw = row[nombre];
              break;
            }
          }
          if (!fechaRaw) {
            const values = Object.values(row);
            if (values.length > 0 && values[0]) fechaRaw = String(values[0]);
          }
          const fechaFormateada = this.plantillaService.normalizarFecha(fechaRaw);

          // 2. NÚMERO DE ORDEN / FACTURA
          const noFactura = row['NO. FACTURA'] || row['# ORDEN'] || row['NO FACTURA'] || row['ORDEN'] || row['B'] || '';
          const tipo = row['ALTA/BAJA'] || row['TIPO'] || row['C'] || '';
          const serie = row['SERIE'] || row['D'] || '';

          // 3. SUCURSAL / MARCA
          const marcaNombreRaw = row['SUCURSAL'] || row['MARCA'] || row['AGENCIA'] || '';
          const marcaNombreOficial = this.normalizarNombreMarcaOficial(
            marcaNombreRaw ? String(marcaNombreRaw).trim() : '',
            this.esSegmentoComprasDetectado
          );
          const marcaId = this.obtenerMarcaId(marcaNombreOficial, this.esSegmentoComprasDetectado);

          // 4. UNIDAD Y AÑO
          const unidad = row['UNIDAD'] || row['VEHICULO'] || row['MODELO'] || row['AUTO'] || row['E'] || '';
          const anio = row['ANO'] || row['ANIO'] || row['AÑO'] || row['F'] || '';

          // 5. ASESOR
          let asesor = '';
          if (this.esSegmentoComprasDetectado && (row['ASESOR COMPRAS'] || row['ASESOR COMPRA'])) {
            asesor = row['ASESOR COMPRAS'] || row['ASESOR COMPRA'];
          } else {
            asesor = row['ASESOR COMPRAS'] || row['ASESOR'] || row['ADV'] || row['ASESOR DE SERVICIO'] || row['EJECUTIVO'] || row['VENDEDOR'] || row['G'] || '';
          }
          const asesorFinal = asesor ? String(asesor).trim() : (this.esSegmentoComprasDetectado ? 'Asesor de Compras' : 'Asesor de Servicio');

          // 6. CLIENTE, TELÉFONO Y CORREO
          const nombreCliente = row['NOMBRE CLIENTE'] || row['CLIENTE'] || row['NOMBRE'] || row['TITULAR'] || row['PROPIETARIO'] || row['H'] || '';
          const telefonoRaw = row['TELEFONO 1'] || row['TELEFONO'] || row['TELEFONO2'] || row['CELULAR'] || row['MOVIL'] || row['TEL'] || row['I'] || '';
          const email = row['CORREO ELECTRONICO'] || row['CORREO'] || row['EMAIL'] || '';

          if (nombreCliente && String(nombreCliente).trim()) {
            this.datosExcel.push({
              index: index + 1,
              seleccionado: true,
              fecha: fechaFormateada,
              noFactura: noFactura ? String(noFactura).trim() : '',
              tipoOperativo: tipo ? String(tipo).trim() : '',
              serie: serie ? String(serie).trim() : '',
              unidad: unidad ? String(unidad).trim() : '',
              anio: anio ? String(anio).trim() : '',
              asesor: asesorFinal,
              marcaNombre: marcaNombreOficial,
              marcaId: marcaId,
              nombreCliente: String(nombreCliente).trim(),
              telefono: telefonoRaw ? String(telefonoRaw).trim() : '',
              email: email ? String(email).trim() : 'sin_correo@inmotion.com',
              procesado: false,
              exito: false,
              error: ''
            });
          }
        });

        this.totalRegistros = this.datosExcel.length;
        this.mostrarResultados = true;
        this.loading = false;
        if (this.totalRegistros > 0) this.mostrarSelectorPlantilla = true;

        const infoSegmento = this.esSegmentoComprasDetectado ? ' (Detectado Segmento Compras / ComproCars)' : '';
        this.mostrarMensaje(`Se cargaron ${this.totalRegistros} clientes listos para verificar${infoSegmento}`, 'info');
      } catch (error) {
        this.loading = false;
        console.error('Error al procesar archivo:', error);
        this.mostrarMensaje('Error al leer el archivo Excel', 'error');
      }
    };
    reader.readAsArrayBuffer(this.archivoSeleccionado);
  }

  cambiarPlantilla(tipo: 'POSTVENTA' | 'VENTA' | 'COMPRA') {
    this.tipoPlantilla = tipo;
  }

  /**
   * PROCESAMIENTO ASÍNCRONO EN LOTES (Chunks de 15 registros en paralelo)
   */
  async generarEncuestas() {
    const pendientes = this.datosExcel.filter(d => d.seleccionado && !d.procesado);
    if (pendientes.length === 0) {
      this.mostrarMensaje('No hay registros seleccionados pendientes por procesar', 'warning');
      return;
    }

    this.procesando = true;
    this.exitosos = 0;
    this.fallidos = 0;
    const chunkSize = 15;

    for (let i = 0; i < pendientes.length; i += chunkSize) {
      const chunk = pendientes.slice(i, i + chunkSize);
      await Promise.all(chunk.map(cliente => this.procesarUnCliente(cliente)));
    }

    this.procesando = false;
    this.mostrarMensaje(`Proceso completado. ${this.exitosos} encuestas generadas con éxito, ${this.fallidos} con error`, 'success');
  }

  private async procesarUnCliente(cliente: ClienteImportacionExcel): Promise<void> {
    const partes = (cliente.nombreCliente || 'Cliente').trim().split(' ');
    const nombre = partes[0] || 'Cliente';
    const apellido = partes.slice(1).join(' ') || 'General';

    const modelo = (cliente.unidad && cliente.unidad.trim() !== '') ? cliente.unidad.trim() : '';
    const anio = cliente.anio ? ` ${cliente.anio}`.trim() : '';
    const unidadCompleta = `${modelo} ${anio}`.trim();

    const dataPayload = {
      nombre: nombre,
      apellido: apellido,
      email: cliente.email || 'sin_correo@inmotion.com',
      telefono: this.plantillaService.limpiarTelefono(cliente.telefono),
      serie: cliente.serie || 'SN',
      asesor: cliente.asesor || 'Atención a Clientes',
      unidad: unidadCompleta,
      marcaId: cliente.marcaId,
      tipo: this.tipoPlantilla,
      fechaVisita: cliente.fecha,
      respuestas: []
    };

    try {
      const response: any = await firstValueFrom(this.encuestaService.crearEncuesta(dataPayload));
      cliente.procesado = true;
      cliente.exito = true;
      this.exitosos++;

      const link = this.encuestaService.generarLinkEncuesta(response.token);
      const plantillaTexto = this.plantillaService.generarPlantilla(cliente, link, this.tipoPlantilla);
      const imagenUrl = this.plantillaService.obtenerImagenMarca(cliente.marcaNombre);

      this.encuestasGeneradas.push({
        id: response.id,
        cliente: cliente.nombreCliente,
        telefono: cliente.telefono,
        marca: cliente.marcaNombre,
        unidad: cliente.unidad,
        anio: cliente.anio,
        token: response.token,
        link: link,
        plantilla: plantillaTexto,
        mostrarPlantilla: false,
        imagenUrl: imagenUrl
      });
    } catch (err) {
      cliente.procesado = true;
      cliente.exito = false;
      cliente.error = 'Error en servidor';
      this.fallidos++;
    }
  }

  abrirWhatsAppDirecto(item: any) {
    const url = this.plantillaService.sanitizarUrlWhatsApp(item.telefono, item.plantilla);
    window.open(url, '_blank');
    if (item.id) {
      this.encuestaService.registrarEnvioWhatsapp(item.id).subscribe({
        next: () => {},
        error: () => {}
      });
    }
  }

  copiarLink(token: string) {
    navigator.clipboard.writeText(this.encuestaService.generarLinkEncuesta(token));
    this.copiadoTokens[token] = true;
    this.mostrarMensaje('Enlace copiado al portapapeles', 'success');
    setTimeout(() => {
      this.copiadoTokens[token] = false;
    }, 2000);
  }

  copiarPlantilla(plantilla: string, index?: number) {
    navigator.clipboard.writeText(plantilla);
    if (index !== undefined) {
      this.copiadoPlantillaIdx = index;
      setTimeout(() => {
        this.copiadoPlantillaIdx = null;
      }, 2000);
    }
    this.mostrarMensaje('Plantilla copiada. Lista para enviar en WhatsApp', 'success');
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
          } else reject('Ctx error');
        };
        img.onerror = (err) => reject(err);
        img.src = imagenUrl;
      });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': imageBlob })]);
      this.mostrarMensaje('Imagen copiada. Lista para pegar en WhatsApp', 'success');
    } catch {
      this.mostrarMensaje('No se pudo copiar la imagen al portapapeles', 'error');
    }
  }

  copiarTodosLosLinks() {
    navigator.clipboard.writeText(this.encuestasGeneradas.map(e => e.link).join('\n'));
    this.mostrarMensaje('Todos los links copiados', 'success');
  }

  limpiar() {
    this.archivoSeleccionado = null;
    this.datosExcel = [];
    this.encuestasGeneradas = [];
    this.mostrarResultados = false;
    this.totalRegistros = 0;
    this.exitosos = 0;
    this.fallidos = 0;
  }

  descargarReporte() {
    if (this.encuestasGeneradas.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(this.encuestasGeneradas.map(e => ({
      'Cliente': e.cliente,
      'Teléfono': e.telefono,
      'Marca': e.marca,
      'Unidad': e.unidad,
      'Año': e.anio,
      'Link': e.link
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `reporte_encuestas_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}