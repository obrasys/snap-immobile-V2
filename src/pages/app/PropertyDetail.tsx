"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, Trash2, UserRoundCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getProperty, deleteProperty } from "@/services/propertyService";
import { deleteHdrSessions, listSessions } from "@/services/hdrService";
import type { HDRSession, Property } from "@/lib/models";
import { showError, showSuccess } from "@/utils/toast";
import { SnapLogo } from "@/components/app/SnapLogo";

function SessionTile({
  session,
  selected,
  onToggle,
}: {
  session: HDRSession;
  selected: boolean;
  onToggle: () => void;
}) {
  const subtitle = useMemo(() => {
    const d = new Date(session.createdAt);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }, [session.createdAt]);

  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative text-left"
      aria-label={selected ? "Desmarcar foto" : "Marcar foto"}
    >
      <Card className="relative overflow-hidden rounded-3xl border border-primary/10 bg-muted shadow-sm">
        <div className="aspect-square w-full">
          {session.hdrImageUrl ? (
            <img
              src={session.hdrImageUrl}
              alt="Foto do imóvel"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-muted">
              <div className="text-center">
                <div className="text-xs font-extrabold tracking-tight text-foreground/80">
                  {session.status === "processing" ? "Processando" : "Sem foto"}
                </div>
                <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                  {subtitle}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* selection */}
        <div className="pointer-events-none absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-background/85 shadow-sm">
          <Checkbox checked={selected} className="h-4 w-4 rounded-full" />
        </div>

        {/* subtle gradient-free readability overlay */}
        <div className="absolute inset-x-0 bottom-0 p-2">
          <div className="inline-flex items-center rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-extrabold tracking-tight text-foreground/80 shadow-sm">
            {subtitle}
          </div>
        </div>
      </Card>
    </button>
  );
}

export default function PropertyDetail() {
  const nav = useNavigate();
  const { id } = useParams();

  const [property, setProperty] = useState<Property | null>(null);
  const [sessions, setSessions] = useState<HDRSession[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function fetchProperty() {
      if (!id) {
        setProperty(null);
        setLoadingProperty(false);
        return;
      }
      setLoadingProperty(true);
      try {
        const fetchedProperty = await getProperty(id);
        setProperty(fetchedProperty);
      } catch (error) {
        console.error("[PropertyDetail] Failed to fetch property:", error);
        showError("Falha ao carregar detalhes do imóvel.");
        setProperty(null);
      } finally {
        setLoadingProperty(false);
      }
    }
    fetchProperty();
  }, [id]);

  useEffect(() => {
    async function fetchSessions() {
      if (!id) {
        setSessions([]);
        setLoadingSessions(false);
        return;
      }
      setLoadingSessions(true);
      try {
        const fetchedSessions = await listSessions(id);
        setSessions(fetchedSessions);

        // Default: selected = true only for sessions that already have an image.
        const initial: Record<string, boolean> = {};
        for (const s of fetchedSessions) {
          if (s.hdrImageUrl) initial[s.id] = true;
        }
        setSelectedIds(initial);
      } catch (error) {
        console.error("[PropertyDetail] Failed to fetch sessions:", error);
        showError("Falha ao carregar sessões HDR.");
        setSessions([]);
      } finally {
        setLoadingSessions(false);
      }
    }
    fetchSessions();
  }, [id]);

  const selectedSessions = useMemo(() => {
    const set = new Set(Object.keys(selectedIds).filter((k) => selectedIds[k]));
    return sessions.filter((s) => set.has(s.id));
  }, [sessions, selectedIds]);

  const hdrTiles = useMemo(() => {
    // Keep only sessions that have a URL, like a real photo gallery.
    return sessions.filter((s) => !!s.hdrImageUrl);
  }, [sessions]);

  async function handleDeleteSelected() {
    if (!selectedSessions.length) return;
    setBusy(true);
    try {
      await deleteHdrSessions(selectedSessions.map((s) => ({ id: s.id, hdrImageUrl: s.hdrImageUrl })));
      const remaining = sessions.filter((s) => !selectedIds[s.id]);
      setSessions(remaining);
      setSelectedIds({});
      showSuccess("Fotos removidas.");
    } catch (e) {
      console.error("[PropertyDetail] Failed to delete selected sessions:", e);
      showError("Falha ao remover fotos.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteProperty() {
    if (!property) return;
    setBusy(true);
    try {
      await deleteProperty(property.id);
      showSuccess("Imóvel removido.");
      nav("/app/properties", { replace: true });
    } catch (e) {
      console.error("[PropertyDetail] Failed to delete property:", e);
      showError("Falha ao remover imóvel.");
    } finally {
      setBusy(false);
    }
  }

  if (loadingProperty) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto w-full max-w-md px-5 pt-5 sm:max-w-lg sm:px-6">
            <div className="relative flex items-center justify-between">
              <div className="h-10 w-10" />
              <div className="absolute left-1/2 -translate-x-1/2">
                <SnapLogo size="sm" />
              </div>
              <div className="h-10 w-10" />
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-md px-5 pt-6 text-sm text-muted-foreground sm:max-w-lg sm:px-6">
          Carregando imóvel...
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto w-full max-w-md px-5 pt-5 sm:max-w-lg sm:px-6">
            <div className="relative flex items-center justify-between">
              <Link
                to="/app/properties"
                className="grid h-10 w-10 place-items-center rounded-2xl text-muted-foreground hover:bg-muted/60"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>

              <div className="absolute left-1/2 -translate-x-1/2">
                <SnapLogo size="sm" />
              </div>

              <div className="h-10 w-10" />
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-md px-5 pt-6 text-sm text-muted-foreground sm:max-w-lg sm:px-6">
          Imóvel não encontrado.
        </div>
      </div>
    );
  }

  const anySelected = selectedSessions.length > 0;

  return (
    <div className="min-h-dvh bg-background">
      {/* Header (igual ao layout da listagem) */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto w-full max-w-md px-5 pt-5 sm:max-w-lg sm:px-6">
          <div className="relative flex items-center justify-between">
            <Link
              to="/app/properties"
              className="grid h-10 w-10 place-items-center rounded-2xl text-muted-foreground hover:bg-muted/60"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

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
        <section className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[22px] font-extrabold tracking-tight text-foreground">
              {property.title}
            </div>
            <div className="mt-1 text-sm font-semibold text-muted-foreground">
              {property.addressFull}
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-muted-foreground hover:bg-muted/60"
                aria-label="Remover imóvel"
                disabled={busy}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl border-primary/10">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-extrabold tracking-tight">
                  Remover imóvel?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Isso apagará este imóvel e todas as sessões HDR vinculadas a ele.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDeleteProperty}
                >
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>

        <section className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div className="text-sm font-extrabold tracking-tight">
              Fotos do imóvel
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={!anySelected || busy}
                onClick={handleDeleteSelected}
                className="h-9 rounded-2xl px-3 text-xs font-extrabold text-muted-foreground hover:bg-muted/60"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </div>
          </div>

          {loadingSessions ? (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square w-full rounded-3xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : hdrTiles.length === 0 ? (
            <div className="mt-3 rounded-3xl border border-primary/10 bg-secondary/40 p-5">
              <div className="text-base font-extrabold tracking-tight">
                Nenhuma foto ainda
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Toque em "Iniciar Captura" para começar.
              </div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {hdrTiles.map((s) => (
                <SessionTile
                  key={s.id}
                  session={s}
                  selected={!!selectedIds[s.id]}
                  onToggle={() =>
                    setSelectedIds((prev) => ({ ...prev, [s.id]: !prev[s.id] }))
                  }
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Bottom CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
        <div className="mx-auto flex w-full max-w-md justify-center px-5 sm:max-w-lg sm:px-6">
          <Button
            onClick={() => nav(`/app/properties/${property.id}/camera`)}
            className="h-12 w-full max-w-md rounded-full bg-[hsl(var(--cta))] px-9 text-[15px] font-extrabold tracking-tight text-white shadow-lg shadow-[hsl(var(--cta))]/25 hover:bg-[hsl(var(--cta))]/90"
          >
            <Camera className="h-4 w-4" />
            Iniciar Captura
          </Button>
        </div>
      </div>
    </div>
  );
}