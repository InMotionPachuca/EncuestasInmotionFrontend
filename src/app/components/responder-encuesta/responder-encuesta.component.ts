import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, FormControl } from '@angular/forms';
import { EncuestaService } from '../../services/encuesta.service';
import { Encuesta, EncuestaRequestDTO, Pregunta } from '../../models/encuesta.model';

@Component({
  selector: 'app-responder-encuesta',
  templateUrl: './responder-encuesta.component.html',
  styleUrls: ['./responder-encuesta.component.css']
})
export class ResponderEncuestaComponent implements OnInit {
  token: string = '';
  encuesta: (Encuesta & { asesor?: string }) | null = null;
  preguntas: Pregunta[] = [];
  loading: boolean = true;
  error: string = '';
  enviando: boolean = false;
  exito: boolean = false;
  encuestaForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private encuestaService: EncuestaService
  ) {
    this.preguntas = this.encuestaService.obtenerPreguntas();
    this.encuestaForm = this.fb.group({
      respuestas: this.fb.array([])
    });
  }

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (this.token) {
      this.cargarEncuesta();
    } else {
      this.error = 'Token no válido';
      this.loading = false;
    }
  }

  get respuestasFormArray(): FormArray {
    return this.encuestaForm.get('respuestas') as FormArray;
  }

  getRespuestaControl(index: number, field: string): FormControl {
    const control = this.respuestasFormArray.at(index);
    return control.get(field) as FormControl;
  }

  setCalificacion(index: number, valor: number) {
    const control = this.respuestasFormArray.at(index);
    control.get('valorNumerico')?.setValue(valor);
    control.get('valorNumerico')?.markAsTouched();
  }

  getCalificacion(index: number): number {
    const control = this.respuestasFormArray.at(index);
    return control.get('valorNumerico')?.value || 0;
  }

  setOpcion(index: number, valor: number) {
    const control = this.respuestasFormArray.at(index);
    control.get('opcionId')?.setValue(valor);
    control.get('opcionId')?.markAsTouched();
  }

  getOpcionSeleccionada(index: number): number {
    const control = this.respuestasFormArray.at(index);
    return control.get('opcionId')?.value || 0;
  }

  cargarEncuesta() {
    this.loading = true;
    this.encuestaService.obtenerEncuestaPorToken(this.token).subscribe({
      next: (data: Encuesta & { asesor?: string }) => {
        this.encuesta = data;
        this.inicializarFormulario();
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'Encuesta no encontrada o expirada';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  inicializarFormulario() {
    const respuestasArray = this.encuestaForm.get('respuestas') as FormArray;
    while (respuestasArray.length) {
      respuestasArray.removeAt(0);
    }

    respuestasArray.push(this.fb.group({
      preguntaId: [2],
      valorTexto: [''],
      valorNumerico: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      opcionId: [null]
    }));

    respuestasArray.push(this.fb.group({
      preguntaId: [3],
      valorTexto: [''],
      valorNumerico: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      opcionId: [null]
    }));

    respuestasArray.push(this.fb.group({
      preguntaId: [4],
      valorTexto: [''],
      valorNumerico: [null],
      opcionId: [null, Validators.required]
    }));

    respuestasArray.push(this.fb.group({
      preguntaId: [5],
      valorTexto: [''],
      valorNumerico: [null],
      opcionId: [null]
    }));
  }

  volver() {
    this.router.navigate(['/']);
  }

  enviarRespuesta() {
    let invalid = false;
    const respuestasArray = this.encuestaForm.get('respuestas') as FormArray;
    
    for (let i = 0; i < respuestasArray.length; i++) {
      const control = respuestasArray.at(i);
      const preguntaId = control.get('preguntaId')?.value;
      
      if (preguntaId === 2 || preguntaId === 3) {
        const valor = control.get('valorNumerico')?.value;
        if (!valor || valor < 1 || valor > 5) {
          invalid = true;
          break;
        }
      } else if (preguntaId === 4) {
        if (!control.get('opcionId')?.value) {
          invalid = true;
          break;
        }
      }
    }

    if (invalid) {
      alert('Por favor complete todas las preguntas obligatorias');
      return;
    }

    this.enviando = true;
    const formValue = this.encuestaForm.value;

    const nombreCompleto = this.encuesta?.clienteNombre || '';
    const partesNombre = nombreCompleto.split(' ');
    const nombre = partesNombre[0] || '';
    const apellido = partesNombre.slice(1).join(' ') || '';

    const data: EncuestaRequestDTO = {
      nombre: nombre,
      apellido: apellido,
      email: this.encuesta?.clienteEmail || '',
      telefono: '',
      marcaId: this.encuesta?.marcaId || 1,
      tipo: this.encuesta?.tipo || 'SERVICIO',
      respuestas: formValue.respuestas
    };

    this.encuestaService.responderEncuesta(this.token, data).subscribe({
      next: () => {
        this.enviando = false;
        this.exito = true;
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 3000);
      },
      error: (error) => {
        this.enviando = false;
        alert('Error al enviar la encuesta: ' + error.message);
        console.error('Error:', error);
      }
    });
  }
}