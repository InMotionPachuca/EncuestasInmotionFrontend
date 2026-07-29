import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, UsuarioRegistro } from '../../services/auth.service';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
  usuarios: any[] = [];
  usuarioForm: FormGroup;
  
  loading = false;
  cargandoLista = false;
  mostrarModal = false;
  mostrarPassword = false;

  mensajeExito = '';
  mensajeError = '';

  readonly DOMINIOS_PERMITIDOS = ['@inmotion.com', '@toyotapachuca.com.mx'];

  constructor(
    private fb: FormBuilder,
    public authService: AuthService // Cambiado a public para acceder desde la plantilla
  ) {
    this.usuarioForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rol: ['USER', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.cargandoLista = true;
    this.authService.listarUsuarios().subscribe({
      next: (data) => {
        this.usuarios = data;
        this.cargandoLista = false;
      },
      error: () => {
        this.cargandoLista = false;
      }
    });
  }

  toggleVerPassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  abrirModal(): void {
    this.mensajeError = '';
    this.mensajeExito = '';
    this.mostrarPassword = false;
    this.usuarioForm.reset({ rol: 'USER' });
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  private esDominioValido(email: string): boolean {
    return this.DOMINIOS_PERMITIDOS.some(d => email.endsWith(d));
  }

  guardarUsuario(): void {
    if (this.usuarioForm.invalid) {
      this.mensajeError = 'Por favor completa todos los campos requeridos correctamente.';
      return;
    }

    const email = this.usuarioForm.get('email')?.value.toLowerCase().trim();

    if (!this.esDominioValido(email)) {
      this.mensajeError = 'Dominio no permitido. Utiliza @toyotapachuca.com.mx o @inmotion.com';
      return;
    }

    this.loading = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    const nuevoUsuario: UsuarioRegistro = {
      nombre: this.usuarioForm.get('nombre')?.value.trim(),
      email: email,
      password: this.usuarioForm.get('password')?.value,
      rol: this.usuarioForm.get('rol')?.value
    };

    this.authService.crearUsuario(nuevoUsuario).subscribe({
      next: () => {
        this.loading = false;
        this.mensajeExito = '¡Usuario registrado exitosamente!';
        this.cargarUsuarios();
        setTimeout(() => this.cerrarModal(), 1200);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.mensajeError = typeof err.error === 'string' 
          ? err.error 
          : (err.error?.message || 'Error al registrar el usuario.');
      }
    });
  }

  toggleEstado(usuario: any): void {
    const nuevoEstado = !usuario.activo;
    this.authService.cambiarEstadoUsuario(usuario.id, nuevoEstado).subscribe({
      next: () => {
        usuario.activo = nuevoEstado;
      }
    });
  }

  // Método para eliminar usuario de la DB (Solo ejecutable/visible para ti)
  eliminarUsuario(usuario: any): void {
    // Evita que te elimines a ti mismo accidentalmente
    if (usuario.email.toLowerCase() === 'oolguin@toyotapachuca.com.mx') {
      alert('No puedes eliminar tu propia cuenta de Administrador Principal.');
      return;
    }

    const confirmar = confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario ${usuario.nombre} (${usuario.email})?`);
    
    if (confirmar) {
      this.authService.eliminarUsuario(usuario.id).subscribe({
        next: () => {
          this.usuarios = this.usuarios.filter(u => u.id !== usuario.id);
        },
        error: (err: HttpErrorResponse) => {
          alert('Error al eliminar el usuario. Intenta de nuevo.');
        }
      });
    }
  }
}