import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EncuestaService } from '../../services/encuesta.service';

@Component({
  selector: 'app-crear-encuesta',
  templateUrl: './crear-encuesta.component.html',
  styleUrls: ['./crear-encuesta.component.css']
})
export class CrearEncuestaComponent {
  encuestaForm: FormGroup;
  marcas: any[] = [];
  loading = false;
  exito = false;
  linkGenerado = '';
  tokenGenerado = '';
  encuestaCreada: any = null;
  fechaVisitaFormateada = '';

  constructor(
    private fb: FormBuilder,
    private encuestaService: EncuestaService
  ) {
    this.marcas = this.encuestaService.obtenerMarcas();
    const hoy = new Date().toISOString().split('T')[0];

    this.encuestaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      email: [''], 
      telefono: ['', [Validators.required, Validators.minLength(8)]], 
      asesor: [''], 
      unidad: [''],
      fechaVisita: [hoy, Validators.required],
      marcaId: ['', Validators.required],
      tipo: ['POSTVENTA', Validators.required]
    });
  }

  generarEncuesta() {
    if (this.encuestaForm.invalid) {
      alert('Por favor complete los campos requeridos');
      return;
    }

    this.loading = true;
    const formValue = this.encuestaForm.value;

    const data = {
      nombre: formValue.nombre,
      apellido: formValue.apellido,
      email: formValue.email || 'sin_correo@inmotion.com', 
      telefono: formValue.telefono ? formValue.telefono.toString().replace(/\D/g, '') : '',
      asesor: formValue.asesor || 'Atención a Clientes', 
      unidad: formValue.unidad || '',
      fechaVisita: formValue.fechaVisita,
      marcaId: Number(formValue.marcaId),
      tipo: formValue.tipo,
      respuestas: []
    };

    this.encuestaService.crearEncuesta(data).subscribe({
      next: (response) => {
        this.loading = false;
        this.exito = true;
        this.encuestaCreada = response;
        this.tokenGenerado = response.token;
        this.linkGenerado = this.encuestaService.generarLinkEncuesta(response.token);
        this.fechaVisitaFormateada = formValue.fechaVisita;
      },
      error: (error) => {
        this.loading = false;
        alert('Error al generar la encuesta: ' + error.message);
        console.error('Error:', error);
      }
    });
  }

  copiarLink() {
    navigator.clipboard.writeText(this.linkGenerado);
    alert('Link copiado al portapapeles');
  }

  resetForm() {
    const hoy = new Date().toISOString().split('T')[0];
    this.encuestaForm.reset({ 
      tipo: 'POSTVENTA',
      fechaVisita: hoy 
    });
    this.exito = false;
    this.linkGenerado = '';
    this.tokenGenerado = '';
    this.encuestaCreada = null;
    this.fechaVisitaFormateada = '';
  }
}