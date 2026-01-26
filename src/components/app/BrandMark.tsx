export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-9 w-9 rounded-2xl bg-primary/10 ring-1 ring-primary/20 grid place-items-center">
        <div className="h-4 w-4 rotate-45 rounded-[0.4rem] bg-primary" />
      </div>
      <div className="leading-tight">
        <div className="text-[0.95rem] font-extrabold tracking-tight text-foreground">
          Snap Immobile
        </div>
        <div className="text-xs text-muted-foreground">HDR para imóveis</div>
      </div>
    </div>
  );
}
