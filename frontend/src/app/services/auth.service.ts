import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthResponse {
  token: string;
  email?: string;
  nombre?: string;
  usuario?: any;
  rol?: string;
  role?: string;
}

export interface UsuarioRegistro {
  nombre: string;
  email: string;
  password: string;
  rol: string;
}

export interface CambioPassword {
  email: string;
  passwordActual: string;
  nuevaPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authUrl = `${environment.apiUrl}/auth`;
  private usuariosUrl = `${environment.apiUrl}/usuarios`;

  // LISTA DE ADMINISTRADORES INSTITUCIONALES POR CORREO
  private readonly ADMIN_EMAILS = [
    'admin@toyotapachuca.com.mx',
    'admin@inmotion.com',
    'cjuarez@toyotapachuca.com.mx',
    'oolguin@toyotapachuca.com.mx'
  ];

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  logout(): void {
    localStorage.clear();
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/login`, credentials).pipe(
      tap((res: AuthResponse) => {
        const email = (res.email || credentials.email).toLowerCase().trim();
        const rawRole = res.rol || res.role || res.usuario?.rol || res.usuario?.role || '';
        let role = rawRole.toString().toUpperCase().replace('ROLE_', '').trim();
        const userName = res.nombre || res.usuario?.nombre || email.split('@')[0];

        localStorage.setItem('token', res.token);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userName', userName);

        // Si es admin por lista, prefijo admin o rol del backend
        if (this.ADMIN_EMAILS.includes(email) || email.startsWith('admin') || role === 'ADMIN' || role === 'ADMINISTRADOR') {
          role = 'ADMIN';
        }

        localStorage.setItem('userRole', role || 'USER');
      })
    );
  }

  getUserEmail(): string {
    const emailDirecto = localStorage.getItem('userEmail');
    if (emailDirecto) return emailDirecto.toLowerCase().trim();

    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.email) return user.email.toLowerCase().trim();
      } catch (e) {}
    }

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const email = payload.sub || payload.email || payload.username;
          if (email) {
            const clean = email.toLowerCase().trim();
            localStorage.setItem('userEmail', clean);
            return clean;
          }
        }
      } catch (e) {}
    }

    return '';
  }

  getUserName(): string {
    const nameDirecto = localStorage.getItem('userName');
    if (nameDirecto) return nameDirecto;
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.nombre) return user.nombre;
      } catch (e) {}
    }
    const email = this.getUserEmail();
    if (email === 'admin@toyotapachuca.com.mx') return 'Administrador General';
    if (email === 'cjuarez@toyotapachuca.com.mx') return 'Cecilia Juárez';
    if (email === 'oolguin@toyotapachuca.com.mx') return 'Oscar Olguín';
    if (email === 'admin@inmotion.com') return 'Administrador InMotion';
    return email ? email.split('@')[0] : 'Usuario';
  }

  getUserRole(): string {
    const email = this.getUserEmail();
    if (this.ADMIN_EMAILS.includes(email) || email.startsWith('admin')) {
      if (localStorage.getItem('userRole') !== 'ADMIN') {
        localStorage.setItem('userRole', 'ADMIN');
      }
      return 'ADMIN';
    }

    const directRole = localStorage.getItem('userRole');
    if (directRole) {
      return directRole.toUpperCase().replace('ROLE_', '').trim();
    }

    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const r = user.rol || user.role || user.perfil || '';
        if (r) return r.toString().toUpperCase().replace('ROLE_', '').trim();
      } catch (e) {}
    }

    return 'USER';
  }

  isAdmin(): boolean {
    const email = this.getUserEmail();
    const rol = this.getUserRole();
    return this.ADMIN_EMAILS.includes(email) || 
           email.startsWith('admin') || 
           rol === 'ADMIN' || 
           rol === 'ROLE_ADMIN' || 
           rol === 'ADMINISTRADOR';
  }

  isGerente(): boolean {
    if (this.isAdmin()) {
      return false;
    }
    const email = this.getUserEmail();
    const rol = this.getUserRole();
    return rol === 'GERENTE' || rol === 'ROLE_GERENTE' || rol === 'FACTURACION' || email.includes('facturacion');
  }

  cambiarPassword(datos: CambioPassword): Observable<any> {
    return this.http.post(`${this.usuariosUrl}/cambiar-password`, datos, { 
      headers: this.getAuthHeaders(), 
      responseType: 'text' 
    });
  }

  listarUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(this.usuariosUrl, { headers: this.getAuthHeaders() });
  }

  crearUsuario(usuario: UsuarioRegistro): Observable<any> {
    return this.http.post(`${this.usuariosUrl}/crear`, usuario, { headers: this.getAuthHeaders() });
  }

  cambiarEstadoUsuario(id: number, activo: boolean): Observable<any> {
    return this.http.put(`${this.usuariosUrl}/${id}/estado?activo=${activo}`, {}, { headers: this.getAuthHeaders() });
  }

  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete(`${this.usuariosUrl}/${id}`, { headers: this.getAuthHeaders() });
  }
}