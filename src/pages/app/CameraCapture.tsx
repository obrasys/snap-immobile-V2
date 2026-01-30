import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useOrientationAngle } from "@/hooks/use-orientation-angle";
import { useCamera } from "@/hooks/useCamera";
import { CameraViewfinder } from "@/components/app/CameraViewfinder";
import { CameraControls } from "@/components/app/CameraControls";
import { aiService } from "@/services/aiService";
import { bracketStorage } from "@/lib/bracketStorage";
import { createHdrSession, updateHdrSession } from "@/lib/snapdb";
import { useAuth } from "@/lib/auth";
import type { PhotoMode } from "@/lib/models";

const EV_STEPS = [-4, -3, -2, -1, 0, 1, 2, 3, 4]; // 9 exposições
const SHUTTER_SOUND =
  "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADgnABuQAAAgAEAAP//wAABAAEAAA=";

type CaptureMode = "single" | "hdr"; // Novo tipo para o modo de captura

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const res = await fetch(dataUrl);
  return await res.blob();
};

export default function CameraCapture() {
  const navigate = useNavigate();
  const { id: propertyId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { angle } = useOrientationAngle(); // Este ângulo é a orientação do dispositivo

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
  } = useCamera();

  const shutter = React.useRef<HTMLAudioElement>(new Audio(SHUTTER_SOUND));

  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [sceneMode, setSceneMode] = useState<"interior" | "exterior">("interior");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("hdr"); // Padrão para HDR

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
      h = w * aspectRatio;
      if (h > screenHeight) {
        h = screenHeight;
        w = h / aspectRatio;
      }
    }
    return { w, h };
  }, [windowSize, isLandscape]);

  // Estilo para os elementos da UI permanecerem na vertical em relação ao dispositivo
  const uiRotateStyle = useMemo(() => {
    return { transform: `rotate(${-angle}deg)` };
  }, [angle]);

  // Estilo para o elemento de vídeo girar seu conteúdo para corresponder à orientação da UI
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
      <CameraViewfinder
        videoRef={videoRef}
        viewfinderDim={viewfinderDim}
        showGrid={showGrid}
        processing={processing}
        cameraError={cameraError}
        bracketIndex={bracketIndex}
        evStepsLength={EV_STEPS.length}
        uiRotateStyle={uiRotateStyle}
        videoRotateStyle={videoRotateStyle} // Passando o novo estilo para o CameraViewfinder
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
      />
    </div>
  );
}