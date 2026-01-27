import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Camera } from "lucide-react";
import { TopBar, IconTopButton } from "@/components/app/TopBar";
import { Card } from "@/components/ui/card";
import { getProperty, listSessions } from "@/lib/snapdb";
import { propertyCoverUrl } from "@/lib/images";

export default function PropertyDetail() {
  const nav = useNavigate();
  const { id } = useParams();

  const property = useMemo(() => (id ? getProperty(id) : null), [id]);
  const sessions = useMemo(() => (id ? listSessions(id) : []), [id]);

  if (!property) {
    return (
      <div className="min-h-dvh bg-background">
        <TopBar title="IMÓVEIS" left={<div />} right={<div />} />
        <div className="mx-auto w-full max-w-md px-4 pt-6 text-sm text-muted-foreground sm:max-w-lg sm:px-6">
          Imóvel não encontrado.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <TopBar
        title="IMÓVEIS"
        left={
          <Link to="/app/properties" className="text-sm font-semibold text-primary">
            Voltar
          </Link>
        }
        right={
          <IconTopButton
            ariaLabel="Abrir câmera"
            onClick={() => nav(`/app/properties/${property.id}/camera`)}
          >
            <Camera className="h-5 w-5 text-[hsl(var(--cta))]" />
          </IconTopButton>
        }
      />

      <main className="mx-auto w-full max-w-md px-4 pb-10 pt-2 sm:max-w-lg sm:px-6">
        <div className="text-xs text-muted-foreground">{property.name}</div>
        <div className="mt-2 overflow-hidden rounded-3xl bg-muted shadow-sm">
          <img
            alt={property.name}
            src={propertyCoverUrl(property.id)}
            className="h-44 w-full object-cover min-[420px]:h-48"
            loading="lazy"
          />
        </div>

        <div className="mt-6 text-sm font-extrabold tracking-tight">Galeria HDR</div>
        <div className="mt-2 grid gap-3">
          {sessions.length === 0 ? (
            <div className="rounded-3xl border border-primary/10 bg-secondary/40 p-5 text-sm text-muted-foreground">
              Nenhuma sessão ainda. Toque na câmera para capturar.
            </div>
          ) : null}

          {sessions.map((s) => (
            <Card
              key={s.id}
              className="rounded-3xl border-primary/10 bg-background/80 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold tracking-tight">Sessão</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(s.createdAt).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="text-xs font-semibold text-muted-foreground">
                  {s.status}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}