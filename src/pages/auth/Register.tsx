import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { BrandMark } from "@/components/app/BrandMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@/lib/models";
import { useAuth } from "@/lib/auth";
import { showError, showSuccess } from "@/utils/toast";

export default function Register() {
  const nav = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("corretor");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!acceptTerms || !acceptPrivacy) {
      showError("Você precisa aceitar Termos e Política de Privacidade");
      return;
    }

    try {
      setLoading(true);
      await register({ name, email, password, role });
      showSuccess("Conta criada com sucesso");
      nav("/app/properties", { replace: true });
    } catch (err) {
      showError(err instanceof Error ? err.message : "Falha ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-secondary/40 px-4 py-10">
      <div className="mx-auto max-w-md">
        <BrandMark />

        <div className="mt-10">
          <h1 className="text-2xl font-extrabold tracking-tight">Criar conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Comece no plano Free e faça upgrade quando precisar.
          </p>

          <Card className="mt-5 rounded-3xl border-primary/10 bg-background/80 p-5 shadow-sm">
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  className="h-11 rounded-2xl"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  inputMode="email"
                  autoComplete="email"
                  className="h-11 rounded-2xl"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Perfil</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                    <SelectTrigger className="h-11 rounded-2xl">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corretor">Corretor</SelectItem>
                      <SelectItem value="proprietario">Proprietário</SelectItem>
                      <SelectItem value="fotografo">Fotógrafo</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    className="h-11 rounded-2xl"
                    placeholder="Crie uma senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="rounded-2xl border bg-background/70 p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary ring-1 ring-primary/15">
                    <BadgeCheck className="h-4 w-4" />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={acceptTerms}
                        onCheckedChange={(v) => setAcceptTerms(Boolean(v))}
                        className="mt-0.5"
                      />
                      <span className="text-muted-foreground">
                        Eu li e aceito os{" "}
                        <a
                          className="font-semibold text-primary underline-offset-4 hover:underline"
                          href="https://snapimmobile.app/termos-de-uso/"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Termos de Uso
                        </a>
                        .
                      </span>
                    </label>

                    <label className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={acceptPrivacy}
                        onCheckedChange={(v) => setAcceptPrivacy(Boolean(v))}
                        className="mt-0.5"
                      />
                      <span className="text-muted-foreground">
                        Eu li e aceito a{" "}
                        <a
                          className="font-semibold text-primary underline-offset-4 hover:underline"
                          href="https://snapimmobile.app/politica-privacidade/"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Política de Privacidade
                        </a>
                        .
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <Button disabled={loading} className="h-11 w-full rounded-2xl" type="submit">
                Criar conta <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Já tem conta?{" "}
                <Link
                  to="/auth/login"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Entrar
                </Link>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
