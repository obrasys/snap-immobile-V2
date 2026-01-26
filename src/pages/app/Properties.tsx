import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Building2, MapPin, Plus } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { listProperties } from "@/lib/snapdb";

export default function Properties() {
  const { user } = useAuth();

  const properties = useMemo(() => {
    if (!user) return [];
    return listProperties(user.id);
  }, [user]);

  return (
    <AppShell title="Seus imóveis">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight text-muted-foreground">
            Organize por imóvel
          </div>
          <div className="mt-1 text-xl font-extrabold tracking-tight">
            Imóveis
          </div>
        </div>
        <Button asChild className="h-11 rounded-2xl">
          <Link to="/app/properties/new">
            <Plus className="mr-2 h-4 w-4" /> Novo
          </Link>
        </Button>
      </div>

      <div className="mt-4 grid gap-3">
        {properties.length === 0 ? (
          <Card className="rounded-3xl border-primary/10 bg-background/80 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-primary/10 p-2 text-primary ring-1 ring-primary/15">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-tight">
                  Comece criando seu primeiro imóvel
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Depois, capture sessões HDR e mantenha tudo na galeria.
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        {properties.map((p) => (
          <Link key={p.id} to={`/app/properties/${p.id}`} className="block">
            <Card className="group rounded-3xl border-primary/10 bg-background/80 p-5 shadow-sm transition-colors hover:bg-background">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-extrabold tracking-tight">
                    {p.name}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{p.address}</span>
                  </div>
                </div>
                <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">
                  Abrir
                </Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
