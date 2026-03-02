import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Loader2, Save, X } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { upsertProfile } from "@/services/profileService";
import { uploadProfilePhoto } from "@/services/profileService";
import { showError, showSuccess } from "@/utils/toast";

export default function Account() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [company, setCompany] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.name || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setCpf(user.cpf || "");
      setCompany(user.company || "");
      setPhotoPreview(user.photoUrl || null);
    }
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      showError("Por favor, selecione uma imagem válida");
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError("A imagem deve ter no máximo 5MB");
      return;
    }

    setPhotoFile(file);

    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(user?.photoUrl || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);

      let avatarUrl = user.photoUrl;

      // Upload da foto se houver uma nova
      if (photoFile) {
        console.log("[Account] Uploading profile photo...");
        avatarUrl = await uploadProfilePhoto(user.id, photoFile);
        console.log("[Account] Photo uploaded:", avatarUrl);
      }

      // Atualizar perfil
      await upsertProfile({
        id: user.id,
        firstName,
        lastName,
        email,
        phone,
        cpf,
        company,
        role: user.role,
        plan: user.plan,
        avatarUrl,
      });

      await refresh();
      showSuccess("Perfil atualizado com sucesso!");
      setPhotoFile(null);
    } catch (err) {
      console.error("[Account] Error saving profile:", err);
      showError(err instanceof Error ? err.message : "Erro ao salvar perfil");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  const hasChanges = photoFile !== null ||
    firstName !== (user.name || "") ||
    lastName !== (user.lastName || "") ||
    phone !== (user.phone || "") ||
    cpf !== (user.cpf || "") ||
    company !== (user.company || "");

  return (
    <AppShell title="Conta">
      <Card className="rounded-3xl border-primary/10 bg-background/80 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-lg font-extrabold tracking-tight">Seu perfil</div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl"
            onClick={() => navigate(-1)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Avatar Section */}
        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="h-28 w-28 border-4 border-primary/10">
              <AvatarImage src={photoPreview || undefined} alt={firstName} />
              <AvatarFallback className="text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-white shadow-lg transition-transform hover:scale-110"
              aria-label="Alterar foto"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />

          {photoFile && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Nova foto selecionada
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemovePhoto}
                className="h-6 rounded-full px-2 text-xs"
              >
                Remover
              </Button>
            </div>
          )}
        </div>

        {/* Form Section */}
        <div className="mt-8 space-y-4">
          <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-11 rounded-2xl"
                placeholder="Nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-11 rounded-2xl"
                placeholder="Sobrenome"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="h-11 rounded-2xl bg-muted/50"
              placeholder="E-mail"
            />
            <p className="text-xs text-muted-foreground">
              O e-mail não pode ser alterado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 rounded-2xl"
              placeholder="Telefone"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="h-11 rounded-2xl"
              placeholder="CPF"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Empresa</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-11 rounded-2xl"
              placeholder="Empresa"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6">
          <Button
            onClick={handleSave}
            disabled={loading || !hasChanges}
            className="h-12 w-full rounded-2xl"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar alterações
              </>
            )}
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
