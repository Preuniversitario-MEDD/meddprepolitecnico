// OAuth consent route for MCP clients (ChatGPT, Claude, Cursor, etc.)
// Routed at /.lovable/oauth/consent
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, ShieldCheck, X } from "lucide-react";

// Beta namespace: type it locally so TS doesn't complain.
type OAuthAPI = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauthApi = () => (supabase.auth as any).oauth as OAuthAPI;

function isSafeRelativePath(p: string | null): p is string {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Falta el parámetro authorization_id.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message || "No se pudo obtener la autorización.");
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const api = oauthApi();
    const { data, error } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);
    if (error) { setBusy(false); return setError(error.message || "Error al procesar la decisión."); }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); return setError("El servidor de autorización no devolvió un redirect."); }
    window.location.href = target;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader><h1 className="text-xl font-semibold">No se pudo cargar la autorización</h1></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{error}</p></CardContent>
        </Card>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const clientName = details.client?.name ?? "una aplicación externa";
  const scopes: string[] = typeof details.scope === "string" ? details.scope.split(/\s+/).filter(Boolean) : [];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Conectar {clientName} a ESPOLMEDD</h1>
          <p className="text-sm text-muted-foreground">
            {clientName} podrá usar las herramientas de esta app actuando como tú mientras estés autorizado.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {details.client?.redirect_uri && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Redirección:</span> {details.client.redirect_uri}
            </div>
          )}
          {scopes.length > 0 && (
            <div className="text-xs">
              <span className="font-medium">Permisos solicitados:</span>
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-muted-foreground">
                {scopes.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Esto no anula los permisos ni las políticas de la aplicación. Los datos de otros usuarios siguen protegidos.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => decide(false)} disabled={busy}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button className="flex-1" onClick={() => decide(true)} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aprobar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
