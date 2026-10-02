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
  tokenGenerado = '';
  encuestaCreada: any = null;
  fechaVisitaFormateada = '';

  constructor(
    private fb: FormBuilder,
    private encuestaService: EncuestaService
  ) {
    this.marcas = this.encuestaService.obtenerMarcas();
    const hoy = new Date().toISOString().split('T')[0];

    // TODOS LOS CAMPOS OBLIGATORIOS (ESTADO: NUEVO / SEMINUEVO)
    this.encuestaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]], 
      telefono: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10), Validators.pattern(/^[0-9]+$/)]], 
      asesor: ['', [Validators.required, Validators.minLength(3)]], 
      marcaVehiculo: ['', Validators.required],
      unidad: ['', Validators.required],
      factura: ['', [Validators.required, Validators.minLength(4)]],
      serie: ['', [Validators.required, Validators.minLength(8)]],
      año: ['NUEVO', Validators.required], // Selección Nuevo / Seminuevo
      fechaVisita: [hoy, Validators.required],
      marcaId: ['', Validators.required],
      tipo: ['VENTA', Validators.required]
    });
  }

  generarEncuesta(): void {
    if (this.encuestaForm.invalid) {
      this.encuestaForm.markAllAsTouched();
      alert('Por favor complete todos los campos obligatorios del formulario');
      return;
    }

    this.loading = true;
    const f = this.encuestaForm.value;

    const unidadCompleta = `${f.marcaVehiculo.trim()} ${f.unidad.trim()}`.trim();

    const data = {
      nombre: f.nombre.trim(),
      apellido: f.apellido.trim(),
      email: f.email.trim(), 
      telefono: f.telefono.toString().replace(/\D/g, ''),
      asesor: f.asesor.trim(), 
      unidad: unidadCompleta,
      serie: f.serie.trim(),
      fechaVisita: f.fechaVisita,
      marcaId: Number(f.marcaId),
      tipo: f.tipo,
      respuestas: []
    };

    this.encuestaService.crearEncuesta(data).subscribe({
      next: (response) => {
        this.loading = false;
        this.exito = true;
        this.encuestaCreada = response;
        this.tokenGenerado = response.token;
        this.fechaVisitaFormateada = f.fechaVisita;
      },
      error: (error) => {
        this.loading = false;
        alert('Error al registrar los datos de facturación: ' + error.message);
      }
    });
  }

  resetForm(): void {
    const hoy = new Date().toISOString().split('T')[0];
    this.encuestaForm.reset({ 
      tipo: 'VENTA',
      año: 'NUEVO',
      fechaVisita: hoy,
      marcaId: ''
    });
    this.exito = false;
    this.tokenGenerado = '';
    this.encuestaCreada = null;
    this.fechaVisitaFormateada = '';
  }
}