import React from "react";
import { useNavigate } from "react-router-dom";
import { Icons } from "@/components/app/Icons";
import type { PhotoMode } from "@/lib/models";

type ZoomPreset = 0.5 | 1.0;
type CaptureMode = "single" | "hdr";

interface CameraControlsProps {
  uiRotateStyle: React.CSSProperties;
  processing: string | null;
  cameraError: string | null;
  zoomPreset: ZoomPreset;
  handleZoomPreset: (preset: ZoomPreset) => Promise<void>;
  sceneMode: "interior" | "exterior";
  setSceneMode: (mode: "interior" | "exterior") => void;
  manualEv: number;
  setManualEv: (ev: number | ((prev: number) => number)) => void;
  minEv: number;
  maxEv: number;
  captureMode: CaptureMode;
  setCaptureMode: (mode: CaptureMode | ((prev: CaptureMode) => CaptureMode)) => void;
  handleMainCapture: () => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
}

export function CameraControls({
  uiRotateStyle,
  processing,
  cameraError,
  zoomPreset,
  handleZoomPreset,
  sceneMode,
  setSceneMode,
  manualEv,
  setManualEv,
  minEv,
  maxEv,
  captureMode,
  setCaptureMode,
  handleMainCapture,
  showGrid,
  setShowGrid,
}: CameraControlsProps) {
  const navigate = useNavigate();

  const isDisabled = !!processing || !!cameraError;

  return (
    <>
      {/* Zoom Presets */}
      {!isDisabled && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 z-20 bg-black/40 backdrop-blur-xl px-5 py-2 rounded-full border border-white/10"
          style={uiRotateStyle}
        >
          <button
            onClick={() => handleZoomPreset(0.5)}
            className={`flex items-center justify-center w-10 h-10 rounded-full text-[10px] font-black transition-all ${
              zoomPreset === 0.5 ? "bg-primary text-white scale-125" : "text-white/60"
            }`}
          >
            .5
          </button>
          <button
            onClick={() => handleZoomPreset(1.0)}
            className={`flex items-center justify-center w-10 h-10 rounded-full text-[10px] font-black transition-all ${
              zoomPreset === 1.0 ? "bg-primary text-white scale-125" : "text-white/60"
            }`}
          >
            1x
          </button>
        </div>
      )}

      {/* Scene Mode */}
      {!isDisabled && (
        <div
          className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4"
          style={uiRotateStyle}
        >
          <button
            onClick={() => setSceneMode("interior")}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              sceneMode === "interior"
                ? "bg-white text-black scale-110 shadow-lg"
                : "bg-black/40 text-white border border-white/10"
            }`}
          >
            <Icons.Home className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSceneMode("exterior")}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              sceneMode === "exterior"
                ? "bg-white text-black scale-110 shadow-lg"
                : "bg-black/40 text-white border border-white/10"
            }`}
          >
            <Icons.Image className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* EV Controls (left side) */}
      {!isDisabled && (
        <div
          className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-4"
          style={uiRotateStyle}
        >
          <button
            onClick={() => setManualEv((prev) => Math.min(maxEv, prev + 1))}
            disabled={manualEv >= maxEv}
            className="w-12 h-12 rounded-xl bg-black/40 text-white border border-white/10 flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Icons.Plus className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-xl bg-black/40 text-white border border-white/10 flex items-center justify-center text-sm font-semibold">
            {manualEv > 0 ? `+${manualEv}` : manualEv}
          </div>
          <button
            onClick={() => setManualEv((prev) => Math.max(minEv, prev - 1))}
            disabled={manualEv <= minEv}
            className="w-12 h-12 rounded-xl bg-black/40 text-white border border-white/10 flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Icons.Minus className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Bottom/Right Control Bar (fixed, not rotating) */}
      <div
        className={`fixed flex items-center justify-between px-10 bg-black/95 backdrop-blur-xl ${
          window.innerWidth > window.innerHeight
            ? "right-0 top-0 bottom-0 w-28 flex-col py-12 border-l border-white/5"
            : "bottom-0 left-0 right-0 h-32 flex-row border-t border-white/5"
        }`}
      >
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`text-white/40 active:text-primary transition-colors p-2 ${
            showGrid ? "text-primary" : ""
          }`}
          style={uiRotateStyle}
        >
          <Icons.Grid className="w-6 h-6" />
        </button>

        {/* Main Capture Button */}
        <button
          onClick={handleMainCapture}
          disabled={isDisabled}
          className="w-20 h-20 rounded-full border-4 border-white/20 p-1 active:scale-90 transition-all flex items-center justify-center"
          style={uiRotateStyle}
        >
          <div
            className={`w-full h-full rounded-full ${
              captureMode === "hdr" ? "bg-white" : "bg-primary"
            }`}
          />
        </button>

        {/* Toggle Capture Mode Button */}
        <button
          onClick={() => setCaptureMode((prev) => (prev === "single" ? "hdr" : "single"))}
          disabled={isDisabled}
          className="text-white/40 hover:text-white p-2"
          style={uiRotateStyle}
        >
          {captureMode === "single" ? (
            <Icons.Camera className="w-7 h-7" />
          ) : (
            <Icons.Aperture className="w-7 h-7" />
          )}
        </button>

        <button
          onClick={() => navigate(-1)}
          className="text-white/40 hover:text-white p-2"
          style={uiRotateStyle}
        >
          <Icons.X className="w-7 h-7" />
        </button>
      </div>

      {/* Hint */}
      <div
        className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-black/40 px-3 py-2 text-xs text-white/80 sm:left-6 sm:top-6"
        style={uiRotateStyle}
      >
        Tela de câmera (demo) • UI gira com a orientação
      </div>
    </>
  );
}