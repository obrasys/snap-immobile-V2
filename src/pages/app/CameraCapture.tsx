import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Grid3X3, Home, Image as ImageIcon, Timer, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { createHdrSession, updateHdrSession, uploadHdrImage } from "@/services/hdrService";
import { fuseHdr9Exposure } from "@/services/hdrPipeline";
import { useOrientationAngle } from "@/hooks/use-orientation-angle";

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
  const { angle } = useOrientationAngle();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shutterRef = useRef<HTMLAudioElement>(new Audio(SHUTTER_SOUND));

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [hdrProfile, setHdrProfile] = useState<"interior" | "exterior">("interior");
  const [zoom, setZoom] = useState<0.5 | 1>(1);
  const [tilt, setTilt] = useState({ beta: 0, gamma: 0 });
  const [flashVisual, setFlashVisual] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState<0 | 1>(1);

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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 2560 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 1.333333 }, // 4:3
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

  const handleZoom = async (level: 0.5 | 1) => {
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
    // Garante 4:3
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
    setProcessingStep(timerSeconds ? `Disparando em ${timerSeconds}s...` : "Capturando 9 exposições...");
    setProcessingProgress(2);

    if (timerSeconds) {
      await new Promise((r) => setTimeout(r, timerSeconds * 1000));
    }

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

    // Heurística de "window" (mantemos determinístico)
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

  const isLevel = Math.abs(tilt.gamma) < 2;

  const videoRotateStyle = useMemo((): React.CSSProperties => {
    // Tentativa de manter a prévia alinhada à orientação do dispositivo.
    // Em alguns browsers o vídeo já vem "corrigido"; o scale ajuda a não mostrar bordas.
    const needsRotate = angle === 90 || angle === 270;
    const scale = needsRotate ? 1.35 : 1;
    return {
      transform: `rotate(${angle}deg) scale(${scale})`,
      transformOrigin: "center center",
    };
  }, [angle]);

  return (
    <div className="fixed inset-0 z-50 bg-black select-none">
      <div className="flex h-dvh w-full">
        {/* Viewfinder area (sempre 4:3) */}
        <div className="relative flex-1 bg-black">
          <div className="absolute inset-0 flex items-center justify-center px-3 py-3">
            <div className="relative w-full max-w-[calc(100vw-6.5rem)] aspect-[4/3] overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 h-full w-full object-cover"
                style={videoRotateStyle}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Flash */}
              <div
                className={`absolute inset-0 bg-white transition-opacity duration-75 pointer-events-none ${
                  flashVisual ? "opacity-70" : "opacity-0"
                }`}
              />

              {/* Grid */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none opacity-25">
                  <div className="grid h-full w-full grid-cols-3 grid-rows-3">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="border border-white/50" />
                    ))}
                  </div>
                </div>
              )}

              {/* Crosshair */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[38%] w-[2px] -translate-x-1/2 -translate-y-1/2 bg-red-500/90" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[2px] w-[38%] -translate-x-1/2 -translate-y-1/2 bg-emerald-400/90" />

              {/* Horizon indicator */}
              <div
                className={`pointer-events-none absolute left-1/2 top-1/2 h-[2px] w-56 -translate-x-1/2 -translate-y-1/2 transition-colors ${
                  isLevel ? "bg-primary" : "bg-white/35"
                }`}
                style={{ transform: `translate(-50%, -50%) rotate(${tilt.gamma}deg)` }}
              />

              {/* Scene selector (como no layout) */}
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                <div className="rounded-2xl bg-black/35 p-3 backdrop-blur-md border border-white/10">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHdrProfile("interior")}
                      className={`grid h-11 w-11 place-items-center rounded-xl border transition-colors ${
                        hdrProfile === "interior"
                          ? "bg-white/85 text-black border-white/40"
                          : "bg-white/10 text-white border-white/15"
                      }`}
                      aria-label="Interior"
                    >
                      <Home className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setHdrProfile("exterior")}
                      className={`grid h-11 w-11 place-items-center rounded-xl border transition-colors ${
                        hdrProfile === "exterior"
                          ? "bg-white/85 text-black border-white/40"
                          : "bg-white/10 text-white border-white/15"
                      }`}
                      aria-label="Exterior"
                    >
                      <ImageIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-2 text-center text-[11px] font-black tracking-[0.24em] text-emerald-300">
                    {hdrProfile === "interior" ? "INTERIOR" : "EXTERIOR"}
                  </div>
                </div>
              </div>

              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl">
                  <div className="relative mb-4 h-24 w-24">
                    <svg className="h-full w-full -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="none"
                        stroke="white"
                        strokeWidth="4"
                        className="opacity-10"
                      />
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
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-white">
                      {processingProgress}%
                    </div>
                  </div>
                  <p className="animate-pulse text-sm font-bold uppercase tracking-widest text-primary">
                    {processingStep}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right control rail (como no layout) */}
        <div className="w-[6.5rem] bg-black flex flex-col items-center justify-between py-10 border-l border-white/5">
          <button
            type="button"
            onClick={() => setShowGrid((s) => !s)}
            className={`grid h-12 w-12 place-items-center rounded-2xl transition-colors ${
              showGrid ? "text-white" : "text-white/50"
            }`}
            aria-label="Grade"
          >
            <Grid3X3 className="h-7 w-7" />
          </button>

          <div className="flex flex-col items-center gap-7">
            <button
              type="button"
              onClick={() => handleZoom(1)}
              className={`text-lg font-semibold tracking-tight transition-colors ${
                zoom === 1 ? "text-white" : "text-white/55"
              }`}
            >
              1×
            </button>

            <button
              type="button"
              onClick={captureSequence}
              disabled={isProcessing}
              className="grid h-24 w-24 place-items-center rounded-full border-4 border-white/25 active:scale-[0.98] transition-transform disabled:opacity-60"
              aria-label="Capturar"
            >
              <div className="h-[76px] w-[76px] rounded-full border-2 border-black/60 bg-white" />
            </button>

            <button
              type="button"
              onClick={() => handleZoom(0.5)}
              className={`text-lg font-semibold tracking-tight transition-colors ${
                zoom === 0.5 ? "text-white" : "text-white/55"
              }`}
            >
              0.5×
            </button>
          </div>

          <div className="flex flex-col items-center gap-6 pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
            <button
              type="button"
              onClick={() => setTimerSeconds((s) => (s === 1 ? 0 : 1))}
              className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-white transition-colors ${
                timerSeconds ? "text-white" : "text-white/55"
              }`}
              aria-label="Timer"
            >
              <Timer className="h-6 w-6" />
              <span className="text-lg font-semibold">{timerSeconds || 0}s</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="grid h-12 w-12 place-items-center rounded-2xl border border-white/40 text-white/90 hover:bg-white/10"
              aria-label="Fechar"
            >
              <X className="h-7 w-7" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
