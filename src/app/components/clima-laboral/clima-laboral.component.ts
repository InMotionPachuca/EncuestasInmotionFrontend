import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { EncuestaService } from '../../services/encuesta.service';

interface OpcionAgencia {
  nombre: string;
  subtitulo: string;
  logoSvg: string;
}

interface PasoClima {
  id: number;
  tipo: 'agencias' | 'select' | 'rating' | 'textarea' | 'multiselect';
  categoria: string;
  pregunta: string;
  subtitulo?: string;
  icono: string;
  opciones?: string[];
  valor: any;
  campoNombre: string;
}

@Component({
  selector: 'app-clima-laboral',
  templateUrl: './clima-laboral.component.html',
  styleUrls: ['./clima-laboral.component.css']
})
export class ClimaLaboralComponent implements OnInit {
  pasoActual = 0;
  loading = false;
  animando = false;
  direccionTransicion: 'next' | 'prev' = 'next';
  seleccionEfecto = false;

  private readonly STORAGE_KEY = 'inmotion_clima_2026_completado';

  // Rutas directas a los SVGs de tu carpeta assets
  readonly agenciasVisuales: OpcionAgencia[] = [
    { nombre: 'Toyota Pachuca', subtitulo: 'Agencia Matriz', logoSvg: 'assets/logos/pachuca.svg' },
    { nombre: 'Toyota Tulancingo', subtitulo: 'Sucursal Tulancingo', logoSvg: 'assets/logos/tulancingo.svg' },
    { nombre: 'Centro de Servicio Toyota Pachuca', subtitulo: 'Taller y Postventa', logoSvg: 'assets/logos/toyota.svg' },
    { nombre: 'Carsline Pachuca', subtitulo: 'Seminuevos Garantizados', logoSvg: 'assets/logos/carsline.svg' },
    { nombre: 'Subaru', subtitulo: 'Agencia Subaru', logoSvg: 'assets/logos/subaru.svg' }
  ];

  // Segmentación oficial por sucursal
  readonly estructuraSucursales: { [key: string]: string[] } = {
    'Centro de Servicio Toyota Pachuca': [
      'Administración',
      'Área Técnica',
      'Intendencia'
    ],
    'Toyota Pachuca': [
      'Ventas',
      'Administración',
      'Intendencia',
      'Área Técnica'
    ],
    'Carsline Pachuca': [
      'Ventas',
      'Administración',
      'Intendencia',
      'Área Técnica'
    ],
    'Toyota Tulancingo': [
      'Ventas',
      'Administración',
      'Área Técnica',
      'Intendencia'
    ],
    'Subaru': [
      'Ventas',
      'Administración',
      'Área Técnica',
      'Intendencia'
    ]
  };

  readonly ratingEscala = [
    { num: 1, label: 'Muy en desacuerdo', sub: 'Nivel 1' },
    { num: 2, label: 'En desacuerdo', sub: 'Nivel 2' },
    { num: 3, label: 'Neutral / Regular', sub: 'Nivel 3' },
    { num: 4, label: 'De acuerdo', sub: 'Nivel 4' },
    { num: 5, label: 'Totalmente de acuerdo', sub: 'Nivel 5' }
  ];

  readonly antiguedades = [
    'Menos de 6 meses',
    '6 meses a 1 año',
    '1 a 3 años',
    '3 a 5 años',
    'Más de 5 años'
  ];

  readonly opcionesPriorizacion = [
    'Higiene y mantenimiento de sanitarios y comedores',
    'Salario y compensaciones',
    'Reconocimiento',
    'Oportunidades de crecimiento',
    'Capacitación',
    'Liderazgo',
    'Comunicación',
    'Ambiente laboral',
    'Trabajo en equipo',
    'Carga de trabajo',
    'Horarios y flexibilidad',
    'Instalaciones y mobiliario',
    'Herramientas y recursos',
    'Beneficios',
    'Seguridad'
  ];

  priorizacionSeleccionadas: string[] = [];
  otroPriorizacion: string = '';

  pasos: PasoClima[] = [
    // --- DATOS DEMOGRÁFICOS ---
    { id: 101, tipo: 'agencias', categoria: 'UBICACIÓN', pregunta: '¿A qué agencia o sucursal perteneces?', subtitulo: 'Tus respuestas son estrictamente anónimas y confidenciales.', icono: 'fas fa-building', valor: '', campoNombre: 'agencia' },
    { id: 102, tipo: 'select', categoria: 'DEPARTAMENTO', pregunta: '¿Cuál es tu departamento o área de trabajo?', subtitulo: 'Selecciona el área en la que desempeñas tus funciones.', icono: 'fas fa-briefcase', opciones: [], valor: '', campoNombre: 'departamento' },
    { id: 103, tipo: 'select', categoria: 'TRAYECTORIA', pregunta: '¿Cuánto tiempo llevas colaborando en la empresa?', subtitulo: 'Tu perspectiva según tu experiencia es fundamental.', icono: 'fas fa-clock', opciones: this.antiguedades, valor: '', campoNombre: 'antiguedad' },

    // --- 1. HERRAMIENTAS Y RECURSOS ---
    { id: 1, tipo: 'rating', categoria: '1. HERRAMIENTAS Y RECURSOS', pregunta: '¿Cuentas con las herramientas y recursos necesarios para realizar tu trabajo de manera eficiente?', icono: 'fas fa-tools', valor: null, campoNombre: 'p1' },
    { id: 2, tipo: 'rating', categoria: '1. HERRAMIENTAS Y RECURSOS', pregunta: '¿Los equipos, sistemas y materiales que utilizas funcionan adecuadamente?', icono: 'fas fa-desktop', valor: null, campoNombre: 'p2' },
    { id: 3, tipo: 'rating', categoria: '1. HERRAMIENTAS Y RECURSOS', pregunta: '¿Recibes oportunamente los recursos que necesitas para cumplir con tus responsabilidades?', icono: 'fas fa-boxes', valor: null, campoNombre: 'p3' },

    // --- 2. AMBIENTE Y TRABAJO EN EQUIPO ---
    { id: 4, tipo: 'rating', categoria: '2. AMBIENTE Y TRABAJO EN EQUIPO', pregunta: '¿Consideras que existe un ambiente de respeto y compañerismo entre los colaboradores?', icono: 'fas fa-users', valor: null, campoNombre: 'p4' },
    { id: 5, tipo: 'rating', categoria: '2. AMBIENTE Y TRABAJO EN EQUIPO', pregunta: '¿Existe una buena colaboración entre los integrantes de tu equipo?', icono: 'fas fa-hands-helping', valor: null, campoNombre: 'p5' },
    { id: 6, tipo: 'rating', categoria: '2. AMBIENTE Y TRABAJO EN EQUIPO', pregunta: '¿Consideras que tus compañeros están dispuestos a apoyarte cuando lo necesitas?', icono: 'fas fa-user-friends', valor: null, campoNombre: 'p6' },

    // --- 3. LIDERAZGO Y COMUNICACIÓN ---
    { id: 7, tipo: 'rating', categoria: '3. LIDERAZGO Y COMUNICACIÓN', pregunta: '¿La comunicación con tu líder directo o gerencia es clara y constructiva?', icono: 'fas fa-comments', valor: null, campoNombre: 'p7' },
    { id: 8, tipo: 'rating', categoria: '3. LIDERAZGO Y COMUNICACIÓN', pregunta: '¿Tu líder comunica de manera clara las prioridades, objetivos y expectativas de tu trabajo?', icono: 'fas fa-bullseye', valor: null, campoNombre: 'p8' },
    { id: 9, tipo: 'rating', categoria: '3. LIDERAZGO Y COMUNICACIÓN', pregunta: '¿Consideras que tu líder está disponible para escuchar y atender tus inquietudes?', icono: 'fas fa-headset', valor: null, campoNombre: 'p9' },

    // --- 4. RECONOCIMIENTO Y VALORACIÓN ---
    { id: 10, tipo: 'rating', categoria: '4. RECONOCIMIENTO Y VALORACIÓN', pregunta: '¿Sientes que tu esfuerzo, dedicación y contribución son valorados?', icono: 'fas fa-award', valor: null, campoNombre: 'p10' },
    { id: 11, tipo: 'rating', categoria: '4. RECONOCIMIENTO Y VALORACIÓN', pregunta: '¿Recibes reconocimiento cuando realizas un buen trabajo o alcanzas resultados importantes?', icono: 'fas fa-medal', valor: null, campoNombre: 'p11' },
    { id: 12, tipo: 'rating', categoria: '4. RECONOCIMIENTO Y VALORACIÓN', pregunta: '¿Consideras que la empresa reconoce adecuadamente las aportaciones de sus colaboradores?', icono: 'fas fa-trophy', valor: null, campoNombre: 'p12' },

    // --- 5. INSTALACIONES, SEGURIDAD Y CONDICIONES ---
    { id: 13, tipo: 'rating', categoria: '5. INSTALACIONES Y SEGURIDAD', pregunta: '¿Las instalaciones donde trabajas son adecuadas para realizar tus actividades?', icono: 'fas fa-building', valor: null, campoNombre: 'p13' },
    { id: 14, tipo: 'rating', categoria: '5. INSTALACIONES Y SEGURIDAD', pregunta: '¿Consideras que la limpieza, higiene e insumos (papel, jabón, toallas) en sanitarios, comedores y áreas comunes son adecuados y suficientes?', icono: 'fas fa-restroom', valor: null, campoNombre: 'p14' },
    { id: 15, tipo: 'rating', categoria: '5. INSTALACIONES Y SEGURIDAD', pregunta: '¿Consideras que existen medidas suficientes para garantizar tu seguridad durante la jornada laboral?', icono: 'fas fa-shield-alt', valor: null, campoNombre: 'p15' },

    // --- 6. SENTIDO DE PERTENENCIA Y ORGULLO ---
    { id: 16, tipo: 'rating', categoria: '6. PERTENENCIA Y ORGULLO', pregunta: '¿Te sientes orgulloso/a de pertenecer a Grupo InMotion?', icono: 'fas fa-heart', valor: null, campoNombre: 'p16' },
    { id: 17, tipo: 'rating', categoria: '6. PERTENENCIA Y ORGULLO', pregunta: '¿Consideras que los valores de la empresa son coherentes con la manera en que se trabaja día a día?', icono: 'fas fa-balance-scale', valor: null, campoNombre: 'p17' },
    { id: 18, tipo: 'rating', categoria: '6. PERTENENCIA Y ORGULLO', pregunta: '¿Recomendarías Grupo InMotion como un buen lugar para trabajar?', icono: 'fas fa-thumbs-up', valor: null, campoNombre: 'p18' },

    // --- 7. DESARROLLO, APRENDIZAJE Y CRECIMIENTO ---
    { id: 19, tipo: 'rating', categoria: '7. DESARROLLO Y CRECIMIENTO', pregunta: '¿Consideras que tienes oportunidades para aprender y desarrollar nuevas habilidades?', icono: 'fas fa-graduation-cap', valor: null, campoNombre: 'p19' },
    { id: 20, tipo: 'rating', categoria: '7. DESARROLLO Y CRECIMIENTO', pregunta: '¿La empresa te proporciona capacitación adecuada para mejorar tu desempeño?', icono: 'fas fa-chalkboard-teacher', valor: null, campoNombre: 'p20' },
    { id: 21, tipo: 'rating', categoria: '7. DESARROLLO Y CRECIMIENTO', pregunta: '¿Consideras que existen oportunidades reales de crecimiento y desarrollo profesional dentro de la empresa?', icono: 'fas fa-chart-line', valor: null, campoNombre: 'p21' },

    // --- 8. EQUIDAD, RESPETO Y JUSTICIA ---
    { id: 22, tipo: 'rating', categoria: '8. EQUIDAD Y JUSTICIA', pregunta: '¿Consideras que los colaboradores reciben un trato justo y respetuoso?', icono: 'fas fa-handshake', valor: null, campoNombre: 'p22' },
    { id: 23, tipo: 'rating', categoria: '8. EQUIDAD Y JUSTICIA', pregunta: '¿Percibes que las oportunidades de crecimiento, reconocimiento y desarrollo se asignan de manera justa?', icono: 'fas fa-scale-balanced', valor: null, campoNombre: 'p23' },
    { id: 24, tipo: 'rating', categoria: '8. EQUIDAD Y JUSTICIA', pregunta: '¿Consideras que las reglas y políticas de la empresa se aplican de manera consistente para todos?', icono: 'fas fa-gavel', valor: null, campoNombre: 'p24' },

    // --- 9. CARGA DE TRABAJO Y BIENESTAR ---
    { id: 25, tipo: 'rating', categoria: '9. BIENESTAR Y CARGA DE TRABAJO', pregunta: '¿Consideras que tu carga de trabajo es adecuada para el tiempo disponible?', icono: 'fas fa-weight-hanging', valor: null, campoNombre: 'p25' },
    { id: 26, tipo: 'rating', categoria: '9. BIENESTAR Y CARGA DE TRABAJO', pregunta: '¿Consideras que tienes un equilibrio saludable entre tus responsabilidades laborales y tu vida personal?', icono: 'fas fa-spa', valor: null, campoNombre: 'p26' },
    { id: 27, tipo: 'rating', categoria: '9. BIENESTAR Y CARGA DE TRABAJO', pregunta: '¿La empresa muestra interés por el bienestar y las necesidades de sus colaboradores?', icono: 'fas fa-user-shield', valor: null, campoNombre: 'p27' },

    // --- 10. PARTICIPACIÓN, OPINIÓN Y ESCUCHA ---
    { id: 28, tipo: 'rating', categoria: '10. PARTICIPACIÓN Y ESCUCHA', pregunta: '¿Sientes que tus opiniones y sugerencias son escuchadas por tus líderes?', icono: 'fas fa-comment-dots', valor: null, campoNombre: 'p28' },
    { id: 29, tipo: 'rating', categoria: '10. PARTICIPACIÓN Y ESCUCHA', pregunta: '¿Tienes oportunidades para proponer ideas o mejoras relacionadas con tu trabajo?', icono: 'fas fa-lightbulb', valor: null, campoNombre: 'p29' },
    { id: 30, tipo: 'rating', categoria: '10. PARTICIPACIÓN Y ESCUCHA', pregunta: '¿Consideras que la empresa toma en cuenta las opiniones de los colaboradores para mejorar?', icono: 'fas fa-people-arrows', valor: null, campoNombre: 'p30' },

    // --- 11. CONFIANZA Y SEGURIDAD PSICOLÓGICA ---
    { id: 31, tipo: 'rating', categoria: '11. SEGURIDAD PSICOLÓGICA', pregunta: '¿Te sientes con la confianza de expresar tus ideas, dudas o desacuerdos?', icono: 'fas fa-microphone', valor: null, campoNombre: 'p31' },
    { id: 32, tipo: 'rating', categoria: '11. SEGURIDAD PSICOLÓGICA', pregunta: '¿Consideras que puedes comunicar un problema o error sin temor a recibir un trato negativo?', icono: 'fas fa-shield-heart', valor: null, campoNombre: 'p32' },
    { id: 33, tipo: 'rating', categoria: '11. SEGURIDAD PSICOLÓGICA', pregunta: '¿Sientes que existe un ambiente donde las personas pueden expresar sus opiniones con respeto y libertad?', icono: 'fas fa-door-open', valor: null, campoNombre: 'p33' },

    // --- 12. MOTIVACIÓN Y COMPROMISO ---
    { id: 34, tipo: 'rating', categoria: '12. MOTIVACIÓN Y COMPROMISO', pregunta: '¿Te sientes motivado/a para realizar tu trabajo y alcanzar tus objetivos?', icono: 'fas fa-fire', valor: null, campoNombre: 'p34' },
    { id: 35, tipo: 'rating', categoria: '12. MOTIVACIÓN Y COMPROMISO', pregunta: '¿Consideras que tu trabajo contribuye de manera importante a los objetivos de Grupo InMotion?', icono: 'fas fa-puzzle-piece', valor: null, campoNombre: 'p35' },
    { id: 36, tipo: 'rating', categoria: '12. MOTIVACIÓN Y COMPROMISO', pregunta: '¿Te gustaría continuar desarrollándote y trabajando en Grupo InMotion durante los próximos años?', icono: 'fas fa-seedling', valor: null, campoNombre: 'p36' },

    // --- EVALUACIÓN GENERAL ---
    { id: 37, tipo: 'rating', categoria: 'EVALUACIÓN GENERAL', pregunta: 'En términos generales, ¿qué tan satisfecho/a estás trabajando en Grupo InMotion?', icono: 'fas fa-star', valor: null, campoNombre: 'p37' },
    { id: 38, tipo: 'rating', categoria: 'EVALUACIÓN GENERAL', pregunta: 'En términos generales, ¿cómo evaluarías el clima laboral de Grupo InMotion?', icono: 'fas fa-sun', valor: null, campoNombre: 'p38' },
    { id: 39, tipo: 'rating', categoria: 'EVALUACIÓN GENERAL', pregunta: 'Si tuvieras la oportunidad de elegir nuevamente, ¿volverías a elegir trabajar en Grupo InMotion?', icono: 'fas fa-redo-alt', valor: null, campoNombre: 'p39' },
    { id: 40, tipo: 'rating', categoria: 'EVALUACIÓN GENERAL', pregunta: '¿Qué tan probable es que recomiendes Grupo InMotion como lugar de trabajo a un familiar, amigo o conocido?', icono: 'fas fa-share-alt', valor: null, campoNombre: 'p40' },

    // --- PREGUNTAS ABIERTAS ---
    { id: 41, tipo: 'textarea', categoria: 'PREGUNTA ABIERTA', pregunta: '¿Qué es lo que más valoras de trabajar en Grupo InMotion?', subtitulo: 'Comparte con nosotros lo que más te motiva día a día.', icono: 'fas fa-heart', valor: '', campoNombre: 'p41' },
    { id: 42, tipo: 'textarea', categoria: 'PREGUNTA ABIERTA', pregunta: '¿Qué consideras que es lo mejor que tiene actualmente la empresa?', subtitulo: 'Tus observaciones ayudan a fortalecer nuestros pilares.', icono: 'fas fa-gem', valor: '', campoNombre: 'p42' },
    { id: 43, tipo: 'textarea', categoria: 'PREGUNTA ABIERTA', pregunta: '¿Qué es lo principal que deberíamos mejorar para hacer de Grupo InMotion un mejor lugar para trabajar?', subtitulo: 'Tu perspectiva nos ayuda a fijar prioridades.', icono: 'fas fa-wrench', valor: '', campoNombre: 'p43' },
    { id: 44, tipo: 'textarea', categoria: 'PREGUNTA ABIERTA', pregunta: 'Si pudieras cambiar una sola cosa de tu experiencia laboral actual, ¿qué cambiarías?', subtitulo: 'Toda propuesta constructiva es bienvenida.', icono: 'fas fa-magic', valor: '', campoNombre: 'p44' },
    { id: 45, tipo: 'textarea', categoria: 'PREGUNTA ABIERTA', pregunta: '¿Qué podría hacer tu líder directo para mejorar tu experiencia de trabajo?', subtitulo: 'Para apoyar el desarrollo del liderazgo positivo.', icono: 'fas fa-user-tie', valor: '', campoNombre: 'p45' },
    { id: 46, tipo: 'textarea', categoria: 'PREGUNTA ABIERTA', pregunta: '¿Hay algún comentario, situación o sugerencia que consideres importante que la empresa conozca y que no haya sido abordado en esta encuesta?', subtitulo: 'Espacio libre para cualquier mensaje adicional.', icono: 'fas fa-comment-medical', valor: '', campoNombre: 'p46' },

    // --- PRIORIZACIÓN ---
    { id: 47, tipo: 'multiselect', categoria: 'PRIORIDADES DE MEJORA', pregunta: 'De los siguientes aspectos, selecciona los 3 que consideras más importantes para mejorar tu experiencia laboral:', subtitulo: 'Selecciona hasta 3 opciones clave.', icono: 'fas fa-list-check', valor: [], campoNombre: 'p47' }
  ];

  constructor(
    private encuestaService: EncuestaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (localStorage.getItem(this.STORAGE_KEY) === 'true') {
      this.router.navigate(['/gracias-clima']);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (this.paso.tipo === 'textarea' || this.paso.tipo === 'multiselect') return;

    if (this.paso.tipo === 'rating') {
      const num = parseInt(event.key, 10);
      if (num >= 1 && num <= 5) {
        this.seleccionarCalificacion(num);
      }
    } else if (this.paso.tipo === 'agencias') {
      const num = parseInt(event.key, 10);
      if (num >= 1 && num <= this.agenciasVisuales.length) {
        this.seleccionarAgencia(this.agenciasVisuales[num - 1].nombre);
      }
    } else if (this.paso.tipo === 'select' && this.paso.opciones) {
      const num = parseInt(event.key, 10);
      if (num >= 1 && num <= this.paso.opciones.length) {
        this.seleccionarOpcion(this.paso.opciones[num - 1]);
      }
    }

    if (event.key === 'ArrowRight' || event.key === 'Enter') {
      if (this.paso.valor) {
        this.siguientePaso();
      }
    } else if (event.key === 'ArrowLeft' && this.pasoActual > 0) {
      this.pasoAnterior();
    }
  }

  get porcentajeProgreso(): number {
    return Math.round(((this.pasoActual + 1) / this.pasos.length) * 100);
  }

  get paso(): PasoClima {
    return this.pasos[this.pasoActual];
  }

  get tiempoEstimadoRestante(): string {
    const restantes = this.pasos.length - this.pasoActual;
    return restantes <= 3 ? '~1 min' : `~${Math.ceil((restantes * 6) / 60)} min`;
  }

  seleccionarAgencia(nombreAgencia: string): void {
    this.paso.valor = nombreAgencia;

    const pasoDepto = this.pasos.find(p => p.campoNombre === 'departamento');
    if (pasoDepto) {
      pasoDepto.opciones = this.estructuraSucursales[nombreAgencia] || [
        'Ventas',
        'Administración',
        'Área Técnica',
        'Intendencia'
      ];
      pasoDepto.valor = '';
    }

    this.activarEfectoSeleccion();
    setTimeout(() => this.siguientePaso(), 220);
  }

  seleccionarOpcion(opcion: string): void {
    this.paso.valor = opcion;
    this.activarEfectoSeleccion();
    setTimeout(() => this.siguientePaso(), 220);
  }

  seleccionarCalificacion(valor: number): void {
    this.paso.valor = valor;
    this.activarEfectoSeleccion();
    setTimeout(() => this.siguientePaso(), 240);
  }

  togglePriorizacion(opcion: string): void {
    const idx = this.priorizacionSeleccionadas.indexOf(opcion);
    if (idx > -1) {
      this.priorizacionSeleccionadas.splice(idx, 1);
    } else {
      if (this.priorizacionSeleccionadas.length < 3) {
        this.priorizacionSeleccionadas.push(opcion);
      }
    }
    this.paso.valor = [...this.priorizacionSeleccionadas];
  }

  private activarEfectoSeleccion(): void {
    this.seleccionEfecto = true;
    setTimeout(() => this.seleccionEfecto = false, 300);
  }

  siguientePaso(): void {
    if (this.paso.tipo !== 'textarea' && this.paso.tipo !== 'multiselect' && !this.paso.valor) {
      return;
    }

    if (this.pasoActual < this.pasos.length - 1) {
      this.direccionTransicion = 'next';
      this.animando = true;
      setTimeout(() => {
        this.pasoActual++;
        this.animando = false;
      }, 180);
    } else {
      this.enviarEncuesta();
    }
  }

  pasoAnterior(): void {
    if (this.pasoActual > 0) {
      this.direccionTransicion = 'prev';
      this.animando = true;
      setTimeout(() => {
        this.pasoActual--;
        this.animando = false;
      }, 180);
    }
  }

  enviarEncuesta(): void {
    this.loading = true;

    const val = (campo: string) => this.pasos.find(p => p.campoNombre === campo)?.valor;

    const respuestas: any[] = [];

    for (let i = 1; i <= 40; i++) {
      const pObj = this.pasos.find(p => p.campoNombre === `p${i}`);
      respuestas.push({
        preguntaId: i,
        preguntaTexto: pObj?.pregunta || `Pregunta ${i}`,
        valorNumerico: pObj?.valor ? Number(pObj.valor) : null
      });
    }

    for (let i = 41; i <= 46; i++) {
      const pObj = this.pasos.find(p => p.campoNombre === `p${i}`);
      respuestas.push({
        preguntaId: i,
        preguntaTexto: pObj?.pregunta || `Pregunta abierta ${i}`,
        valorTexto: pObj?.valor || 'Sin comentarios'
      });
    }

    const prioridadesFinal = [...this.priorizacionSeleccionadas];
    if (this.otroPriorizacion.trim()) {
      prioridadesFinal.push(`Otro: ${this.otroPriorizacion.trim()}`);
    }

    respuestas.push({
      preguntaId: 47,
      preguntaTexto: 'Aspectos prioritarios para mejorar la experiencia laboral',
      valorTexto: prioridadesFinal.length > 0 ? prioridadesFinal.join(' | ') : 'Sin selección'
    });

    const dataPayload = {
      nombre: 'Colaborador Anónimo',
      apellido: `[${val('agencia')}]`,
      email: 'clima_laboral@inmotion.com',
      telefono: '0000000000',
      asesor: val('departamento'),
      unidad: val('antiguedad'),
      serie: 'CLIMA-LABORAL-2026',
      fechaVisita: new Date().toISOString().split('T')[0],
      marcaId: this.resolverMarcaId(val('agencia')),
      tipo: 'CLIMA_LABORAL',
      estado: 'RESPONDIDA',
      respuestas: respuestas
    };

    this.encuestaService.crearEncuesta(dataPayload).subscribe({
      next: () => {
        localStorage.setItem(this.STORAGE_KEY, 'true');
        this.loading = false;
        this.router.navigate(['/gracias-clima']);
      },
      error: () => {
        localStorage.setItem(this.STORAGE_KEY, 'true');
        this.loading = false;
        this.router.navigate(['/gracias-clima']);
      }
    });
  }

  private resolverMarcaId(agencia: string): number {
    switch (agencia) {
      case 'Toyota Pachuca': return 1;
      case 'Carsline Pachuca': return 2;
      case 'Toyota Tulancingo': return 3;
      case 'Centro de Servicio Toyota Pachuca': return 4;
      case 'Subaru': return 5;
      default: return 1;
    }
  }
}