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

  constructor(private encuestaService: EncuestaService) {}

  ngOnInit(): void {
    const catalogo = this.encuestaService.obtenerMarcas();
    this.marcas = catalogo.map(m => ({
      id: m.id,
      nombre: m.nombre,
      logo: this.encuestaService.obtenerLogo(m.id)
    }));

    // Selecciona por defecto la primera agencia
    if (this.marcas.length > 0) {
      this.seleccionarMarca(this.marcas[0]);
    }
  }

  seleccionarMarca(marca: MarcaQR): void {
    this.marcaSeleccionada = marca;
    // URL con parámetro de marca preseleccionada
    this.qrUrl = `${window.location.origin}/evaluar?marcaId=${marca.id}`;
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