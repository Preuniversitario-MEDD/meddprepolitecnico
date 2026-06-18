import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Shield, Lock, Database, Users, Mail, FileText } from "lucide-react";

export default function Trust() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg gradient-primary bg-clip-text text-transparent">
            ESPOLMEDD
          </Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl space-y-10">
        <section className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            Centro de confianza
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Seguridad y privacidad en ESPOLMEDD
          </h1>
          <p className="text-muted-foreground text-lg">
            Esta página es mantenida por el equipo de ESPOLMEDD para responder a las preguntas más
            comunes sobre cómo cuidamos los datos de estudiantes y administradores que usan la
            plataforma. No es una certificación independiente.
          </p>
        </section>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Acceso y autenticación</h2>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-6">
            <li>El acceso a la plataforma requiere usuario y contraseña personales.</li>
            <li>Cada cuenta tiene un rol (administrador o estudiante) y los permisos se aplican tanto en la interfaz como en el servidor.</li>
            <li>Las acciones administrativas (crear, eliminar o reiniciar cuentas) solo se ejecutan tras verificar el rol de administrador en el backend.</li>
            <li>Las contraseñas temporales se generan automáticamente y se entregan al administrador para que las comunique de forma privada al estudiante.</li>
          </ul>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Plataforma y alojamiento</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            ESPOLMEDD se ejecuta sobre la infraestructura de Lovable Cloud, que provee base de datos
            gestionada, autenticación, almacenamiento y funciones de servidor. Las capacidades de la
            plataforma se describen de forma factual y no constituyen una certificación emitida por
            Lovable.
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-6">
            <li>Las conexiones entre el navegador, el backend y la base de datos viajan sobre HTTPS/TLS.</li>
            <li>Las tablas que almacenan datos personales están protegidas mediante políticas a nivel de fila (RLS) que limitan la lectura al propio usuario y a los administradores autorizados.</li>
            <li>Las funciones de servidor que invocan a la IA del tutor y a las herramientas administrativas validan la sesión del usuario antes de ejecutarse.</li>
          </ul>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Datos que recopilamos</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Para operar el preuniversitario recolectamos solo la información necesaria para
            identificar al estudiante y medir su progreso:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-6">
            <li>Datos de cuenta: cédula, nombre, apellidos, colegio y fecha de nacimiento.</li>
            <li>Progreso académico: respuestas a quizzes y exámenes, sesiones completadas, métricas de concentración y resultados psicométricos.</li>
            <li>Datos de uso técnico: tiempos de conexión, navegador y dirección IP, utilizados para auditoría de acceso.</li>
            <li>Interacciones con Mr. Victor: mensajes que el estudiante envía al tutor para recibir explicaciones.</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Los datos sensibles (cédula, fecha de nacimiento, IP, etc.) solo son visibles para el
            propio estudiante y para administradores con permisos.
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Subprocesadores e integraciones</h2>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-6">
            <li><strong>Lovable Cloud (Supabase):</strong> base de datos, autenticación, almacenamiento y funciones de servidor.</li>
            <li><strong>Lovable AI Gateway:</strong> procesamiento de las consultas hechas al tutor "Mr. Victor".</li>
            <li><strong>YouTube:</strong> reproducción de videos educativos incrustados; YouTube puede establecer cookies propias al cargar el reproductor.</li>
          </ul>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Contacto y reporte de incidentes</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Si encuentras un problema de seguridad o privacidad, o quieres ejercer derechos sobre
            tus datos (consultar, corregir o eliminar), comunícate con el administrador del curso
            desde el módulo de Mensajes dentro de la plataforma.
          </p>
          <p className="text-xs text-muted-foreground">
            Las claims de cumplimiento regulatorio (GDPR, HIPAA, SOC 2, ISO, etc.) y los acuerdos
            de tratamiento de datos requieren confirmación del responsable de ESPOLMEDD antes de
            publicarse aquí.
          </p>
        </Card>

        <footer className="text-xs text-muted-foreground text-center pt-6 border-t border-border/40">
          Última revisión por el equipo de ESPOLMEDD. Esta página puede actualizarse para reflejar
          mejoras en nuestros controles.
        </footer>
      </main>
    </div>
  );
}
