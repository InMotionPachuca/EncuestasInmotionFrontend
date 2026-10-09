import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, AuthResponse } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  error = '';
  
  mostrarPassword = false;
  mostrarEmail = false;

  readonly DOMINIOS_PERMITIDOS = [
    '@inmotion.com',
    '@toyotapachuca.com.mx'
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // 1. Interceptar parámetro sso_token enviado por la Intranet
    this.route.queryParams.subscribe(params => {
      const ssoToken = params['sso_token'] || params['token'];
      if (ssoToken) {
        this.procesarSsoToken(ssoToken);
      }
    });
  }

  private procesarSsoToken(token: string): void {
    // Guardar token principal y variantes habituales
    localStorage.setItem('token', token);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('jwt', token);

    try {
      // Decodificar el payload del JWT para restaurar usuario/rol si vienen dentro
      const payloadBase64 = token.split('.')[1];
      if (payloadBase64) {
        const decodedPayload = JSON.parse(atob(payloadBase64));
        const email = decodedPayload.sub || decodedPayload.email || decodedPayload.username || '';
        const rol = decodedPayload.rol || decodedPayload.role || (decodedPayload.roles && decodedPayload.roles[0]) || '';

        if (email) {
          localStorage.setItem('userEmail', email);
        }
        if (rol) {
          localStorage.setItem('userRole', rol.toString().toUpperCase().replace('ROLE_', '').trim());
        }
        localStorage.setItem('currentUser', JSON.stringify({
          email: email,
          rol: rol,
          nombre: decodedPayload.nombre || decodedPayload.name || 'Usuario Intranet'
        }));
      }
    } catch (e) {
      console.warn('No se pudo decodificar el payload del SSO JWT:', e);
    }

    // Redirigir al dashboard según el rol o por defecto
    if (this.authService.isGerente() && !this.authService.isAdmin()) {
      this.router.navigate(['/dashboard-facturacion']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  toggleVerPassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  toggleVerEmail(): void {
    this.mostrarEmail = !this.mostrarEmail;
  }

  private esDominioValido(email: string): boolean {
    return this.DOMINIOS_PERMITIDOS.some(dominio => email.endsWith(dominio));
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.error = 'Por favor complete todos los campos correctamente.';
      return;
    }

    const email = this.loginForm.get('email')?.value.toLowerCase().trim();
    const password = this.loginForm.get('password')?.value;

    if (!this.esDominioValido(email)) {
      this.error = 'Dominio no autorizado. Utiliza tu correo corporativo (@toyotapachuca.com.mx o @inmotion.com)';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login({ email, password }).subscribe({
      next: (res: AuthResponse) => {
        this.loading = false;
        
        // Guardar token, email y rol
        const emailLimpio = (res.email || email).toLowerCase().trim();
        const rawRole = res.rol || res.role || res.usuario?.rol || res.usuario?.role || '';
        let role = rawRole.toString().toUpperCase().replace('ROLE_', '').trim();
        const userName = res.nombre || res.usuario?.nombre || emailLimpio.split('@')[0];

        localStorage.setItem('token', res.token);
        localStorage.setItem('userEmail', emailLimpio);
        localStorage.setItem('userName', userName);

        if (this.authService.isAdmin() || role === 'ADMIN' || role === 'ADMINISTRADOR' || emailLimpio.startsWith('admin')) {
          role = 'ADMIN';
        }

        localStorage.setItem('userRole', role || 'USER');
        localStorage.setItem('currentUser', JSON.stringify({
          email: emailLimpio,
          nombre: userName,
          rol: role || 'USER'
        }));

        // Redirección según rol
        if (this.authService.isGerente() && !this.authService.isAdmin()) {
          this.router.navigate(['/dashboard-facturacion']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.error = err.error?.message || 'Credenciales incorrectas o usuario no autorizado.';
      }
    });
  }
}