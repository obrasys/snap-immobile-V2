import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Grid3X3,
  Timer,
  X,
  Image as ImageIcon,
  Sofa,
  Minus,
  Plus,
} from "lucide-react";
import { useOrientationAngle } from "@/hooks/use-orientation-angle";
import { showError, showSuccess } from "@/utils/toast";

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function CameraCapture() {
  const nav = useNavigate();
  const { id } = useParams();
  const { angle, isLandscape } = useOrientationAngle(); // Obter isLandscape

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [ready, setReady] = useState(false);
  const [timerSec, setTimerSec] = useState<0 | 1>(1);
  const [zoom, setZoom] = useState<0.5 | 1>(1);
  const [mode, setMode] = useState<"interior" | "foto">("interior");

  const uiRotate = useMemo(() => {
    // Rotaciona a UI conforme orientação (efeito de câmera nativa)
    return `rotate(${angle}deg)`;
  }, [angle]);

  useEffect(() => {
    let mounted = true;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (err) {
        showError(
          err instanceof Error
            ? err.message
            : "Não foi possível acessar a câmera",
        );
      }
    }

    start();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  async function capture() {
    if (!videoRef.current) return;

    const doShot = () => {
      const v = videoRef.current!;
      const canvas = document.createElement("canvas");
      
      // Ajustar as dimensões do canvas para a proporção 4:3
      const videoWidth = v.videoWidth;
      const videoHeight = v.videoHeight;
      const targetAspectRatio = 4 / 3; // Proporção desejada (largura/altura)

      let drawWidth = videoWidth;
      let drawHeight = videoHeight;
      let offsetX = 0;
      let offsetY = 0;

      const currentVideoAspectRatio = videoWidth / videoHeight;

      if (currentVideoAspectRatio > targetAspectRatio) {
        // O vídeo é mais largo que 4:3, cortar horizontalmente
        drawWidth = videoHeight * targetAspectRatio;
        offsetX = (videoWidth - drawWidth) / 2;
      } else {
        // O vídeo é mais alto que 4:3, cortar verticalmente
        drawHeight = videoWidth / targetAspectRatio;
        offsetY = (videoHeight - drawHeight) / 2;
      }

      canvas.width = drawWidth;
      canvas.height = drawHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      // Desenhar a imagem cortada no canvas
      ctx.drawImage(v, offsetX, offsetY, drawWidth, drawHeight, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      showSuccess(
        `Foto capturada${id ? ` (imóvel ${id.slice(0, 6)}…)` : ""} — demo`,
      );
      // Fluxo HDR virá depois (9 fotos + upload)
      return dataUrl;
    };

    if (timerSec === 1) {
      showSuccess("Capturando em 1s…");
      setTimeout(doShot, 1000);
      return;
    }

    doShot();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Preview Container - agora centralizado e com proporção 4:3 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={cx(
          "relative h-full w-auto overflow-hidden", // Este div conterá o vídeo e as sobreposições, limitado pela proporção
          isLandscape ? "aspect-[4/3]" : "aspect-[3/4]", // Proporção dinâmica
        )}>
          <video
            ref={videoRef}
            playsInline
            muted
            className={cx(
              "absolute inset-0 h-full w-full object-cover", // O vídeo preenche seu pai (o div com aspect-ratio)
              zoom === 0.5 && "scale-[0.92]",
            )}
          />
          {/* overlay shading */}
          <div className="absolute inset-0 bg-black/10" />

          {/* grid */}
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                className="border border-white/15"
              />
            ))}
          </div>

          {/* crosshair */}
          {/* As linhas de mira agora estão centralizadas dentro do contêiner de proporção */}
          <div className="absolute left-1/2 top-1/2 h-[38%] w-[2px] -translate-x-1/2 -translate-y-1/2 bg-red-500/90" />
          <div className="absolute left-1/2 top-1/2 h-[2px] w-[38%] -translate-x-1/2 -translate-y-1/2 bg-emerald-400/90" />
        </div>
      </div>

      {/* Botão de Disparo - movido para fora da barra lateral direita, centralizado verticalmente */}
      <button
        disabled={!ready}
        onClick={capture}
        className={cx(
          "fixed right-[calc(env(safe-area-inset-right)+104px+20px)] top-1/2 -translate-y-1/2 z-50 grid h-20 w-20 place-items-center rounded-full",
          ready ? "opacity-100" : "opacity-60",
        )}
        aria-label="Capturar"
        // O botão de disparo não gira, apenas os controles dentro da barra lateral
      >
        <div className="absolute inset-0 rounded-full border-4 border-white/90" />
        <div className="h-16 w-16 rounded-full bg-white" />
      </button>

      {/* Right rail (controls). Tudo gira com a orientação. */}
      <div className="absolute right-0 top-0 h-full w-[104px] bg-black/80 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
        <div className="relative flex h-full flex-col items-center justify-between px-3 py-6">
          <div
            className="flex flex-col items-center gap-6"
            style={{ transform: uiRotate, transition: "transform 220ms ease" }}
          >
            <button
              className="grid h-12 w-12 place-items-center rounded-2xl bg-white/0 text-white hover:bg-white/10"
              aria-label="Grid"
              onClick={() => showSuccess("Grid: demo")}
            >
              <Grid3X3 className="h-7 w-7" />
            </button>

            <div className="flex flex-col items-center gap-1 text-white/80">
              <button
                className={cx(
                  "text-lg font-semibold",
                  zoom === 1 && "text-white",
                )}
                onClick={() => setZoom(1)}
              >
                1×
              </button>
              <button
                className={cx(
                  "text-lg font-semibold",
                  zoom === 0.5 && "text-white",
                )}
                onClick={() => setZoom(0.5)}
              >
                0.5×
              </button>
              <div className="mt-2 flex items-center gap-2 opacity-70">
                <button
                  className="grid h-9 w-9 place-items-center rounded-2xl hover:bg-white/10"
                  onClick={() => setZoom(0.5)}
                  aria-label="Diminuir zoom"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <button
                  className="grid h-9 w-9 place-items-center rounded-2xl hover:bg-white/10"
                  onClick={() => setZoom(1)}
                  aria-label="Aumentar zoom"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            <button
              className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-white hover:bg-white/15"
              aria-label="Modo"
              onClick={() => setMode((m) => (m === "interior" ? "foto" : "interior"))}
            >
              {mode === "interior" ? (
                <Sofa className="h-7 w-7" />
              ) : (
                <ImageIcon className="h-7 w-7" />
              )}
              <div className="mt-1 text-[11px] font-extrabold tracking-widest text-emerald-400">
                {mode === "interior" ? "INTERIOR" : "FOTO"}
              </div>
            </button>
          </div>

          <div
            className="flex flex-col items-center gap-6"
            style={{ transform: uiRotate, transition: "transform 220ms ease" }}
          >
            <button
              className="flex items-center gap-2 rounded-2xl px-3 py-2 text-white/90 hover:bg-white/10"
              onClick={() => setTimerSec((t) => (t === 1 ? 0 : 1))}
              aria-label="Timer"
            >
              <Timer className="h-6 w-6" />
              <span className="text-lg font-semibold">{timerSec}s</span>
            </button>

            <button
              className="grid h-12 w-12 place-items-center rounded-2xl border border-white/30 text-white hover:bg-white/10"
              onClick={() => nav(-1)}
              aria-label="Fechar"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Hint */}
      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-black/40 px-3 py-2 text-xs text-white/80 sm:left-6 sm:top-6">
        Tela de câmera (demo) • UI gira com a orientação
      </div>
    </div>
  );
}