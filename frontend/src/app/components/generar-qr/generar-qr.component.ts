import { Component, OnInit } from '@angular/core';
import { EncuestaService } from '../../services/encuesta.service';

interface MarcaQR {
  id: number;
  nombre: string;
  logo: string;
}

@Component({
  selector: 'app-generar-qr',
  templateUrl: './generar-qr.component.html',
  styleUrls: ['./generar-qr.component.css']
})
export class GenerarQrComponent implements OnInit {
  marcas: MarcaQR[] = [];
  marcaSeleccionada: MarcaQR | null = null;
  qrUrl: string = '';

  // Diccionario de imágenes/logos oficiales por agencia
  private logosPorMarca: { [key: string]: string } = {
    'toyota pachuca': 'assets/whatsapp/toyotaPachuca.jpeg',
    'toyota tulancingo': 'assets/whatsapp/toyotaTulancingo.jpeg',
    'carsline pachuca': 'assets/whatsapp/carsline.png',
    'carsline querétaro': 'assets/whatsapp/carsline.png',
    'gwm': 'assets/whatsapp/gwm.png',
    'subaru': 'assets/whatsapp/subaruPachuca.png',
    'comprocars querétaro': 'assets/whatsapp/comproCars.png',
    'comprocars pachuca': 'assets/whatsapp/comproCars.png'
  };

  constructor(private encuestaService: EncuestaService) {}

  ngOnInit(): void {
    const catalogo = this.encuestaService.obtenerMarcas();
    this.marcas = catalogo.map(m => ({
      id: m.id,
      nombre: m.nombre,
      logo: this.obtenerLogoMarca(m.nombre)
    }));

    if (this.marcas.length > 0) {
      this.seleccionarMarca(this.marcas[0]);
    }
  }

  obtenerLogoMarca(nombreMarca: string): string {
    if (!nombreMarca) return 'assets/whatsapp/carsline.png';
    const limpio = nombreMarca.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    for (const key of Object.keys(this.logosPorMarca)) {
      const keyLimpio = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      if (limpio.includes(keyLimpio) || keyLimpio.includes(limpio)) {
        return this.logosPorMarca[key];
      }
    }
    return 'assets/whatsapp/carsline.png';
  }

  seleccionarMarca(marca: MarcaQR): void {
    this.marcaSeleccionada = marca;
    this.qrUrl = `${window.location.origin}/evaluar?marcaId=${marca.id}`;
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'assets/inmo1.png';
    }
  }

  descargarQR(): void {
    const container = document.querySelector('.qrcode-container');
    if (!container) {
      alert('No se encontró el contenedor del código QR.');
      return;
    }

    const qrElement = container.querySelector('canvas, img') as HTMLCanvasElement | HTMLImageElement;
    if (!qrElement) {
      alert('Aún no se ha renderizado el código QR.');
      return;
    }

    let dataUrl = '';
    if (qrElement instanceof HTMLCanvasElement) {
      dataUrl = qrElement.toDataURL('image/png');
    } else if (qrElement instanceof HTMLImageElement) {
      dataUrl = qrElement.src;
    }

    if (dataUrl) {
      const nombreLimpio = (this.marcaSeleccionada?.nombre || 'agencia')
        .toLowerCase()
        .replace(/\s+/g, '_');

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `qr_${nombreLimpio}_${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('Error al obtener la imagen del código QR.');
    }
  }
}