import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { upgradePlan } from "@/lib/snapdb";
import { showSuccess } from "@/utils/toast";

export default function Plan() {
  const { user, refresh } = useAuth();

  if (!user) return null;

  return (
    <AppShell title="Plano">
      <Card className="rounded-3xl border-primary/10 bg-background/80 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-2 text-primary ring-1 ring-primary/15">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-extrabold tracking-tight">{user.plan.toUpperCase()}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Plano Free tem limites mensais. No Pro, você libera uso intensivo.
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Button
            className="h-11 w-full rounded-2xl"
            onClick={() => {
              upgradePlan(user.id, user.plan === "pro" ? "free" : "pro");
              refresh();
              showSuccess("Plano atualizado (demo)");
            }}
          >
            Alternar para {user.plan === "pro" ? "Free" : "Pro"}
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
