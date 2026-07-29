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
    rol: string;
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

  // Correo de Administrador Principal
  private readonly ADMIN_EMAIL = 'oolguin@toyotapachuca.com.mx';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
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

  // Verifica si el usuario actual es oolguin@toyotapachuca.com.mx
  isAdmin(): boolean {
    const email = this.getUserEmail();
    return email === this.ADMIN_EMAIL;
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

  // Eliminar usuario permanentemente
  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete(`${this.usuariosUrl}/${id}`, { headers: this.getAuthHeaders() });
  }
}