import { Component } from '@angular/core';

@Component({
  selector: 'app-generar-qr',
  templateUrl: './generar-qr.component.html',
  styleUrls: ['./generar-qr.component.css']
})
export class GenerarQrComponent {
  // Genera automáticamente el enlace dinámico dependiendo de la URL (localhost o Render)
  qrUrl: string = `${window.location.origin}/evaluar`;

  descargarQR() {
    const parentElement = document.querySelector('.qrcode-container img') as HTMLImageElement;
    if (parentElement) {
      const link = document.createElement('a');
      link.href = parentElement.src;
      link.download = 'QR_Encuesta_Satisfaccion_InMotion.png';
      link.click();
    }
  }
}