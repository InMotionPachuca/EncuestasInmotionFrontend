import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EncuestaService } from '../../services/encuesta.service';

@Component({
  selector: 'app-encuesta-estatica',
  templateUrl: './encuesta-estatica.component.html',
  styleUrls: ['./encuesta-estatica.component.css']
})
export class EncuestaEstaticaComponent implements OnInit {
  marcas: any[] = [];
  encuestaForm: FormGroup;
  enviando: boolean = false;
  exito: boolean = false;

  constructor(
    private fb: FormBuilder,
    private encuestaService: EncuestaService,
    private router: Router
  ) {
    this.marcas = this.encuestaService.obtenerMarcas();

    this.encuestaForm = this.fb.group({
      marcaId: [1, [Validators.required]],
      nombreCliente: ['', [Validators.required]],
      telefono: [''],
      experiencia: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      atencion: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      tiempoAdecuado: ['', [Validators.required]],
      recomienda: ['', [Validators.required]],
      comentarios: ['']
    });
  }

  ngOnInit(): void {}

  setCalificacion(controlName: string, valor: number): void {
    this.encuestaForm.get(controlName)?.setValue(valor);
    this.encuestaForm.get(controlName)?.markAsTouched();
  }

  getCalificacion(controlName: string): number {
    return this.encuestaForm.get(controlName)?.value || 0;
  }

  setTiempoAdecuado(valor: string): void {
    this.encuestaForm.get('tiempoAdecuado')?.setValue(valor);
    this.encuestaForm.get('tiempoAdecuado')?.markAsTouched();
  }

  getTiempoAdecuado(): string {
    return this.encuestaForm.get('tiempoAdecuado')?.value || '';
  }

  setOpcionRecomienda(valor: string): void {
    this.encuestaForm.get('recomienda')?.setValue(valor);
    this.encuestaForm.get('recomienda')?.markAsTouched();
  }

  getOpcionRecomienda(): string {
    return this.encuestaForm.get('recomienda')?.value || '';
  }

  obtenerNombreMarca(): string {
    const marcaId = Number(this.encuestaForm.get('marcaId')?.value);
    const marcaEncontrada = this.marcas.find(m => m.id === marcaId);
    return marcaEncontrada ? marcaEncontrada.nombre : 'Toyota Pachuca';
  }

  enviarRespuesta(): void {
    if (this.encuestaForm.invalid) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    this.enviando = true;
    const formValue = this.encuestaForm.value;

    const nombreCompleto = formValue.nombreCliente.trim();
    const partesNombre = nombreCompleto.split(' ');
    const nombre = partesNombre[0] || 'Cliente';
    const apellido = partesNombre.slice(1).join(' ') || 'QR General';

    const data = {
      nombre: nombre,
      apellido: apellido,
      email: 'qr_cliente@inmotion.com',
      telefono: formValue.telefono || '0000000000',
      serie: 'QR-GENERAL',
      asesor: 'Atención General QR',
      marcaId: Number(formValue.marcaId),
      tipo: 'QR',
      respuestas: [
        { preguntaId: 1, valorTexto: nombreCompleto, valorNumerico: null, opcionId: null },
        { preguntaId: 2, valorTexto: '', valorNumerico: formValue.experiencia, opcionId: null },
        { preguntaId: 3, valorTexto: '', valorNumerico: formValue.atencion, opcionId: null },
        { preguntaId: 4, valorTexto: '', valorNumerico: null, opcionId: formValue.tiempoAdecuado === 'SI' ? 1 : 2 },
        { preguntaId: 5, valorTexto: '', valorNumerico: null, opcionId: formValue.recomienda === 'SI' ? 1 : 2 },
        { preguntaId: 6, valorTexto: formValue.comentarios, valorNumerico: null, opcionId: null }
      ]
    };

    this.encuestaService.crearEncuesta(data).subscribe({
      next: () => {
        this.enviando = false;
        this.exito = true;
        
        // REDIRECCIÓN AUTOMÁTICA A LA VISTA DE AGRADECIMIENTO TRAS 1 SEGUNDO
        setTimeout(() => {
          this.router.navigate(['/gracias']);
        }, 1000);
      },
      error: (error) => {
        this.enviando = false;
        console.error('Error al enviar la encuesta:', error);
        alert('Ocurrió un error al enviar la encuesta. Intente nuevamente.');
      }
    });
  }
}