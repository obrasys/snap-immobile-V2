import { Button } from "@/components/ui/button";

export function TopBar({
  title,
  left,
  right,
}: {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <div className="w-12 flex items-center justify-start">{left}</div>
        <div className="text-center text-sm font-extrabold tracking-[0.22em] text-muted-foreground">
          {title}
        </div>
        <div className="w-12 flex items-center justify-end">{right}</div>
      </div>
    </header>
  );
}

export function IconTopButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="h-10 w-10 rounded-2xl"
      aria-label={ariaLabel}
    >
      {children}
    </Button>
  );
}
