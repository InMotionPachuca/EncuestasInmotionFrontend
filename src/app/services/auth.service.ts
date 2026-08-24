import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthResponse {
  token: string;
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

  private readonly ADMIN_EMAIL = 'oolguin@toyotapachuca.com.mx';

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
    return this.http.post<AuthResponse>(`${this.authUrl}/login`, credentials);
  }

  getUserEmail(): string {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.email) return user.email.toLowerCase().trim();
      } catch (e) {}
    }
    return (localStorage.getItem('userEmail') || '').toLowerCase().trim();
  }

  /**
   * Extrae el rol desde currentUser, localStorage directo o decodificando el JWT
   */
  getUserRole(): string {
    // 1. Verificar si está en localStorage directo
    const directRole = localStorage.getItem('userRole');
    if (directRole) {
      return directRole.toUpperCase().replace('ROLE_', '').trim();
    }

    // 2. Verificar en el objeto currentUser
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        let rawRole = user.rol || user.role || user.perfil || '';

        // Si viene como arreglo de roles/authorities
        if (!rawRole && Array.isArray(user.roles) && user.roles.length > 0) {
          rawRole = typeof user.roles[0] === 'string' ? user.roles[0] : user.roles[0].nombre || user.roles[0].name;
        }
        if (!rawRole && Array.isArray(user.authorities) && user.authorities.length > 0) {
          rawRole = user.authorities[0].authority || user.authorities[0];
        }

        if (rawRole) {
          return rawRole.toString().toUpperCase().replace('ROLE_', '').trim();
        }
      } catch (e) {}
    }

    // 3. Decodificar desde el Payload del JWT Token
    const token = localStorage.getItem('token');
    if (token && token.includes('.')) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const jwtRole = payload.role || payload.rol || payload.roles || (payload.authorities && payload.authorities[0]);
        if (jwtRole) {
          return jwtRole.toString().toUpperCase().replace('ROLE_', '').trim();
        }
      } catch (e) {}
    }

    return '';
  }

  isAdmin(): boolean {
    const email = this.getUserEmail();
    const rol = this.getUserRole();
    return email === this.ADMIN_EMAIL || rol === 'ADMIN' || rol === 'ROLE_ADMIN' || rol === 'ADMINISTRADOR';
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