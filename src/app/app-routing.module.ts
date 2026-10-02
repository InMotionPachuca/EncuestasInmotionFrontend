import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Componentes
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CrearEncuestaComponent } from './components/crear-encuesta/crear-encuesta.component';
import { ResponderEncuestaComponent } from './components/responder-encuesta/responder-encuesta.component';
import { ListarEncuestasComponent } from './components/listar-encuestas/listar-encuestas.component';
import { ImportarEncuestasComponent } from './components/importar-encuestas/importar-encuestas.component';
import { ContestarEncuestaManualComponent } from './components/contestar-encuesta/contestar-encuesta-manual.component';
import { AsesoresComponent } from './components/asesores/asesores.component';
import { UsuariosComponent } from './components/usuarios/usuarios.component';
import { EncuestaEstaticaComponent } from './components/encuesta-estatica/encuesta-estatica.component';
import { EncuestaComprasAutoComponent } from './components/encuesta-compras-auto/encuesta-compras-auto.component';
import { GenerarQrComponent } from './components/generar-qr/generar-qr.component';
import { DashboardQrComponent } from './components/dashboard-qr/dashboard-qr.component'; 
import { ListarEncuestasQrComponent } from './components/listar-encuestas-qr/listar-encuestas-qr.component';
import { DashboardFacturacionComponent } from './components/dashboard-facturacion/dashboard-facturacion.component';
import { AgradecimientoComponent } from './paginas/agradecimiento.component';

// Componentes de Clima Laboral
import { ClimaLaboralComponent } from './components/clima-laboral/clima-laboral.component';
import { AgradecimientoClimaComponent } from './paginas/agradecimiento-clima/agradecimiento-clima.component';
import { DashboardClimaComponent } from './components/dashboard-clima/dashboard-clima.component';

// Guards
import { authGuard, adminGuard, gerenteGuard } from './guards/admin.guard';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // --- RUTAS PÚBLICAS (Sin autenticación) ---
  { path: 'login', component: LoginComponent },
  { path: 'evaluar', component: EncuestaEstaticaComponent },
  { path: 'compras-auto', component: EncuestaComprasAutoComponent },
  { path: 'responder/:token', component: ResponderEncuestaComponent },
  { path: 'gracias', component: AgradecimientoComponent },
  
  // Clima Laboral Público
  { path: 'clima-laboral', component: ClimaLaboralComponent },
  { path: 'gracias-clima', component: AgradecimientoClimaComponent },

  // --- RUTAS PROTEGIDAS (Cualquier usuario autenticado) ---
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'dashboard-qr', component: DashboardQrComponent, canActivate: [authGuard] },
  { path: 'listar', component: ListarEncuestasComponent, canActivate: [authGuard] },
  { path: 'encuestas-qr', component: ListarEncuestasQrComponent, canActivate: [authGuard] },
  { path: 'contestar-manual', component: ContestarEncuestaManualComponent, canActivate: [authGuard] },

  // --- RUTAS EXCLUSIVAS DE FACTURACIÓN (GERENTE Y ADMIN) ---
  { path: 'crear', component: CrearEncuestaComponent, canActivate: [gerenteGuard] },
  { path: 'dashboard-facturacion', component: DashboardFacturacionComponent, canActivate: [gerenteGuard] },

  // --- RUTAS PROTEGIDAS EXCLUSIVAS DE ADMIN ---
  { path: 'dashboard-clima', component: DashboardClimaComponent, canActivate: [adminGuard] },
  { path: 'asesores', component: AsesoresComponent, canActivate: [adminGuard] },
  { path: 'importar', component: ImportarEncuestasComponent, canActivate: [adminGuard] },
  { path: 'usuarios', component: UsuariosComponent, canActivate: [adminGuard] },
  { path: 'generar-qr', component: GenerarQrComponent, canActivate: [adminGuard] },

  // --- CUALQUIER OTRA RUTA ---
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }