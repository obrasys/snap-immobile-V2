import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useOrientationAngle } from "@/hooks/use-orientation-angle";
import { Icons } from "@/components/app/Icons";
import { aiService } from "@/services/aiService";
import { bracketStorage } from "@/lib/bracketStorage";
import { createHdrSession, updateHdrSession } from "@/lib/snapdb";
import { useAuth } from "@/lib/auth";
import type { PhotoMode } from "@/lib/models";

const EV_STEPS = [-4, -3, -2, -1, 0, 1, 2, 3, 4]; // Atualizado para 9 exposições
const SHUTTER_SOUND =
  "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADgnABuQAAAgAEAAP//wAABAAEAAA=";

type ZoomPreset = 0.5 | 1.0;
type CaptureMode = "single" | "hdr"; // Novo tipo para o modo de captura

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const res = await fetch(dataUrl);
  return await res.blob();
};

export default function CameraCapture() {
  const navigate = useNavigate();
  const { id: propertyId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { angle } = useOrientationAngle();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const shutter = useRef<HTMLAudioElement>(new Audio(SHUTTER_SOUND));

  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [sceneMode, setSceneMode] = useState<"interior" | "exterior">("interior");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("hdr"); // Padrão para HDR

  const [processing, setProcessing] = useState<string | null>(null);
  const [bracketIndex, setBracketIndex] = useState<number | null>(null);

  const [showGrid, setShowGrid] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [zoomPreset, setZoomPreset] = useState<ZoomPreset>(1.0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const [manualEv, setManualEv] = useState(0);
  const minEv = -3;
  const maxEv = 3;

  const isLandscape = windowSize.w > windowSize.h;

  const viewfinderDim = useMemo(() => {
    const aspectRatio = 4 / 3;
    const screenWidth = windowSize.w;
    const screenHeight = windowSize.h;

    let w, h;
    if (isLandscape) {
      h = screenHeight;
      w = h * aspectRatio;
      if (w > screenWidth) {
        w = screenWidth;
        h = w / aspectRatio;
      }
    } else {
      w = screenWidth;
      h = w * aspectRatio;
      if (h > screenHeight) {
        h = screenHeight;
        w = h / aspectRatio;
      }
    }
    return { w, h };
  }, [windowSize, isLandscape]);

  const uiRotateStyle = useMemo(() => {
    return { transform: `rotate(${-angle}deg)` };
  }, [angle]);

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
    if (!track || !track.getCapabilities || !track.getSettings) return;

    const capabilities = track.getCapabilities();
    // @ts-ignore
    if (capabilities.exposureCompensation) {
      try {
        // @ts-ignore
        await track.applyConstraints({ advanced: [{ exposureCompensation: ev }] });
      } catch (e) {
        console.warn("Failed to apply exposure compensation:", e);
      }
    }
  }, []);

  const startCamera = useCallback(
    async (preset: ZoomPreset, deviceId?: string | null) => {
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
        await applyExposureCompensation(manualEv);

      } catch (err: any) {
        console.error("Camera init error:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setCameraError("Acesso à câmara negado. Verifique as permissões.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            setCameraError("Nenhuma câmara encontrada.");
        } else {
            setCameraError("Erro ao iniciar a câmara.");
        }
      }
    },
    [refreshDevices, selectedDeviceId, findBackMain, applyExposureCompensation, manualEv]
  );

  useEffect(() => {
    startCamera(1.0, null);
    const onResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [startCamera]);

  useEffect(() => {
    if (trackRef.current && !processing) {
      applyExposureCompensation(manualEv);
    }
  }, [manualEv, applyExposureCompensation, processing]);

  const handleZoomPreset = async (preset: ZoomPreset) => {
    if (processing) return;
    setZoomPreset(preset);
    const vids = devices.length ? devices : await refreshDevices();
    if (preset === 0.5) {
      const ultraId = findUltraWide(vids);
      if (ultraId) {
        setSelectedDeviceId(ultraId);
        await startCamera(1.0, ultraId);
        return;
      }
    }
    const mainId = findBackMain(vids);
    if (mainId) {
      setSelectedDeviceId(mainId);
      await startCamera(1.0, mainId);
    }
  };

  const onSmartSave = useCallback(
    async (image: string, mode: PhotoMode, photoId?: string) => {
      if (!user?.id || !propertyId) return;

      try {
        if (photoId) {
          await updateHdrSession(photoId, { hdrImageDataUrl: image, status: "done", mode });
        } else {
          const newPhotoId = `photo_${Date.now()}`;
          await createHdrSession({ userId: user.id, propertyId, imagesCount: 1, mode, id: newPhotoId });
          await updateHdrSession(newPhotoId, { hdrImageDataUrl: image, status: "done", mode });
        }
      } catch (error) {
        console.error("Failed to save photo:", error);
        toast.error("Falha ao salvar a foto.");
      }
    },
    [user?.id, propertyId]
  );

  const processHDRInBackground = useCallback(
    async (
      photoId: string,
      bracketIds: string[],
      mode: "hp_hdr_exterior" | "hp_hdr_window",
      base64Image: string
    ) => {
      if (!user?.id || !propertyId) return;
      try {
        const final = await aiService.enhanceBrackets(bracketIds, mode, { scene: sceneMode }, base64Image);
        await onSmartSave(final, mode, photoId);
      } catch (e) {
        console.error("HDR processing failed:", e);
        await updateHdrSession(photoId, { status: "error", errorMessage: (e as Error).message });
        toast.error("Falha ao processar HDR.");
      } finally {
        for (const id of bracketIds) bracketStorage.deleteBracket(id);
      }
    },
    [propertyId, sceneMode, user?.id, onSmartSave]
  );

  const captureFrame = async (): Promise<string | null> => {
    const video = videoRef.current;
    if (!video) return null;
    
    shutter.current.currentTime = 0;
    shutter.current.play().catch(() => {});

    const canvas = document.createElement("canvas");
    canvas.width = viewfinderDim.w;
    canvas.height = viewfinderDim.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const videoAspectRatio = video.videoWidth / video.videoHeight;
    const targetAspectRatio = 4 / 3;

    let sx = 0, sy = 0, sWidth = video.videoWidth, sHeight = video.videoHeight;

    if (videoAspectRatio > targetAspectRatio) {
      sWidth = video.videoHeight * targetAspectRatio;
      sx = (video.videoWidth - sWidth) / 2;
    } else if (videoAspectRatio < targetAspectRatio) {
      sHeight = video.videoWidth / targetAspectRatio;
      sy = (video.videoHeight - sHeight) / 2;
    }

    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.95);
  };

  const takeSinglePhoto = async () => {
    if (!propertyId || processing || !user?.id) return;

    setProcessing("A CAPTURAR FOTO...");
    try {
      const track = trackRef.current;
      if (!track) throw new Error("Câmara não pronta");

      await applyExposureCompensation(manualEv);
      await new Promise(r => setTimeout(r, 300));

      const dataUrl = await captureFrame();
      if (dataUrl) {
        const mode = sceneMode === "exterior" ? "hp_hdr_exterior" : "hp_hdr_window";
        await onSmartSave(dataUrl, mode);
        toast.success("Foto guardada!");
        navigate(-1);
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao capturar foto.");
      if (propertyId && user?.id) {
        const photoId = `photo_${Date.now()}`;
        await createHdrSession({ userId: user.id, propertyId, imagesCount: 1, mode: sceneMode === "exterior" ? "hp_hdr_exterior" : "hp_hdr_window", id: photoId });
        await updateHdrSession(photoId, { status: "error", errorMessage: (e as Error).message });
      }
    } finally {
      setProcessing(null);
      applyExposureCompensation(manualEv); // Reset to manualEv
    }
  };

  const runHDR = async () => {
    if (!propertyId || processing || !user?.id) return;

    setProcessing("A CAPTURAR HDR...");
    const ids: string[] = [];
    let capturedBase64Image: string | null = null;

    try {
      const video = videoRef.current;
      const track = trackRef.current;
      if (!video || !track) throw new Error("Câmara não pronta");

      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      // @ts-ignore
      const supportsExposure = capabilities.exposureCompensation || capabilities.exposureMode;

      if (!supportsExposure) {
        const dataUrl = await captureFrame();
        if (dataUrl) {
            const mode = sceneMode === "exterior" ? "hp_hdr_exterior" : "hp_hdr_window";
            await onSmartSave(dataUrl, mode);
            toast.success("Foto guardada!");
            navigate(-1);
        }
        setProcessing(null);
        return;
      }

      const photoId = `photo_${Date.now()}`;
      const mode: PhotoMode = sceneMode === "exterior" ? "hp_hdr_exterior" : "hp_hdr_window";

      await createHdrSession({ userId: user.id, propertyId, imagesCount: EV_STEPS.length, mode, id: photoId });

      for (let i = 0; i < EV_STEPS.length; i++) {
        setBracketIndex(i);
        try {
          await track.applyConstraints({ advanced: [{ exposureCompensation: EV_STEPS[i] }] } as any);
          await new Promise(r => setTimeout(r, 650));
        } catch (e) {
            console.warn("Exposure constraints failed, skipping frame", e);
            continue;
        }

        const dataUrl = await captureFrame();
        if (dataUrl) {
            const id = `bracket_${Date.now()}_${i}`;
            const blob = await dataUrlToBlob(dataUrl);
            await bracketStorage.saveBracket(id, blob);
            ids.push(id);
            if (i === Math.floor(EV_STEPS.length / 2)) {
              capturedBase64Image = dataUrl;
            }
        }
      }

      await applyExposureCompensation(manualEv); // Reset exposure to manualEv

      if (ids.length === 0) throw new Error("Nenhum frame capturado");
      if (!capturedBase64Image) throw new Error("Imagem para processamento HDR não capturada.");
      
      const midId = ids[Math.floor(ids.length / 2)];
      const previewBlob = await bracketStorage.getBracket(midId);
      
      if (previewBlob) {
        const previewUrl = URL.createObjectURL(previewBlob);
        
        await onSmartSave(previewUrl, mode, photoId);
        
        toast.success("Foto guardada! A processar HDR...");
        processHDRInBackground(photoId, [...ids], mode, capturedBase64Image);
        navigate(-1);
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha na captura HDR.");
      if (propertyId && user?.id) {
        const photoId = `photo_${Date.now()}`;
        await createHdrSession({ userId: user.id, propertyId, imagesCount: 0, mode: sceneMode === "exterior" ? "hp_hdr_exterior" : "hp_hdr_window", id: photoId });
        await updateHdrSession(photoId, { status: "error", errorMessage: (e as Error).message });
      }
    } finally {
      setProcessing(null);
      setBracketIndex(null);
      applyExposureCompensation(manualEv); // Ensure exposure is reset to manualEv
    }
  };

  const handleMainCapture = () => {
    if (captureMode === "single") {
      takeSinglePhoto();
    } else {
      runHDR();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden touch-none select-none">
      {/* Viewfinder Container - centralizado e com proporção 4:3 */}
      <div className="relative bg-neutral-900 shadow-2xl" style={{ width: viewfinderDim.w, height: viewfinderDim.h }}>
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted autoPlay />
        {showGrid && (
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
            {[...Array(9)].map((_, i) => <div key={i} className="border border-white/50" />)}
          </div>
        )}

        {/* Crosshairs - centralizados dentro do viewfinder */}
        <div className="absolute left-1/2 top-1/2 h-[38%] w-[2px] -translate-x-1/2 -translate-y-1/2 bg-red-500/90" />
        <div className="absolute left-1/2 top-1/2 h-[2px] w-[38%] -translate-x-1/2 -translate-y-1/2 bg-emerald-400/90" />

        {/* Zoom Presets */}
        {!processing && !cameraError && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 z-20 bg-black/40 backdrop-blur-xl px-5 py-2 rounded-full border border-white/10" style={uiRotateStyle}>
            <button onClick={() => handleZoomPreset(0.5)} className={`flex items-center justify-center w-10 h-10 rounded-full text-[10px] font-black transition-all ${zoomPreset === 0.5 ? "bg-primary text-white scale-125" : "text-white/60"}`}>.5</button>
            <button onClick={() => handleZoomPreset(1.0)} className={`flex items-center justify-center w-10 h-10 rounded-full text-[10px] font-black transition-all ${zoomPreset === 1.0 ? "bg-primary text-white scale-125" : "text-white/60"}`}>1x</button>
          </div>
        )}

        {/* Scene Mode */}
        {!processing && !cameraError && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4" style={uiRotateStyle}>
            <button onClick={() => setSceneMode("interior")} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${sceneMode === "interior" ? "bg-white text-black scale-110 shadow-lg" : "bg-black/40 text-white border border-white/10"}`}><Icons.Home className="w-5 h-5" /></button>
            <button onClick={() => setSceneMode("exterior")} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${sceneMode === "exterior" ? "bg-white text-black scale-110 shadow-lg" : "bg-black/40 text-white border border-white/10"}`}><Icons.Image className="w-5 h-5" /></button>
          </div>
        )}

        {/* NEW EV Controls (left side) */}
        {!processing && !cameraError && (
          <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-4" style={uiRotateStyle}>
            <button 
              onClick={() => setManualEv(prev => Math.min(maxEv, prev + 1))} 
              disabled={manualEv >= maxEv}
              className="w-12 h-12 rounded-xl bg-black/40 text-white border border-white/10 flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Icons.Plus className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-black/40 text-white border border-white/10 flex items-center justify-center text-sm font-semibold">
              {manualEv > 0 ? `+${manualEv}` : manualEv}
            </div>
            <button 
              onClick={() => setManualEv(prev => Math.max(minEv, prev - 1))} 
              disabled={manualEv <= minEv}
              className="w-12 h-12 rounded-xl bg-black/40 text-white border border-white/10 flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Icons.Minus className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Processing / Error Overlay */}
        {(processing || cameraError) && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white z-50" style={uiRotateStyle}>
            <Icons.Aperture className="w-14 h-14 animate-spin text-primary mb-6" />
            <p className="text-xs font-black uppercase tracking-[0.3em]">{cameraError || processing}</p>
            {bracketIndex !== null && <p className="text-[10px] opacity-40 mt-3 font-bold">Captura {bracketIndex + 1} de {EV_STEPS.length}</p>}
          </div>
        )}
      </div>

      {/* Bottom/Right Control Bar (fixed, not rotating) */}
      <div className={`fixed flex items-center justify-between px-10 bg-black/95 backdrop-blur-xl ${isLandscape ? "right-0 top-0 bottom-0 w-28 flex-col py-12 border-l border-white/5" : "bottom-0 left-0 right-0 h-32 flex-row border-t border-white/5"}`}>
        <button onClick={() => setShowGrid(!showGrid)} className={`text-white/40 active:text-primary transition-colors p-2 ${showGrid ? "text-primary" : ""}`} style={uiRotateStyle}><Icons.Grid className="w-6 h-6" /></button>
        
        {/* Main Capture Button */}
        <button onClick={handleMainCapture} disabled={!!processing || !!cameraError} className="w-20 h-20 rounded-full border-4 border-white/20 p-1 active:scale-90 transition-all flex items-center justify-center" style={uiRotateStyle}>
          <div className={`w-full h-full rounded-full ${captureMode === "hdr" ? "bg-white" : "bg-primary"}`} />
        </button>
        
        {/* Toggle Capture Mode Button */}
        <button 
          onClick={() => setCaptureMode(prev => prev === "single" ? "hdr" : "single")} 
          disabled={!!processing || !!cameraError}
          className="text-white/40 hover:text-white p-2" style={uiRotateStyle}
        >
          {captureMode === "single" ? <Icons.Camera className="w-7 h-7" /> : <Icons.Aperture className="w-7 h-7" />}
        </button>

        <button onClick={() => navigate(-1)} className="text-white/40 hover:text-white p-2" style={uiRotateStyle}><Icons.X className="w-7 h-7" /></button>
      </div>

      {/* Hint */}
      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-black/40 px-3 py-2 text-xs text-white/80 sm:left-6 sm:top-6" style={uiRotateStyle}>
        Tela de câmera (demo) • UI gira com a orientação
      </div>
    </div>
  );
}