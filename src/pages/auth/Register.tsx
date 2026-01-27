import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCw } from "lucide-react";
import { SnapLogo } from "@/components/app/SnapLogo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/lib/auth";

export default function Register() {
  const nav = useNavigate();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputClass = useMemo(
    () =>
      "h-12 rounded-2xl border-transparent bg-muted/70 px-4 text-[15px] shadow-sm placeholder:text-muted-foreground/70 focus-visible:ring-primary/25",
    [],
  );

  function resetForm() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setCpf("");
    setCompany("");
    setPassword("");
    setAcceptTerms(false);
    setAcceptPrivacy(false);
  }

  async function onSubmit() {
    if (!acceptTerms || !acceptPrivacy) {
      showError("Você precisa aceitar Termos e Política de Privacidade");
      return;
    }

    try {
      setLoading(true);
      await register({
        name: firstName,
        lastName,
        email,
        phone,
        cpf,
        company,
        password,
        role: "corretor",
      });
      showSuccess("Conta criada com sucesso");
      nav("/app/properties", { replace: true });
    } catch (err) {
      showError(err instanceof Error ? err.message : "Falha ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md px-6 pb-32 pt-10 sm:max-w-lg sm:px-8">
        <div className="flex items-center justify-between">
          <SnapLogo size="sm" />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl"
            onClick={resetForm}
            aria-label="Limpar"
          >
            <RotateCw className="h-5 w-5 text-primary" />
          </Button>
        </div>

        <div className="mt-10">
          <h1 className="text-2xl font-extrabold tracking-tight">Crie a sua conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preencha os seus dados
          </p>
        </div>

        <div className="mt-7 space-y-3">
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
            <Input
              className={inputClass}
              placeholder="Nome"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              className={inputClass}
              placeholder="Sobre Nome"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <Input
            className={inputClass}
            placeholder="E-Mail"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            className={inputClass}
            placeholder="Telefone"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            className={inputClass}
            placeholder="CPF"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
          />

          <Input
            className={inputClass}
            placeholder="Empresa"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />

          <Input
            className={inputClass}
            placeholder="Senha"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="space-y-2 pt-2">
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox
                className="mt-0.5"
                checked={acceptTerms}
                onCheckedChange={(v) => setAcceptTerms(Boolean(v))}
              />
              <span>
                Aceito os{" "}
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

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox
                className="mt-0.5"
                checked={acceptPrivacy}
                onCheckedChange={(v) => setAcceptPrivacy(Boolean(v))}
              />
              <span>
                Aceito a{" "}
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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-6 pt-4 sm:max-w-lg sm:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl"
            onClick={() => nav(-1)}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-6 w-6 text-muted-foreground" />
          </Button>

          <Button
            disabled={loading}
            onClick={onSubmit}
            className="h-11 rounded-full bg-muted px-7 font-extrabold tracking-wide text-foreground hover:bg-muted/80"
          >
            CRIAR CONTA
          </Button>
        </div>
      </div>
    </div>
  );
}