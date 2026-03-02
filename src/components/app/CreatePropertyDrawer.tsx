import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, RotateCw, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerPortal,
  DrawerOverlay,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPropertyDraft } from "@/services/propertyService";
import { showError, showSuccess } from "@/utils/toast";
import { usePinLocation } from "@/hooks/usePinLocation";

export function CreatePropertyDrawer({
  open,
  onOpenChange,
  userId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onCreated: () => void;
}) {
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [addressFull, setAddressFull] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [loading, setLoading] = useState(false);

  const { pinState, pin, retry, goIdle, coords, isLoading: pinLoading } = usePinLocation();

  useEffect(() => {
    if (pinState.status === "pin_success") {
      setAddressFull(pinState.result.addressFull);
      setCity(pinState.result.city ?? "");
      setDistrict(pinState.result.district ?? "");
      setPostalCode(pinState.result.postalCode ?? "");
    }
  }, [pinState]);

  const inputClass = useMemo(
    () =>
      "h-11 rounded-2xl border-white/60 bg-transparent text-white placeholder:text-white/65 focus-visible:ring-white/25",
    [],
  );

  function resetForm() {
    setTitle("");
    setAddressFull("");
    setCity("");
    setDistrict("");
    setPostalCode("");
    goIdle();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      showError("Informe o título do imóvel");
      return;
    }

    if (!addressFull.trim()) {
      showError("Informe o endereço (PIN ou manual)");
      return;
    }

    try {
      setLoading(true);

      const created = await createPropertyDraft({
        userId,
        title: title.trim(),
        addressFull: addressFull.trim(),
        city: city.trim() || undefined,
        district: district.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        geoLat: coords?.lat,
        geoLng: coords?.lng,
      });

      showSuccess("Imóvel criado (rascunho)");
      resetForm();
      onCreated();
      onOpenChange(false);
      nav(`/app/properties/${created.id}`);
    } catch (err) {
      console.error("[CreatePropertyDrawer] Erro ao criar imóvel:", err);
      showError(err instanceof Error ? err.message : "Erro ao criar imóvel");
    } finally {
      setLoading(false);
    }
  }

  const pinHint =
    pinState.status === "pin_loading"
      ? "Localizando…"
      : pinState.status === "pin_success" && pinState.result.isApproximate
        ? "Endereço aproximado"
        : pinState.status === "pin_success"
          ? "Endereço confirmado"
          : pinState.status === "pin_error"
            ? pinState.message
            : "Use o PIN para preencher automaticamente";

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerPortal>
        <DrawerOverlay className="bg-black/55" />
        <DrawerContent className="overflow-hidden rounded-t-[2.25rem] border-0 bg-primary p-0">
          <div className="relative max-h-[92dvh] overflow-hidden">
            <div className="relative">
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-3 rounded-2xl bg-white/10 text-white hover:bg-white/15"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </Button>
              </DrawerClose>

              <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+1.75rem)] pt-7 text-white sm:px-6">
                <div className="pr-10 text-2xl font-extrabold tracking-tight">
                  Criar um novo imóvel
                </div>
                <div className="mt-1 text-sm text-white/85">
                  Título + endereço (via PIN ou manual). Sem mapa.
                </div>

                <form onSubmit={onSubmit} className="mt-5 space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-white/80">Título</div>
                    <Input
                      className={`${inputClass} mt-2`}
                      placeholder="Ex: Apt 3/4 em Boa Viagem"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-white/80">Endereço</div>
                      <div className="text-[11px] text-white/70">{pinHint}</div>
                    </div>

                    <div className="relative">
                      <Input
                        className={`${inputClass} pr-12`}
                        placeholder="Digite ou use o PIN"
                        value={addressFull}
                        onChange={(e) => {
                          setAddressFull(e.target.value);
                          if (pinState.status !== "pin_idle") goIdle();
                        }}
                        required
                      />

                      <button
                        type="button"
                        onClick={() => {
                          if (pinState.status === "pin_error") retry();
                          else pin();
                        }}
                        disabled={pinLoading}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-xl border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/15 disabled:opacity-50`}
                        aria-label="Usar minha localização"
                      >
                        {pinLoading ? (
                          <RotateCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {pinState.status === "pin_error" ? (
                      <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
                        <div className="text-xs text-white/85">{pinState.message}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => retry()}
                          className="h-8 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/15"
                        >
                          Tentar novamente
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {/* Campos opcionais (mantendo no fluxo, mas sem priorizar layout agora) */}
                  <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                    <Input
                      className={inputClass}
                      placeholder="Cidade (opcional)"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                    <Input
                      className={inputClass}
                      placeholder="Bairro (opcional)"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                    />
                  </div>
                  <Input
                    className={inputClass}
                    placeholder="CEP (opcional)"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />

                  <div className="pt-1">
                    <Button
                      disabled={loading}
                      type="submit"
                      className="h-11 w-full rounded-2xl bg-[hsl(var(--cta))] text-white hover:bg-[hsl(var(--cta))]/90"
                    >
                      {loading ? "Salvando..." : "Salvar e continuar"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}