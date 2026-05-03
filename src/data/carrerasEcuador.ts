/**
 * Catálogo de carreras universitarias del Ecuador.
 * © 2019-2026 Víctor Cañizares González — PreUniversitario MEDD.
 *
 * Universidades incluidas: ESPOL (35), ECOTEC (5), UEES (7), UNEMI (5), UG (12), UCE (13).
 * Total: 77 carreras.
 */
export type Modalidad = 'presencial' | 'online' | 'semipresencial' | 'hibrida';
export type TipoCosto = 'publica' | 'privada' | 'cofinanciada';
export type DemandaLaboral = 'alta' | 'media' | 'baja';

export interface CarreraUniversidad {
  id: string;
  nombre: string;
  universidad: string;
  siglaUniversidad: string;
  urlUniversidad: string;
  urlCarrera?: string;
  modalidad: Modalidad[];
  ciudad: string[];
  facultad: string;
  descripcion: string;
  campoLaboral: string[];
  perfilIdeal: {
    empatia: number;
    inteligenciaEmocional: number;
    prosocial: number;
    habilidadesSociales: number;
    estilos: ('V' | 'A' | 'R' | 'K')[];
  };
  materiasClaveExamen: string[];
  color: string;
  icono: string;
  /** Duración estimada en semestres */
  duracion: number;
  tipoCosto: TipoCosto;
  /** Salario promedio inicial estimado en USD/mes en Ecuador */
  salarioPromedioEcuador: number;
  demandaLaboral: DemandaLaboral;
  tags: string[];
}

export type CarreraEspol = CarreraUniversidad;

const ESPOL_BASE = {
  universidad: 'Escuela Superior Politécnica del Litoral',
  siglaUniversidad: 'ESPOL',
  urlUniversidad: 'https://www.espol.edu.ec/es/admision/oferta-academica',
  modalidad: ['presencial'] as Modalidad[],
  ciudad: ['Guayaquil'],
  tipoCosto: 'cofinanciada' as TipoCosto,
};

// Helper para crear ESPOL
const espol = (
  id: string,
  nombre: string,
  facultad: string,
  descripcion: string,
  campoLaboral: string[],
  perfilIdeal: CarreraUniversidad['perfilIdeal'],
  materiasClaveExamen: string[],
  color: string,
  icono: string,
  duracion: number,
  salario: number,
  demanda: DemandaLaboral,
  tags: string[],
): CarreraUniversidad => ({
  id, nombre, ...ESPOL_BASE, facultad, descripcion, campoLaboral, perfilIdeal,
  materiasClaveExamen, color, icono, duracion, salarioPromedioEcuador: salario,
  demandaLaboral: demanda, tags,
  urlCarrera: 'https://www.espol.edu.ec/es/admision/oferta-academica',
});

export const CARRERAS_ECUADOR: CarreraUniversidad[] = [
  // ============== ESPOL — 33 carreras ==============
  espol('medicina','Medicina','Facultad de Ciencias de la Vida (FCV)','Formación integral en ciencias de la salud humana, diagnóstico clínico y atención hospitalaria de excelencia.',['Hospitales públicos y privados','Investigación médica','Salud pública','Docencia universitaria'],{empatia:95,inteligenciaEmocional:90,prosocial:88,habilidadesSociales:85,estilos:['V','K']},['Biología','Química Orgánica','Matemáticas'],'#EAF3DE','🩺',12,1500,'alta',['salud','clínica','ciencia']),
  espol('nutricion','Nutrición y Dietética','Facultad de Ciencias de la Vida (FCV)','Ciencia de la alimentación aplicada a la salud individual, comunitaria y deportiva.',['Hospitales','Clínicas','Industria alimentaria','Deporte','Docencia'],{empatia:82,inteligenciaEmocional:78,prosocial:85,habilidadesSociales:80,estilos:['K','V']},['Biología','Química','Matemáticas'],'#EAF3DE','🥗',9,900,'alta',['salud','alimentación']),
  espol('biologia','Biología','Facultad de Ciencias de la Vida (FCV)','Estudio de los seres vivos, su evolución, ecología y biodiversidad ecuatoriana.',['Investigación','Conservación','Docencia','ONGs ambientales'],{empatia:65,inteligenciaEmocional:62,prosocial:78,habilidadesSociales:55,estilos:['V','K']},['Biología','Química','Matemáticas'],'#E1F5EE','🧬',9,800,'media',['ciencia','investigación','naturaleza']),
  espol('biotecnologia','Ingeniería en Biotecnología','Facultad de Ciencias de la Vida (FCV)','Aplicación de organismos vivos y tecnología para desarrollar productos farmacéuticos, agroindustriales y ambientales.',['Industria farmacéutica','Agroindustria','Investigación','Medio ambiente'],{empatia:60,inteligenciaEmocional:65,prosocial:75,habilidadesSociales:58,estilos:['R','K']},['Química','Biología','Matemáticas'],'#E1F5EE','🔬',10,1300,'alta',['ciencia','tecnología','innovación']),
  espol('arquitectura','Arquitectura','Facultad de Ingeniería en Ciencias de la Tierra (FICT)','Diseño de espacios, edificaciones y ciudades combinando creatividad técnica, sostenibilidad y estética.',['Estudios de arquitectura','Constructoras','Gobierno','Docencia'],{empatia:65,inteligenciaEmocional:70,prosocial:60,habilidadesSociales:72,estilos:['V','K']},['Matemáticas','Física','Dibujo técnico'],'#FAEEDA','🏛️',10,1100,'media',['diseño','arte','construcción']),
  espol('civil','Ingeniería Civil','Facultad de Ingeniería en Ciencias de la Tierra (FICT)','Diseño y construcción de infraestructura: puentes, edificios, carreteras y sistemas hidráulicos.',['Constructoras','Gobierno','Consultoras','Organismos internacionales'],{empatia:50,inteligenciaEmocional:60,prosocial:55,habilidadesSociales:65,estilos:['V','K']},['Matemáticas','Física','Química'],'#F1EFE8','🏗️',10,1400,'alta',['ingeniería','construcción']),
  espol('ambiental','Ingeniería Ambiental','Facultad de Ingeniería en Ciencias de la Tierra (FICT)','Gestión ambiental, manejo de residuos y evaluación de impacto en proyectos industriales.',['Empresas petroleras','Gobierno','ONGs','Consultoría ambiental'],{empatia:70,inteligenciaEmocional:65,prosocial:82,habilidadesSociales:68,estilos:['K','R']},['Química','Biología','Matemáticas'],'#E1F5EE','🌿',10,1200,'alta',['ingeniería','medio ambiente','sostenibilidad']),
  espol('geologica','Ingeniería Geológica','Facultad de Ingeniería en Ciencias de la Tierra (FICT)','Estudio de la estructura terrestre, recursos minerales, energéticos y riesgos geológicos.',['Petroleras','Mineras','Gobierno','Consultoras'],{empatia:48,inteligenciaEmocional:60,prosocial:55,habilidadesSociales:58,estilos:['V','K']},['Matemáticas','Física','Química'],'#FAEEDA','⛰️',10,1500,'media',['ingeniería','geología','recursos']),
  espol('minas','Ingeniería en Minas','Facultad de Ingeniería en Ciencias de la Tierra (FICT)','Exploración, explotación y procesamiento de recursos minerales con responsabilidad ambiental.',['Mineras','Gobierno','Consultoras','Industria metalúrgica'],{empatia:45,inteligenciaEmocional:58,prosocial:50,habilidadesSociales:55,estilos:['K','R']},['Matemáticas','Física','Química'],'#F1EFE8','⛏️',10,1600,'media',['ingeniería','minería','recursos']),
  espol('petroleos','Ingeniería en Petróleos','Facultad de Ingeniería en Ciencias de la Tierra (FICT)','Exploración, producción y refinación de hidrocarburos con tecnología de punta.',['Petroleras','Petroecuador','Servicios petroleros','Consultoría'],{empatia:42,inteligenciaEmocional:58,prosocial:48,habilidadesSociales:55,estilos:['R','K']},['Matemáticas','Física','Química'],'#F1EFE8','🛢️',10,2000,'media',['ingeniería','petróleo','energía']),
  espol('industrial','Ingeniería Industrial','Facultad de Ingeniería en Mecánica y Ciencias de la Producción (FIMCP)','Optimización de sistemas productivos, logística, calidad y gestión de operaciones.',['Manufactura','Logística','Consultoría','Banca'],{empatia:55,inteligenciaEmocional:65,prosocial:58,habilidadesSociales:70,estilos:['R','K']},['Matemáticas','Física','Química'],'#E6F1FB','⚙️',10,1400,'alta',['ingeniería','gestión','procesos']),
  espol('mecanica','Ingeniería Mecánica','Facultad de Ingeniería en Mecánica y Ciencias de la Producción (FIMCP)','Diseño y mantenimiento de máquinas, sistemas térmicos, automotriz y manufactura avanzada.',['Industria','Energía','Automotriz','Manufactura'],{empatia:42,inteligenciaEmocional:55,prosocial:45,habilidadesSociales:52,estilos:['K','V']},['Matemáticas','Física','Química'],'#E6F1FB','🔧',10,1400,'alta',['ingeniería','mecánica','industria']),
  espol('mecatronica','Ingeniería en Mecatrónica','Facultad de Ingeniería en Mecánica y Ciencias de la Producción (FIMCP)','Integra mecánica, electrónica e informática para diseñar robots y sistemas inteligentes.',['Industria 4.0','Robótica','Automatización','Investigación'],{empatia:45,inteligenciaEmocional:60,prosocial:48,habilidadesSociales:55,estilos:['R','V']},['Matemáticas','Física','Lógica'],'#EEEDFE','🤖',10,1600,'alta',['ingeniería','robótica','automatización']),
  espol('alimentos','Ingeniería en Alimentos','Facultad de Ingeniería en Mecánica y Ciencias de la Producción (FIMCP)','Procesamiento, conservación y desarrollo de productos alimenticios industriales.',['Industria alimentaria','Exportación','Investigación','Consultoría'],{empatia:55,inteligenciaEmocional:62,prosocial:65,habilidadesSociales:60,estilos:['K','R']},['Química','Biología','Matemáticas'],'#EAF3DE','🍱',10,1200,'alta',['ingeniería','alimentos','industria']),
  espol('materiales','Ingeniería en Materiales','Facultad de Ingeniería en Mecánica y Ciencias de la Producción (FIMCP)','Investigación y desarrollo de nuevos materiales: metales, polímeros, cerámicos y nanomateriales.',['Industria','Investigación','Manufactura','Innovación'],{empatia:42,inteligenciaEmocional:55,prosocial:50,habilidadesSociales:50,estilos:['R','K']},['Química','Física','Matemáticas'],'#FAEEDA','🧪',10,1300,'media',['ingeniería','ciencia de materiales']),
  espol('naval','Ingeniería Naval','Facultad de Ingeniería en Mecánica y Ciencias de la Producción (FIMCP)','Diseño, construcción y mantenimiento de embarcaciones y estructuras marinas.',['Astilleros','Marina','Pesca','Petróleo offshore'],{empatia:42,inteligenciaEmocional:55,prosocial:48,habilidadesSociales:55,estilos:['V','K']},['Matemáticas','Física','Química'],'#E6F1FB','⚓',10,1500,'media',['ingeniería','marina']),
  espol('agricola','Ingeniería Agrícola y Biológica','Facultad de Ingeniería en Mecánica y Ciencias de la Producción (FIMCP)','Tecnología agrícola, riego, maquinaria y sistemas de producción agropecuaria sostenible.',['Agroindustria','Cooperativas','Gobierno','Investigación'],{empatia:60,inteligenciaEmocional:62,prosocial:78,habilidadesSociales:60,estilos:['K','R']},['Biología','Matemáticas','Química'],'#E1F5EE','🌾',10,1100,'media',['ingeniería','agro','sostenibilidad']),
  espol('acuicola','Ingeniería Acuícola','Facultad de Ingeniería en Mecánica y Ciencias de la Producción (FIMCP)','Producción sostenible de especies acuáticas: camarón, tilapia y nuevas especies.',['Camaroneras','Exportación','Gobierno','Investigación'],{empatia:55,inteligenciaEmocional:60,prosocial:72,habilidadesSociales:58,estilos:['K','V']},['Biología','Química','Matemáticas'],'#E1F5EE','🦐',10,1300,'alta',['ingeniería','acuicultura','exportación']),
  espol('logistica','Ingeniería en Logística y Transporte','Facultad de Ingeniería en Mecánica y Ciencias de la Producción (FIMCP)','Cadena de suministro, transporte multimodal y comercio internacional.',['Logística','Comercio exterior','Aduanas','Consultoría'],{empatia:55,inteligenciaEmocional:65,prosocial:58,habilidadesSociales:72,estilos:['R','A']},['Matemáticas','Estadística','Lengua'],'#FAEEDA','🚚',10,1300,'alta',['ingeniería','logística','comercio']),
  espol('electrica','Ingeniería en Electricidad','Facultad de Ingeniería en Electricidad y Computación (FIEC)','Generación, transmisión y distribución de energía eléctrica con énfasis en energías renovables.',['Empresas eléctricas','Industria','Energías renovables','Consultoría'],{empatia:42,inteligenciaEmocional:58,prosocial:50,habilidadesSociales:52,estilos:['R','V']},['Matemáticas','Física','Química'],'#E6F1FB','⚡',10,1500,'alta',['ingeniería','energía']),
  espol('electronica','Ingeniería en Electrónica y Automatización','Facultad de Ingeniería en Electricidad y Computación (FIEC)','Diseño de sistemas electrónicos, control automático y automatización industrial.',['Industria','Telecomunicaciones','Investigación','Manufactura'],{empatia:40,inteligenciaEmocional:55,prosocial:45,habilidadesSociales:50,estilos:['R','V']},['Matemáticas','Física','Química'],'#E6F1FB','📡',10,1500,'alta',['ingeniería','electrónica','automatización']),
  espol('telecomunicaciones','Ingeniería en Telecomunicaciones','Facultad de Ingeniería en Electricidad y Computación (FIEC)','Redes de comunicación, fibra óptica, 5G, satelital y transformación digital.',['Telecomunicaciones','Gobierno','Consultoría','Empresas tech'],{empatia:42,inteligenciaEmocional:58,prosocial:48,habilidadesSociales:55,estilos:['R','V']},['Matemáticas','Física','Lógica'],'#E6F1FB','📶',10,1500,'alta',['ingeniería','redes','telecomunicaciones']),
  espol('telematica','Ingeniería en Telemática','Facultad de Ingeniería en Electricidad y Computación (FIEC)','Combina telecomunicaciones e informática: redes, ciberseguridad y servicios digitales.',['Empresas tech','Banca','Telecomunicaciones','Ciberseguridad'],{empatia:42,inteligenciaEmocional:58,prosocial:48,habilidadesSociales:52,estilos:['R','V']},['Matemáticas','Física','Lógica'],'#EEEDFE','🛰️',10,1500,'alta',['ingeniería','redes','tecnología']),
  espol('computacion','Ingeniería en Ciencias Computacionales','Facultad de Ingeniería en Electricidad y Computación (FIEC)','Algoritmos, inteligencia artificial, ciencia de datos y desarrollo de software avanzado.',['Empresas tech','Banca','IA','Startups','Freelance internacional'],{empatia:45,inteligenciaEmocional:60,prosocial:50,habilidadesSociales:55,estilos:['R','V']},['Matemáticas','Física','Lógica'],'#EEEDFE','🤖',10,1700,'alta',['tecnología','IA','programación']),
  espol('sistemas','Ingeniería en Sistemas de Información','Facultad de Ingeniería en Electricidad y Computación (FIEC)','Desarrollo de software, bases de datos y soluciones tecnológicas para organizaciones.',['Empresas tech','Banca','Gobierno','Startups','Freelance'],{empatia:45,inteligenciaEmocional:60,prosocial:50,habilidadesSociales:55,estilos:['R','V']},['Matemáticas','Física','Lógica'],'#E6F1FB','💻',10,1500,'alta',['tecnología','programación','negocios']),
  espol('estadistica','Estadística','Facultad de Ciencias Naturales y Matemáticas (FCNM)','Análisis cuantitativo de datos, modelos predictivos y soporte a la toma de decisiones.',['Banca','Gobierno','Investigación','Consultoría','Big Data'],{empatia:45,inteligenciaEmocional:62,prosocial:55,habilidadesSociales:55,estilos:['R','V']},['Matemáticas','Estadística','Lógica'],'#EEEDFE','📈',9,1300,'alta',['matemáticas','datos','análisis']),
  espol('matematicas','Matemáticas','Facultad de Ciencias Naturales y Matemáticas (FCNM)','Matemática pura y aplicada, modelamiento, criptografía e investigación científica.',['Investigación','Docencia','Banca','Tecnología'],{empatia:42,inteligenciaEmocional:60,prosocial:50,habilidadesSociales:50,estilos:['R','V']},['Matemáticas','Lógica','Física'],'#EEEDFE','🧮',9,1100,'media',['ciencia','matemáticas','investigación']),
  espol('auditoria','Auditoría y Control de Gestión','Facultad de Ciencias Sociales y Humanísticas (FCSH)','Auditoría financiera, control interno, NIIF y gestión de riesgos empresariales.',['Auditoras Big Four','Empresas','SRI','Banca','Sector público'],{empatia:50,inteligenciaEmocional:65,prosocial:58,habilidadesSociales:70,estilos:['R','A']},['Matemáticas','Lengua','Razonamiento'],'#FAEEDA','📋',9,1300,'alta',['negocios','finanzas','auditoría']),
  espol('economia','Economía','Facultad de Ciencias Sociales y Humanísticas (FCSH)','Análisis económico, políticas públicas, finanzas y desarrollo sostenible.',['Banco Central','Ministerios','Banca','Consultoría','Investigación'],{empatia:55,inteligenciaEmocional:68,prosocial:65,habilidadesSociales:75,estilos:['R','A']},['Matemáticas','Estadística','Lengua'],'#FAEEDA','💹',9,1400,'alta',['economía','negocios','política']),
  espol('administracion','Administración de Empresas','Facultad de Ciencias Sociales y Humanísticas (FCSH)','Gestión organizacional, liderazgo empresarial, finanzas y estrategia de negocios.',['Empresas privadas','Emprendimiento','Banca','Organismos internacionales'],{empatia:62,inteligenciaEmocional:78,prosocial:60,habilidadesSociales:85,estilos:['A','R']},['Matemáticas','Estadística','Economía'],'#FAEEDA','📊',9,1300,'alta',['negocios','liderazgo','emprendimiento']),
  espol('negocios-internacionales','Negocios Internacionales','Facultad de Ciencias Sociales y Humanísticas (FCSH)','Comercio exterior, marketing global, multinacionales y negociación intercultural.',['Comercio exterior','Multinacionales','Aduanas','Diplomacia comercial'],{empatia:60,inteligenciaEmocional:75,prosocial:60,habilidadesSociales:88,estilos:['A','R']},['Matemáticas','Lengua','Inglés'],'#E6F1FB','🌎',9,1400,'alta',['negocios','internacional','comercio']),
  espol('turismo','Turismo','Facultad de Ciencias Sociales y Humanísticas (FCSH)','Gestión turística, hotelería, ecoturismo y patrimonio cultural ecuatoriano.',['Hoteles','Operadoras turísticas','Gobierno','Emprendimiento'],{empatia:80,inteligenciaEmocional:78,prosocial:75,habilidadesSociales:90,estilos:['A','V']},['Lengua','Inglés','Geografía'],'#FAECE7','✈️',9,900,'media',['turismo','servicios','cultura']),
  espol('diseno-productos','Diseño de Productos','Facultad de Arte, Diseño y Comunicación Audiovisual (EDCOM)','Diseño industrial centrado en usuario: productos físicos, mobiliario, packaging.',['Industria','Diseño','Emprendimiento','Consultoría'],{empatia:70,inteligenciaEmocional:72,prosocial:62,habilidadesSociales:75,estilos:['V','K']},['Arte','Matemáticas','Lengua'],'#FAEEDA','🎨',8,1100,'media',['diseño','arte','creatividad']),
  espol('educacion','Licenciatura en Educación','Facultad de Ciencias Sociales y Humanísticas (FCSH)','Formación docente con sólida base pedagógica para educación básica y bachillerato.',['Instituciones educativas','Ministerio de Educación','ONGs','Docencia universitaria'],{empatia:88,inteligenciaEmocional:85,prosocial:90,habilidadesSociales:92,estilos:['A','V']},['Matemáticas','Lengua','Ciencias'],'#FAECE7','📚',8,800,'alta',['educación','pedagogía','social']),
  espol('psicologia','Psicología','Facultad de Ciencias Sociales y Humanísticas (FCSH)','Estudio del comportamiento humano, salud mental y procesos cognitivos y emocionales.',['Clínicas y hospitales','Empresas (RRHH)','Educación','Investigación'],{empatia:92,inteligenciaEmocional:95,prosocial:85,habilidadesSociales:88,estilos:['R','A']},['Biología','Estadística','Comunicación'],'#EEEDFE','🧠',9,1000,'alta',['salud','social','clínica']),

  // ============== ECOTEC — 5 ==============
  { id: 'ecotec-psicologia', nombre: 'Psicología', universidad: 'Universidad Tecnológica ECOTEC', siglaUniversidad: 'ECOTEC', urlUniversidad: 'https://ecotec.edu.ec/carreras-de-grado/', urlCarrera: 'https://ecotec.edu.ec/carreras-de-grado/', modalidad: ['presencial'], ciudad: ['Samborondón','Guayaquil'], facultad: 'Facultad de Ciencias de la Salud y Desarrollo Humano',
    descripcion: 'Formación en salud mental, comportamiento humano y bienestar psicosocial con enfoque clínico y organizacional.',
    campoLaboral: ['Clínicas','Empresas (RRHH)','Educación','ONGs','Investigación'],
    perfilIdeal: { empatia: 92, inteligenciaEmocional: 95, prosocial: 85, habilidadesSociales: 88, estilos: ['R','A'] },
    materiasClaveExamen: ['Biología','Lengua','Razonamiento'], color: '#EEEDFE', icono: '🧠',
    duracion: 9, tipoCosto: 'privada', salarioPromedioEcuador: 1100, demandaLaboral: 'alta', tags: ['salud','clínica','social'] },
  { id: 'ecotec-derecho', nombre: 'Derecho', universidad: 'Universidad Tecnológica ECOTEC', siglaUniversidad: 'ECOTEC', urlUniversidad: 'https://ecotec.edu.ec/carreras-de-grado/', urlCarrera: 'https://ecotec.edu.ec/carreras-de-grado/', modalidad: ['presencial'], ciudad: ['Samborondón','Guayaquil'], facultad: 'Facultad de Derecho y Gobernabilidad',
    descripcion: 'Formación jurídica integral con énfasis en derecho civil, penal, constitucional y gobernabilidad pública.',
    campoLaboral: ['Estudios jurídicos','Sector público','Empresas','Judicatura','ONGs'],
    perfilIdeal: { empatia: 68, inteligenciaEmocional: 75, prosocial: 72, habilidadesSociales: 88, estilos: ['R','A'] },
    materiasClaveExamen: ['Lengua','Razonamiento','Ciencias Sociales'], color: '#FAEEDA', icono: '⚖️',
    duracion: 10, tipoCosto: 'privada', salarioPromedioEcuador: 1300, demandaLaboral: 'alta', tags: ['derecho','social','política'] },
  { id: 'ecotec-marketing', nombre: 'Marketing y Comunicación', universidad: 'Universidad Tecnológica ECOTEC', siglaUniversidad: 'ECOTEC', urlUniversidad: 'https://ecotec.edu.ec/carreras-de-grado/', urlCarrera: 'https://ecotec.edu.ec/carreras-de-grado/', modalidad: ['presencial'], ciudad: ['Samborondón','Guayaquil'], facultad: 'Facultad de Ciencias Empresariales',
    descripcion: 'Estrategia de marca, marketing digital, comunicación corporativa y gestión de medios en la era digital.',
    campoLaboral: ['Agencias de publicidad','Empresas','Medios digitales','Emprendimiento'],
    perfilIdeal: { empatia: 65, inteligenciaEmocional: 72, prosocial: 60, habilidadesSociales: 85, estilos: ['V','A'] },
    materiasClaveExamen: ['Lengua','Razonamiento','Matemáticas Básica'], color: '#FAECE7', icono: '📣',
    duracion: 8, tipoCosto: 'privada', salarioPromedioEcuador: 1100, demandaLaboral: 'alta', tags: ['negocios','digital','creativo'] },
  { id: 'ecotec-administracion', nombre: 'Administración de Empresas', universidad: 'Universidad Tecnológica ECOTEC', siglaUniversidad: 'ECOTEC', urlUniversidad: 'https://ecotec.edu.ec/carreras-de-grado/', urlCarrera: 'https://ecotec.edu.ec/carreras-de-grado/', modalidad: ['presencial'], ciudad: ['Samborondón','Guayaquil','La Costa'], facultad: 'Facultad de Ciencias Empresariales',
    descripcion: 'Gestión organizacional, liderazgo, finanzas, emprendimiento y estrategia de negocios internacionales.',
    campoLaboral: ['Empresas privadas','Emprendimiento','Banca','Organismos internacionales'],
    perfilIdeal: { empatia: 60, inteligenciaEmocional: 75, prosocial: 58, habilidadesSociales: 85, estilos: ['A','R'] },
    materiasClaveExamen: ['Matemáticas','Lengua','Razonamiento'], color: '#E6F1FB', icono: '📊',
    duracion: 8, tipoCosto: 'privada', salarioPromedioEcuador: 1200, demandaLaboral: 'alta', tags: ['negocios','liderazgo'] },
  { id: 'ecotec-sistemas', nombre: 'Ingeniería en Sistemas Computacionales', universidad: 'Universidad Tecnológica ECOTEC', siglaUniversidad: 'ECOTEC', urlUniversidad: 'https://ecotec.edu.ec/carreras-de-grado/', urlCarrera: 'https://ecotec.edu.ec/carreras-de-grado/', modalidad: ['presencial'], ciudad: ['Samborondón','Guayaquil'], facultad: 'Facultad de Ingeniería',
    descripcion: 'Desarrollo de software, inteligencia artificial, redes y soluciones tecnológicas para la transformación digital.',
    campoLaboral: ['Empresas tech','Banca','Gobierno','Startups','Freelance internacional'],
    perfilIdeal: { empatia: 45, inteligenciaEmocional: 60, prosocial: 50, habilidadesSociales: 55, estilos: ['R','V'] },
    materiasClaveExamen: ['Matemáticas','Física','Razonamiento Lógico'], color: '#E1F5EE', icono: '💻',
    duracion: 9, tipoCosto: 'privada', salarioPromedioEcuador: 1500, demandaLaboral: 'alta', tags: ['tecnología','programación'] },

  // ============== UEES — 7 ==============
  { id: 'uees-medicina', nombre: 'Medicina', universidad: 'Universidad Espíritu Santo', siglaUniversidad: 'UEES', urlUniversidad: 'https://uees.edu.ec/grado/', urlCarrera: 'https://uees.edu.ec/grado/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad de Ciencias de la Salud',
    descripcion: 'Una de las mejores facultades de medicina del Ecuador con estándares internacionales y convenios en el exterior.',
    campoLaboral: ['Hospitales','Clínicas','Investigación médica','Salud pública','Exterior'],
    perfilIdeal: { empatia: 95, inteligenciaEmocional: 90, prosocial: 88, habilidadesSociales: 85, estilos: ['V','K'] },
    materiasClaveExamen: ['Biología','Química','Matemáticas'], color: '#EAF3DE', icono: '🩺',
    duracion: 12, tipoCosto: 'privada', salarioPromedioEcuador: 1800, demandaLaboral: 'alta', tags: ['salud','clínica','internacional'] },
  { id: 'uees-odontologia', nombre: 'Odontología', universidad: 'Universidad Espíritu Santo', siglaUniversidad: 'UEES', urlUniversidad: 'https://uees.edu.ec/grado/', urlCarrera: 'https://uees.edu.ec/grado/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad de Ciencias de la Salud',
    descripcion: 'Formación odontológica integral con laboratorios de alta tecnología y prácticas clínicas desde el primer año.',
    campoLaboral: ['Consultorios propios','Clínicas','Hospitales','Investigación'],
    perfilIdeal: { empatia: 82, inteligenciaEmocional: 78, prosocial: 80, habilidadesSociales: 82, estilos: ['V','K'] },
    materiasClaveExamen: ['Biología','Química','Matemáticas'], color: '#E1F5EE', icono: '🦷',
    duracion: 10, tipoCosto: 'privada', salarioPromedioEcuador: 1600, demandaLaboral: 'alta', tags: ['salud','clínica'] },
  { id: 'uees-derecho', nombre: 'Derecho', universidad: 'Universidad Espíritu Santo', siglaUniversidad: 'UEES', urlUniversidad: 'https://uees.edu.ec/grado/', urlCarrera: 'https://uees.edu.ec/grado/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad de Derecho, Política y Desarrollo',
    descripcion: 'Derecho con visión internacional, énfasis en arbitraje, mediación y carrera diplomática.',
    campoLaboral: ['Estudios jurídicos','Sector público','Organismos internacionales','Diplomacia'],
    perfilIdeal: { empatia: 68, inteligenciaEmocional: 76, prosocial: 72, habilidadesSociales: 90, estilos: ['R','A'] },
    materiasClaveExamen: ['Lengua','Razonamiento','Ciencias Sociales'], color: '#FAEEDA', icono: '⚖️',
    duracion: 10, tipoCosto: 'privada', salarioPromedioEcuador: 1500, demandaLaboral: 'alta', tags: ['derecho','internacional'] },
  { id: 'uees-comunicacion', nombre: 'Ciencias de la Comunicación', universidad: 'Universidad Espíritu Santo', siglaUniversidad: 'UEES', urlUniversidad: 'https://uees.edu.ec/grado/', urlCarrera: 'https://uees.edu.ec/grado/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad de Ciencias de la Comunicación',
    descripcion: 'Periodismo, producción audiovisual, comunicación digital y relaciones públicas con enfoque multimedia.',
    campoLaboral: ['Medios de comunicación','Agencias PR','Empresas','Producción audiovisual'],
    perfilIdeal: { empatia: 72, inteligenciaEmocional: 70, prosocial: 65, habilidadesSociales: 88, estilos: ['A','V'] },
    materiasClaveExamen: ['Lengua','Razonamiento','Arte'], color: '#FAECE7', icono: '🎙️',
    duracion: 8, tipoCosto: 'privada', salarioPromedioEcuador: 1100, demandaLaboral: 'media', tags: ['comunicación','creativo','digital'] },
  { id: 'uees-negocios', nombre: 'Emprendimiento y Negocios Internacionales', universidad: 'Universidad Espíritu Santo', siglaUniversidad: 'UEES', urlUniversidad: 'https://uees.edu.ec/grado/', urlCarrera: 'https://uees.edu.ec/grado/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad de Emprendimiento, Negocios y Economía',
    descripcion: 'Negocios globales, comercio exterior, emprendimiento con mentalidad internacional y red de contactos UEES.',
    campoLaboral: ['Comercio exterior','Startups','Multinacionales','Consultoría internacional'],
    perfilIdeal: { empatia: 60, inteligenciaEmocional: 72, prosocial: 58, habilidadesSociales: 88, estilos: ['A','R'] },
    materiasClaveExamen: ['Matemáticas','Lengua','Inglés'], color: '#E6F1FB', icono: '🌎',
    duracion: 8, tipoCosto: 'privada', salarioPromedioEcuador: 1500, demandaLaboral: 'alta', tags: ['negocios','internacional','emprendimiento'] },
  { id: 'uees-ingenieria-civil', nombre: 'Ingeniería Civil', universidad: 'Universidad Espíritu Santo', siglaUniversidad: 'UEES', urlUniversidad: 'https://uees.edu.ec/grado/', urlCarrera: 'https://uees.edu.ec/grado/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad de Ingeniería',
    descripcion: 'Diseño y construcción de infraestructura con estándares internacionales y laboratorios propios.',
    campoLaboral: ['Constructoras','Gobierno','Consultoras','Organismos internacionales'],
    perfilIdeal: { empatia: 50, inteligenciaEmocional: 60, prosocial: 55, habilidadesSociales: 65, estilos: ['V','K'] },
    materiasClaveExamen: ['Matemáticas','Física','Química'], color: '#F1EFE8', icono: '🏗️',
    duracion: 10, tipoCosto: 'privada', salarioPromedioEcuador: 1400, demandaLaboral: 'alta', tags: ['ingeniería','construcción'] },
  { id: 'uees-arquitectura', nombre: 'Arquitectura y Diseño', universidad: 'Universidad Espíritu Santo', siglaUniversidad: 'UEES', urlUniversidad: 'https://uees.edu.ec/grado/', urlCarrera: 'https://uees.edu.ec/grado/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad de Arquitectura y Diseño',
    descripcion: 'Diseño arquitectónico con enfoque sostenible, innovación tecnológica y proyección internacional.',
    campoLaboral: ['Estudios de arquitectura','Constructoras','Diseño urbano','Docencia'],
    perfilIdeal: { empatia: 62, inteligenciaEmocional: 68, prosocial: 58, habilidadesSociales: 70, estilos: ['V','K'] },
    materiasClaveExamen: ['Matemáticas','Física','Arte'], color: '#FAEEDA', icono: '🏛️',
    duracion: 10, tipoCosto: 'privada', salarioPromedioEcuador: 1200, demandaLaboral: 'media', tags: ['diseño','arte','construcción'] },

  // ============== UNEMI — 5 ==============
  { id: 'unemi-enfermeria', nombre: 'Enfermería', universidad: 'Universidad Estatal de Milagro', siglaUniversidad: 'UNEMI', urlUniversidad: 'https://www.unemi.edu.ec/index.php/carreras-presencial/', urlCarrera: 'https://www.unemi.edu.ec/index.php/carreras-presencial/', modalidad: ['presencial'], ciudad: ['Milagro','Guayaquil'], facultad: 'Facultad de Ciencias de la Salud',
    descripcion: 'Formación en cuidado integral de pacientes, salud comunitaria y atención primaria de salud.',
    campoLaboral: ['Hospitales públicos','Centros de salud','Clínicas privadas','Salud comunitaria'],
    perfilIdeal: { empatia: 92, inteligenciaEmocional: 88, prosocial: 90, habilidadesSociales: 85, estilos: ['K','V'] },
    materiasClaveExamen: ['Biología','Química','Matemáticas'], color: '#EAF3DE', icono: '💉',
    duracion: 9, tipoCosto: 'publica', salarioPromedioEcuador: 900, demandaLaboral: 'alta', tags: ['salud','social'] },
  { id: 'unemi-sistemas', nombre: 'Ingeniería en Sistemas de Información', universidad: 'Universidad Estatal de Milagro', siglaUniversidad: 'UNEMI', urlUniversidad: 'https://www.unemi.edu.ec/index.php/carreras-presencial/', urlCarrera: 'https://www.unemi.edu.ec/index.php/carreras-presencial/', modalidad: ['presencial','semipresencial'], ciudad: ['Milagro'], facultad: 'Facultad de Ciencias de la Ingeniería',
    descripcion: 'Desarrollo de software, bases de datos, redes y seguridad informática para organizaciones.',
    campoLaboral: ['Empresas tecnológicas','Gobierno','Banca','Freelance'],
    perfilIdeal: { empatia: 45, inteligenciaEmocional: 58, prosocial: 48, habilidadesSociales: 52, estilos: ['R','V'] },
    materiasClaveExamen: ['Matemáticas','Física','Lógica'], color: '#E6F1FB', icono: '🖥️',
    duracion: 9, tipoCosto: 'publica', salarioPromedioEcuador: 1200, demandaLaboral: 'alta', tags: ['tecnología','programación'] },
  { id: 'unemi-contabilidad', nombre: 'Contabilidad y Auditoría', universidad: 'Universidad Estatal de Milagro', siglaUniversidad: 'UNEMI', urlUniversidad: 'https://www.unemi.edu.ec/index.php/carreras-presencial/', urlCarrera: 'https://www.unemi.edu.ec/index.php/carreras-presencial/', modalidad: ['presencial','semipresencial','online'], ciudad: ['Milagro'], facultad: 'Facultad de Ciencias Administrativas',
    descripcion: 'Control financiero, auditoría de empresas, tributación y gestión contable con herramientas digitales.',
    campoLaboral: ['Empresas privadas','SRI','Auditorías','Banca','Emprendimiento propio'],
    perfilIdeal: { empatia: 50, inteligenciaEmocional: 62, prosocial: 55, habilidadesSociales: 65, estilos: ['R','K'] },
    materiasClaveExamen: ['Matemáticas','Lengua','Razonamiento'], color: '#FAEEDA', icono: '📋',
    duracion: 8, tipoCosto: 'publica', salarioPromedioEcuador: 1000, demandaLaboral: 'alta', tags: ['negocios','finanzas'] },
  { id: 'unemi-educacion', nombre: 'Educación Básica', universidad: 'Universidad Estatal de Milagro', siglaUniversidad: 'UNEMI', urlUniversidad: 'https://www.unemi.edu.ec/index.php/carreras-presencial/', urlCarrera: 'https://www.unemi.edu.ec/index.php/carreras-presencial/', modalidad: ['presencial','semipresencial'], ciudad: ['Milagro'], facultad: 'Facultad de Educación y Comunicación',
    descripcion: 'Formación de docentes para educación básica con enfoque en pedagogía innovadora e inclusión educativa.',
    campoLaboral: ['Escuelas públicas y privadas','Ministerio de Educación','ONGs','Docencia universitaria'],
    perfilIdeal: { empatia: 88, inteligenciaEmocional: 85, prosocial: 90, habilidadesSociales: 92, estilos: ['A','V'] },
    materiasClaveExamen: ['Lengua','Matemáticas','Razonamiento'], color: '#FAECE7', icono: '📚',
    duracion: 8, tipoCosto: 'publica', salarioPromedioEcuador: 800, demandaLaboral: 'alta', tags: ['educación','social'] },
  { id: 'unemi-agroindustrias', nombre: 'Ingeniería en Agroindustrias', universidad: 'Universidad Estatal de Milagro', siglaUniversidad: 'UNEMI', urlUniversidad: 'https://www.unemi.edu.ec/index.php/carreras-presencial/', urlCarrera: 'https://www.unemi.edu.ec/index.php/carreras-presencial/', modalidad: ['presencial'], ciudad: ['Milagro'], facultad: 'Facultad de Ciencias Agropecuarias',
    descripcion: 'Producción, procesamiento y comercialización de alimentos agroindustriales con enfoque en sostenibilidad.',
    campoLaboral: ['Industria alimentaria','Exportación','Gobierno','Investigación agrícola'],
    perfilIdeal: { empatia: 58, inteligenciaEmocional: 60, prosocial: 72, habilidadesSociales: 60, estilos: ['K','R'] },
    materiasClaveExamen: ['Química','Biología','Matemáticas'], color: '#E1F5EE', icono: '🌾',
    duracion: 10, tipoCosto: 'publica', salarioPromedioEcuador: 1100, demandaLaboral: 'media', tags: ['agro','industria','exportación'] },

  // ============== UG — 12 ==============
  { id: 'ug-medicina', nombre: 'Medicina', universidad: 'Universidad de Guayaquil', siglaUniversidad: 'UG', urlUniversidad: 'https://admision.ug.edu.ec/oferta-ug/', urlCarrera: 'https://admision.ug.edu.ec/oferta-ug/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad de Ciencias Médicas',
    descripcion: 'Una de las facultades de medicina más grandes del país. Formación integral en ciencias de la salud humana, pública y comunitaria.',
    campoLaboral: ['Hospitales IESS y MSP','Clínicas privadas','Salud pública','Investigación','Docencia'],
    perfilIdeal: { empatia: 95, inteligenciaEmocional: 90, prosocial: 90, habilidadesSociales: 85, estilos: ['V','K'] },
    materiasClaveExamen: ['Biología','Química','Matemáticas'], color: '#EAF3DE', icono: '🩺',
    duracion: 12, tipoCosto: 'publica', salarioPromedioEcuador: 1500, demandaLaboral: 'alta', tags: ['salud','clínica','social'] },
  { id: 'ug-enfermeria', nombre: 'Enfermería', universidad: 'Universidad de Guayaquil', siglaUniversidad: 'UG', urlUniversidad: 'https://admision.ug.edu.ec/oferta-ug/', urlCarrera: 'https://admision.ug.edu.ec/oferta-ug/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad de Ciencias Médicas',
    descripcion: 'Cuidado integral del paciente, enfermería comunitaria y gestión de servicios de salud pública.',
    campoLaboral: ['Hospitales IESS y MSP','Centros de salud','Clínicas','Atención domiciliaria'],
    perfilIdeal: { empatia: 92, inteligenciaEmocional: 88, prosocial: 90, habilidadesSociales: 85, estilos: ['K','V'] },
    materiasClaveExamen: ['Biología','Química','Matemáticas'], color: '#E1F5EE', icono: '💉',
    duracion: 9, tipoCosto: 'publica', salarioPromedioEcuador: 900, demandaLaboral: 'alta', tags: ['salud','social'] },
  { id: 'ug-nutricion', nombre: 'Dietética y Nutrición', universidad: 'Universidad de Guayaquil', siglaUniversidad: 'UG', urlUniversidad: 'https://admision.ug.edu.ec/oferta-ug/', urlCarrera: 'https://admision.ug.edu.ec/oferta-ug/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad de Ciencias Médicas',
    descripcion: 'Ciencia de la alimentación aplicada a la salud clínica, deportiva y comunitaria.',
    campoLaboral: ['Hospitales','Industria alimentaria','Deporte','Consultorios nutricionales'],
    perfilIdeal: { empatia: 82, inteligenciaEmocional: 78, prosocial: 85, habilidadesSociales: 80, estilos: ['K','V'] },
    materiasClaveExamen: ['Biología','Química','Matemáticas'], color: '#EAF3DE', icono: '🥗',
    duracion: 9, tipoCosto: 'publica', salarioPromedioEcuador: 850, demandaLaboral: 'alta', tags: ['salud','alimentación'] },
  { id: 'ug-odontologia', nombre: 'Odontología', universidad: 'Universidad de Guayaquil', siglaUniversidad: 'UG', urlUniversidad: 'https://admision.ug.edu.ec/oferta-ug/', urlCarrera: 'https://admision.ug.edu.ec/oferta-ug/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad Piloto de Odontología',
    descripcion: 'Diagnóstico, prevención y tratamiento de enfermedades bucales con clínicas de atención comunitaria.',
    campoLaboral: ['Consultorios propios','Hospitales','Clínicas','Salud pública','Docencia'],
    perfilIdeal: { empatia: 82, inteligenciaEmocional: 78, prosocial: 78, habilidadesSociales: 80, estilos: ['V','K'] },
    materiasClaveExamen: ['Biología','Química','Matemáticas'], color: '#E1F5EE', icono: '🦷',
    duracion: 10, tipoCosto: 'publica', salarioPromedioEcuador: 1300, demandaLaboral: 'alta', tags: ['salud','clínica'] },
  { id: 'ug-derecho', nombre: 'Derecho', universidad: 'Universidad de Guayaquil', siglaUniversidad: 'UG', urlUniversidad: 'https://admision.ug.edu.ec/oferta-ug/', urlCarrera: 'https://admision.ug.edu.ec/oferta-ug/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad de Jurisprudencia y Ciencias Sociales y Políticas',
    descripcion: 'Formación jurídica con enfoque en derecho constitucional, civil, penal y administrativo.',
    campoLaboral: ['Estudios jurídicos','Función judicial','Sector público','Empresas'],
    perfilIdeal: { empatia: 68, inteligenciaEmocional: 75, prosocial: 72, habilidadesSociales: 90, estilos: ['R','A'] },
    materiasClaveExamen: ['Lengua','Razonamiento','Ciencias Sociales'], color: '#FAEEDA', icono: '⚖️',
    duracion: 10, tipoCosto: 'publica', salarioPromedioEcuador: 1100, demandaLaboral: 'alta', tags: ['derecho','social','política'] },
  { id: 'ug-administracion', nombre: 'Administración de Empresas', universidad: 'Universidad de Guayaquil', siglaUniversidad: 'UG', urlUniversidad: 'https://admision.ug.edu.ec/oferta-ug/', urlCarrera: 'https://admision.ug.edu.ec/oferta-ug/', modalidad: ['presencial','hibrida'], ciudad: ['Guayaquil'], facultad: 'Facultad de Ciencias Administrativas',
    descripcion: 'Gestión empresarial, finanzas, marketing y emprendimiento con visión pública y privada.',
    campoLaboral: ['Empresas privadas','Sector público','Banca','Emprendimiento'],
    perfilIdeal: { empatia: 60, inteligenciaEmocional: 75, prosocial: 58, habilidadesSociales: 85, estilos: ['A','R'] },
    materiasClaveExamen: ['Matemáticas','Lengua','Razonamiento'], color: '#E6F1FB', icono: '📊',
    duracion: 8, tipoCosto: 'publica', salarioPromedioEcuador: 1000, demandaLaboral: 'alta', tags: ['negocios','liderazgo'] },
  { id: 'ug-arquitectura', nombre: 'Arquitectura y Urbanismo', universidad: 'Universidad de Guayaquil', siglaUniversidad: 'UG', urlUniversidad: 'https://admision.ug.edu.ec/oferta-ug/', urlCarrera: 'https://admision.ug.edu.ec/oferta-ug/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad de Arquitectura y Urbanismo',
    descripcion: 'Diseño arquitectónico, planificación urbana y gestión del hábitat sostenible.',
    campoLaboral: ['Estudios de arquitectura','Municipios','Constructoras','Sector público'],
    perfilIdeal: { empatia: 62, inteligenciaEmocional: 68, prosocial: 60, habilidadesSociales: 70, estilos: ['V','K'] },
    materiasClaveExamen: ['Matemáticas','Física','Arte'], color: '#FAEEDA', icono: '🏛️',
    duracion: 10, tipoCosto: 'publica', salarioPromedioEcuador: 1000, demandaLaboral: 'media', tags: ['diseño','arte','construcción'] },
  { id: 'ug-comunicacion', nombre: 'Comunicación', universidad: 'Universidad de Guayaquil', siglaUniversidad: 'UG', urlUniversidad: 'https://admision.ug.edu.ec/oferta-ug/', urlCarrera: 'https://admision.ug.edu.ec/oferta-ug/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad de Comunicación Social',
    descripcion: 'Periodismo, producción audiovisual, comunicación digital y relaciones institucionales.',
    campoLaboral: ['Medios de comunicación','Publicidad','Gobierno','Producción audiovisual'],
    perfilIdeal: { empatia: 72, inteligenciaEmocional: 70, prosocial: 65, habilidadesSociales: 88, estilos: ['A','V'] },
    materiasClaveExamen: ['Lengua','Razonamiento','Ciencias Sociales'], color: '#FAECE7', icono: '🎙️',
    duracion: 8, tipoCosto: 'publica', salarioPromedioEcuador: 900, demandaLaboral: 'media', tags: ['comunicación','creativo'] },
  { id: 'ug-sistemas', nombre: 'Ingeniería en Sistemas Computacionales', universidad: 'Universidad de Guayaquil', siglaUniversidad: 'UG', urlUniversidad: 'https://admision.ug.edu.ec/oferta-ug/', urlCarrera: 'https://admision.ug.edu.ec/oferta-ug/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad de Ciencias Matemáticas y Físicas',
    descripcion: 'Desarrollo de software, redes, bases de datos y soluciones informáticas para organizaciones.',
    campoLaboral: ['Empresas tecnológicas','Banca','Gobierno','Freelance'],
    perfilIdeal: { empatia: 45, inteligenciaEmocional: 58, prosocial: 50, habilidadesSociales: 55, estilos: ['R','V'] },
    materiasClaveExamen: ['Matemáticas','Física','Lógica'], color: '#E6F1FB', icono: '🖥️',
    duracion: 9, tipoCosto: 'publica', salarioPromedioEcuador: 1200, demandaLaboral: 'alta', tags: ['tecnología','programación'] },
  { id: 'ug-datos-ia', nombre: 'Ciencia de Datos e Inteligencia Artificial', universidad: 'Universidad de Guayaquil', siglaUniversidad: 'UG', urlUniversidad: 'https://admision.ug.edu.ec/oferta-ug/', urlCarrera: 'https://admision.ug.edu.ec/oferta-ug/', modalidad: ['presencial','hibrida'], ciudad: ['Guayaquil'], facultad: 'Facultad de Ciencias Matemáticas y Físicas',
    descripcion: 'Análisis de datos masivos, machine learning, IA y toma de decisiones basada en datos.',
    campoLaboral: ['Empresas tech','Banca','Salud','Gobierno digital','Investigación'],
    perfilIdeal: { empatia: 42, inteligenciaEmocional: 60, prosocial: 48, habilidadesSociales: 52, estilos: ['R','V'] },
    materiasClaveExamen: ['Matemáticas','Física','Lógica'], color: '#EEEDFE', icono: '🤖',
    duracion: 9, tipoCosto: 'publica', salarioPromedioEcuador: 1600, demandaLaboral: 'alta', tags: ['tecnología','IA','datos'] },
  { id: 'ug-psicologia', nombre: 'Psicología', universidad: 'Universidad de Guayaquil', siglaUniversidad: 'UG', urlUniversidad: 'https://admision.ug.edu.ec/oferta-ug/', urlCarrera: 'https://admision.ug.edu.ec/oferta-ug/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad de Ciencias Psicológicas',
    descripcion: 'Psicología clínica, educativa y organizacional con enfoque en salud mental comunitaria.',
    campoLaboral: ['Clínicas','Centros de salud','Empresas','Educación','ONGs'],
    perfilIdeal: { empatia: 92, inteligenciaEmocional: 95, prosocial: 85, habilidadesSociales: 88, estilos: ['R','A'] },
    materiasClaveExamen: ['Biología','Lengua','Razonamiento'], color: '#EEEDFE', icono: '🧠',
    duracion: 9, tipoCosto: 'publica', salarioPromedioEcuador: 950, demandaLaboral: 'alta', tags: ['salud','social','clínica'] },
  { id: 'ug-educacion', nombre: 'Educación Básica', universidad: 'Universidad de Guayaquil', siglaUniversidad: 'UG', urlUniversidad: 'https://admision.ug.edu.ec/oferta-ug/', urlCarrera: 'https://admision.ug.edu.ec/oferta-ug/', modalidad: ['presencial'], ciudad: ['Guayaquil'], facultad: 'Facultad de Filosofía, Letras y Ciencias de la Educación',
    descripcion: 'Formación de docentes con pedagogía innovadora para educación básica pública y privada.',
    campoLaboral: ['Escuelas públicas y privadas','Ministerio de Educación','ONGs','Docencia universitaria'],
    perfilIdeal: { empatia: 88, inteligenciaEmocional: 85, prosocial: 90, habilidadesSociales: 92, estilos: ['A','V'] },
    materiasClaveExamen: ['Lengua','Matemáticas','Ciencias Sociales'], color: '#FAECE7', icono: '📚',
    duracion: 8, tipoCosto: 'publica', salarioPromedioEcuador: 800, demandaLaboral: 'alta', tags: ['educación','social'] },

  // ============== UCE — 13 ==============
  { id: 'uce-medicina', nombre: 'Medicina', universidad: 'Universidad Central del Ecuador', siglaUniversidad: 'UCE', urlUniversidad: 'https://www.uce.edu.ec/grado', urlCarrera: 'https://www.uce.edu.ec/grado', modalidad: ['presencial'], ciudad: ['Quito'], facultad: 'Facultad de Ciencias Médicas',
    descripcion: 'Una de las escuelas de medicina más prestigiosas del país. Puntaje de admisión 940/1000. Formación clínica y comunitaria de excelencia.',
    campoLaboral: ['Hospitales IESS y MSP','Clínicas','Investigación médica','Medicina comunitaria'],
    perfilIdeal: { empatia: 95, inteligenciaEmocional: 90, prosocial: 90, habilidadesSociales: 85, estilos: ['V','K'] },
    materiasClaveExamen: ['Biología','Química','Matemáticas'], color: '#EAF3DE', icono: '🩺',
    duracion: 12, tipoCosto: 'publica', salarioPromedioEcuador: 1500, demandaLaboral: 'alta', tags: ['salud','clínica','prestigio'] },
  { id: 'uce-psicologia', nombre: 'Psicología', universidad: 'Universidad Central del Ecuador', siglaUniversidad: 'UCE', urlUniversidad: 'https://www.uce.edu.ec/grado', urlCarrera: 'https://www.uce.edu.ec/grado', modalidad: ['presencial'], ciudad: ['Quito'], facultad: 'Facultad de Ciencias Psicológicas',
    descripcion: 'Psicología clínica, educativa y organizacional. Una de las más reconocidas del país con alta demanda laboral.',
    campoLaboral: ['Clínicas','Empresas','Educación','Sector público','Investigación'],
    perfilIdeal: { empatia: 92, inteligenciaEmocional: 95, prosocial: 85, habilidadesSociales: 88, estilos: ['R','A'] },
    materiasClaveExamen: ['Biología','Lengua','Razonamiento'], color: '#EEEDFE', icono: '🧠',
    duracion: 9, tipoCosto: 'publica', salarioPromedioEcuador: 950, demandaLaboral: 'alta', tags: ['salud','social','clínica'] },
  { id: 'uce-fisioterapia', nombre: 'Fisioterapia', universidad: 'Universidad Central del Ecuador', siglaUniversidad: 'UCE', urlUniversidad: 'https://www.uce.edu.ec/grado', urlCarrera: 'https://www.uce.edu.ec/grado', modalidad: ['presencial'], ciudad: ['Quito'], facultad: 'Facultad de Ciencias de la Discapacidad y Atención Prehospitalaria',
    descripcion: 'Rehabilitación física, terapia manual y medicina deportiva. Puntaje de admisión 901/1000.',
    campoLaboral: ['Hospitales','Clínicas de rehabilitación','Deporte','Atención domiciliaria'],
    perfilIdeal: { empatia: 88, inteligenciaEmocional: 82, prosocial: 88, habilidadesSociales: 85, estilos: ['K','V'] },
    materiasClaveExamen: ['Biología','Química','Matemáticas'], color: '#E1F5EE', icono: '🦽',
    duracion: 9, tipoCosto: 'publica', salarioPromedioEcuador: 950, demandaLaboral: 'alta', tags: ['salud','rehabilitación'] },
  { id: 'uce-derecho', nombre: 'Derecho', universidad: 'Universidad Central del Ecuador', siglaUniversidad: 'UCE', urlUniversidad: 'https://www.uce.edu.ec/grado', urlCarrera: 'https://www.uce.edu.ec/grado', modalidad: ['presencial'], ciudad: ['Quito'], facultad: 'Facultad de Jurisprudencia, Ciencias Políticas y Sociales',
    descripcion: 'La más antigua y reconocida Facultad de Derecho del Ecuador. Formación en derecho público, privado y constitucional.',
    campoLaboral: ['Estudios jurídicos','Función judicial','Asamblea Nacional','Empresas','Diplomacia'],
    perfilIdeal: { empatia: 68, inteligenciaEmocional: 76, prosocial: 72, habilidadesSociales: 92, estilos: ['R','A'] },
    materiasClaveExamen: ['Lengua','Razonamiento','Ciencias Sociales'], color: '#FAEEDA', icono: '⚖️',
    duracion: 10, tipoCosto: 'publica', salarioPromedioEcuador: 1200, demandaLaboral: 'alta', tags: ['derecho','social','prestigio'] },
  { id: 'uce-arquitectura', nombre: 'Arquitectura y Urbanismo', universidad: 'Universidad Central del Ecuador', siglaUniversidad: 'UCE', urlUniversidad: 'https://www.uce.edu.ec/grado', urlCarrera: 'https://www.uce.edu.ec/grado', modalidad: ['presencial'], ciudad: ['Quito'], facultad: 'Facultad de Arquitectura y Urbanismo',
    descripcion: 'Diseño arquitectónico, planificación urbana y patrimonio cultural. Puntaje de admisión 871/1000.',
    campoLaboral: ['Estudios de arquitectura','Municipios','Ministerio de Obras Públicas','Construcción'],
    perfilIdeal: { empatia: 62, inteligenciaEmocional: 68, prosocial: 60, habilidadesSociales: 70, estilos: ['V','K'] },
    materiasClaveExamen: ['Matemáticas','Física','Arte'], color: '#FAEEDA', icono: '🏛️',
    duracion: 10, tipoCosto: 'publica', salarioPromedioEcuador: 1000, demandaLaboral: 'media', tags: ['diseño','arte','urbanismo'] },
  { id: 'uce-ingenieria-civil', nombre: 'Ingeniería Civil', universidad: 'Universidad Central del Ecuador', siglaUniversidad: 'UCE', urlUniversidad: 'https://www.uce.edu.ec/grado', urlCarrera: 'https://www.uce.edu.ec/grado', modalidad: ['presencial'], ciudad: ['Quito'], facultad: 'Facultad de Ingeniería, Ciencias Físicas y Matemática',
    descripcion: 'Diseño y construcción de obras civiles: puentes, edificios, carreteras y sistemas hidráulicos. Puntaje 861/1000.',
    campoLaboral: ['Constructoras','Gobierno','Consultoras','Sector petrolero'],
    perfilIdeal: { empatia: 50, inteligenciaEmocional: 60, prosocial: 55, habilidadesSociales: 65, estilos: ['V','K'] },
    materiasClaveExamen: ['Matemáticas','Física','Química'], color: '#F1EFE8', icono: '🏗️',
    duracion: 10, tipoCosto: 'publica', salarioPromedioEcuador: 1300, demandaLaboral: 'alta', tags: ['ingeniería','construcción'] },
  { id: 'uce-quimica-farmaceutica', nombre: 'Bioquímica y Farmacia', universidad: 'Universidad Central del Ecuador', siglaUniversidad: 'UCE', urlUniversidad: 'https://www.uce.edu.ec/grado', urlCarrera: 'https://www.uce.edu.ec/grado', modalidad: ['presencial'], ciudad: ['Quito'], facultad: 'Facultad de Ciencias Químicas',
    descripcion: 'Análisis clínico, control de calidad farmacéutico, toxicología y bromatología.',
    campoLaboral: ['Laboratorios clínicos','Industria farmacéutica','Hospitales','Control de calidad'],
    perfilIdeal: { empatia: 65, inteligenciaEmocional: 68, prosocial: 72, habilidadesSociales: 65, estilos: ['R','K'] },
    materiasClaveExamen: ['Química','Biología','Matemáticas'], color: '#E6F1FB', icono: '⚗️',
    duracion: 10, tipoCosto: 'publica', salarioPromedioEcuador: 1200, demandaLaboral: 'alta', tags: ['salud','química','industria'] },
  { id: 'uce-ingenieria-quimica', nombre: 'Ingeniería Química', universidad: 'Universidad Central del Ecuador', siglaUniversidad: 'UCE', urlUniversidad: 'https://www.uce.edu.ec/grado', urlCarrera: 'https://www.uce.edu.ec/grado', modalidad: ['presencial'], ciudad: ['Quito'], facultad: 'Facultad de Ingeniería Química',
    descripcion: 'Diseño de procesos industriales, petroquímica, alimentos y medio ambiente. Puntaje 849/1000.',
    campoLaboral: ['Industria petrolera','Alimentos','Medio ambiente','Manufactura'],
    perfilIdeal: { empatia: 48, inteligenciaEmocional: 58, prosocial: 55, habilidadesSociales: 55, estilos: ['R','K'] },
    materiasClaveExamen: ['Química','Matemáticas','Física'], color: '#FAEEDA', icono: '🧪',
    duracion: 10, tipoCosto: 'publica', salarioPromedioEcuador: 1500, demandaLaboral: 'alta', tags: ['ingeniería','química','industria'] },
  { id: 'uce-sistemas', nombre: 'Sistemas de Información', universidad: 'Universidad Central del Ecuador', siglaUniversidad: 'UCE', urlUniversidad: 'https://www.uce.edu.ec/grado', urlCarrera: 'https://www.uce.edu.ec/grado', modalidad: ['presencial'], ciudad: ['Quito'], facultad: 'Facultad de Ingeniería, Ciencias Físicas y Matemática',
    descripcion: 'Desarrollo de software, bases de datos, redes y transformación digital organizacional.',
    campoLaboral: ['Empresas tecnológicas','Banco Central','Gobierno','Startups'],
    perfilIdeal: { empatia: 45, inteligenciaEmocional: 58, prosocial: 48, habilidadesSociales: 52, estilos: ['R','V'] },
    materiasClaveExamen: ['Matemáticas','Física','Lógica'], color: '#E6F1FB', icono: '💻',
    duracion: 9, tipoCosto: 'publica', salarioPromedioEcuador: 1300, demandaLaboral: 'alta', tags: ['tecnología','programación'] },
  { id: 'uce-administracion', nombre: 'Administración de Empresas', universidad: 'Universidad Central del Ecuador', siglaUniversidad: 'UCE', urlUniversidad: 'https://www.uce.edu.ec/grado', urlCarrera: 'https://www.uce.edu.ec/grado', modalidad: ['presencial'], ciudad: ['Quito'], facultad: 'Facultad de Ciencias Administrativas',
    descripcion: 'Gestión organizacional, finanzas, marketing y administración pública y privada.',
    campoLaboral: ['Ministerios','Empresas privadas','Banca','Emprendimiento'],
    perfilIdeal: { empatia: 60, inteligenciaEmocional: 75, prosocial: 60, habilidadesSociales: 85, estilos: ['A','R'] },
    materiasClaveExamen: ['Matemáticas','Lengua','Razonamiento'], color: '#E6F1FB', icono: '📊',
    duracion: 8, tipoCosto: 'publica', salarioPromedioEcuador: 1000, demandaLaboral: 'alta', tags: ['negocios','liderazgo'] },
  { id: 'uce-comunicacion', nombre: 'Comunicación y Cultura', universidad: 'Universidad Central del Ecuador', siglaUniversidad: 'UCE', urlUniversidad: 'https://www.uce.edu.ec/grado', urlCarrera: 'https://www.uce.edu.ec/grado', modalidad: ['presencial'], ciudad: ['Quito'], facultad: 'Facultad de Comunicación Social',
    descripcion: 'Periodismo, comunicación organizacional, producción audiovisual y medios digitales.',
    campoLaboral: ['Medios de comunicación','Gobierno','ONGs','Publicidad','Producción audiovisual'],
    perfilIdeal: { empatia: 72, inteligenciaEmocional: 70, prosocial: 65, habilidadesSociales: 88, estilos: ['A','V'] },
    materiasClaveExamen: ['Lengua','Razonamiento','Ciencias Sociales'], color: '#FAECE7', icono: '🎙️',
    duracion: 8, tipoCosto: 'publica', salarioPromedioEcuador: 900, demandaLaboral: 'media', tags: ['comunicación','creativo','cultura'] },
  { id: 'uce-veterinaria', nombre: 'Medicina Veterinaria y Zootecnia', universidad: 'Universidad Central del Ecuador', siglaUniversidad: 'UCE', urlUniversidad: 'https://www.uce.edu.ec/grado', urlCarrera: 'https://www.uce.edu.ec/grado', modalidad: ['presencial'], ciudad: ['Quito'], facultad: 'Facultad de Medicina Veterinaria y Zootecnia',
    descripcion: 'Salud animal, producción pecuaria y seguridad alimentaria con enfoque en sostenibilidad.',
    campoLaboral: ['Clínicas veterinarias','Industria pecuaria','Agroindustria','Gobierno','ONGs'],
    perfilIdeal: { empatia: 85, inteligenciaEmocional: 75, prosocial: 80, habilidadesSociales: 70, estilos: ['K','V'] },
    materiasClaveExamen: ['Biología','Química','Matemáticas'], color: '#E1F5EE', icono: '🐾',
    duracion: 10, tipoCosto: 'publica', salarioPromedioEcuador: 1100, demandaLaboral: 'media', tags: ['salud','animales','agro'] },
  { id: 'uce-ambiental', nombre: 'Ingeniería Ambiental', universidad: 'Universidad Central del Ecuador', siglaUniversidad: 'UCE', urlUniversidad: 'https://www.uce.edu.ec/grado', urlCarrera: 'https://www.uce.edu.ec/grado', modalidad: ['presencial'], ciudad: ['Quito'], facultad: 'Facultad de Ingeniería, Ciencias Físicas y Matemática',
    descripcion: 'Protección ambiental, evaluación de impacto, gestión de residuos y cambio climático. Puntaje 869/1000.',
    campoLaboral: ['Ministerio del Ambiente','Empresas petroleras','Consultoras','ONGs ambientales'],
    perfilIdeal: { empatia: 70, inteligenciaEmocional: 65, prosocial: 82, habilidadesSociales: 68, estilos: ['K','R'] },
    materiasClaveExamen: ['Química','Biología','Matemáticas'], color: '#EAF3DE', icono: '🌿',
    duracion: 10, tipoCosto: 'publica', salarioPromedioEcuador: 1200, demandaLaboral: 'alta', tags: ['ingeniería','medio ambiente','sostenibilidad'] },
];

export const CARRERAS_ESPOL = CARRERAS_ECUADOR;
export const UNIVERSIDADES = ['ESPOL', 'ECOTEC', 'UEES', 'UNEMI', 'UG', 'UCE'] as const;
export const MODALIDADES = ['presencial', 'semipresencial', 'online', 'hibrida'] as const;
export const TIPOS_COSTO: TipoCosto[] = ['publica', 'privada', 'cofinanciada'];
export const DEMANDAS: DemandaLaboral[] = ['alta', 'media', 'baja'];

export function getCarreraById(id: string): CarreraUniversidad | undefined {
  return CARRERAS_ECUADOR.find(c => c.id === id);
}
export function getCiudadesUnicas(): string[] {
  const set = new Set<string>();
  CARRERAS_ECUADOR.forEach(c => c.ciudad.forEach(ci => set.add(ci)));
  return Array.from(set).sort();
}
export function getTagsUnicos(): string[] {
  const set = new Set<string>();
  CARRERAS_ECUADOR.forEach(c => c.tags.forEach(t => set.add(t)));
  return Array.from(set).sort();
}
