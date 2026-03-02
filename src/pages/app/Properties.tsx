"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, UserRoundCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { listProperties } from "@/services/propertyService";
import { getFirstHdrCoverByPropertyIds, listRecentHdrImages } from "@/services/hdrService";
import { propertyCoverUrl } from "@/lib/images";
import { showError } from "@/utils/toast";
import { CreatePropertyDrawer } from "@/components/app/CreatePropertyDrawer";
import { SnapLogo } from "@/components/app/SnapLogo";
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
  const [coverByPropertyId, setCoverByPropertyId] = useState<Record<string, string>>({});
  const [recent, setRecent] = useState<
    { propertyId: string; url: string; createdAt: string }[]
  >([]);

  useEffect(() => {
    if (openCreateOnMount) {
      setCreateOpen(true);
      nav("/app/properties", { replace: true });
    }
  }, [openCreateOnMount, nav]);

  useEffect(() => {
    async function fetchAll() {
      if (!user) {
        setProperties([]);
        setRecent([]);
        setCoverByPropertyId({});
        setLoadingProperties(false);
        return;
      }

      setLoadingProperties(true);
      try {
        const fetched = await listProperties(user.id);
        setProperties(fetched);

        const ids = fetched.map((p) => p.id);
        const [covers, recentImages] = await Promise.all([
          getFirstHdrCoverByPropertyIds(ids),
          listRecentHdrImages(user.id, 12),
        ]);

        setCoverByPropertyId(covers);
        setRecent(recentImages);
      } catch (error) {
        console.error("[Properties] Failed to fetch properties:", error);
        showError("Falha ao carregar imóveis.");
        setProperties([]);
        setRecent([]);
        setCoverByPropertyId({});
      } finally {
        setLoadingProperties(false);
      }
    }

    fetchAll();
  }, [user, createOpen]);

  const orderedProperties = useMemo(() => {
    // Mantém ordem do backend, mas garante valores
    return properties;
  }, [properties]);

  return (
    <div className="min-h-dvh bg-background">
      {/* Header (igual ao layout) */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto w-full max-w-md px-5 pt-5 sm:max-w-lg sm:px-6">
          <div className="relative flex items-center justify-between">
            <button
              className="grid h-10 w-10 place-items-center rounded-2xl text-muted-foreground hover:bg-muted/60"
              onClick={() => {
                // reservado para pesquisa
              }}
              aria-label="Pesquisar"
              type="button"
            >
              <Search className="h-5 w-5" />
            </button>

            <div className="absolute left-1/2 -translate-x-1/2">
              <SnapLogo size="sm" />
            </div>

            <button
              className="grid h-10 w-10 place-items-center rounded-2xl text-muted-foreground hover:bg-muted/60"
              onClick={() => nav("/app/settings")}
              aria-label="Conta"
              type="button"
            >
              <UserRoundCog className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-5 pb-28 pt-4 sm:max-w-lg sm:px-6">
        {/* Recent activity */}
        <section>
          <div className="text-sm font-semibold tracking-tight text-foreground/80">
            Atividades recentes
          </div>

          <div className="mt-3 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recent.length === 0 ? (
              <div className="flex items-center gap-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-24 w-32 shrink-0 rounded-2xl bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : (
              recent.map((r) => (
                <button
                  key={`${r.propertyId}-${r.createdAt}`}
                  type="button"
                  onClick={() => nav(`/app/properties/${r.propertyId}`)}
                  className="relative h-24 w-32 shrink-0 overflow-hidden rounded-2xl bg-muted shadow-sm"
                  aria-label="Abrir atividade"
                >
                  <img
                    src={r.url}
                    alt="Atividade recente"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))
            )}
          </div>
        </section>

        {/* Properties list */}
        <section className="mt-3 grid gap-5">
          {loadingProperties ? (
            <div className="rounded-3xl border border-primary/10 bg-secondary/40 p-5 text-sm text-muted-foreground">
              Carregando imóveis...
            </div>
          ) : orderedProperties.length === 0 ? (
            <div className="rounded-3xl border border-primary/10 bg-secondary/40 p-5">
              <div className="text-base font-extrabold tracking-tight">
                Nenhum imóvel ainda
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Toque em "Novo Imóvel" para começar.
              </div>
            </div>
          ) : (
            orderedProperties.map((p) => {
              const cover = coverByPropertyId[p.id] || propertyCoverUrl(p.id);
              return (
                <div key={p.id} className="space-y-2">
                  <div className="text-xs text-muted-foreground">{p.title}</div>
                  <Link to={`/app/properties/${p.id}`} className="block">
                    <Card className="overflow-hidden rounded-3xl border-0 bg-muted shadow-sm">
                      <img
                        alt={p.title}
                        src={cover}
                        className="h-44 w-full object-cover min-[420px]:h-52"
                        loading="lazy"
                      />
                    </Card>
                  </Link>
                </div>
              );
            })
          )}
        </section>
      </main>

      {/* Novo Imóvel (botão flutuante central) */}
      <div className="fixed inset-x-0 bottom-0 z-40 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
        <div className="mx-auto flex w-full max-w-md justify-center px-5 sm:max-w-lg sm:px-6">
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-12 rounded-full bg-[hsl(var(--cta))] px-9 text-[15px] font-extrabold tracking-tight text-white shadow-lg shadow-[hsl(var(--cta))]/25 hover:bg-[hsl(var(--cta))]/90"
          >
            Novo Imóvel
          </Button>
        </div>
      </div>

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
