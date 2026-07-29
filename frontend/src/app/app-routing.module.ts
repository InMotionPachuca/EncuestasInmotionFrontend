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

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'crear', component: CrearEncuestaComponent },
  { path: 'responder/:token', component: ResponderEncuestaComponent },
  { path: 'listar', component: ListarEncuestasComponent },
  { path: 'importar', component: ImportarEncuestasComponent },
  { path: 'contestar-manual', component: ContestarEncuestaManualComponent },
  { path: 'asesores', component: AsesoresComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }