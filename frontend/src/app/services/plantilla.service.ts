import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PlantillaService {
  readonly imagenesMarca: { [key: string]: string } = {
    'toyota pachuca': 'assets/whatsapp/toyotaPachuca.jpeg',
    'toyota tulancingo': 'assets/whatsapp/toyotaTulancingo.jpeg',
    'carsline': 'assets/whatsapp/carsline.png',
    'carsline pachuca': 'assets/whatsapp/carsline.png',
    'carsline queretaro': 'assets/whatsapp/carsline.png',
    'carsline querétaro': 'assets/whatsapp/carsline.png',
    'gwm': 'assets/whatsapp/gwm.png',
    'subaru': 'assets/whatsapp/subaruPachuca.png',
    'comprocars': 'assets/whatsapp/comproCars.png',
    'comprocars querétaro': 'assets/whatsapp/comproCars.png',
    'comprocars queretaro': 'assets/whatsapp/comproCars.png',
    'comprocars pachuca': 'assets/whatsapp/comproCars.png'
  };

  readonly emojis = {
    manosArriba: '🙌🏽',
    auto: '🚗',
    herramienta: '🧰',
    gracias: '☺️',
    bienvenida: '🙌🏽',
    punto: '👉',
    estrella: '⭐'
  };

  normalizarTexto(texto: string): string {
    return texto ? texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : '';
  }

  /**
   * Normalización matemática e inmune a desfase horario UTC para fechas de Excel y cadenas.
   */
  normalizarFecha(valor: any): string {
    if (!valor) return '';

    // 1. Enteros seriales de Excel (ej: 45508)
    if (typeof valor === 'number' || (!isNaN(Number(valor)) && !String(valor).includes('/') && !String(valor).includes('-'))) {
      const serial = Number(valor);
      if (serial > 0) {
        // 25569 = Días entre 1899-12-30 (origen Excel ajustado) y 1970-01-01
        const utcMs = Math.round((serial - 25569) * 86400 * 1000);
        const date = new Date(utcMs);
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }

    const str = String(valor).trim();

    // 2. Formato latinoamericano DD/MM/YYYY o DD-MM-YYYY
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmmyyyy) {
      const d = ddmmyyyy[1].padStart(2, '0');
      const m = ddmmyyyy[2].padStart(2, '0');
      const y = ddmmyyyy[3];
      return `${y}-${m}-${d}`;
    }

    // 3. Formato ISO YYYY-MM-DD
    const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (yyyymmdd) {
      const y = yyyymmdd[1];
      const m = yyyymmdd[2].padStart(2, '0');
      const d = yyyymmdd[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // 4. Instancia de Date
    if (valor instanceof Date && !isNaN(valor.getTime())) {
      const y = valor.getFullYear();
      const m = String(valor.getMonth() + 1).padStart(2, '0');
      const d = String(valor.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return '';
  }

  formatearFechaLarga(fechaStr: any): string {
    if (!fechaStr) return 'fecha de operación';
    const norm = this.normalizarFecha(fechaStr);
    if (norm) {
      const [y, m, d] = norm.split('-').map(Number);
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      if (m >= 1 && m <= 12) {
        return `${d} de ${meses[m - 1]} de ${y}`;
      }
    }
    return String(fechaStr) || 'fecha de operación';
  }

  limpiarTelefono(telefono: string): string {
    if (!telefono) return '';
    let limpio = telefono.toString().replace(/\D/g, '');
    if (limpio.length === 10) {
      limpio = '52' + limpio;
    }
    return limpio;
  }

  obtenerImagenMarca(nombreMarca: string): string {
    if (!nombreMarca) return 'assets/whatsapp/carsline.png';
    const limpio = this.normalizarTexto(nombreMarca);

    if (limpio.includes('toyota') && limpio.includes('tulancingo')) return 'assets/whatsapp/toyotaTulancingo.jpeg';
    if (limpio.includes('toyota')) return 'assets/whatsapp/toyotaPachuca.jpeg';
    if (limpio.includes('carsline')) return 'assets/whatsapp/carsline.png';
    if (limpio.includes('gwm')) return 'assets/whatsapp/gwm.png';
    if (limpio.includes('subaru')) return 'assets/whatsapp/subaruPachuca.png';
    if (limpio.includes('compro')) return 'assets/whatsapp/comproCars.png';

    return 'assets/whatsapp/carsline.png';
  }

  /**
   * Genera el texto formal para WhatsApp según el segmento operativo:
   * - POSTVENTA / SERVICIO
   * - VENTA
   * - COMPRA / ComproCars
   */
  generarPlantilla(cliente: any, link: string, tipoOverride?: string): string {
    const tipo = (tipoOverride || cliente.tipo || 'POSTVENTA').toString().toUpperCase();
    const nombreCliente = cliente.nombreCliente || cliente.clienteNombre || 'Cliente';
    const nombreAsesor = cliente.asesor || (tipo === 'COMPRA' || tipo === 'COMPRA_AUTO' ? 'Asesor de Compras' : (tipo === 'VENTA' ? 'Asesor de Ventas' : 'Asesor de Servicio'));
    const nombreMarca = cliente.marcaNombre || 'Agencia';

    const unidadRaw = cliente.unidad || '';
    const anioRaw = cliente.anio ? ` ${cliente.anio}` : '';
    const modelo = (unidadRaw && unidadRaw.toString().trim() !== '') ? unidadRaw.toString().trim() : 'vehículo';
    const vehiculoCompleto = (modelo === 'vehículo') ? 'vehículo' : `${modelo}${anioRaw}`.trim();

    const fechaReferencia = cliente.fecha || cliente.fechaEnvio || cliente.fechaOperacion;
    const fechaTexto = fechaReferencia ? this.formatearFechaLarga(fechaReferencia) : 'su visita';

    let plantilla = '';

    if (tipo === 'COMPRA' || tipo === 'COMPRA_AUTO') {
      plantilla += `Buen día, Sr./Srita. *${nombreCliente}*.\n`;
      plantilla += `Mi nombre es *Cecilia Juárez* y formo parte del área de Satisfacción a Clientes de *${nombreMarca}*. ${this.emojis.manosArriba}\n`;
      plantilla += `Agradecemos sinceramente el tiempo que nos brindó durante el proceso de compra/toma de su vehículo *${vehiculoCompleto}*.\n`;
      plantilla += `Nos gustaría conocer su opinión sobre la rapidez de valuación, la transparencia del trámite y la atención brindada por su asesor de compra *${nombreAsesor}*. Por ello, le invitamos a responder nuestra breve encuesta de satisfacción.\n`;
      plantilla += `Para participar, por favor haga clic en el siguiente enlace:\n`;
      plantilla += `${this.emojis.punto} ${link}\n`;
      plantilla += `Muchas gracias por su confianza y preferencia.\n`;
      plantilla += `¡Fue un verdadero placer atenderle! ${this.emojis.gracias}${this.emojis.auto}`;
    } else if (tipo === 'VENTA') {
      plantilla += `Buen día, Sr./Srita. *${nombreCliente}*.\n`;
      plantilla += `Mi nombre es *Cecilia Juárez* y formo parte del área de Satisfacción a Clientes de *${nombreMarca}*. ${this.emojis.manosArriba}\n`;
      plantilla += `Agradecemos sinceramente el tiempo que nos brindó al visitarnos. Fue un placer atenderle y acompañarle durante la adquisición de su *${vehiculoCompleto}*.\n`;
      plantilla += `Nos gustaría conocer su opinión sobre la atención recibida tanto por parte de nuestra agencia como de su asesor *${nombreAsesor}*. Por ello, le invitamos a responder nuestra encuesta de satisfacción, la cual le tomará solo unos minutos.\n`;
      plantilla += `Para participar, por favor haga clic en el siguiente enlace:\n`;
      plantilla += `${this.emojis.punto} ${link}\n`;
      plantilla += `Muchas gracias por su tiempo y confianza.\n`;
      plantilla += `¡Le damos la más cordial bienvenida a la familia *${nombreMarca}*! ${this.emojis.bienvenida}${this.emojis.auto}`;
    } else {
      // POSTVENTA / SERVICIO
      plantilla += `Buen día, Sr./Srita. *${nombreCliente}*.\n`;
      plantilla += `Mi nombre es *Cecilia Juárez* de Satisfacción a Clientes de *${nombreMarca}* ${this.emojis.manosArriba}\n`;
      plantilla += `Agradecemos sinceramente el tiempo que nos brindó al visitarnos en nuestra agencia, fue un gusto atenderle y acompañarle durante su estancia.\n`;
      plantilla += `Nos gustaría conocer su opinión respecto al servicio realizado a su *${vehiculoCompleto}* el día *${fechaTexto}*. ${this.emojis.auto}${this.emojis.herramienta}\n`;
      plantilla += `Lo invitamos a responder nuestra encuesta de satisfacción; le tomará solo unos minutos.\n`;
      plantilla += `Por favor, haz clic en el siguiente enlace para participar:\n`;
      plantilla += `${this.emojis.punto} ${link}\n`;
      plantilla += `¡Muchas gracias por su tiempo! ${this.emojis.gracias}${this.emojis.auto}`;
    }

    return plantilla;
  }

  sanitizarUrlWhatsApp(telefono: string, mensaje: string): string {
    const telLimpio = this.limpiarTelefono(telefono);
    const mensajeCodificado = encodeURIComponent(mensaje);
    return `https://api.whatsapp.com/send?phone=${telLimpio}&text=${mensajeCodificado}`;
  }
}
