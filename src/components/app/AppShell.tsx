import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/app/BrandMark";
import { MobileNav } from "@/components/app/MobileNav";
import { useAuth } from "@/lib/auth";

export function AppShell({
  children,
  title,
  backTo,
}: {
  children: React.ReactNode;
  title?: string;
  backTo?: string;
}) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            {backTo ? (
              <Link to={backTo} className="block">
                <BrandMark className="scale-[0.98]" />
              </Link>
            ) : (
              <BrandMark className="scale-[0.98]" />
            )}
            {title ? (
              <div className="mt-1 truncate text-sm font-semibold tracking-tight text-muted-foreground">
                {title}
              </div>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="rounded-2xl"
            aria-label="Sair"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-24 pt-4">{children}</main>

      <MobileNav />
    </div>
  );
}
