import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EncuestaService } from '../../services/encuesta.service';
import { Encuesta, EncuestaRequestDTO, EncuestaRespuestaDTO } from '../../models/encuesta.model';

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

  hoverRating1: number = 0;
  hoverRating2: number = 0;

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

  get totalCompletadas(): number {
    let count = 0;
    if (this.encuestaForm.get('experiencia')?.value > 0) count++;
    if (this.encuestaForm.get('atencion')?.value > 0) count++;
    if (this.encuestaForm.get('tiempoAdecuado')?.value) count++;
    if (this.encuestaForm.get('recomienda')?.value) count++;
    return count;
  }

  get porcentajeCompletado(): number {
    return Math.round((this.totalCompletadas / 4) * 100);
  }

  getRatingLabel(valor: number): string {
    switch (valor) {
      case 5: return 'Excelente (5 de 5)';
      case 4: return 'Muy Bueno (4 de 5)';
      case 3: return 'Aceptable (3 de 5)';
      case 2: return 'Regular (2 de 5)';
      case 1: return 'Deficiente (1 de 5)';
      default: return 'Seleccione una calificación';
    }
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

  get esVenta(): boolean {
    return this.encuesta?.tipo === 'VENTA';
  }

  get esCompra(): boolean {
    return this.encuesta?.tipo === 'COMPRA' || this.encuesta?.tipo === 'COMPRA_AUTO';
  }

  getTituloEncuesta(): string {
    if (this.esCompra) return 'Encuesta de Satisfacción en Compras (ComproCars)';
    if (this.esVenta) return 'Encuesta de Satisfacción en Ventas';
    if (this.encuesta?.tipo === 'POSTVENTA') return 'Encuesta de Satisfacción en Postventa';
    return 'Encuesta de Satisfacción en Servicio';
  }

  getSubtituloEncuesta(): string {
    if (this.esCompra) {
      return 'Agradecemos su confianza durante el proceso de compra/toma de su vehículo, nos gustaría conocer su experiencia.';
    }
    if (this.esVenta) {
      return 'Agradecemos su preferencia en la compra de su unidad, nos gustaría conocer su experiencia.';
    }
    return 'Agradecemos su reciente visita, nos gustaría que nos compartiera su experiencia.';
  }

  getPregunta1Texto(): string {
    if (this.esCompra) {
      return '¿Cómo califica la rapidez y transparencia en la valuación de su vehículo?';
    }
    if (this.esVenta) {
      return '¿Cómo evaluaría su experiencia general durante el proceso de compra de su vehículo?';
    }
    return '¿Cómo evaluaría su experiencia general con el servicio realizado a su vehículo?';
  }

  getPregunta2Texto(): string {
    if (this.esCompra) {
      return '¿Cómo califica la atención y profesionalismo brindado por su Asesor de Compras?';
    }
    if (this.esVenta) {
      return '¿Cómo califica la atención y asesoría brindada por su Asesor de Ventas?';
    }
    return '¿Cómo califica la atención y amabilidad brindada por su Asesor de Servicio?';
  }

  getPregunta3Texto(): string {
    if (this.esCompra) {
      return '¿El trámite administrativo y pago se realizó en el tiempo y condiciones acordadas?';
    }
    if (this.esVenta) {
      return '¿La entrega de su vehículo se realizó en el tiempo y condiciones acordadas?';
    }
    return '¿El vehículo le fue entregado en el tiempo prometido?';
  }

  getPregunta4Texto(): string {
    if (this.esCompra) {
      return '¿Recomendaría nuestro servicio de compra/toma de vehículos a sus familiares y amigos?';
    }
    if (this.esVenta) {
      return '¿Recomendaría nuestra agencia de ventas a sus familiares y amigos?';
    }
    return '¿Recomendaría nuestro taller de servicio a sus familiares y amigos?';
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

    const respuestasData: EncuestaRespuestaDTO[] = [
      { preguntaId: 2, valorTexto: '', valorNumerico: Number(formValue.experiencia) },
      { preguntaId: 3, valorTexto: '', valorNumerico: Number(formValue.atencion) },
      { preguntaId: 4, valorTexto: '', opcionId: formValue.tiempoAdecuado === 'SI' ? 1 : 2 },
      { preguntaId: 5, valorTexto: '', opcionId: formValue.recomienda === 'SI' ? 1 : 2 },
      { preguntaId: 6, valorTexto: formValue.comentarios || '' }
    ];

    const nombreCompleto = this.encuesta.clienteNombre || 'Cliente General';
    const partesNombre = nombreCompleto.trim().split(' ');
    const primerNombre = partesNombre[0] || 'Cliente';
    const apellidos = partesNombre.slice(1).join(' ') || 'General';

    const payloadDTO: EncuestaRequestDTO = {
      nombre: primerNombre,
      apellido: apellidos,
      email: this.encuesta.clienteEmail || 'cliente@inmotion.com',
      telefono: this.encuesta.clienteTelefono || this.encuesta.telefono || '0000000000',
      asesor: this.encuesta.asesor || 'Atención a Clientes',
      unidad: this.encuesta.unidad || '',
      marcaId: this.encuesta.marcaId || 1,
      tipo: this.encuesta.tipo || 'POSTVENTA',
      respuestas: respuestasData
    };

    this.encuestaService.responderEncuesta(this.token, payloadDTO).subscribe({
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