import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
import { EncuestaService } from '../../services/encuesta.service';

@Component({
  selector: 'app-importar-encuestas',
  templateUrl: './importar-encuestas.component.html',
  styleUrls: ['./importar-encuestas.component.css']
})
export class ImportarEncuestasComponent {
  archivoSeleccionado: File | null = null;
  datosExcel: any[] = [];
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
  tipoPlantilla: 'POSTVENTA' | 'VENTA' = 'POSTVENTA';
  mostrarSelectorPlantilla = false;

  // MAPEO CORREGIDO SEGÚN IDS DE BASE DE DATOS
  marcasMap: { [key: string]: number } = {
    'toyota pachuca': 1,
    'toyota tulancingo': 2,
    'carsline pachuca': 3,
    'carsline queretaro': 4,
    'subaru': 5,
    'subaru pachuca': 5,
    'gwm celaya': 6,
    'gwm queretaro': 6,
    'gwm': 6,
    'comprocars queretaro': 7,
    'compro pachuca': 8,
    'comprocars pachuca': 8
  };

  imagenesMarca: { [key: string]: string } = {
    'Toyota Pachuca': 'assets/whatsapp/toyotaPachuca.jpeg',
    'Toyota Tulancingo': 'assets/whatsapp/toyotaTulancingo.jpeg',
    'Carsline Pachuca': 'assets/whatsapp/carsline.png',
    'Carsline Querétaro': 'assets/whatsapp/carsline.png',
    'Subaru': 'assets/whatsapp/subaruPachuca.png',
    'GWM Celaya': 'assets/whatsapp/gwm.png',
    'ComproCars Querétaro': 'assets/whatsapp/comproCars.png',
    'ComproCars Pachuca': 'assets/whatsapp/comproCars.png'
  };

  emojis = {
    manosArriba: '🙌🏽',
    auto: '🚗',
    herramienta: '🧰',
    gracias: '☺️',
    bienvenida: '🙌🏽',
    estrella: '⭐',
    punto: '👉'
  };

  constructor(private encuestaService: EncuestaService) {}

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
    setTimeout(() => {
      this.mensajeToast = '';
    }, 4000);
  }

  normalizarTexto(texto: string): string {
    return texto ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';
  }

  normalizarNombreMarcaOficial(nombreMarcaRaw: string): string {
    if (!nombreMarcaRaw) return 'Carsline Pachuca';
    const limpio = this.normalizarTexto(nombreMarcaRaw);

    if (limpio.includes('toyota') && limpio.includes('tulancingo')) return 'Toyota Tulancingo';
    if (limpio.includes('toyota')) return 'Toyota Pachuca';
    if (limpio.includes('carsline') && limpio.includes('queretaro')) return 'Carsline Querétaro';
    if (limpio.includes('carsline')) return 'Carsline Pachuca';
    if (limpio.includes('subaru')) return 'Subaru';
    if (limpio.includes('gwm')) return 'GWM Celaya'; // SIEMPRE HOMOLOGA A GWM CELAYA
    if (limpio.includes('compro') && limpio.includes('queretaro')) return 'ComproCars Querétaro';
    if (limpio.includes('compro')) return 'ComproCars Pachuca';

    return 'Carsline Pachuca';
  }

  procesarArchivo() {
    if (!this.archivoSeleccionado) {
      this.mostrarMensaje('Seleccione un archivo', 'warning');
      return;
    }

    this.loading = true;
    this.errores = [];
    this.datosExcel = [];

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        jsonData.forEach((row: any, index: number) => {
          let fecha = '';
          
          const posiblesNombresFecha = ['FECHA ORDEN', 'FECHA DE FACTURACIÓN', 'FECHA DE FACTURACION', 'FECHA', 'fecha', 'Fecha', 'A', 'Fecha Venta', 'FECHA VENTA'];
          for (const nombre of posiblesNombresFecha) {
            if (row[nombre] !== undefined && row[nombre] !== null && row[nombre] !== '') {
              fecha = row[nombre];
              break;
            }
          }

          if (!fecha) {
            const values = Object.values(row);
            if (values.length > 0 && values[0]) {
              fecha = String(values[0]);
            }
          }

          const noFactura = row['# ORDEN'] || row['NO FACTURA'] || row['B'] || '';
          const tipo = row['TIPO'] || row['ALTA/BAJA'] || row['C'] || '';
          const serie = row['SERIE'] || row['D'] || '';
          const unidad = row['UNIDAD'] || row['E'] || '';
          const anio = row['AÑO'] || row['F'] || '';
          
          const asesorRaw = row['ASESOR'] || row['Asesor'] || row['asesor'] || row['ADV'] || row['G'] || '';
          const asesor = asesorRaw ? asesorRaw.toString().trim() : 'Asesor de Servicio';
          
          const marcaNombreRaw = row['MARCA'] || row['Marca'] || row['marca'] || row['SUCURSAL'] || row['sucursal'] || '';
          const marcaNombreOficial = this.normalizarNombreMarcaOficial(marcaNombreRaw ? marcaNombreRaw.toString().trim() : '');

          const nombreCliente = row['NOMBRE CLIENTE'] || row['H'] || '';
          const telefono = row['TELEFONO 1'] || row['TELEFONO'] || row['I'] || '';

          if (nombreCliente && nombreCliente.toString().trim()) {
            const marcaId = this.obtenerMarcaId(marcaNombreOficial);
            const fechaConvertida = this.convertirFecha(fecha);

            this.datosExcel.push({
              index: index + 1,
              fecha: fechaConvertida,
              noFactura: noFactura ? noFactura.toString().trim() : '',
              tipo: tipo ? tipo.toString().trim() : '',
              serie: serie ? serie.toString().trim() : '',
              unidad: unidad ? unidad.toString().trim() : '',
              anio: anio ? anio.toString().trim() : '',
              asesor: asesor,
              marcaNombre: marcaNombreOficial,
              marcaId: marcaId,
              nombreCliente: nombreCliente.toString().trim(),
              telefono: telefono ? telefono.toString().trim() : '',
              procesado: false,
              exito: false,
              error: ''
            });
          }
        });

        this.totalRegistros = this.datosExcel.length;
        this.mostrarResultados = true;
        this.loading = false;

        if (this.totalRegistros > 0) {
          this.mostrarSelectorPlantilla = true;
        }

        this.mostrarMensaje(
          'Se encontraron ' + this.totalRegistros + ' clientes para generar encuestas',
          'info'
        );
      } catch (error) {
        console.error('Error al leer archivo:', error);
        this.loading = false;
        this.mostrarMensaje('Error al leer el archivo Excel', 'error');
      }
    };

    reader.readAsArrayBuffer(this.archivoSeleccionado);
  }

  obtenerMarcaId(nombreMarca: string): number {
    if (!nombreMarca) return 3;
    const nombreLimpio = this.normalizarTexto(nombreMarca);

    if (nombreLimpio.includes('toyota') && nombreLimpio.includes('tulancingo')) return 2;
    if (nombreLimpio.includes('toyota')) return 1;
    if (nombreLimpio.includes('carsline') && nombreLimpio.includes('queretaro')) return 4;
    if (nombreLimpio.includes('carsline')) return 3;
    if (nombreLimpio.includes('subaru')) return 5;
    if (nombreLimpio.includes('gwm')) return 6; // GWM CELAYA ES MARCA ID 6
    if (nombreLimpio.includes('compro') && nombreLimpio.includes('queretaro')) return 7;
    if (nombreLimpio.includes('compro')) return 8;

    return 3;
  }

  obtenerImagenMarca(nombreMarca: string): string {
    if (!nombreMarca) return 'assets/whatsapp/carsline.png';
    const nombreLimpio = this.normalizarTexto(nombreMarca);

    if (nombreLimpio.includes('toyota') && nombreLimpio.includes('tulancingo')) return 'assets/whatsapp/toyotaTulancingo.jpeg';
    if (nombreLimpio.includes('toyota')) return 'assets/whatsapp/toyotaPachuca.jpeg';
    if (nombreLimpio.includes('carsline')) return 'assets/whatsapp/carsline.png';
    if (nombreLimpio.includes('subaru')) return 'assets/whatsapp/subaruPachuca.png';
    if (nombreLimpio.includes('gwm')) return 'assets/whatsapp/gwm.png';
    if (nombreLimpio.includes('compro')) return 'assets/whatsapp/comproCars.png';

    return 'assets/whatsapp/carsline.png';
  }

  obtenerUrlImagen(marcaNombre: string): string {
    return this.obtenerImagenMarca(marcaNombre);
  }

  convertirFecha(valor: any): string {
    if (!valor) return '';
    if (typeof valor === 'number') {
      const fecha = new Date(1899, 11, 30);
      fecha.setDate(fecha.getDate() + valor);
      return fecha.toISOString().split('T')[0];
    }
    if (typeof valor === 'string') {
      const numero = parseFloat(valor);
      if (!isNaN(numero) && numero > 10000 && numero < 60000) {
        const fecha = new Date(1899, 11, 30);
        fecha.setDate(fecha.getDate() + numero);
        return fecha.toISOString().split('T')[0];
      }
      const fecha = new Date(valor);
      if (!isNaN(fecha.getTime())) {
        return fecha.toISOString().split('T')[0];
      }
      const partes = valor.split('/');
      if (partes.length === 3) {
        const dia = parseInt(partes[0]);
        const mes = parseInt(partes[1]) - 1;
        const anio = parseInt(partes[2]);
        if (!isNaN(dia) && !isNaN(mes) && !isNaN(anio)) {
          return anio + '-' + String(mes + 1).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
        }
      }
    }
    return '';
  }

  formatearFecha(fechaStr: string): string {
    if (!fechaStr) return 'fecha de visita';
    const fecha = new Date(fechaStr);
    if (!isNaN(fecha.getTime())) {
      return fecha.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return fechaStr || 'fecha de visita';
  }

  generarPlantilla(cliente: any, link: string): string {
    const nombreCliente = cliente.nombreCliente || 'Cliente';
    const nombreAsesor = cliente.asesor || 'Asesor de Servicio';
    const nombreMarca = cliente.marcaNombre || 'Agencia';
    const modeloAuto = cliente.unidad || 'su vehiculo';
    const anioAuto = cliente.anio ? ` ${cliente.anio}` : '';
    const vehiculoCompleto = `${modeloAuto}${anioAuto}`.trim();
    const fechaVisita = cliente.fecha ? this.formatearFecha(cliente.fecha) : 'fecha de visita';

    let plantilla = '';

    if (this.tipoPlantilla === 'VENTA') {
      plantilla += `Buen día, Sr./Srita. *${nombreCliente}*.\n`;
      plantilla += `Mi nombre es *Cecilia Juárez* y formo parte del área de Satisfacción a Clientes de *${nombreMarca}*. ${this.emojis.manosArriba}\n`;
      plantilla += `Agradecemos sinceramente el tiempo que nos brindó al visitarnos. Fue un placer atenderle y acompañarle durante la adquisición de su ${vehiculoCompleto}.\n`;
      plantilla += `Nos gustaría conocer su opinión sobre la atención recibida tanto por parte de nuestra agencia como de su asesor *${nombreAsesor}*. Por ello, le invitamos a responder nuestra encuesta de satisfacción, la cual le tomará solo unos minutos.\n`;
      plantilla += `Para participar, por favor haga click en el siguiente enlace:\n`;
      plantilla += `${this.emojis.punto} ${link}\n`;
      plantilla += `Muchas gracias por su tiempo y confianza.\n`;
      plantilla += `¡Le damos la más cordial bienvenida a la familia *${nombreMarca}*! ${this.emojis.gracias}${this.emojis.auto}`;
    } else {
      plantilla += `Buen día, Sr./Srita. *${nombreCliente}* Mi nombre es *Cecilia Juárez* de Satisfacción a Clientes de *${nombreMarca}*${this.emojis.manosArriba}\n`;
      plantilla += `Agradecemos sinceramente el tiempo que nos brindó al visitarnos en nuestra agencia, fue un gusto atenderle y acompañarle durante su estancia.\n`;
      plantilla += `Nos gustaría conocer su opinión respecto al servicio realizado a su *${vehiculoCompleto}* el día *${fechaVisita}*.${this.emojis.auto}${this.emojis.herramienta}\n`;
      plantilla += `Lo invitamos a responder nuestra encuesta de satisfacción; le tomará solo unos minutos.\n`;
      plantilla += `Por favor, haz clic en el siguiente enlace para participar:\n`;
      plantilla += `${this.emojis.punto} ${link}\n`;
      plantilla += `  ¡Muchas gracias por su tiempo! ${this.emojis.gracias}${this.emojis.auto}`;
    }

    return plantilla;
  }

  generarEncuestas() {
    if (this.datosExcel.length === 0) {
      this.mostrarMensaje('No hay datos para procesar', 'warning');
      return;
    }

    this.procesando = true;
    this.exitosos = 0;
    this.fallidos = 0;
    this.encuestasGeneradas = [];
    this.errores = [];

    const pendientes = this.datosExcel.filter(d => !d.procesado);

    if (pendientes.length === 0) {
      this.mostrarMensaje('Todos los clientes ya fueron procesados', 'info');
      this.procesando = false;
      return;
    }

    let completados = 0;

    pendientes.forEach((cliente, index) => {
      setTimeout(() => {
        const nombreCompleto = (cliente.nombreCliente || 'Cliente').trim();
        const partes = nombreCompleto.split(' ');
        const nombre = partes[0] || 'Cliente';
        const apellido = partes.slice(1).join(' ') || 'General';
        const marcaId = cliente.marcaId || 3;

        const data = {
          nombre: nombre,
          apellido: apellido,
          email: cliente.email || 'sin_correo@inmotion.com',
          telefono: cliente.telefono ? cliente.telefono.toString().replace(/\D/g, '') : '7710000000',
          serie: cliente.serie || 'SN',
          asesor: cliente.asesor || 'Atención a Clientes',
          marcaId: marcaId,
          tipo: this.tipoPlantilla,
          respuestas: []
        };

        this.encuestaService.crearEncuesta(data).subscribe({
          next: (response) => {
            cliente.procesado = true;
            cliente.exito = true;
            
            const link = this.encuestaService.generarLinkEncuesta(response.token);
            const plantillaCompleta = this.generarPlantilla(cliente, link);
            
            this.exitosos++;
            this.encuestasGeneradas.push({
              cliente: cliente.nombreCliente,
              marca: cliente.marcaNombre || 'Carsline Pachuca',
              token: response.token,
              link: link,
              plantilla: plantillaCompleta,
              mostrarPlantilla: false,
              imagenUrl: this.obtenerUrlImagen(cliente.marcaNombre || 'Carsline Pachuca')
            });
            completados++;
            if (completados === pendientes.length) {
              this.finalizarProceso();
            }
          },
          error: (error) => {
            cliente.procesado = true;
            cliente.exito = false;
            
            const detalleError = error.error?.message || error.message || 'Error al crear encuesta';
            cliente.error = detalleError;
            this.fallidos++;
            this.errores.push(`${cliente.nombreCliente}: ${detalleError}`);
            completados++;
            if (completados === pendientes.length) {
              this.finalizarProceso();
            }
          }
        });
      }, index * 300);
    });
  }

  private finalizarProceso() {
    this.procesando = false;
    this.mostrarSelectorPlantilla = false;
    this.mostrarMensaje(
      `Se generaron ${this.exitosos} encuestas, ${this.fallidos} fallaron`,
      this.fallidos === 0 ? 'success' : 'warning'
    );
  }

  cambiarPlantilla(tipo: 'POSTVENTA' | 'VENTA') {
    this.tipoPlantilla = tipo;
    this.mostrarMensaje('Plantilla cambiada a: ' + (tipo === 'VENTA' ? 'Venta' : 'Post Venta'), 'info');
  }

  copiarLink(token: string) {
    const link = this.encuestaService.generarLinkEncuesta(token);
    navigator.clipboard.writeText(link);
    this.mostrarMensaje('Link copiado al portapapeles', 'success');
  }

  copiarPlantilla(plantilla: string) {
    navigator.clipboard.writeText(plantilla);
    this.mostrarMensaje('Plantilla de texto copiada', 'success');
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
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject('Error al procesar la imagen');
              }
            }, 'image/png');
          } else {
            reject('Contexto de canvas no disponible');
          }
        };
        img.onerror = (err) => reject(err);
        img.src = imagenUrl;
      });

      const clipboardItem = new ClipboardItem({ 'image/png': imageBlob });
      await navigator.clipboard.write([clipboardItem]);
      this.mostrarMensaje('Imagen copiada. Lista para pegar en WhatsApp', 'success');
    } catch (error) {
      console.error('Error al copiar la imagen:', error);
      this.mostrarMensaje('No se pudo copiar la imagen al portapapeles', 'error');
    }
  }

  copiarTodosLosLinks() {
    const links = this.encuestasGeneradas.map(e => e.link).join('\n');
    navigator.clipboard.writeText(links);
    this.mostrarMensaje('Todos los links copiados', 'success');
  }

  limpiar() {
    this.archivoSeleccionado = null;
    this.datosExcel = [];
    this.encuestasGeneradas = [];
    this.errores = [];
    this.mostrarResultados = false;
    this.totalRegistros = 0;
    this.exitosos = 0;
    this.fallidos = 0;
    this.mostrarSelectorPlantilla = false;
    this.tipoPlantilla = 'POSTVENTA';
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) input.value = '';
  }

  descargarReporte() {
    if (this.encuestasGeneradas.length === 0) {
      this.mostrarMensaje('No hay encuestas generadas para exportar', 'warning');
      return;
    }

    const data = this.encuestasGeneradas.map(e => ({
      'Cliente': e.cliente,
      'Marca': e.marca,
      'Link': e.link,
      'Plantilla': e.plantilla
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Encuestas Generadas');
    
    const colWidths = [
      { wch: 35 },
      { wch: 25 },
      { wch: 50 },
      { wch: 80 }
    ];
    ws['!cols'] = colWidths;

    const resumenData = [
      ['REPORTE DE ENCUESTAS GENERADAS'],
      [''],
      ['Total procesados:', this.totalRegistros],
      ['Exitosos:', this.exitosos],
      ['Fallidos:', this.fallidos],
      ['Tipo de plantilla:', this.tipoPlantilla === 'VENTA' ? 'Venta' : 'Post Venta'],
      [''],
      ['Fecha de generacion:', new Date().toLocaleString('es-MX')]
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    const fileName = 'encuestas_generadas_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, fileName);
    
    this.mostrarMensaje('Reporte exportado correctamente', 'success');
  }
}