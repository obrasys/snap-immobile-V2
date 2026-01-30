import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { hasSupabase, supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

export default function OAuthCallback() {
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        if (!hasSupabase) {
          console.log("[OAuthCallback] Supabase not configured, navigating to properties.");
          nav("/app/properties", { replace: true });
          return;
        }

        const url = new URL(window.location.href);
        const code =
          url.searchParams.get("code") ||
          new URLSearchParams(url.hash.replace("#", "?")).get("code");

        console.log("[OAuthCallback] Code received:", code);

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          console.log("[OAuthCallback] exchangeCodeForSession result:", { data, error });
          if (error) throw error;
        }

        showSuccess("Login concluído");
        nav("/app/properties", { replace: true });
      } catch (err) {
        console.error("[OAuthCallback] Falha no login OAuth:", err);
        showError(err instanceof Error ? err.message : "Falha no login OAuth");
        nav("/auth/login", { replace: true });
      }
    })();
  }, [nav]);

  return (
    <div className="min-h-dvh grid place-items-center bg-background text-sm text-muted-foreground">
      Finalizando login…
    </div>
  );
}