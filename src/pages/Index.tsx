import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { SnapLogo } from "@/components/app/SnapLogo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { welcomeBackgroundUrl } from "@/lib/images";

const Index = () => {
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (user) nav("/app/properties", { replace: true });
  }, [user, nav]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${welcomeBackgroundUrl()})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-primary/65" />
      <div className="absolute inset-0 bg-black/10" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-10 sm:max-w-lg sm:px-8 sm:py-12">
        <div className="mx-auto mt-6">
          <SnapLogo size="lg" variant="white" />
        </div>

        <div className="mt-auto pb-6">
          <div className="text-center">
            <div className="text-sm font-extrabold tracking-widest text-white/80">
              AUMENTE A SUA VISIBILIDADE
            </div>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/90">
              Captação profissional fácil, com qualidade visual através do seu
              smartphone, para melhorar os seus anúncio de imóveis.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <Button
              asChild
              variant="outline"
              className="h-12 w-full rounded-full border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/auth/login">JÁ TEM CONTA? ENTRE AQUI</Link>
            </Button>

            <div className="flex items-center gap-4">
              <Separator className="bg-white/35" />
              <div className="text-xs font-bold tracking-widest text-white/80">
                OU
              </div>
              <Separator className="bg-white/35" />
            </div>

            <Button
              asChild
              className="h-12 w-full rounded-full bg-[hsl(var(--cta))] text-[hsl(var(--cta-foreground))] hover:bg-[hsl(var(--cta))]/90"
            >
              <Link to="/auth/register">FAÇA UM TESTE GRATUITO!</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;