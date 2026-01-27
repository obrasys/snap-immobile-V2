import { Link, useLocation } from "react-router-dom";
import { Home, Sparkles, User2 } from "lucide-react";

const items = [
  { to: "/app/properties", label: "Imóveis", icon: Home },
  { to: "/app/plan", label: "Plano", icon: Sparkles },
  { to: "/app/account", label: "Conta", icon: User2 },
];

export function MobileNav() {
  const loc = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto grid w-full max-w-md grid-cols-3 px-3 py-2 sm:max-w-lg">
        {items.map(({ to, label, icon: Icon }) => {
          const active = loc.pathname === to || loc.pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={`group flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-xs transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              <span className="font-semibold tracking-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}