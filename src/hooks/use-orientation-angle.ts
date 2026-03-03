import { useEffect, useMemo, useState } from "react";

type ScreenWithOrientation = Screen & {
  orientation?: {
    angle?: number;
    addEventListener?: (type: string, listener: () => void) => void;
    removeEventListener?: (type: string, listener: () => void) => void;
  };
};

type WindowWithLegacyOrientation = Window & { orientation?: number };

function getAngle(): number {
  // Prefer Screen Orientation API
  const scr = (typeof screen !== "undefined" ? screen : undefined) as ScreenWithOrientation | undefined;
  const angle = scr?.orientation?.angle;
  if (typeof angle === "number") return angle;

  // iOS Safari legacy
  const w = (typeof window !== "undefined" ? window : undefined) as WindowWithLegacyOrientation | undefined;
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
    const scr = screen as ScreenWithOrientation;
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