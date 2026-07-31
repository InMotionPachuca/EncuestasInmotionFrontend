import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para proteger rutas que requieren cualquier usuario logueado
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true; // Permite el acceso
  }

  // Si no ha iniciado sesión, redirige al login
  return router.createUrlTree(['/login']);
};

/**
 * Guard para proteger rutas exclusivas del Administrador (oolguin@toyotapachuca.com.mx)
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Valida que el email guardado corresponda al admin
  if (authService.isAdmin()) {
    return true; // Permite el acceso
  }

  // Si está logueado pero no es Admin, lo manda al Dashboard
  if (authService.isLoggedIn()) {
    return router.createUrlTree(['/dashboard']);
  }

  // Si no está ni logueado, lo manda al Login
  return router.createUrlTree(['/login']);
};