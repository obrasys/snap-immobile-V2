import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Home, Image as ImageIcon, Zap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { aiService } from "@/services/aiService";
import { createHdrSession, updateHdrSession, uploadHdrImage } from "@/services/hdrService";

const SHUTTER_SOUND = "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3";

export default function CameraCapture() {
  const navigate = useNavigate();
  const { id: propertyId } = useParams();
  const { user } = useAuth();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shutterRef = useRef<HTMLAudioElement>(new Audio(SHUTTER_SOUND));

  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [hdrProfile, setHdrProfile] = useState<"interior" | "exterior">("interior");
  const [zoom, setZoom] = useState(1);
  const [tilt, setTilt] = useState({ beta: 0, gamma: 0 });
  const [capturedPreviews, setCapturedPreviews] = useState<{ url: string; ev: string }[]>([]);
  const [flashVisual, setFlashVisual] = useState(false);

  // Orientação e Nível
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
  }, []);

  const isLevel = Math.abs(tilt.gamma) < 2;

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 2560 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 1.333333 }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      toast.error("Erro ao acessar a câmera.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  };

  const handleZoom = async (level: number) => {
    setZoom(level);
    const track = (videoRef.current?.srcObject as MediaStream)?.getVideoTracks()[0];
    if (track) {
      const caps: any = track.getCapabilities();
      if (caps.zoom) track.applyConstraints({ advanced: [{ zoom: level }] } as any);
    }
  };

  const drawFrame = (ctx: CanvasRenderingContext2D, video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    const targetRatio = 4 / 3;
    const videoRatio = video.videoWidth / video.videoHeight;
    let sw = video.videoWidth, sh = video.videoHeight, sx = 0, sy = 0;

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
  };

  const captureSequence = async () => {
    if (!videoRef.current || !canvasRef.current || !user || !propertyId) return;
    
    setIsProcessing(true);
    setCapturedPreviews([]);
    setProcessingStep("Capturando 9 Exposições...");
    setProcessingProgress(5);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const track = (video.srcObject as MediaStream).getVideoTracks()[0];
    const caps: any = track.getCapabilities();

    // Perfis de Exposição
    const interiorEV = [1, 0.5, 0, -0.7, -1.3, -2, -2.7, -3.3, -4];
    const exteriorEV = [2, 1.3, 0.7, 0, -0.3, -1, -1.7, -2.3, -3];
    
    // Detecção de Janela (Window)
    let effectiveProfile: "hp_hdr_interior" | "hp_hdr_exterior" | "hp_hdr_window" = 
      hdrProfile === "interior" ? "hp_hdr_interior" : "hp_hdr_exterior";

    if (hdrProfile === "interior") {
      drawFrame(ctx, video, canvas);
      const topData = ctx.getImageData(0, 0, canvas.width, canvas.height * 0.3).data;
      let brightPixels = 0;
      for (let i = 0; i < topData.length; i += 16) {
        if (topData[i] > 230 && topData[i+1] > 230 && topData[i+2] > 230) brightPixels++;
      }
      if (brightPixels / (topData.length / 16) > 0.15) effectiveProfile = "hp_hdr_window";
    }

    const evList = effectiveProfile === "hp_hdr_window" ? [-1, -2, -3, -4, -5, -6, -7, -8, -9] : (hdrProfile === "interior" ? interiorEV : exteriorEV);
    let bestBase64 = "";

    // Criar sessão no Supabase
    const session = await createHdrSession({ 
      userId: user.id, 
      propertyId, 
      imagesCount: 9, 
      mode: effectiveProfile 
    });

    for (let i = 0; i < 9; i++) {
      if (caps.exposureCompensation) {
        await track.applyConstraints({ advanced: [{ exposureCompensation: evList[i] }] } as any);
        await new Promise(r => setTimeout(r, 150));
      }

      shutterRef.current.play().catch(() => {});
      setFlashVisual(true);
      setTimeout(() => setFlashVisual(false), 50);

      drawFrame(ctx, video, canvas);
      const frameBase64 = canvas.toDataURL("image/jpeg", 0.7);
      setCapturedPreviews(prev => [...prev, { url: frameBase64, ev: `${evList[i]}EV` }]);
      
      if (i === 4) bestBase64 = canvas.toDataURL("image/jpeg", 0.95);
      setProcessingProgress(10 + (i * 5));
    }

    // Resetar exposição
    if (caps.exposureCompensation) await track.applyConstraints({ advanced: [{ exposureCompensation: 0 }] } as any);

    // Processamento AI
    setProcessingStep("Processando HDR Pro...");
    setProcessingProgress(60);
    
    try {
      const enhanced = await aiService.enhanceImage(bestBase64, effectiveProfile);
      setProcessingProgress(90);
      
      const publicUrl = await uploadHdrImage(user.id, session.id, enhanced);
      await updateHdrSession(session.id, { hdrImageUrl: publicUrl, status: "done" });
      
      toast.success("Foto capturada com sucesso!");
      navigate(-1);
    } catch (err) {
      console.error(err);
      await updateHdrSession(session.id, { status: "error", errorMessage: "Erro na IA" });
      toast.error("Erro ao processar imagem.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden select-none">
      {/* Viewfinder */}
      <div className="flex-1 relative flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline className="w-full aspect-[4/3] object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {/* Flash Effect */}
        <div className={`absolute inset-0 bg-white transition-opacity duration-75 z-50 pointer-events-none ${flashVisual ? 'opacity-80' : 'opacity-0'}`} />

        {/* Grid & Level */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-full aspect-[4/3] relative border border-white/10">
            <div className="grid grid-cols-3 grid-rows-3 w-full h-full opacity-20">
              {[...Array(9)].map((_, i) => <div key={i} className="border border-white/40" />)}
            </div>
            {/* Level Indicator */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-[2px] transition-colors ${isLevel ? 'bg-primary' : 'bg-white/40'}`} 
                 style={{ transform: `translate(-50%, -50%) rotate(${tilt.gamma}deg)` }} />
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-3 bg-black/40 p-2 rounded-full backdrop-blur-md border border-white/10">
          {[0.5, 1, 2].map(z => (
            <button key={z} onClick={() => handleZoom(z)} 
                    className={`w-10 h-10 rounded-full text-xs font-bold transition-all ${zoom === z ? 'bg-primary text-white scale-110' : 'text-white/60'}`}>
              {z}x
            </button>
          ))}
        </div>

        {/* Burst Previews */}
        {capturedPreviews.length > 0 && (
          <div className="absolute bottom-48 left-0 right-0 flex justify-center gap-1 px-4 h-12 overflow-hidden">
            {capturedPreviews.map((p, i) => (
              <img key={i} src={p.url} className="h-full aspect-[4/3] object-cover rounded-sm border border-white/20" />
            ))}
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center z-50">
            <div className="relative w-24 h-24 mb-4">
              <svg className="w-full h-full -rotate-90">
                <circle cx="48" cy="48" r="40" fill="none" stroke="white" strokeWidth="4" className="opacity-10" />
                <circle cx="48" cy="48" r="40" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" 
                        strokeDasharray="251" strokeDashoffset={251 - (251 * processingProgress / 100)} 
                        strokeLinecap="round" className="transition-all duration-300" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold">{processingProgress}%</div>
            </div>
            <p className="text-primary font-bold text-sm animate-pulse uppercase tracking-widest">{processingStep}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-40 bg-black flex flex-col items-center justify-center gap-6 relative">
        <div className="flex gap-4">
          <button onClick={() => setHdrProfile("interior")} 
                  className={`px-6 py-2 rounded-full text-xs font-bold border transition-all ${hdrProfile === "interior" ? 'bg-white text-black' : 'text-white border-white/20'}`}>
            INTERIOR
          </button>
          <button onClick={() => setHdrProfile("exterior")} 
                  className={`px-6 py-2 rounded-full text-xs font-bold border transition-all ${hdrProfile === "exterior" ? 'bg-white text-black' : 'text-white border-white/20'}`}>
            EXTERIOR
          </button>
        </div>

        <button onClick={captureSequence} disabled={isProcessing} 
                className="w-20 h-20 rounded-full border-4 border-white/20 p-1 active:scale-95 transition-all">
          <div className="w-full h-full rounded-full bg-white" />
        </button>

        <button onClick={() => navigate(-1)} className="absolute right-8 text-white/60">
          <X className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
}