import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.isAdmin()) {
      return true; // Acceso permitido a oolguin@toyotapachuca.com.mx
    }

    // Redirige al Dashboard si intenta ingresar otro usuario
    this.router.navigate(['/dashboard']);
    return false;
  }
}