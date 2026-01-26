import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/app/BrandMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const { login, loginGoogle } = useAuth();

  const from = useMemo(() => {
    const s = (loc.state as { from?: string } | null)?.from;
    return s && typeof s === "string" ? s : "/app/properties";
  }, [loc.state]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      await login(email, password);
      showSuccess("Bem-vindo(a) de volta");
      nav(from, { replace: true });
    } catch (err) {
      showError(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    try {
      setLoading(true);
      await loginGoogle();
      showSuccess("Sessão iniciada com Google (demo)");
      nav(from, { replace: true });
    } catch {
      showError("Falha ao entrar com Google");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-secondary/40 px-4 py-10">
      <div className="mx-auto max-w-md">
        <BrandMark />

        <div className="mt-10">
          <h1 className="text-2xl font-extrabold tracking-tight">Entrar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse sua galeria de imóveis e sessões HDR.
          </p>

          <Card className="mt-5 rounded-3xl border-primary/10 bg-background/80 p-5 shadow-sm">
            <div className="space-y-3">
              <Button
                type="button"
                onClick={onGoogle}
                disabled={loading}
                variant="secondary"
                className="h-11 w-full rounded-2xl justify-between"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Entrar com Google
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <div className="text-xs font-semibold text-muted-foreground">
                  ou
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={onSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      inputMode="email"
                      autoComplete="email"
                      className="h-11 rounded-2xl pl-10"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="h-11 rounded-2xl"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-2xl"
                >
                  Entrar
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <Link
                    to="/auth/forgot"
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                  <Link
                    to="/auth/register"
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Criar conta
                  </Link>
                </div>
              </form>
            </div>
          </Card>

          <div className="mt-4 text-xs text-muted-foreground">
            Links legais:{" "}
            <a
              className="font-semibold text-primary underline-offset-4 hover:underline"
              href="https://snapimmobile.app/termos-de-uso/"
              target="_blank"
              rel="noreferrer"
            >
              Termos
            </a>{" "}
            •{" "}
            <a
              className="font-semibold text-primary underline-offset-4 hover:underline"
              href="https://snapimmobile.app/politica-privacidade/"
              target="_blank"
              rel="noreferrer"
            >
              Privacidade
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
