import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  error = '';

  // Correos permitidos (expuestos para el HTML)
  allowedEmails = [
    'admin@inmotion.com',
    'gerencia@inmotion.com',
    'operaciones@inmotion.com'
  ];

  // Credenciales de prueba (mock)
  private credentials: { [key: string]: string } = {
    'admin@inmotion.com': 'admin123',
    'gerencia@inmotion.com': 'gerencia123',
    'operaciones@inmotion.com': 'operaciones123'
  };

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.error = 'Por favor ingrese credenciales validas';
      return;
    }

    const email = this.loginForm.get('email')?.value;
    const password = this.loginForm.get('password')?.value;

    // 1. Verificar si el correo está en la lista de permitidos
    if (!this.allowedEmails.includes(email)) {
      this.error = 'Acceso denegado. Este correo no está autorizado.';
      return;
    }

    // 2. Verificar la contraseña (mock)
    if (this.credentials[email] !== password) {
      this.error = 'Contraseña incorrecta.';
      return;
    }

    this.loading = true;
    this.error = '';

    setTimeout(() => {
      this.loading = false;
      localStorage.setItem('userEmail', email);
      this.router.navigate(['/dashboard']);
    }, 1500);
  }
}