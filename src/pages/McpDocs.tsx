import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Plug, Lock, Terminal, Wrench, Layers, KeyRound } from "lucide-react";

const MCP_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp`;

const TOOLS: { name: string; desc: string; args: string }[] = [
  { name: "whoami", desc: "Perfil del usuario autenticado (nombre, cédula, roles).", args: "—" },
  { name: "list_my_courses", desc: "Cursos a los que el usuario tiene acceso.", args: "limit (1-100, def. 25), offset" },
  { name: "list_sessions", desc: "Sesiones de un curso (número, título, estado).", args: "curso_id, limit, offset" },
  { name: "get_my_progress", desc: "Progreso por sesión del usuario en un curso.", args: "curso_id, limit, offset" },
  { name: "list_recent_exams", desc: "Historial reciente de intentos de examen.", args: "limit, offset, curso_id (opcional)" },
  { name: "list_locked_sections", desc: "Secciones bloqueadas, su prerequisito y si ya se puede desbloquear.", args: "curso_id, limit, offset" },
  { name: "request_unlock", desc: "Solicita el desbloqueo de una sesión; se concede si el prerequisito está al 100%.", args: "sesion_id" },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="text-xs md:text-sm bg-muted/50 border border-border/50 rounded-lg p-4 overflow-x-auto">
      <code>{children}</code>
    </pre>
  );
}

export default function McpDocs() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg gradient-primary bg-clip-text text-transparent">
            MEDD
          </Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl space-y-10">
        <section className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Plug className="w-3.5 h-3.5" />
            Integraciones de agentes
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Servidor MCP de MEDD</h1>
          <p className="text-muted-foreground text-lg">
            Conecta ChatGPT, Claude o Cursor a tu cuenta de MEDD. El asistente actúa como tú: solo ve
            los cursos, sesiones y calificaciones a los que tu usuario tiene acceso.
          </p>
        </section>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Endpoint</h2>
          </div>
          <Code>{MCP_URL}</Code>
          <p className="text-sm text-muted-foreground">
            Transporte: MCP Streamable HTTP. Protocolo de autenticación: OAuth 2.1 con PKCE y registro
            dinámico de clientes (DCR).
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Autenticación (OAuth)</h2>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-6">
            <li>El cliente descubre el servidor de autorización en <code>/.well-known/oauth-protected-resource</code>.</li>
            <li>Se registra automáticamente (DCR) y abre el navegador en la pantalla de consentimiento de MEDD.</li>
            <li>Inicias sesión con tu cédula y contraseña habituales y apruebas la conexión.</li>
            <li>El cliente recibe un token de acceso de usuario; todas las consultas respetan las políticas de acceso (RLS).</li>
          </ol>
          <p className="text-sm text-muted-foreground">
            Nunca pegues tokens ni contraseñas en el cliente MCP: el flujo se completa en el navegador.
          </p>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Configuración por cliente</h2>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-sm">ChatGPT / Claude (conectores remotos)</h3>
            <p className="text-sm text-muted-foreground">
              Agrega un conector personalizado y pega la URL del endpoint. El cliente iniciará el flujo
              OAuth automáticamente.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Cursor / Claude Desktop (mcp.json)</h3>
            <Code>{`{
  "mcpServers": {
    "medd": {
      "url": "${MCP_URL}"
    }
  }
}`}</Code>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Herramientas disponibles</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/50">
                  <th className="py-2 pr-4 font-medium">Herramienta</th>
                  <th className="py-2 pr-4 font-medium">Descripción</th>
                  <th className="py-2 font-medium">Parámetros</th>
                </tr>
              </thead>
              <tbody>
                {TOOLS.map((t) => (
                  <tr key={t.name} className="border-b border-border/30 align-top">
                    <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">{t.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{t.desc}</td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">{t.args}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Paginación y caché</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Todas las herramientas de listado aceptan <code>limit</code> (1-100) y <code>offset</code>, y
            devuelven un bloque <code>pagination</code>. Las lecturas se cachean ~30 s por usuario para
            que las listas grandes respondan rápido; el campo <code>cached</code> indica si la respuesta
            vino de caché.
          </p>
          <Code>{`// petición
{ "name": "list_sessions",
  "arguments": { "curso_id": "…", "limit": 25, "offset": 0 } }

// respuesta (structuredContent)
{
  "items": [ { "id": "…", "numero": 1, "titulo": "Materia y energía" } ],
  "pagination": { "limit": 25, "offset": 0, "returned": 25,
                  "has_more": true, "next_offset": 25 },
  "cached": false
}`}</Code>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Secciones bloqueadas y desbloqueo</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            <code>list_locked_sections</code> devuelve las sesiones bloqueadas con su prerequisito y el
            campo <code>can_request_unlock</code>. Cuando el prerequisito llega al 100% (teoría revisada,
            20 ejercicios correctos y 150 aciertos de quiz), <code>request_unlock</code> concede el acceso.
          </p>
          <Code>{`{ "name": "request_unlock", "arguments": { "sesion_id": "…" } }

// concedido
{ "granted": true, "numero": 4, "titulo": "Estequiometría" }

// pendiente
{ "granted": false,
  "reason": "Session 3 (\\"Enlace químico\\") is not at 100% yet…" }`}</Code>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="text-xl font-semibold">Prueba rápida</h2>
          <Code>{`curl -sS -X POST "${MCP_URL}" \\
  -H "Authorization: Bearer <access_token_oauth>" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}</Code>
          <p className="text-sm text-muted-foreground">
            Sin un token OAuth válido el servidor responde <code>401</code> con la cabecera{" "}
            <code>WWW-Authenticate</code> que indica dónde autenticarse.
          </p>
        </Card>

        <p className="text-xs text-muted-foreground">
          ¿Dudas sobre privacidad? Consulta el{" "}
          <Link to="/trust" className="underline hover:text-foreground">
            centro de confianza
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
