import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { createHdrSession, updateHdrSession, uploadHdrImage } from "@/services/hdrService";
import { fuseHdr9Exposure } from "@/services/hdrPipeline";

const SHUTTER_SOUND = "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3";

function errMsg(err: unknown) {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export default function CameraCapture() {
  const navigate = useNavigate();
  const { id: propertyId } = useParams();
  const { user } = useAuth();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shutterRef = useRef<HTMLAudioElement>(new Audio(SHUTTER_SOUND));

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [hdrProfile, setHdrProfile] = useState<"interior" | "exterior">("interior");
  const [zoom, setZoom] = useState(1);
  const [tilt, setTilt] = useState({ beta: 0, gamma: 0 });
  const [capturedPreviews, setCapturedPreviews] = useState<{ url: string; ev: string }[]>([]);
  const [flashVisual, setFlashVisual] = useState(false);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) setTilt({ beta: e.beta, gamma: e.gamma });
    };
    window.addEventListener("deviceorientation", handleOrientation);
    startCamera();
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLevel = Math.abs(tilt.gamma) < 2;

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 2560 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 1.333333 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast.error("Erro ao acessar a câmera.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
  };

  const handleZoom = async (level: number) => {
    setZoom(level);
    const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0];
    if (!track) return;

    const caps: any = track.getCapabilities?.() || {};
    if (!caps.zoom) return;

    try {
      await track.applyConstraints({ advanced: [{ zoom: level }] } as any);
    } catch {
      // ignore
    }
  };

  const drawFrame = (
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    quality: number,
  ) => {
    const targetRatio = 4 / 3;
    const videoRatio = video.videoWidth / video.videoHeight;
    let sw = video.videoWidth,
      sh = video.videoHeight,
      sx = 0,
      sy = 0;

    if (videoRatio > targetRatio) {
      sw = video.videoHeight * targetRatio;
      sx = (video.videoWidth - sw) / 2;
    } else {
      sh = video.videoWidth / targetRatio;
      sy = (video.videoHeight - sh) / 2;
    }

    canvas.width = sw;
    canvas.height = sh;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    return canvas.toDataURL("image/jpeg", quality);
  };

  const captureSequence = async () => {
    if (!videoRef.current || !canvasRef.current || !user || !propertyId) return;

    setIsProcessing(true);
    setCapturedPreviews([]);
    setProcessingStep("Capturando 9 exposições...");
    setProcessingProgress(5);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsProcessing(false);
      toast.error("Falha ao inicializar captura.");
      return;
    }

    const stream = video.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    const caps: any = track.getCapabilities?.() || {};

    // Pipeline HDR 9 exposures (fixo)
    const evList = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
    const anchorIndex = 4;

    // Detecta "window" de forma simples (mesma heurística anterior), mas mantemos pipeline determinístico
    let look: "interior" | "exterior" | "window" = hdrProfile === "exterior" ? "exterior" : "interior";
    if (hdrProfile === "interior") {
      const probe = drawFrame(ctx, video, canvas, 0.6);
      const probeImg = await (await fetch(probe)).blob();
      const bmp = await createImageBitmap(probeImg);
      ctx.drawImage(bmp, 0, 0);
      const topData = ctx.getImageData(0, 0, canvas.width, canvas.height * 0.3).data;
      let brightPixels = 0;
      for (let i = 0; i < topData.length; i += 16) {
        if (topData[i] > 230 && topData[i + 1] > 230 && topData[i + 2] > 230) brightPixels++;
      }
      if (brightPixels / (topData.length / 16) > 0.15) look = "window";
    }

    let sessionId: string | null = null;
    try {
      setProcessingStep("Criando sessão...");
      setProcessingProgress(8);

      const mode = look === "interior" ? "hp_hdr_interior" : look === "window" ? "hp_hdr_window" : "hp_hdr_exterior";

      const session = await createHdrSession({ userId: user.id, propertyId, imagesCount: 9, mode });
      sessionId = session.id;

      const frames: string[] = [];

      for (let i = 0; i < 9; i++) {
        if (caps.exposureCompensation) {
          try {
            await track.applyConstraints({ advanced: [{ exposureCompensation: evList[i] }] } as any);
            await new Promise((r) => setTimeout(r, 160));
          } catch {
            // ignore
          }
        }

        shutterRef.current.play().catch(() => {});
        setFlashVisual(true);
        setTimeout(() => setFlashVisual(false), 50);

        const frame = drawFrame(ctx, video, canvas, i === anchorIndex ? 0.95 : 0.6);
        frames.push(frame);
        setCapturedPreviews((prev) => [...prev, { url: frame, ev: `${evList[i]}EV` }]);

        setProcessingProgress(10 + i * 5);
        await new Promise((r) => setTimeout(r, 120));
      }

      if (caps.exposureCompensation) {
        try {
          await track.applyConstraints({ advanced: [{ exposureCompensation: 0 }] } as any);
        } catch {
          // ignore
        }
      }

      setProcessingStep("Fusão HDR (determinístico)...");
      setProcessingProgress(60);
      const hdr = await fuseHdr9Exposure({ frames, evs: evList, anchorIndex, look });

      setProcessingStep("Enviando para o Supabase...");
      setProcessingProgress(85);
      const publicUrl = await uploadHdrImage(user.id, sessionId, hdr);

      setProcessingStep("Finalizando...");
      setProcessingProgress(95);
      await updateHdrSession(sessionId, { hdrImageUrl: publicUrl, status: "done", mode });

      toast.success("HDR criado com sucesso!");
      navigate(-1);
    } catch (err) {
      console.error("[CameraCapture] Processing error:", err);
      if (sessionId) {
        try {
          await updateHdrSession(sessionId, { status: "error", errorMessage: errMsg(err) });
        } catch {
          // ignore
        }
      }
      toast.error(`Erro ao processar imagem: ${errMsg(err)}`);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingStep("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden select-none">
      <div className="flex-1 relative flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline className="w-full aspect-[4/3] object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        <div
          className={`absolute inset-0 bg-white transition-opacity duration-75 z-50 pointer-events-none ${
            flashVisual ? "opacity-80" : "opacity-0"
          }`}
        />

        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-full aspect-[4/3] relative border border-white/10">
            <div className="grid grid-cols-3 grid-rows-3 w-full h-full opacity-20">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border border-white/40" />
              ))}
            </div>
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-[2px] transition-colors ${
                isLevel ? "bg-primary" : "bg-white/40"
              }`}
              style={{ transform: `translate(-50%, -50%) rotate(${tilt.gamma}deg)` }}
            />
          </div>
        </div>

        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-3 bg-black/40 p-2 rounded-full backdrop-blur-md border border-white/10">
          {[0.5, 1, 2].map((z) => (
            <button
              key={z}
              onClick={() => handleZoom(z)}
              className={`w-10 h-10 rounded-full text-xs font-bold transition-all ${
                zoom === z ? "bg-primary text-white scale-110" : "text-white/60"
              }`}
            >
              {z}x
            </button>
          ))}
        </div>

        {capturedPreviews.length > 0 && (
          <div className="absolute bottom-48 left-0 right-0 flex justify-center gap-1 px-4 h-12 overflow-hidden">
            {capturedPreviews.map((p, i) => (
              <img
                key={i}
                src={p.url}
                alt={`Preview ${i}`}
                className="h-full aspect-[4/3] object-cover rounded-sm border border-white/20"
              />
            ))}
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center z-50">
            <div className="relative w-24 h-24 mb-4">
              <svg className="w-full h-full -rotate-90">
                <circle cx="48" cy="48" r="40" fill="none" stroke="white" strokeWidth="4" className="opacity-10" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="4"
                  strokeDasharray="251"
                  strokeDashoffset={251 - (251 * processingProgress) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
                {processingProgress}%
              </div>
            </div>
            <p className="text-primary font-bold text-sm animate-pulse uppercase tracking-widest">{processingStep}</p>
          </div>
        )}
      </div>

      <div className="h-40 bg-black flex flex-col items-center justify-center gap-6 relative">
        <div className="flex gap-4">
          <button
            onClick={() => setHdrProfile("interior")}
            className={`px-6 py-2 rounded-full text-xs font-bold border transition-all ${
              hdrProfile === "interior" ? "bg-white text-black" : "text-white border-white/20"
            }`}
          >
            INTERIOR
          </button>
          <button
            onClick={() => setHdrProfile("exterior")}
            className={`px-6 py-2 rounded-full text-xs font-bold border transition-all ${
              hdrProfile === "exterior" ? "bg-white text-black" : "text-white border-white/20"
            }`}
          >
            EXTERIOR
          </button>
        </div>

        <button
          onClick={captureSequence}
          disabled={isProcessing}
          className="w-20 h-20 rounded-full border-4 border-white/20 p-1 active:scale-95 transition-all"
        >
          <div className="w-full h-full rounded-full bg-white" />
        </button>

        <button onClick={() => navigate(-1)} className="absolute right-8 text-white/60" aria-label="Fechar">
          <X className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
}