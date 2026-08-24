import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthResponse {
  token: string;
  usuario: {
    id: number;
    email: string;
    nombre: string;
    rol?: string;
    role?: string;
  };
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

  // Correo de Administrador Maestro
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
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
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

  getUserRole(): string {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const r = user.rol || user.role || user.perfil || '';
        if (r) return r.toString().toUpperCase().replace('ROLE_', '').trim();
      } catch (e) {}
    }
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) return storedRole.toUpperCase().replace('ROLE_', '').trim();
    return '';
  }

  /**
   * Verifica si el usuario actual es Administrador (por correo maestro o por rol en BD)
   */
  isAdmin(): boolean {
    const email = this.getUserEmail();
    const rol = this.getUserRole();
    return email === this.ADMIN_EMAIL || rol === 'ADMIN' || rol === 'ROLE_ADMIN' || rol === 'ADMINISTRADOR';
  }

  /**
   * Verifica si el usuario actual es Gerente/Facturación.
   * Si es ADMIN, devuelve false para que no sea reclasificado como solo gerente.
   */
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