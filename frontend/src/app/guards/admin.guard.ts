import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para rutas de satisfacción (CXI, Listar Encuestas, etc.)
 * Bloquea al GERENTE para que no vea métricas de encuestas.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  // Si es Gerente (Facturación), redirigir directamente a su tablero
  if (authService.isGerente() && !authService.isAdmin()) {
    return router.createUrlTree(['/dashboard-facturacion']);
  }

  return true;
};

/**
 * Guard para rutas exclusivas de ADMIN
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true;
  }

  if (authService.isLoggedIn()) {
    return authService.isGerente() 
      ? router.createUrlTree(['/dashboard-facturacion']) 
      : router.createUrlTree(['/dashboard']);
  }

  return router.createUrlTree(['/login']);
};

/**
 * Guard para rutas de Facturación (GERENTE y ADMIN)
 */
export const gerenteGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isGerente() || authService.isAdmin()) {
    return true;
  }

  if (authService.isLoggedIn()) {
    return router.createUrlTree(['/dashboard']);
  }

  return router.createUrlTree(['/login']);
};