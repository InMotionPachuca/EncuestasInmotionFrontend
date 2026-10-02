import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { QRCodeModule } from 'angularx-qrcode';

// Configuración moderna de Lottie en Angular 17
import { LottieComponent, provideLottieOptions } from 'ngx-lottie';
import player from 'lottie-web';

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
import { EncuestaComprasAutoComponent } from './components/encuesta-compras-auto/encuesta-compras-auto.component';
import { GenerarQrComponent } from './components/generar-qr/generar-qr.component';
import { DashboardQrComponent } from './components/dashboard-qr/dashboard-qr.component';
import { ListarEncuestasQrComponent } from './components/listar-encuestas-qr/listar-encuestas-qr.component';
import { DashboardFacturacionComponent } from './components/dashboard-facturacion/dashboard-facturacion.component';
import { AgradecimientoComponent } from './paginas/agradecimiento.component';
import { ToastComponent } from './components/toast/toast.component';

// Componentes de Clima Laboral
import { ClimaLaboralComponent } from './components/clima-laboral/clima-laboral.component';
import { AgradecimientoClimaComponent } from './paginas/agradecimiento-clima/agradecimiento-clima.component';
import { DashboardClimaComponent } from './components/dashboard-clima/dashboard-clima.component';

// Factoría requerida para inicializar el motor web de Lottie
export function playerFactory() {
  return player;
}

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
    ToastComponent,
    ClimaLaboralComponent,
    AgradecimientoClimaComponent,
    DashboardClimaComponent,
    EncuestaComprasAutoComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    QRCodeModule,
    AppRoutingModule,
    LottieComponent
  ],
  providers: [
    provideLottieOptions({
      player: playerFactory
    })
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }