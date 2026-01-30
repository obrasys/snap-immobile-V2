import { useState, useRef, useEffect, useCallback } from "react";

type ZoomPreset = 0.5 | 1.0;

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [zoomPreset, setZoomPreset] = useState<ZoomPreset>(1.0);
  const [manualEv, setManualEv] = useState(0);
  const [supportsExposureCompensation, setSupportsExposureCompensation] = useState(false);

  const minEv = -3;
  const maxEv = 3;

  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const vids = list.filter(d => d.kind === "videoinput");
      setDevices(vids);
      return vids;
    } catch {
      return [];
    }
  }, []);

  const findUltraWide = useCallback((vids: MediaDeviceInfo[]) => {
    return vids.find(d => /ultra|0\.5|ultrawide|ultra wide/i.test(d.label))?.deviceId ?? null;
  }, []);

  const findBackMain = useCallback((vids: MediaDeviceInfo[]) => {
    const back = vids.find(d => /back|rear|traseira|environment/i.test(d.label));
    if (back?.deviceId) return back.deviceId;
    return vids[0]?.deviceId ?? null;
  }, []);

  const applyExposureCompensation = useCallback(async (ev: number) => {
    const track = trackRef.current;
    if (!track || !track.getCapabilities || !track.getSettings) {
      setSupportsExposureCompensation(false);
      return;
    }

    const capabilities = track.getCapabilities();
    // @ts-ignore
    if (capabilities.exposureCompensation) {
      try {
        // @ts-ignore
        await track.applyConstraints({ advanced: [{ exposureCompensation: ev }] });
        setSupportsExposureCompensation(true);
      } catch (e: any) {
        console.warn("[useCamera] Failed to apply exposure compensation:", e);
        if (e.name === "OverconstrainedError") {
          setSupportsExposureCompensation(false);
        }
      }
    } else {
      setSupportsExposureCompensation(false);
    }
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string | null) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Câmara não suportada neste dispositivo.");
        return;
      }

      setCameraError(null);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const baseVideo: MediaTrackConstraints = {
        facingMode: { ideal: "environment" },
        width: { ideal: 4032 },
        height: { ideal: 3024 }
      };

      if (deviceId) {
        delete baseVideo.facingMode;
        baseVideo.deviceId = { exact: deviceId };
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: baseVideo });
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const vids = await refreshDevices();
        if (!selectedDeviceId) {
          const main = findBackMain(vids);
          if (main) setSelectedDeviceId(main);
        }
        // Check capabilities after stream is active
        const capabilities = track.getCapabilities();
        // @ts-ignore
        setSupportsExposureCompensation(!!capabilities.exposureCompensation);
        await applyExposureCompensation(manualEv);

      } catch (err: any) {
        console.error("Camera init error:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setCameraError("Acesso à câmara negado. Verifique as permissões.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            setCameraError("Nenhuma câmara encontrada.");
        } else if (err.name === "OverconstrainedError") {
            setCameraError("Câmara não suporta as configurações solicitadas (ex: resolução).");
            setSupportsExposureCompensation(false); // Explicitly set to false if initial constraints fail
        } else {
            setCameraError("Erro ao iniciar a câmara.");
        }
      }
    },
    [refreshDevices, selectedDeviceId, findBackMain, applyExposureCompensation, manualEv]
  );

  useEffect(() => {
    startCamera(null); // Start with default back camera
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [startCamera]);

  useEffect(() => {
    if (trackRef.current && supportsExposureCompensation) { // Only apply if supported
      applyExposureCompensation(manualEv);
    }
  }, [manualEv, applyExposureCompensation, supportsExposureCompensation]);

  const handleZoomPreset = useCallback(async (preset: ZoomPreset) => {
    setZoomPreset(preset);
    const vids = devices.length ? devices : await refreshDevices();
    if (preset === 0.5) {
      const ultraId = findUltraWide(vids);
      if (ultraId) {
        setSelectedDeviceId(ultraId);
        await startCamera(ultraId);
        return;
      }
    }
    const mainId = findBackMain(vids);
    if (mainId) {
      setSelectedDeviceId(mainId);
      await startCamera(mainId);
    }
  }, [devices, refreshDevices, findUltraWide, findBackMain, startCamera]);

  return {
    videoRef,
    trackRef,
    cameraError,
    setCameraError,
    zoomPreset,
    handleZoomPreset,
    manualEv,
    setManualEv,
    minEv,
    maxEv,
    applyExposureCompensation,
    startCamera,
    supportsExposureCompensation, // Expose this state
  };
}