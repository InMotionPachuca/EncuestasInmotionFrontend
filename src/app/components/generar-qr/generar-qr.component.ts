import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-generar-qr',
  templateUrl: './generar-qr.component.html',
  styleUrls: ['./generar-qr.component.css']
})
export class GenerarQrComponent implements OnInit {
  // Enlace dinámico o fijo que apunta a la encuesta estática
  qrUrl: string = '';

  ngOnInit(): void {
    // Genera la URL completa hacia la ruta /evaluar
    this.qrUrl = `${window.location.origin}/evaluar`;
  }

  descargarQR(): void {
    // Busca el canvas o img dentro del contenedor generado por angularx-qrcode
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

    // Extrae la imagen en base64 según el elemento renderizado
    if (qrElement instanceof HTMLCanvasElement) {
      dataUrl = qrElement.toDataURL('image/png');
    } else if (qrElement instanceof HTMLImageElement) {
      dataUrl = qrElement.src;
    }

    if (dataUrl) {
      // Crea un enlace temporal en el DOM para forzar la descarga
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `codigo_qr_encuesta_${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('Error al obtener la imagen del código QR.');
    }
  }
}