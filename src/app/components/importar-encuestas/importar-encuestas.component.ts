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

  imagenesMarca: { [key: string]: string } = {
    'Toyota Pachuca': 'assets/whatsapp/toyotaPachuca.jpeg',
    'Toyota Tulancingo': 'assets/whatsapp/toyotaTulancingo.jpeg',
    'Carsline Pachuca': 'assets/whatsapp/carsline.png',
    'Carsline Querétaro': 'assets/whatsapp/carsline.png',
    'GWM Celaya': 'assets/whatsapp/gwm.png',
    'Subaru': 'assets/whatsapp/subaruPachuca.png',
    'ComproCars Querétaro': 'assets/whatsapp/comproCars.png',
    'ComproCars Pachuca': 'assets/whatsapp/comproCars.png'
  };

  emojis = {
    manosArriba: '🙌🏽',
    auto: '🚗',
    herramienta: '🧰',
    gracias: '☺️',
    bienvenida: '🙌🏽',
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
    setTimeout(() => { this.mensajeToast = ''; }, 4000);
  }

  normalizarTexto(texto: string): string {
    return texto ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';
  }

  // IDS CORREGIDOS SEGÚN LA TABLA 'MARCAS' DE PRODUCCIÓN:
  // 1: Toyota Pachuca | 2: Carsline Pachuca | 3: Carsline Queretaro
  // 4: GWM Celaya | 5: Subaru | 6: ComproCars Queretaro | 7: Compro Pachuca | 8: Toyota Tulancingo
  obtenerMarcaId(nombreMarca: string): number {
    if (!nombreMarca) return 2;
    const limpio = this.normalizarTexto(nombreMarca);

    if (limpio.includes('toyota') && limpio.includes('tulancingo')) return 8;
    if (limpio.includes('toyota')) return 1;
    if (limpio.includes('carsline') && limpio.includes('queretaro')) return 3;
    if (limpio.includes('carsline')) return 2;
    if (limpio.includes('gwm')) return 4;               // ID 4 CORRESPONDE A GWM CELAYA
    if (limpio.includes('subaru')) return 5;            // ID 5 CORRESPONDE A SUBARU
    if (limpio.includes('compro') && limpio.includes('queretaro')) return 6;
    if (limpio.includes('compro')) return 7;

    return 2;
  }

  normalizarNombreMarcaOficial(nombreMarcaRaw: string): string {
    if (!nombreMarcaRaw) return 'Carsline Pachuca';
    const limpio = this.normalizarTexto(nombreMarcaRaw);

    if (limpio.includes('toyota') && limpio.includes('tulancingo')) return 'Toyota Tulancingo';
    if (limpio.includes('toyota')) return 'Toyota Pachuca';
    if (limpio.includes('carsline') && limpio.includes('queretaro')) return 'Carsline Querétaro';
    if (limpio.includes('carsline')) return 'Carsline Pachuca';
    if (limpio.includes('gwm')) return 'GWM Celaya';
    if (limpio.includes('subaru')) return 'Subaru';
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

            this.datosExcel.push({
              index: index + 1,
              fecha: this.convertirFecha(fecha),
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
        if (this.totalRegistros > 0) this.mostrarSelectorPlantilla = true;

        this.mostrarMensaje(`Se encontraron ${this.totalRegistros} clientes para generar encuestas`, 'info');
      } catch (error) {
        this.loading = false;
        this.mostrarMensaje('Error al leer el archivo Excel', 'error');
      }
    };
    reader.readAsArrayBuffer(this.archivoSeleccionado);
  }

  obtenerImagenMarca(nombreMarca: string): string {
    if (!nombreMarca) return 'assets/whatsapp/carsline.png';
    const limpio = this.normalizarTexto(nombreMarca);

    if (limpio.includes('toyota') && limpio.includes('tulancingo')) return 'assets/whatsapp/toyotaTulancingo.jpeg';
    if (limpio.includes('toyota')) return 'assets/whatsapp/toyotaPachuca.jpeg';
    if (limpio.includes('carsline')) return 'assets/whatsapp/carsline.png';
    if (limpio.includes('gwm')) return 'assets/whatsapp/gwm.png';
    if (limpio.includes('subaru')) return 'assets/whatsapp/subaruPachuca.png';
    if (limpio.includes('compro')) return 'assets/whatsapp/comproCars.png';

    return 'assets/whatsapp/carsline.png';
  }

  convertirFecha(valor: any): string {
    if (!valor) return '';
    if (typeof valor === 'number') {
      const fecha = new Date(1899, 11, 30);
      fecha.setDate(fecha.getDate() + valor);
      return fecha.toISOString().split('T')[0];
    }
    const fecha = new Date(valor);
    return !isNaN(fecha.getTime()) ? fecha.toISOString().split('T')[0] : '';
  }

  generarPlantilla(cliente: any, link: string): string {
    const nombreCliente = cliente.nombreCliente || 'Cliente';
    const nombreAsesor = cliente.asesor || 'Asesor de Servicio';
    const nombreMarca = cliente.marcaNombre || 'Agencia';
    const modeloAuto = cliente.unidad || 'su vehiculo';

    if (this.tipoPlantilla === 'VENTA') {
      return `Buen día, Sr./Srita. *${nombreCliente}*.\nMi nombre es *Cecilia Juárez* y formo parte del área de Satisfacción a Clientes de *${nombreMarca}*. ${this.emojis.manosArriba}\nAgradecemos sinceramente el tiempo que nos brindó al visitarnos. Fue un placer atenderle y acompañarle durante la adquisición de su ${modeloAuto}.\nNos gustaría conocer su opinión sobre la atención recibida tanto por parte de nuestra agencia como de su asesor *${nombreAsesor}*. Por ello, le invitamos a responder nuestra encuesta de satisfacción:\n👉 ${link}\n¡Muchas gracias por su tiempo y confianza!`;
    } else {
      return `Buen día, Sr./Srita. *${nombreCliente}*. Mi nombre es *Cecilia Juárez* de Satisfacción a Clientes de *${nombreMarca}* ${this.emojis.manosArriba}\nNos gustaría conocer su opinión respecto al servicio realizado a su vehículo.\nPor favor, haz clic en el siguiente enlace para participar:\n👉 ${link}\n¡Muchas gracias por su tiempo!`;
    }
  }

  generarEncuestas() {
    if (this.datosExcel.length === 0) return;
    this.procesando = true;
    this.exitosos = 0;
    this.fallidos = 0;
    this.encuestasGeneradas = [];

    const pendientes = this.datosExcel.filter(d => !d.procesado);
    let completados = 0;

    pendientes.forEach((cliente, index) => {
      setTimeout(() => {
        const partes = (cliente.nombreCliente || 'Cliente').trim().split(' ');
        const nombre = partes[0] || 'Cliente';
        const apellido = partes.slice(1).join(' ') || 'General';

        const data = {
          nombre: nombre,
          apellido: apellido,
          email: cliente.email || 'sin_correo@inmotion.com',
          telefono: cliente.telefono ? cliente.telefono.toString().replace(/\D/g, '') : '7710000000',
          serie: cliente.serie || 'SN',
          asesor: cliente.asesor || 'Atención a Clientes',
          marcaId: cliente.marcaId,
          tipo: this.tipoPlantilla,
          respuestas: []
        };

        this.encuestaService.crearEncuesta(data).subscribe({
          next: (response) => {
            cliente.procesado = true;
            cliente.exito = true;
            const link = this.encuestaService.generarLinkEncuesta(response.token);
            this.exitosos++;
            this.encuestasGeneradas.push({
              cliente: cliente.nombreCliente,
              marca: cliente.marcaNombre,
              token: response.token,
              link: link,
              plantilla: this.generarPlantilla(cliente, link),
              mostrarPlantilla: false,
              imagenUrl: this.obtenerImagenMarca(cliente.marcaNombre)
            });
            completados++;
            if (completados === pendientes.length) this.procesando = false;
          },
          error: () => {
            cliente.procesado = true;
            cliente.exito = false;
            this.fallidos++;
            completados++;
            if (completados === pendientes.length) this.procesando = false;
          }
        });
      }, index * 300);
    });
  }

  copiarLink(token: string) {
    navigator.clipboard.writeText(this.encuestaService.generarLinkEncuesta(token));
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
            canvas.toBlob((blob) => blob ? resolve(blob) : reject('Error'), 'image/png');
          } else reject('Ctx error');
        };
        img.onerror = (err) => reject(err);
        img.src = imagenUrl;
      });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': imageBlob })]);
      this.mostrarMensaje('Imagen copiada. Lista para pegar en WhatsApp', 'success');
    } catch {
      this.mostrarMensaje('No se pudo copiar la imagen', 'error');
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
  }

  cambiarPlantilla(tipo: 'POSTVENTA' | 'VENTA') {
    this.tipoPlantilla = tipo;
  }

  descargarReporte() {
    if (this.encuestasGeneradas.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(this.encuestasGeneradas.map(e => ({ 'Cliente': e.cliente, 'Marca': e.marca, 'Link': e.link })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `reporte_encuestas_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}