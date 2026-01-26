import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

export default function Account() {
  const { user } = useAuth();

  return (
    <AppShell title="Conta">
      <Card className="rounded-3xl border-primary/10 bg-background/80 p-5 shadow-sm">
        <div className="text-lg font-extrabold tracking-tight">Seu perfil</div>
        <div className="mt-2 text-sm text-muted-foreground">
          {user?.name} {user?.lastName}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">{user?.email}</div>
      </Card>
    </AppShell>
  );
}
