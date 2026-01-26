export function SnapLogo({
  size = "md",
  tone = "brand",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  tone?: "brand" | "white";
  className?: string;
}) {
  const s = size === "sm" ? 44 : size === "lg" ? 96 : 64;
  const word = size === "sm" ? "text-3xl" : size === "lg" ? "text-6xl" : "text-5xl";

  const stroke = tone === "white" ? "border-white" : "border-primary";
  const snapText = tone === "white" ? "text-white" : "text-primary";
  const immobileBg = tone === "white" ? "bg-white/15" : "bg-[hsl(var(--cta))]/15";
  const immobileText = tone === "white" ? "text-white" : "text-[hsl(var(--cta))]";

  return (
    <div className={`inline-flex items-center gap-3 ${className}`} aria-label="Snap Immobile">
      <div className="relative shrink-0" style={{ width: s, height: s }} aria-hidden="true">
        {/* corners */}
        <div
          className={`absolute left-0 top-0 h-[38%] w-[38%] rounded-[18px] border-[6px] ${stroke} border-b-0 border-r-0`}
        />
        <div
          className={`absolute right-0 top-0 h-[38%] w-[38%] rounded-[18px] border-[6px] ${stroke} border-b-0 border-l-0`}
        />
        <div
          className={`absolute left-0 bottom-0 h-[38%] w-[38%] rounded-[18px] border-[6px] ${stroke} border-t-0 border-r-0`}
        />
        <div
          className={`absolute right-0 bottom-0 h-[38%] w-[38%] rounded-[18px] border-[6px] ${stroke} border-t-0 border-l-0`}
        />
      </div>

      <div className="leading-none">
        <div className={`${word} font-extrabold tracking-tight ${snapText}`}>snap</div>
        <div
          className={`-mt-1 inline-block rounded-full px-3 py-1 text-xs font-extrabold tracking-widest ${immobileBg} ${immobileText}`}
        >
          immobile
        </div>
      </div>
    </div>
  );
}