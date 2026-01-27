import { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerPortal,
  DrawerOverlay,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProperty } from "@/lib/snapdb";
import { showError, showSuccess } from "@/utils/toast";

const STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

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
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [state, setState] = useState("SP");
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);

  const inputClass = useMemo(
    () =>
      "h-11 rounded-2xl border-white/60 bg-transparent text-white placeholder:text-white/65 focus-visible:ring-white/25",
    [],
  );

  function resetForm() {
    setName("");
    setStreet("");
    setNumber("");
    setNeighborhood("");
    setState("SP");
    setCep("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      const address = `${street}, ${number} - ${neighborhood} - ${state} • CEP ${cep}`
        .replace(/\s+/g, " ")
        .trim();

      createProperty({ userId, name, address });
      showSuccess("Imóvel criado com sucesso");
      resetForm();
      onCreated();
      onOpenChange(false);
    } catch {
      showError("Erro ao criar imóvel");
    } finally {
      setLoading(false);
    }
  }

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
                  Crie um novo imóvel cada vez que começar a capturar um novo
                  imóvel.
                </div>

                <form onSubmit={onSubmit} className="mt-5 space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-white/80">
                      Detalhes do imóvel
                    </div>
                    <Input
                      className={`${inputClass} mt-2`}
                      placeholder="Nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-white/80">
                      Localização do imóvel
                    </div>
                    <Input
                      className={inputClass}
                      placeholder="Nome da Rua"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      required
                    />
                    <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                      <Input
                        className={inputClass}
                        placeholder="Número"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        required
                      />
                      <Input
                        className={inputClass}
                        placeholder="Bairro"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                      <Select value={state} onValueChange={setState}>
                        <SelectTrigger className="h-11 rounded-2xl border-white/60 bg-transparent text-white focus:ring-white/25">
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {STATES.map((uf) => (
                            <SelectItem key={uf} value={uf}>
                              {uf}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className={inputClass}
                        placeholder="CEP"
                        value={cep}
                        onChange={(e) => setCep(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <Button
                      disabled={loading}
                      type="submit"
                      className="h-11 w-full rounded-2xl bg-[hsl(var(--cta))] text-white hover:bg-[hsl(var(--cta))]/90"
                    >
                      Guardar
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