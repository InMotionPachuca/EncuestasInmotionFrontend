import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CrearEncuestaComponent } from './components/crear-encuesta/crear-encuesta.component';
import { ResponderEncuestaComponent } from './components/responder-encuesta/responder-encuesta.component';
import { ListarEncuestasComponent } from './components/listar-encuestas/listar-encuestas.component';
import { ImportarEncuestasComponent } from './components/importar-encuestas/importar-encuestas.component';
import { ContestarEncuestaManualComponent } from './components/contestar-encuesta/contestar-encuesta-manual.component';
import { AsesoresComponent } from './components/asesores/asesores.component';
import { UsuariosComponent } from './components/usuarios/usuarios.component';
import { AdminGuard } from './guards/admin.guard';
import { EncuestaEstaticaComponent } from './components/encuesta-estatica/encuesta-estatica.component';
import { GenerarQrComponent } from './components/generar-qr/generar-qr.component';
import { DashboardQrComponent } from './components/dashboard-qr/dashboard-qr.component'; 
import { ListarEncuestasQrComponent } from './components/listar-encuestas-qr/listar-encuestas-qr.component';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'dashboard-qr', component: DashboardQrComponent }, 
  { path: 'crear', component: CrearEncuestaComponent },
  { path: 'responder/:token', component: ResponderEncuestaComponent },
  { path: 'listar', component: ListarEncuestasComponent },
  { path: 'encuestas-qr', component: ListarEncuestasQrComponent },
  { path: 'importar', component: ImportarEncuestasComponent },
  { path: 'contestar-manual', component: ContestarEncuestaManualComponent },
  { path: 'asesores', component: AsesoresComponent },
  { 
    path: 'usuarios', 
    component: UsuariosComponent,
    canActivate: [AdminGuard]
  },
  { path: 'evaluar', component: EncuestaEstaticaComponent },
  { path: 'generar-qr', component: GenerarQrComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }