import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'encuestas-app';

menuItems = [
  { route: '/dashboard', label: 'CXI', icon: 'fas fa-chart-pie', badge: null, badgeClass: '' },
  { route: '/asesores', label: 'Asesores', icon: 'fas fa-user-tie', badge: null, badgeClass: '' },
  { route: '/crear', label: 'Crear Encuesta', icon: 'fas fa-plus-circle', badge: null, badgeClass: 'bg-danger' },
  { route: '/listar', label: 'Encuestas', icon: 'fas fa-list-alt', badge: null, badgeClass: '' },
  { route: '/importar', label: 'Importar Datos', icon: 'fas fa-file-upload', badge: null, badgeClass: '' },
  { route: '/contestar-manual', label: 'Contestar Manual', icon: 'fas fa-edit', badge: null, badgeClass: '' }
];
  constructor(private router: Router) {}

  isPublicRoute(): boolean {
    const url = this.router.url;
    return url.includes('/login') || url.includes('/responder');
  }

  getUserName(): string {
    return localStorage.getItem('userName') || 'Usuario';
  }

  logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userName');
    this.router.navigate(['/login']);
  }

  onLogoError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      const text = document.createElement('span');
      text.style.cssText = 'font-size: 1.1rem; font-weight: 700; color: white; letter-spacing: 2px;';
      text.textContent = 'INMO';
      parent.appendChild(text);
    }
  }
}