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
  supportsExposureCompensation: boolean; // New prop
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
  supportsExposureCompensation, // Destructure new prop
}: CameraControlsProps) {
  const navigate = useNavigate();

  const isDisabled = !!processing || !!cameraError;
  const isHdrDisabled = !supportsExposureCompensation; // Determine if HDR should be disabled

  return (
    <React.Fragment>
      {/* Scene Mode (right-center, rotating) */}
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

      {/* EV Controls (left-center, rotating) */}
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

      {/* Hint (top-left, rotating) */}
      <div
        className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-black/40 px-3 py-2 text-xs text-white/80 sm:left-6 sm:top-6"
        style={uiRotateStyle}
      >
        Tela de câmera (demo) • UI gira com a orientação
      </div>

      {/* Main Control Bar (fixed on the right, always vertical) */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-28 flex flex-col items-center justify-between py-12 bg-black/95 backdrop-blur-xl border-l border-white/5`}
      >
        {/* Top section: Grid button */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`text-white/40 active:text-primary transition-colors p-2 ${
            showGrid ? "text-primary" : ""
          }`}
        >
          <Icons.Grid className="w-6 h-6" style={uiRotateStyle} /> {/* Aplicado uiRotateStyle ao ícone */}
        </button>

        {/* Middle section: Capture button and Zoom presets */}
        <div className="flex flex-col items-center gap-4">
          {/* Zoom Presets */}
          {!isDisabled && (
            <div
              className="flex flex-col items-center gap-2 z-20"
            >
              <button
                onClick={() => handleZoomPreset(1.0)}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-[9px] font-black transition-all ${
                  zoomPreset === 1.0 ? "bg-primary text-white scale-125" : "text-white/60"
                }`}
                style={uiRotateStyle} {/* Aplicado uiRotateStyle ao botão */}
              >
                1x
              </button>
              <button
                onClick={() => handleZoomPreset(0.5)}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-[9px] font-black transition-all ${
                  zoomPreset === 0.5 ? "bg-primary text-white scale-125" : "text-white/60"
                }`}
                style={uiRotateStyle} {/* Aplicado uiRotateStyle ao botão */}
              >
                .5
              </button>
            </div>
          )}

          {/* Main Capture Button */}
          <button
            onClick={handleMainCapture}
            disabled={isDisabled}
            className="w-20 h-20 rounded-full border-4 border-white/20 p-1 active:scale-90 transition-all flex items-center justify-center"
            style={uiRotateStyle} {/* Mantido uiRotateStyle no botão principal */}
          >
            <div
              className={`w-full h-full rounded-full ${
                captureMode === "hdr" ? "bg-white" : "bg-primary"
              }`}
            />
          </button>
        </div>

        {/* Bottom section: Toggle Capture Mode and Exit buttons */}
        <div className="flex flex-col items-center gap-4">
          {/* Toggle Capture Mode Button */}
          <button
            onClick={() => setCaptureMode((prev) => (prev === "single" ? "hdr" : "single"))}
            disabled={isDisabled || isHdrDisabled} // Disable if HDR is not supported
            className={`text-white/40 hover:text-white p-2 ${isHdrDisabled ? "opacity-30 cursor-not-allowed" : ""}`}
          >
            {captureMode === "single" ? (
              <Icons.Camera className="w-7 h-7" style={uiRotateStyle} /> {/* Aplicado uiRotateStyle ao ícone */}
            ) : (
              <Icons.Aperture className="w-7 h-7" style={uiRotateStyle} /> {/* Aplicado uiRotateStyle ao ícone */}
            )}
          </button>

          <button
            onClick={() => navigate(-1)}
            className="text-white/40 hover:text-white p-2"
          >
            <Icons.X className="w-7 h-7" style={uiRotateStyle} /> {/* Aplicado uiRotateStyle ao ícone */}
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}