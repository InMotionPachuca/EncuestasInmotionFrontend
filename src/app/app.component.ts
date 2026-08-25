import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './services/auth.service';

interface MenuItem {
  route: string;
  label: string;
  icon: string;
  badge?: string | null;
  badgeClass?: string;
  adminOnly?: boolean;
  gerenteOnly?: boolean;
  satisfaccionOnly?: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'encuestas-app';
  sidebarOculta = false;

  private todosLosMenuItems: MenuItem[] = [
    // --- VISTAS DE SATISFACCIÓN (ADMIN Y USER) ---
    { route: '/dashboard', label: 'CXI', icon: 'fas fa-chart-pie', satisfaccionOnly: true },
    { route: '/dashboard-qr', label: 'CXI QR', icon: 'fas fa-qrcode', badge: null, badgeClass: 'bg-warning text-dark', satisfaccionOnly: true },
    { route: '/listar', label: 'Encuestas', icon: 'fas fa-list-alt', satisfaccionOnly: true },
    { route: '/encuestas-qr', label: 'Respuestas QR', icon: 'fas fa-mobile-alt', satisfaccionOnly: true },
    { route: '/contestar-manual', label: 'Contestar Manual', icon: 'fas fa-edit', satisfaccionOnly: true },

    // --- MÓDULO DE CLIMA LABORAL ---
    { route: '/clima-laboral', label: 'Encuesta Clima', icon: 'fas fa-clipboard-check', satisfaccionOnly: true },
    { route: '/dashboard-clima', label: 'Tablero Clima', icon: 'fas fa-chart-pie', badge: null, badgeClass: 'bg-primary', adminOnly: true },

    // --- MÓDULOS DE FACTURACIÓN (GERENTE Y ADMIN) ---
    { route: '/dashboard-facturacion', label: 'Tablero Facturación', icon: 'fas fa-chart-line', gerenteOnly: true },
    { route: '/crear', label: 'Facturación', icon: 'fas fa-file-invoice-dollar', gerenteOnly: true },

    // --- MÓDULOS EXCLUSIVOS DE ADMINISTRADOR ---
    { route: '/usuarios', label: 'Usuarios', icon: 'fas fa-users-cog', adminOnly: true },
    { route: '/asesores', label: 'Asesores', icon: 'fas fa-user-tie', adminOnly: true },
    { route: '/importar', label: 'Importar Datos', icon: 'fas fa-file-upload', adminOnly: true },
    { route: '/generar-qr', label: 'Generar QR', icon: 'fas fa-qrcode', adminOnly: true }
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

  toggleSidebar(): void {
    this.sidebarOculta = !this.sidebarOculta;
  }

  get menuItems(): MenuItem[] {
    if (this.authService.isAdmin()) {
      return this.todosLosMenuItems;
    }
    if (this.authService.isGerente()) {
      return this.todosLosMenuItems.filter(item => item.gerenteOnly);
    }
    return this.todosLosMenuItems.filter(item => item.satisfaccionOnly);
  }

  isPublicRoute(): boolean {
    const url = this.router.url;
    return url.includes('/login') || 
           url.includes('/responder') || 
           url.includes('/evaluar') || 
           url.includes('/gracias') ||
           url.includes('/clima-laboral') ||
           url.includes('/gracias-clima');
  }

  toggleUserMenu(): void {
    this.mostrarMenuUsuario = !this.mostrarMenuUsuario;
  }

  toggleVerPasswordActual(): void {
    this.mostrarPasswordActual = !this.mostrarPasswordActual;
  }

  toggleVerNuevaPassword(): void {
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

  abrirModalPassword(): void {
    this.mostrarMenuUsuario = false;
    this.mensajePasswordSuccess = '';
    this.mensajePasswordError = '';
    this.mostrarPasswordActual = false;
    this.mostrarNuevaPassword = false;
    this.passwordForm.reset();
    this.mostrarModalPassword = true;
  }

  cerrarModalPassword(): void {
    this.mostrarModalPassword = false;
  }

  cambiarPassword(): void {
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

  logout(): void {
    this.mostrarMenuUsuario = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}