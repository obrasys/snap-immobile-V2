import { useCallback, useMemo, useRef, useState } from "react";
import { reverseGeocodeNominatim, type ReverseGeocodeResult } from "@/services/geocodingService";

export type PinState =
  | { status: "pin_idle" }
  | { status: "pin_loading" }
  | { status: "pin_success"; result: ReverseGeocodeResult; coords: { lat: number; lng: number } }
  | { status: "pin_error"; reason: "permission" | "gps" | "geocode"; message: string };

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      },
    );
  });
}

function getCoords(args: { enableHighAccuracy: boolean; timeoutMs: number }): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(Object.assign(new Error("Geolocation unavailable"), { code: "UNAVAILABLE" }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err),
      {
        enableHighAccuracy: args.enableHighAccuracy,
        timeout: args.timeoutMs,
        maximumAge: 0,
      },
    );
  });
}

export function usePinLocation() {
  const [pinState, setPinState] = useState<PinState>({ status: "pin_idle" });
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const isLoading = pinState.status === "pin_loading";

  const pin = useCallback(async () => {
    setPinState({ status: "pin_loading" });

    // 1) tenta alta precisão (X segundos)
    let coords: GeolocationCoordinates | null = null;
    let isApproximate = false;

    try {
      coords = await withTimeout(getCoords({ enableHighAccuracy: true, timeoutMs: 7000 }), 8000);
    } catch (e: any) {
      // fallback: precisão normal
      try {
        coords = await withTimeout(getCoords({ enableHighAccuracy: false, timeoutMs: 8000 }), 9000);
        isApproximate = true;
      } catch (err: any) {
        if (err?.code === 1 /* PERMISSION_DENIED */) {
          setPinState({
            status: "pin_error",
            reason: "permission",
            message: "Permissão de localização negada.",
          });
          return;
        }

        setPinState({
          status: "pin_error",
          reason: "gps",
          message: "Não foi possível obter sua localização.",
        });
        return;
      }
    }

    const lat = coords.latitude;
    const lng = coords.longitude;
    lastCoordsRef.current = { lat, lng };

    // 2) reverse geocode
    try {
      const result = await reverseGeocodeNominatim({ lat, lng });
      setPinState({
        status: "pin_success",
        result: { ...result, isApproximate },
        coords: { lat, lng },
      });
    } catch {
      setPinState({
        status: "pin_error",
        reason: "geocode",
        message: "Não foi possível identificar o endereço.",
      });
    }
  }, []);

  const retry = useCallback(() => pin(), [pin]);

  const goIdle = useCallback(() => {
    setPinState({ status: "pin_idle" });
  }, []);

  const coords = useMemo(() => {
    if (pinState.status === "pin_success") return pinState.coords;
    return lastCoordsRef.current;
  }, [pinState]);

  return { pinState, pin, retry, goIdle, coords, isLoading };
}
