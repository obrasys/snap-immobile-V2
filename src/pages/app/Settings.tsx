import { useNavigate } from "react-router-dom";
import {
  Compass,
  Heart,
  Info,
  LogOut,
  RefreshCcw,
  Search,
  Settings as SettingsIcon,
  X,
  FileText,
} from "lucide-react";
import { SnapLogo } from "@/components/app/SnapLogo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { showSuccess } from "@/utils/toast";

function MenuRow({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
        active ? "bg-muted" : "hover:bg-muted/60"
      }`}
    >
      <div className="text-foreground/90">{icon}</div>
      <div className="text-sm font-semibold tracking-tight text-foreground">
        {label}
      </div>
    </button>
  );
}

export default function Settings() {
  const nav = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 pb-10 pt-8">
        <div className="flex items-start justify-between">
          <SnapLogo size="sm" />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl"
            onClick={() => nav(-1)}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-8 space-y-2">
          <MenuRow
            icon={<Info className="h-5 w-5" />}
            label="Politica de Privacidade"
            active
            onClick={() =>
              window.open(
                "https://snapimmobile.app/politica-privacidade/",
                "_blank",
                "noreferrer",
              )
            }
          />
          <MenuRow
            icon={<RefreshCcw className="h-5 w-5" />}
            label="Sicronização"
            onClick={() => showSuccess("Sincronização: em breve")}
          />
          <MenuRow
            icon={<Search className="h-5 w-5" />}
            label="Pesquisar"
            onClick={() => showSuccess("Pesquisar: em breve")}
          />
          <MenuRow
            icon={<Compass className="h-5 w-5" />}
            label="Explorar"
            onClick={() => showSuccess("Explorar: em breve")}
          />
          <MenuRow
            icon={<Heart className="h-5 w-5" />}
            label="Favoritos"
            onClick={() => showSuccess("Favoritos: em breve")}
          />
        </div>

        <div className="mt-10">
          <Separator />
        </div>

        <div className="mt-6 space-y-2">
          <MenuRow
            icon={<Info className="h-5 w-5" />}
            label="Politica de Privacidade"
            onClick={() =>
              window.open(
                "https://snapimmobile.app/politica-privacidade/",
                "_blank",
                "noreferrer",
              )
            }
          />
          <MenuRow
            icon={<FileText className="h-5 w-5" />}
            label="Termos e Condições"
            onClick={() =>
              window.open(
                "https://snapimmobile.app/termos-de-uso/",
                "_blank",
                "noreferrer",
              )
            }
          />
          <MenuRow
            icon={<SettingsIcon className="h-5 w-5" />}
            label="Configurações"
            onClick={() => showSuccess("Configurações: em breve")}
          />
          <MenuRow
            icon={<LogOut className="h-5 w-5" />}
            label="Sair"
            onClick={() => {
              logout();
              nav("/", { replace: true });
            }}
          />
        </div>
      </div>
    </div>
  );
}
