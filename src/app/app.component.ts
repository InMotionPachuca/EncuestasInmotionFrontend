import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'encuestas-app';

  // Todos los ítems de navegación marcando cuáles requieren ser Admin
  private todosLosMenuItems = [
    { route: '/dashboard', label: 'CXI', icon: 'fas fa-chart-pie', badge: null, badgeClass: '', adminOnly: false },
    { route: '/dashboard-qr', label: 'CXI QR', icon: 'fas fa-qrcode', badge: null, badgeClass: 'bg-warning text-dark', adminOnly: false },
    { route: '/usuarios', label: 'Usuarios', icon: 'fas fa-users-cog', badge: null, badgeClass: '', adminOnly: true },
    { route: '/asesores', label: 'Asesores', icon: 'fas fa-user-tie', badge: null, badgeClass: '', adminOnly: false },
    { route: '/crear', label: 'Crear Encuesta', icon: 'fas fa-plus-circle', badge: null, badgeClass: 'bg-danger', adminOnly: false },
    { route: '/listar', label: 'Encuestas', icon: 'fas fa-list-alt', badge: null, badgeClass: '', adminOnly: false },
    { route: '/importar', label: 'Importar Datos', icon: 'fas fa-file-upload', badge: null, badgeClass: '', adminOnly: false },
    { route: '/contestar-manual', label: 'Contestar Manual', icon: 'fas fa-edit', badge: null, badgeClass: '', adminOnly: false },
    { route: '/generar-qr', label: 'Generar QR', icon: 'fas fa-qrcode', badge: null, badgeClass: '', adminOnly: false }
  ];

  mostrarMenuUsuario = false;
  mostrarModalPassword = false;

  mostrarPasswordActual = false;
  mostrarNuevaPassword = false;

  passwordForm: FormGroup;
  loadingPassword = false;
  mensajePasswordSuccess = '';
  mensajePasswordError = '';

  constructor(
    private router: Router,
    private fb: FormBuilder,
    public authService: AuthService
  ) {
    this.passwordForm = this.fb.group({
      passwordActual: ['', [Validators.required]],
      nuevaPassword: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  // Getter que filtra las opciones según quien haya iniciado sesión
  get menuItems() {
    if (this.authService.isAdmin()) {
      return this.todosLosMenuItems;
    }
    return this.todosLosMenuItems.filter(item => !item.adminOnly);
  }

  // RUTAS PÚBLICAS SIN NAVBAR NI SIDEBAR (AÑADIDO /gracias)
  isPublicRoute(): boolean {
    const url = this.router.url;
    return url.includes('/login') || 
           url.includes('/responder') || 
           url.includes('/evaluar') || 
           url.includes('/gracias');
  }

  toggleUserMenu() {
    this.mostrarMenuUsuario = !this.mostrarMenuUsuario;
  }

  toggleVerPasswordActual() {
    this.mostrarPasswordActual = !this.mostrarPasswordActual;
  }

  toggleVerNuevaPassword() {
    this.mostrarNuevaPassword = !this.mostrarNuevaPassword;
  }

  getUserName(): string {
    const email = this.authService.getUserEmail();
    if (email && email.includes('@')) {
      const usuarioLimpio = email.split('@')[0];
      return `Hola, ${usuarioLimpio}`;
    }
    return 'Hola, usuario';
  }

  getUserEmail(): string {
    return this.authService.getUserEmail() || 'usuario@empresa.com';
  }

  abrirModalPassword() {
    this.mostrarMenuUsuario = false;
    this.mensajePasswordSuccess = '';
    this.mensajePasswordError = '';
    this.mostrarPasswordActual = false;
    this.mostrarNuevaPassword = false;
    this.passwordForm.reset();
    this.mostrarModalPassword = true;
  }

  cerrarModalPassword() {
    this.mostrarModalPassword = false;
  }

  cambiarPassword() {
    if (this.passwordForm.invalid) {
      this.mensajePasswordError = 'La nueva contraseña debe tener al menos 8 caracteres.';
      return;
    }

    const email = this.getUserEmail();
    this.loadingPassword = true;
    this.mensajePasswordError = '';
    this.mensajePasswordSuccess = '';

    const payload = {
      email: email,
      passwordActual: this.passwordForm.get('passwordActual')?.value,
      nuevaPassword: this.passwordForm.get('nuevaPassword')?.value
    };

    this.authService.cambiarPassword(payload).subscribe({
      next: () => {
        this.loadingPassword = false;
        this.mensajePasswordSuccess = '¡Contraseña actualizada exitosamente!';
        setTimeout(() => this.cerrarModalPassword(), 1500);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingPassword = false;
        this.mensajePasswordError = typeof err.error === 'string' 
          ? err.error 
          : (err.error?.message || 'Error al cambiar la contraseña.');
      }
    });
  }

  logout() {
    this.mostrarMenuUsuario = false;
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  onLogoError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}