import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
  mostrarPassword = false; // <-- Controla el tipo de input ('text' o 'password')

  readonly DOMINIOS_PERMITIDOS = [
    '@inmotion.com',
    '@toyotapachuca.com.mx'
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {}

  // Alterna la visibilidad de la contraseña al hacer clic en el ojito
  toggleVerPassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
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
        localStorage.setItem('token', res.token);
        localStorage.setItem('currentUser', JSON.stringify(res.usuario));
        localStorage.setItem('userEmail', email);
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.error = err.error?.message || 'Credenciales incorrectas o usuario no autorizado.';
      }
    });
  }
}