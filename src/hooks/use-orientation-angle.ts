import { useEffect, useMemo, useState } from "react";

function getAngle(): number {
  // Prefer Screen Orientation API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scr: any = typeof screen !== "undefined" ? (screen as any) : undefined;
  const angle = scr?.orientation?.angle;
  if (typeof angle === "number") return angle;

  // iOS Safari legacy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w: any = typeof window !== "undefined" ? (window as any) : undefined;
  const wAngle = w?.orientation;
  if (typeof wAngle === "number") return wAngle;

  return 0;
}

export function useOrientationAngle() {
  const [angle, setAngle] = useState<number>(() => getAngle());

  useEffect(() => {
    const update = () => setAngle(getAngle());

    window.addEventListener("orientationchange", update);
    window.addEventListener("resize", update);

    // Screen Orientation API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scr: any = screen as any;
    scr?.orientation?.addEventListener?.("change", update);

    return () => {
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("resize", update);
      scr?.orientation?.removeEventListener?.("change", update);
    };
  }, []);

  const normalized = useMemo(() => {
    // Normalize to one of 0/90/180/270
    const a = ((angle % 360) + 360) % 360;
    if (a < 45) return 0;
    if (a < 135) return 90;
    if (a < 225) return 180;
    if (a < 315) return 270;
    return 0;
  }, [angle]);

  const isLandscape = normalized === 90 || normalized === 270;

  return { angle: normalized, isLandscape };
}
