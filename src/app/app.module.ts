import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { QRCodeModule } from 'angularx-qrcode';

import { AppRoutingModule } from './app-routing.module';

// Componentes Principales
import { AppComponent } from './app.component';
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
import { GenerarQrComponent } from './components/generar-qr/generar-qr.component';
import { DashboardQrComponent } from './components/dashboard-qr/dashboard-qr.component';
import { ListarEncuestasQrComponent } from './components/listar-encuestas-qr/listar-encuestas-qr.component';
import { DashboardFacturacionComponent } from './components/dashboard-facturacion/dashboard-facturacion.component';
import { AgradecimientoComponent } from './paginas/agradecimiento.component';

// Componente Toast Notificaciones
import { ToastComponent } from './components/toast/toast.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    CrearEncuestaComponent,
    ResponderEncuestaComponent,
    ListarEncuestasComponent,
    ImportarEncuestasComponent,
    ContestarEncuestaManualComponent,
    AsesoresComponent,
    UsuariosComponent,
    EncuestaEstaticaComponent,
    GenerarQrComponent,
    DashboardQrComponent,
    ListarEncuestasQrComponent,
    DashboardFacturacionComponent,
    AgradecimientoComponent,
    ToastComponent 
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    QRCodeModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }