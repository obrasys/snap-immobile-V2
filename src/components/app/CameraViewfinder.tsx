import React from "react";
import { Icons } from "@/components/app/Icons";

interface CameraViewfinderProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  viewfinderDim: { w: number; h: number };
  showGrid: boolean;
  processing: string | null;
  cameraError: string | null;
  bracketIndex: number | null;
  evStepsLength: number;
  uiRotateStyle: React.CSSProperties;
}

export function CameraViewfinder({
  videoRef,
  viewfinderDim,
  showGrid,
  processing,
  cameraError,
  bracketIndex,
  evStepsLength,
  uiRotateStyle,
}: CameraViewfinderProps) {
  return (
    <div
      className="relative bg-neutral-900 shadow-2xl"
      style={{ width: viewfinderDim.w, height: viewfinderDim.h }}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />
      {showGrid && (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="border border-white/50" />
          ))}
        </div>
      )}

      {/* Crosshairs - centralizados dentro do viewfinder */}
      <div className="absolute left-1/2 top-1/2 h-[38%] w-[2px] -translate-x-1/2 -translate-y-1/2 bg-red-500/90" />
      <div className="absolute left-1/2 top-1/2 h-[2px] w-[38%] -translate-x-1/2 -translate-y-1/2 bg-emerald-400/90" />

      {/* Processing / Error Overlay */}
      {(processing || cameraError) && (
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white z-50"
          style={uiRotateStyle}
        >
          <Icons.Aperture className="w-14 h-14 animate-spin text-primary mb-6" />
          <p className="text-xs font-black uppercase tracking-[0.3em]">
            {cameraError || processing}
          </p>
          {bracketIndex !== null && (
            <p className="text-[10px] opacity-40 mt-3 font-bold">
              Captura {bracketIndex + 1} de {evStepsLength}
            </p>
          )}
        </div>
      )}
    </div>
  );
}