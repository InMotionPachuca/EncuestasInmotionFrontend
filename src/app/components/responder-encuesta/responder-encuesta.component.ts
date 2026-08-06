import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EncuestaService } from '../../services/encuesta.service';
import { Encuesta } from '../../models/encuesta.model';

@Component({
  selector: 'app-responder-encuesta',
  templateUrl: './responder-encuesta.component.html',
  styleUrls: ['./responder-encuesta.component.css']
})
export class ResponderEncuestaComponent implements OnInit {
  token: string = '';
  encuesta: Encuesta | null = null;
  encuestaForm: FormGroup;
  loading: boolean = true;
  enviando: boolean = false;
  error: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private encuestaService: EncuestaService
  ) {
    this.encuestaForm = this.fb.group({
      experiencia: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      atencion: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      tiempoAdecuado: ['', [Validators.required]],
      recomienda: ['', [Validators.required]],
      comentarios: ['']
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (this.token) {
      this.cargarEncuesta();
    } else {
      this.error = 'Token de encuesta no válido';
      this.loading = false;
    }
  }

  cargarEncuesta(): void {
    this.loading = true;
    this.encuestaService.obtenerEncuestaPorToken(this.token).subscribe({
      next: (data: Encuesta) => {
        this.encuesta = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar la encuesta:', err);
        this.error = 'No se encontró la encuesta o el enlace ha expirado.';
        this.loading = false;
      }
    });
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.src.includes('assets/inmo1.png')) {
      img.src = 'assets/inmo1.png';
    }
  }

  setCalificacion(preguntaId: number, valor: number): void {
    if (preguntaId === 1 || preguntaId === 2) {
      const controlName = preguntaId === 1 ? 'experiencia' : 'atencion';
      this.encuestaForm.get(controlName)?.setValue(valor);
      this.encuestaForm.get(controlName)?.markAsTouched();
    }
  }

  getCalificacion(preguntaId: number): number {
    const controlName = preguntaId === 1 ? 'experiencia' : 'atencion';
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

  enviarRespuesta(): void {
    if (this.encuestaForm.invalid || !this.encuesta) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    this.enviando = true;
    const formValue = this.encuestaForm.value;

    // PAYLOAD ALINEADO STRICTAMENTE CON RespuestaRequestDTO.java
    const respuestasData = [
      { 
        preguntaId: 1, 
        valorTexto: this.encuesta.clienteNombre || 'Cliente', 
        valorNumerico: null, 
        opcionId: null 
      },
      { 
        preguntaId: 2, 
        valorTexto: formValue.experiencia ? formValue.experiencia.toString() : '', 
        valorNumerico: Number(formValue.experiencia), 
        opcionId: null 
      },
      { 
        preguntaId: 3, 
        valorTexto: formValue.atencion ? formValue.atencion.toString() : '', 
        valorNumerico: Number(formValue.atencion), 
        opcionId: null 
      },
      { 
        preguntaId: 4, 
        valorTexto: formValue.tiempoAdecuado || 'SI', 
        valorNumerico: null, 
        opcionId: formValue.tiempoAdecuado === 'SI' ? 1 : 2 
      },
      { 
        preguntaId: 5, 
        valorTexto: formValue.recomienda || 'SI', 
        valorNumerico: null, 
        opcionId: formValue.recomienda === 'SI' ? 1 : 2 
      },
      { 
        preguntaId: 6, 
        valorTexto: formValue.comentarios || '', 
        valorNumerico: null, 
        opcionId: null 
      }
    ];

    this.encuestaService.responderEncuesta(this.token, respuestasData).subscribe({
      next: () => {
        this.enviando = false;
        this.router.navigate(['/gracias']);
      },
      error: (err: any) => {
        this.enviando = false;
        console.error('Error al responder encuesta:', err);
        alert('Ocurrió un error al enviar la encuesta. Intente nuevamente.');
      }
    });
  }
}