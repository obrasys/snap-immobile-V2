"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Camera, MapPin } from "lucide-react";
import { TopBar, IconTopButton } from "@/components/app/TopBar";
import { Card } from "@/components/ui/card";
import { getProperty } from "@/services/propertyService";
import { listSessions } from "@/services/hdrService";
import { propertyCoverUrl } from "@/lib/images";
import type { HDRSession, Property } from "@/lib/models";
import { showError } from "@/utils/toast";

export default function PropertyDetail() {
  const nav = useNavigate();
  const { id } = useParams();

  const [property, setProperty] = useState<Property | null>(null);
  const [sessions, setSessions] = useState<HDRSession[]>([]);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);

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
        console.error("Failed to fetch property:", error);
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
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
        showError("Falha ao carregar sessões HDR.");
        setSessions([]);
      } finally {
        setLoadingSessions(false);
      }
    }
    fetchSessions();
  }, [id]);

  if (loadingProperty) {
    return (
      <div className="min-h-dvh bg-background">
        <TopBar title="IMÓVEIS" left={<div />} right={<div />} />
        <div className="mx-auto w-full max-w-md px-4 pt-6 text-sm text-muted-foreground sm:max-w-lg sm:px-6">
          Carregando imóvel...
        </div>
      </div>
    );
  }

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
        <div className="text-xs text-muted-foreground">{property.title}</div>
        <div className="mt-2 overflow-hidden rounded-3xl bg-muted shadow-sm">
          <img
            alt={property.title}
            src={propertyCoverUrl(property.id)}
            className="h-44 w-full object-cover min-[420px]:h-48"
            loading="lazy"
          />
        </div>

        <div className="mt-3 rounded-3xl border border-primary/10 bg-secondary/40 p-4">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-semibold tracking-tight text-foreground">
                {property.addressFull}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Status: <span className="font-semibold">{property.status}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-sm font-extrabold tracking-tight">Galeria HDR</div>
        <div className="mt-2 grid gap-3">
          {loadingSessions ? (
            <div className="rounded-3xl border border-primary/10 bg-secondary/40 p-5 text-sm text-muted-foreground">
              Carregando sessões...
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-3xl border border-primary/10 bg-secondary/40 p-5 text-sm text-muted-foreground">
              Nenhuma sessão ainda. Toque na câmera para capturar.
            </div>
          ) : (
            sessions.map((s) => (
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
                  {s.hdrImageUrl ? (
                    <img
                      src={s.hdrImageUrl}
                      alt="HDR Session"
                      className="h-16 w-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="text-xs font-semibold text-muted-foreground">
                      {s.status}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}