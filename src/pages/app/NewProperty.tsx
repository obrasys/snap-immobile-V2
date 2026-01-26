import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserRoundCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TopBar, IconTopButton } from "@/components/app/TopBar";
import { useAuth } from "@/lib/auth";
import { createProperty } from "@/lib/snapdb";
import { showError, showSuccess } from "@/utils/toast";
import { propertyCoverUrl } from "@/lib/images";

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

export default function NewProperty() {
  const nav = useNavigate();
  const { user } = useAuth();

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      const address = `${street}, ${number} - ${neighborhood} - ${state} • CEP ${cep}`
        .replace(/\s+/g, " ")
        .trim();
      createProperty({ userId: user.id, name, address });
      showSuccess("Imóvel criado com sucesso");
      nav("/app/properties", { replace: true });
    } catch {
      showError("Erro ao criar imóvel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar
        title="IMÓVEIS"
        left={
          <IconTopButton ariaLabel="Pesquisar" onClick={() => showSuccess("Pesquisa: em breve")}>
            <Search className="h-5 w-5 text-[hsl(var(--cta))]" />
          </IconTopButton>
        }
        right={
          <IconTopButton ariaLabel="Configurações" onClick={() => nav("/app/settings")}>
            <UserRoundCog className="h-5 w-5 text-[hsl(var(--cta))]" />
          </IconTopButton>
        }
      />

      <main className="mx-auto max-w-md px-4 pb-6 pt-2">
        <div className="text-xs text-muted-foreground">Apartamento 3/4 em Boa Viagem</div>
        <div className="mt-2 overflow-hidden rounded-3xl bg-muted shadow-sm">
          <img
            alt="Imagem do imóvel"
            src={propertyCoverUrl("new-property")}
            className="h-44 w-full object-cover"
            loading="lazy"
          />
        </div>
      </main>

      <section className="relative mx-auto max-w-md">
        <div className="rounded-t-[2.25rem] bg-primary px-5 pb-7 pt-7 text-white">
          <div className="text-2xl font-extrabold tracking-tight">Criar um novo imóvel</div>
          <div className="mt-1 text-sm text-white/85">
            Crie um novo imóvel cada vez que começar a capturar um novo imóvel.
          </div>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <div className="text-xs font-semibold text-white/80">Detalhes do imóvel</div>
              <Input
                className={`${inputClass} mt-2`}
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-white/80">Localização do imóvel</div>
              <Input
                className={inputClass}
                placeholder="Nome da Rua"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
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
              <div className="grid grid-cols-2 gap-3">
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
      </section>
    </div>
  );
}