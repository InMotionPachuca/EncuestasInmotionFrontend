import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CrearEncuestaComponent } from './components/crear-encuesta/crear-encuesta.component';
import { ResponderEncuestaComponent } from './components/responder-encuesta/responder-encuesta.component';
import { ListarEncuestasComponent } from './components/listar-encuestas/listar-encuestas.component';
import { ToastComponent } from './components/toast/toast.component';
import { ImportarEncuestasComponent } from './components/importar-encuestas/importar-encuestas.component';
import { ContestarEncuestaManualComponent } from './components/contestar-encuesta/contestar-encuesta-manual.component';
import { AsesoresComponent } from './components/asesores/asesores.component'; 
import { EncuestaService } from './services/encuesta.service';
import { UsuariosComponent } from './components/usuarios/usuarios.component';
import { EncuestaEstaticaComponent } from './components/encuesta-estatica/encuesta-estatica.component';
import { GenerarQrComponent } from './components/generar-qr/generar-qr.component';
import { DashboardQrComponent } from './components/dashboard-qr/dashboard-qr.component'; 
import { QRCodeModule } from 'angularx-qrcode';
import { ListarEncuestasQrComponent } from './components/listar-encuestas-qr/listar-encuestas-qr.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    CrearEncuestaComponent,
    ResponderEncuestaComponent,
    ListarEncuestasComponent,
    ToastComponent,
    ImportarEncuestasComponent,
    ContestarEncuestaManualComponent,
    AsesoresComponent,
    UsuariosComponent,
    EncuestaEstaticaComponent,
    GenerarQrComponent,
    DashboardQrComponent,
    ListarEncuestasQrComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    AppRoutingModule,
    QRCodeModule
  ],
  providers: [EncuestaService],
  bootstrap: [AppComponent]
})
export class AppModule { }