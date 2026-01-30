"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, Plus, Search, UserRoundCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { listProperties } from "@/services/propertyService"; // Updated import
import { propertyCoverUrl } from "@/lib/images";
import { TopBar, IconTopButton } from "@/components/app/TopBar";
import { showError, showSuccess } from "@/utils/toast";
import { CreatePropertyDrawer } from "@/components/app/CreatePropertyDrawer";
import type { Property } from "@/lib/models";

export default function Properties({
  openCreateOnMount = false,
}: {
  openCreateOnMount?: boolean;
}) {
  const { user } = useAuth();
  const nav = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  useEffect(() => {
    if (openCreateOnMount) {
      setCreateOpen(true);
      nav("/app/properties", { replace: true });
    }
  }, [openCreateOnMount, nav]);

  useEffect(() => {
    async function fetchProperties() {
      if (!user) {
        setProperties([]);
        setLoadingProperties(false);
        return;
      }
      setLoadingProperties(true);
      try {
        const fetchedProperties = await listProperties(user.id);
        setProperties(fetchedProperties);
      } catch (error) {
        console.error("Failed to fetch properties:", error);
        showError("Falha ao carregar imóveis.");
        setProperties([]);
      } finally {
        setLoadingProperties(false);
      }
    }
    fetchProperties();
  }, [user, createOpen]);

  return (
    <div className="min-h-dvh bg-background">
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
          <IconTopButton
            ariaLabel="Configurações"
            onClick={() => nav("/app/settings")}
          >
            <UserRoundCog className="h-5 w-5 text-[hsl(var(--cta))]" />
          </IconTopButton>
        }
      />

      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-2 sm:max-w-lg sm:px-6">
        <div className="mt-3">
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-11 w-full rounded-2xl bg-primary text-white hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" /> Criar um imóvel
          </Button>
        </div>

        {loadingProperties ? (
          <div className="mt-4 rounded-3xl border border-primary/10 bg-secondary/40 p-5 text-sm text-muted-foreground">
            Carregando imóveis...
          </div>
        ) : properties.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-primary/10 bg-secondary/40 p-5">
            <div className="text-base font-extrabold tracking-tight">
              Nenhum imóvel ainda
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Toque em "Criar um imóvel" (ou no botão da câmera) para começar.
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-5">
            {properties.map((p) => (
              <div key={p.id} className="space-y-2">
                <div className="text-xs text-muted-foreground">{p.name}</div>
                <Link to={`/app/properties/${p.id}`} className="block">
                  <Card className="overflow-hidden rounded-3xl border-0 bg-muted shadow-sm">
                    <img
                      alt={p.name}
                      src={propertyCoverUrl(p.id)}
                      className="h-44 w-full object-cover min-[420px]:h-48"
                      loading="lazy"
                    />
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      <button
        className="fixed left-1/2 z-40 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-[hsl(var(--cta))] text-white shadow-lg shadow-[hsl(var(--cta))]/25 active:scale-[0.98]"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
        onClick={() => setCreateOpen(true)}
        aria-label="Criar imóvel"
      >
        <Camera className="h-6 w-6" />
      </button>

      {user ? (
        <CreatePropertyDrawer
          open={createOpen}
          onOpenChange={setCreateOpen}
          userId={user.id}
          onCreated={() => setCreateOpen(false)}
        />
      ) : null}
    </div>
  );
}