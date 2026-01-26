import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, MapPin, StickyNote } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { createProperty } from "@/lib/snapdb";
import { showSuccess, showError } from "@/utils/toast";

export default function NewProperty() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      const p = createProperty({ userId: user.id, name, address, description });
      showSuccess("Imóvel criado com sucesso");
      nav(`/app/properties/${p.id}`, { replace: true });
    } catch {
      showError("Erro ao criar imóvel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Criar imóvel" backTo="/app/properties">
      <Card className="rounded-3xl border-primary/10 bg-background/80 p-5 shadow-sm">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-2 text-primary ring-1 ring-primary/15">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-tight">Novo imóvel</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Use um nome curto para aparecer bem na galeria.
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              className="h-11 rounded-2xl"
              placeholder="Ex: Apto Jardins 120m²"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Endereço</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="address"
                className="h-11 rounded-2xl pl-10"
                placeholder="Rua, número, bairro, cidade"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Descrição (opcional)</Label>
            <div className="relative">
              <StickyNote className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="desc"
                className="min-h-24 rounded-2xl pl-10"
                placeholder="Ex: sala com janelão, vista livre, excelente iluminação..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <Button disabled={loading} className="h-11 w-full rounded-2xl" type="submit">
            Criar imóvel
          </Button>
        </form>
      </Card>
    </AppShell>
  );
}
