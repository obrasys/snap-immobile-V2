import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/app/BrandMark";
import { useAuth } from "@/lib/auth";

const Index = () => {
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (user) nav("/app/properties", { replace: true });
  }, [user, nav]);

  return (
    <div className="min-h-screen bg-secondary/40 px-4 py-10">
      <div className="mx-auto max-w-md">
        <BrandMark />

        <div className="mt-10 space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            HDR automático, pronto para venda.
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Capture 9 exposições com um único fluxo guiado, envie e receba sua
            foto HDR final na galeria do imóvel.
          </p>

          <Card className="rounded-3xl border-primary/10 bg-background/80 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-2xl bg-primary/10 p-2 text-primary ring-1 ring-primary/15">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-tight">
                  Mobile-first • fluxo guiado • multiusuário
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Protótipo web com arquitetura pronta para evoluir para SaaS.
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button asChild className="h-11 flex-1 rounded-2xl">
                <Link to="/auth/login">
                  Entrar <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                className="h-11 flex-1 rounded-2xl"
              >
                <Link to="/auth/register">Criar conta</Link>
              </Button>
            </div>
          </Card>

          <div className="text-xs text-muted-foreground">
            Ao continuar você concorda com os nossos{" "}
            <a
              className="font-semibold text-primary underline-offset-4 hover:underline"
              href="https://snapimmobile.app/termos-de-uso/"
              target="_blank"
              rel="noreferrer"
            >
              Termos de Uso
            </a>{" "}
            e{" "}
            <a
              className="font-semibold text-primary underline-offset-4 hover:underline"
              href="https://snapimmobile.app/politica-privacidade/"
              target="_blank"
              rel="noreferrer"
            >
              Política de Privacidade
            </a>
            .
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;