import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { BrandMark } from "@/components/app/BrandMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { showSuccess } from "@/utils/toast";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await resetPassword(email);
    setLoading(false);
    showSuccess("Se existir uma conta, enviaremos instruções para o e-mail.");
  }

  return (
    <div className="min-h-dvh bg-secondary/40 px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-md sm:max-w-lg">
        <BrandMark />

        <div className="mt-10">
          <h1 className="text-2xl font-extrabold tracking-tight">Recuperar senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe seu e-mail para receber instruções.
          </p>

          <Card className="mt-5 rounded-3xl border-primary/10 bg-background/80 p-5 shadow-sm">
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

              <Button
                className="h-11 w-full rounded-2xl"
                disabled={loading}
                type="submit"
              >
                Enviar
              </Button>

              <Button asChild variant="ghost" className="h-11 w-full rounded-2xl">
                <Link to="/auth/login">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao login
                </Link>
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}