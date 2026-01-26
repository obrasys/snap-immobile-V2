import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, Search, UserRoundCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { listProperties } from "@/lib/snapdb";
import { propertyCoverUrl } from "@/lib/images";
import { TopBar, IconTopButton } from "@/components/app/TopBar";
import { showSuccess } from "@/utils/toast";

export default function Properties() {
  const { user } = useAuth();
  const nav = useNavigate();

  const properties = useMemo(() => {
    if (!user) return [];
    return listProperties(user.id);
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <TopBar
        title="IMÓVEIS"
        left={
          <IconTopButton
            ariaLabel="Pesquisar"
            onClick={() => showSuccess("Pesquisa: em breve")}
          >
            <Search className="h-5 w-5 text-[hsl(var(--cta))]" />
          </IconTopButton>
        }
        right={
          <IconTopButton ariaLabel="Configurações" onClick={() => nav("/app/settings")}>
            <UserRoundCog className="h-5 w-5 text-[hsl(var(--cta))]" />
          </IconTopButton>
        }
      />

      <main className="mx-auto max-w-md px-4 pb-24 pt-2">
        {properties.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-primary/10 bg-secondary/40 p-5">
            <div className="text-base font-extrabold tracking-tight">
              Nenhum imóvel ainda
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Toque no botão da câmera para criar o seu primeiro imóvel.
            </div>
          </div>
        ) : null}

        <div className="mt-3 grid gap-5">
          {properties.map((p) => (
            <div key={p.id} className="space-y-2">
              <div className="text-xs text-muted-foreground">{p.name}</div>
              <Link to={`/app/properties/${p.id}`} className="block">
                <Card className="overflow-hidden rounded-3xl border-0 bg-muted shadow-sm">
                  <img
                    alt={p.name}
                    src={propertyCoverUrl(p.id)}
                    className="h-44 w-full object-cover"
                    loading="lazy"
                  />
                </Card>
              </Link>
            </div>
          ))}
        </div>
      </main>

      <button
        className="fixed bottom-8 left-1/2 z-40 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-[hsl(var(--cta))] text-white shadow-lg shadow-[hsl(var(--cta))]/25 active:scale-[0.98]"
        onClick={() => nav("/app/properties/new")}
        aria-label="Criar imóvel"
      >
        <Camera className="h-6 w-6" />
      </button>
    </div>
  );
}