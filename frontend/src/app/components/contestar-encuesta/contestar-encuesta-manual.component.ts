import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EncuestaService } from '../../services/encuesta.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-contestar-encuesta-manual',
  templateUrl: './contestar-encuesta-manual.component.html',
  styleUrls: ['./contestar-encuesta-manual.component.css']
})
export class ContestarEncuestaManualComponent {
  searchForm: FormGroup;
  encuestaForm: FormGroup;
  encuestaEncontrada: any = null;
  loading = false;
  enviando = false;
  exito = false;
  marcas: any[] = [];
  clienteEncontrado = false;

  constructor(
    private fb: FormBuilder,
    private encuestaService: EncuestaService,
    private notificationService: NotificationService
  ) {
    this.marcas = this.encuestaService.obtenerMarcas();

    this.searchForm = this.fb.group({
      nombreCliente: ['', [Validators.required, Validators.minLength(3)]]
    });

    this.encuestaForm = this.fb.group({
      experienciaAgencia: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      experienciaAsesor: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      recomendacion: ['', Validators.required],
      comentario: ['']
    });
  }

  buscarEncuesta() {
    if (this.searchForm.invalid) {
      this.notificationService.show('Ingrese al menos 3 caracteres para buscar', 'warning');
      return;
    }

    this.loading = true;
    const nombre = this.searchForm.get('nombreCliente')?.value;

    this.encuestaService.listarEncuestas().subscribe({
      next: (encuestas: any[]) => {
        const encuestasPendientes = encuestas.filter(e => 
          e.estado === 'ENVIADA' && 
          e.clienteNombre.toLowerCase().includes(nombre.toLowerCase())
        );

        if (encuestasPendientes.length === 0) {
          this.notificationService.show('No se encontraron encuestas pendientes para este cliente', 'warning');
          this.encuestaEncontrada = null;
          this.clienteEncontrado = false;
          this.loading = false;
          return;
        }

        if (encuestasPendientes.length > 1) {
          this.encuestaEncontrada = encuestasPendientes.sort((a, b) => 
            new Date(b.fechaEnvio).getTime() - new Date(a.fechaEnvio).getTime()
          )[0];
          this.notificationService.show(
            'Se encontraron ' + encuestasPendientes.length + ' encuestas. Usando la mas reciente.',
            'info'
          );
        } else {
          this.encuestaEncontrada = encuestasPendientes[0];
        }

        this.clienteEncontrado = true;
        this.loading = false;
        this.notificationService.show(
          'Encuesta encontrada para ' + this.encuestaEncontrada.clienteNombre,
          'success'
        );
      },
      error: (error) => {
        console.error('Error al buscar encuesta:', error);
        this.loading = false;
        this.notificationService.show('Error al buscar la encuesta', 'error');
      }
    });
  }

  enviarEncuesta() {
    if (this.encuestaForm.invalid) {
      this.notificationService.show('Complete todas las preguntas requeridas', 'warning');
      return;
    }

    if (!this.encuestaEncontrada) {
      this.notificationService.show('Primero busque una encuesta', 'warning');
      return;
    }

    this.enviando = true;
    const formValue = this.encuestaForm.value;

    const respuestas = [
      {
        preguntaId: 2,
        valorTexto: '',
        valorNumerico: formValue.experienciaAgencia,
        opcionId: null
      },
      {
        preguntaId: 3,
        valorTexto: '',
        valorNumerico: formValue.experienciaAsesor,
        opcionId: null
      },
      {
        preguntaId: 4,
        valorTexto: '',
        valorNumerico: null,
        opcionId: formValue.recomendacion === 'SI' ? 1 : 2
      },
      {
        preguntaId: 5,
        valorTexto: formValue.comentario || '',
        valorNumerico: null,
        opcionId: null
      }
    ];

    const nombreCompleto = this.encuestaEncontrada.clienteNombre;
    const partes = nombreCompleto.split(' ');
    const nombre = partes[0] || '';
    const apellido = partes.slice(1).join(' ') || '';

    const data = {
      nombre: nombre,
      apellido: apellido,
      email: this.encuestaEncontrada.clienteEmail || '',
      telefono: '',
      marcaId: this.encuestaEncontrada.marcaId || 5,
      tipo: this.encuestaEncontrada.tipo || 'SERVICIO',
      respuestas: respuestas
    };

    this.encuestaService.responderEncuesta(this.encuestaEncontrada.token, data).subscribe({
      next: () => {
        this.enviando = false;
        this.exito = true;
        this.notificationService.show('Encuesta contestada exitosamente', 'success');
        setTimeout(() => {
          this.limpiar();
        }, 3000);
      },
      error: (error) => {
        console.error('Error al enviar encuesta:', error);
        this.enviando = false;
        this.notificationService.show('Error al enviar la encuesta: ' + error.message, 'error');
      }
    });
  }

  limpiar() {
    this.searchForm.reset();
    this.encuestaForm.reset({
      experienciaAgencia: 0,
      experienciaAsesor: 0,
      recomendacion: '',
      comentario: ''
    });
    this.encuestaEncontrada = null;
    this.clienteEncontrado = false;
    this.exito = false;
  }

  getCalificacionText(valor: number): string {
    if (valor === 0) return 'Seleccione';
    if (valor <= 1) return 'Muy Malo';
    if (valor <= 2) return 'Malo';
    if (valor <= 3) return 'Regular';
    if (valor <= 4) return 'Bueno';
    return 'Excelente';
  }
}