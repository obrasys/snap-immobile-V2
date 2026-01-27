import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { hasSupabase, supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";

export default function OAuthCallback() {
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        if (!hasSupabase) {
          nav("/app/properties", { replace: true });
          return;
        }

        const url = new URL(window.location.href);
        const code =
          url.searchParams.get("code") ||
          new URLSearchParams(url.hash.replace("#", "?")).get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        showSuccess("Login concluído");
        nav("/app/properties", { replace: true });
      } catch (err) {
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
