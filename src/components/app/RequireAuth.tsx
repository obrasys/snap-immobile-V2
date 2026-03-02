import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();
  const loc = useLocation();

  if (!isReady) {
    return (
      <div className="min-h-dvh grid place-items-center bg-background text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: loc.pathname }} />;
  }

  return <>{children}</>;
}