import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { EncuestaService } from '../../services/encuesta.service';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-encuesta-compras-auto',
  templateUrl: './encuesta-compras-auto.component.html',
  styleUrls: ['./encuesta-compras-auto.component.css'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.6s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('toastAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('0.3s ease-in', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ])
  ]
})
export class EncuestaComprasAutoComponent implements OnInit {
  marcas: any[] = [];
  encuestaForm: FormGroup;
  enviando: boolean = false;
  exito: boolean = false;
  toastMessage: string = '';
  showToast: boolean = false;
  toastType: 'success' | 'error' = 'success';

  constructor(
    private fb: FormBuilder,
    private encuestaService: EncuestaService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.marcas = this.encuestaService.obtenerMarcas();

    this.encuestaForm = this.fb.group({
      marcaId: [1, [Validators.required]],
      nombreCliente: ['', [Validators.required]],
      telefono: [''],
      trato: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      experiencia: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      asesor: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      tramite: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      recomienda: ['', [Validators.required]],
      comentarios: ['']
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['marcaId']) {
        const marcaIdParam = Number(params['marcaId']);
        this.encuestaForm.patchValue({ marcaId: marcaIdParam });
      }
    });
  }

  setCalificacion(controlName: string, valor: number): void {
    this.encuestaForm.get(controlName)?.setValue(valor);
    this.encuestaForm.get(controlName)?.markAsTouched();
  }

  getCalificacion(controlName: string): number {
    return this.encuestaForm.get(controlName)?.value || 0;
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
    return marcaEncontrada ? marcaEncontrada.nombre : 'Agencia';
  }

  mostrarToast(mensaje: string, tipo: 'success' | 'error') {
    this.toastMessage = mensaje;
    this.toastType = tipo;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3500);
  }

  enviarRespuesta(): void {
    if (this.encuestaForm.invalid) {
      this.mostrarToast('Por favor, califique todas las preguntas obligatorias.', 'error');
      // Marcar todos como tocados para mostrar errores visuales
      Object.keys(this.encuestaForm.controls).forEach(key => {
        this.encuestaForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.enviando = true;
    const formValue = this.encuestaForm.value;

    const nombreCompleto = formValue.nombreCliente.trim();
    const partesNombre = nombreCompleto.split(' ');
    const nombre = partesNombre[0] || 'Cliente';
    const apellido = partesNombre.slice(1).join(' ') || 'Ventas';

    const data = {
      nombre: nombre,
      apellido: apellido,
      email: 'ventas_cliente@inmotion.com',
      telefono: formValue.telefono || '0000000000',
      serie: 'COMPRA-AUTO',
      asesor: 'Asesor de Ventas',
      marcaId: Number(formValue.marcaId),
      tipo: 'COMPRA_AUTO',
      respuestas: [
        { preguntaId: 1, valorTexto: nombreCompleto, valorNumerico: null, opcionId: null },
        { preguntaId: 7, valorTexto: '', valorNumerico: formValue.trato, opcionId: null },
        { preguntaId: 8, valorTexto: '', valorNumerico: formValue.experiencia, opcionId: null },
        { preguntaId: 9, valorTexto: '', valorNumerico: formValue.asesor, opcionId: null },
        { preguntaId: 10, valorTexto: '', valorNumerico: formValue.tramite, opcionId: null },
        { preguntaId: 11, valorTexto: '', valorNumerico: null, opcionId: formValue.recomienda === 'SI' ? 1 : 2 },
        { preguntaId: 12, valorTexto: formValue.comentarios, valorNumerico: null, opcionId: null }
      ]
    };

    this.encuestaService.crearEncuesta(data).subscribe({
      next: () => {
        this.enviando = false;
        this.exito = true;
        this.mostrarToast('¡Encuesta enviada con éxito!', 'success');
        
        setTimeout(() => {
          this.router.navigate(['/gracias']);
        }, 1500);
      },
      error: (error) => {
        this.enviando = false;
        console.error('Error al enviar la encuesta:', error);
        this.mostrarToast('Ocurrió un error al enviar. Intente nuevamente.', 'error');
      }
    });
  }

  onLogoError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      imgElement.src = 'assets/inmo1.png';
    }
  }
}
