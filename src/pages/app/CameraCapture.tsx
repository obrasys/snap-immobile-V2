import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useOrientationAngle } from "@/hooks/use-orientation-angle";
import { useCamera } from "@/hooks/useCamera";
import { CameraViewfinder } from "@/components/app/CameraViewfinder";
import { CameraControls } from "@/components/app/CameraControls";
import { aiService } from "@/services/aiService";
import { createHdrSession, updateHdrSession, uploadHdrImage } from "@/services/hdrService";
import { useAuth } from "@/lib/auth";
import type { PhotoMode } from "@/lib/models";

const EV_STEPS = [-4, -3, -2, -1, 0, 1, 2, 3, 4]; // 9 exposições
const SHUTTER_SOUND =
  "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADgnABuQAAAgAEAAP//wAABAAEAAA=";

type CaptureMode = "single" | "hdr";

export default function CameraCapture() {
  const navigate = useNavigate();
  const { id: propertyId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { angle } = useOrientationAngle();

  const {
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
    supportsExposureCompensation,
  } = useCamera();

  const shutter = React.useRef<HTMLAudioElement>(new Audio(SHUTTER_SOUND));

  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [sceneMode, setSceneMode] = useState<"interior" | "exterior">("interior");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("hdr");

  const [processing, setProcessing] = useState<string | null>(null);
  const [bracketIndex, setBracketIndex] = useState<number | null>(null);

  const [showGrid, setShowGrid] = useState(true);

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
      h = w / aspectRatio;
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

  const videoRotateStyle = useMemo(() => {
    return { transform: `rotate(${angle}deg)` };
  }, [angle]);

  useEffect(() => {
    const onResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const onSmartSave = useCallback(
    async (base64Image: string, mode: PhotoMode, sessionId: string) => {
      if (!user?.id || !propertyId) return;

      try {
        const imageUrl = await uploadHdrImage(user.id, sessionId, base64Image);
        await updateHdrSession(sessionId, { hdrImageUrl: imageUrl, status: "done", mode });
      } catch (error) {
        console.error("Failed to save photo:", error);
        toast.error("Falha ao salvar a foto.");
        await updateHdrSession(sessionId, { status: "error", errorMessage: (error as Error).message });
      }
    },
    [user?.id, propertyId]
  );

  const processHDRInBackground = useCallback(
    async (
      sessionId: string,
      _bracketIds: string[],
      mode: "hp_hdr_exterior" | "hp_hdr_window",
      base64Image: string
    ) => {
      if (!user?.id || !propertyId) return;
      try {
        const finalHdrBase64 = await aiService.enhanceBrackets(_bracketIds, mode, { scene: sceneMode }, base64Image);
        await onSmartSave(finalHdrBase64, mode, sessionId);
      } catch (e) {
        console.error("HDR processing failed:", e);
        await updateHdrSession(sessionId, { status: "error", errorMessage: (e as Error).message });
        toast.error("Falha ao processar HDR.");
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
    const mode = sceneMode === "exterior" ? "hp_hdr_exterior" : "hp_hdr_window";

    try {
      await applyExposureCompensation(manualEv);
      await new Promise(r => setTimeout(r, 300));

      const dataUrl = await captureFrame();
      if (dataUrl) {
        const session = await createHdrSession({ userId: user.id, propertyId, imagesCount: 1, mode });
        await onSmartSave(dataUrl, mode, session.id);
        toast.success("Foto guardada!");
        navigate(-1);
      } else {
        throw new Error("Nenhum frame capturado.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao capturar foto.");
    } finally {
      setProcessing(null);
      applyExposureCompensation(manualEv);
    }
  };

  const runHDR = async () => {
    if (!propertyId || processing || !user?.id) return;

    setProcessing("A CAPTURAR HDR...");
    const ids: string[] = [];
    let capturedBase64Image: string | null = null;

    const mode: PhotoMode = sceneMode === "exterior" ? "hp_hdr_exterior" : "hp_hdr_window";

    try {
      const track = trackRef.current;
      if (!track) throw new Error("Câmara não pronta");

      if (!supportsExposureCompensation) {
        toast.warning("Seu dispositivo não suporta bracketing de exposição. Capturando uma única foto.");
        const session = await createHdrSession({ userId: user.id, propertyId, imagesCount: 1, mode });
        await applyExposureCompensation(manualEv);
        await new Promise(r => setTimeout(r, 300));
        const dataUrl = await captureFrame();
        if (dataUrl) {
          await onSmartSave(dataUrl, mode, session.id);
          toast.success("Foto guardada!");
          navigate(-1);
        }
        return;
      }

      const session = await createHdrSession({ userId: user.id, propertyId, imagesCount: EV_STEPS.length, mode });

      for (let i = 0; i < EV_STEPS.length; i++) {
        setBracketIndex(i);
        try {
          await track.applyConstraints({ advanced: [{ exposureCompensation: EV_STEPS[i] }] } as any);
          await new Promise(r => setTimeout(r, 650));
        } catch (e) {
            console.warn("[CameraCapture] Exposure constraints failed for frame", i, e);
            continue;
        }

        const dataUrl = await captureFrame();
        if (dataUrl) {
            ids.push(`bracket_${Date.now()}_${i}`);
            if (i === Math.floor(EV_STEPS.length / 2)) {
              capturedBase64Image = dataUrl;
            }
        }
      }

      await applyExposureCompensation(manualEv);

      if (ids.length === 0) throw new Error("Nenhum frame capturado para HDR.");
      if (!capturedBase64Image) throw new Error("Imagem central para processamento HDR não capturada.");

      await onSmartSave(capturedBase64Image, mode, session.id);
      toast.success("Foto guardada! A processar HDR...");
      processHDRInBackground(session.id, ids, mode, capturedBase64Image);
      navigate(-1);

    } catch (e) {
      console.error(e);
      toast.error("Falha na captura HDR.");
    } finally {
      setProcessing(null);
      setBracketIndex(null);
      applyExposureCompensation(manualEv);
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
      <CameraViewfinder
        videoRef={videoRef}
        viewfinderDim={viewfinderDim}
        showGrid={showGrid}
        processing={processing}
        cameraError={cameraError}
        bracketIndex={bracketIndex}
        evStepsLength={EV_STEPS.length}
        uiRotateStyle={uiRotateStyle}
        videoRotateStyle={videoRotateStyle}
      />

      <CameraControls
        uiRotateStyle={uiRotateStyle}
        processing={processing}
        cameraError={cameraError}
        zoomPreset={zoomPreset}
        handleZoomPreset={handleZoomPreset}
        sceneMode={sceneMode}
        setSceneMode={setSceneMode}
        manualEv={manualEv}
        setManualEv={setManualEv}
        minEv={minEv}
        maxEv={maxEv}
        captureMode={captureMode}
        setCaptureMode={setCaptureMode}
        handleMainCapture={handleMainCapture}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        supportsExposureCompensation={supportsExposureCompensation}
      />
    </div>
  );
}