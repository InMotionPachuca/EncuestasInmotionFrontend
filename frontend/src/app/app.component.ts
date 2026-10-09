import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './services/auth.service';

export interface MenuItem {
  route: string;
  label: string;
  icon: string;
  badge?: string | null;
  badgeClass?: string;
  adminOnly?: boolean;
  gerenteOnly?: boolean;
  satisfaccionOnly?: boolean;
}

export interface MenuItemGroup {
  groupName: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'encuestas-app';
  sidebarOculta = false;

  // Variables para la caché del menú (evitan el bucle infinito)
  private roleActual: string = '';
  private menuAgrupadoCache: MenuItemGroup[] = [];

  private menuGroups: MenuItemGroup[] = [
    {
      groupName: 'CXI',
      items: [
        { route: '/dashboard', label: 'CXI', icon: 'fas fa-chart-pie', satisfaccionOnly: true },
        { route: '/importar', label: 'Importar Datos', icon: 'fas fa-file-upload', adminOnly: true },
        { route: '/listar', label: 'Encuestas', icon: 'fas fa-list-alt', satisfaccionOnly: true },
        { route: '/contestar-manual', label: 'Encuesta Manual', icon: 'fas fa-edit', satisfaccionOnly: true }
      ]
    },
    {
      groupName: 'Facturación',
      items: [
        { route: '/dashboard-facturacion', label: 'Facturación', icon: 'fas fa-chart-line', gerenteOnly: true },
        { route: '/crear', label: 'Crear Factura', icon: 'fas fa-file-invoice-dollar', gerenteOnly: true }
      ]
    },
    {
      groupName: 'QR',
      items: [
        { route: '/dashboard-qr', label: 'CXI QR', icon: 'fas fa-qrcode', badge: null, badgeClass: 'bg-warning text-dark', satisfaccionOnly: true },
        { route: '/encuestas-qr', label: 'Respuestas QR', icon: 'fas fa-mobile-alt', satisfaccionOnly: true },
        { route: '/generar-qr', label: 'Generar QR', icon: 'fas fa-qrcode', adminOnly: true }
      ]
    },
    {
      groupName: 'Clima Laboral',
      items: [
        { route: '/dashboard-clima', label: 'Clima', icon: 'fas fa-chart-pie', badge: null, badgeClass: 'bg-primary', adminOnly: true },
        { route: '/clima-laboral', label: 'Encuesta Clima', icon: 'fas fa-clipboard-check', satisfaccionOnly: true }
      ]
    },
    {
      groupName: 'Configuración',
      items: [
        { route: '/usuarios', label: 'Usuarios', icon: 'fas fa-users-cog', adminOnly: true },
        { route: '/asesores', label: 'Asesores', icon: 'fas fa-user-tie', adminOnly: true }
      ]
    }
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

  get filteredMenuGroups(): MenuItemGroup[] {
    let rolEvaluado = 'satisfaccion';
    if (this.authService.isAdmin()) {
      rolEvaluado = 'admin';
    } else if (this.authService.isGerente()) {
      rolEvaluado = 'gerente';
    }

    // Si el rol no ha cambiado y ya tenemos caché, devolvemos la caché
    if (this.roleActual === rolEvaluado && this.menuAgrupadoCache.length > 0) {
      return this.menuAgrupadoCache;
    }

    // Si es la primera vez o cambió el rol, calculamos el menú
    this.roleActual = rolEvaluado;
    this.menuAgrupadoCache = this.menuGroups.map(group => {
      let itemsFiltrados: MenuItem[] = [];

      if (rolEvaluado === 'admin') {
        itemsFiltrados = group.items;
      } else if (rolEvaluado === 'gerente') {
        itemsFiltrados = group.items.filter(item => item.gerenteOnly);
      } else {
        itemsFiltrados = group.items.filter(item => item.satisfaccionOnly);
      }

      return { ...group, items: itemsFiltrados };
    }).filter(group => group.items.length > 0);

    return this.menuAgrupadoCache;
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