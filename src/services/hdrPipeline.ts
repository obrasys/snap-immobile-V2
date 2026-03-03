import { getMimeType } from "@/utils/helpers";

function srgbToLinear(u: number) {
  if (u <= 0.04045) return u / 12.92;
  return Math.pow((u + 0.055) / 1.055, 2.4);
}

function linearToSrgb(u: number) {
  if (u <= 0.0031308) return 12.92 * u;
  return 1.055 * Math.pow(u, 1 / 2.4) - 0.055;
}

async function dataUrlToImageBitmap(dataUrl: string): Promise<ImageBitmap> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: ImageBitmap,
  w: number,
  h: number,
) {
  ctx.clearRect(0, 0, w, h);
  const scale = Math.min(w / img.width, h / img.height);
  const dw = Math.round(img.width * scale);
  const dh = Math.round(img.height * scale);
  const dx = Math.floor((w - dw) / 2);
  const dy = Math.floor((h - dh) / 2);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, dx, dy, dw, dh);
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

// Peso triangular (evita sombras muito escuras e highlights estourados)
function triangularWeight(y: number) {
  // y em linear [0..1] aproximado. Pico no meio
  const w = 1 - 2 * Math.abs(y - 0.5);
  return Math.max(0, w);
}

function reinhard(x: number) {
  return x / (1 + x);
}

export async function fuseHdr9Exposure(args: {
  frames: string[];
  evs: number[];
  anchorIndex: number;
  look: "interior" | "exterior" | "window";
}): Promise<string> {
  if (args.frames.length !== 9 || args.evs.length !== 9) {
    throw new Error("HDR9 requer exatamente 9 frames.");
  }
  if (args.anchorIndex < 0 || args.anchorIndex >= 9) {
    throw new Error("anchorIndex inválido");
  }

  const anchorBmp = await dataUrlToImageBitmap(args.frames[args.anchorIndex]);
  const w = anchorBmp.width;
  const h = anchorBmp.height;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas não suportado");

  // Anchor (para deghost simples)
  drawContain(ctx, anchorBmp, w, h);
  const anchor = ctx.getImageData(0, 0, w, h).data;

  const n = w * h;

  // Acumuladores de radiance
  const sumR = new Float32Array(n);
  const sumG = new Float32Array(n);
  const sumB = new Float32Array(n);
  const sumW = new Float32Array(n);

  // Params por look
  const shadowLift =
    args.look === "interior" ? 1.55 : args.look === "window" ? 1.25 : 1.08;

  const highlightCompress =
    args.look === "window" ? 1.25 : args.look === "exterior" ? 1.12 : 1.08;

  const gamma =
    args.look === "interior" ? 0.9 : args.look === "window" ? 0.95 : 1.0;

  // Deghost: mais permissivo em interior, mais restrito em exterior
  const ghostThresh =
    args.look === "interior" ? 0.4 : args.look === "window" ? 0.33 : 0.26;

  const ghostMul =
    args.look === "interior" ? 0.55 : args.look === "window" ? 0.35 : 0.18;

  // Pequeno viés de EV: sombras puxam EV+, highlights puxam EV-
  const evBiasStrength =
    args.look === "interior" ? 0.18 : args.look === "window" ? 0.14 : 0.1;

  for (let i = 0; i < 9; i++) {
    const bmp =
      i === args.anchorIndex
        ? anchorBmp
        : await dataUrlToImageBitmap(args.frames[i]);
    drawContain(ctx, bmp, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    const ev = args.evs[i] ?? 0;
    const exposureScale = Math.pow(2, ev); // proxy de "tempo" relativo
    const invExposure = 1 / (exposureScale || 1e-6);

    for (let p = 0; p < n; p++) {
      const idx = p * 4;

      const r = srgbToLinear(data[idx] / 255);
      const g = srgbToLinear(data[idx + 1] / 255);
      const b = srgbToLinear(data[idx + 2] / 255);

      // luminância linear
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      // Peso base: evita extremos
      let wBase = triangularWeight(y);

      // Se frame muito escuro/estourado, quase ignora
      // (ajuda a reduzir ruído de sombras e clipping)
      if (y < 0.02 || y > 0.98) wBase *= 0.05;

      // EV bias: em sombras, pref EV+; em highlights, pref EV-
      let wEv = 1.0;
      if (y < 0.35) wEv = 1 + evBiasStrength * Math.max(0, ev);
      else if (y > 0.75) wEv = 1 + evBiasStrength * Math.max(0, -ev);

      let wFinal = wBase * wEv;

      // Deghost simples comparando luminância com anchor
      if (i !== args.anchorIndex) {
        const ar = srgbToLinear(anchor[idx] / 255);
        const ag = srgbToLinear(anchor[idx + 1] / 255);
        const ab = srgbToLinear(anchor[idx + 2] / 255);
        const ay = 0.2126 * ar + 0.7152 * ag + 0.0722 * ab;

        if (Math.abs(ay - y) > ghostThresh) {
          wFinal *= ghostMul;
        }
      }

      // Radiance aproximada: linear / 2^EV
      const rr = r * invExposure;
      const gg = g * invExposure;
      const bb = b * invExposure;

      sumR[p] += rr * wFinal;
      sumG[p] += gg * wFinal;
      sumB[p] += bb * wFinal;
      sumW[p] += wFinal;
    }
  }

  // Escreve saída com tone mapping
  const out = ctx.createImageData(w, h);
  const outData = out.data;

  // Auto-exposure global simples: usa yMax como referência (com clamp)
  let yMax = 0;
  for (let p = 0; p < n; p++) {
    const wsum = sumW[p] || 1e-6;
    const r = sumR[p] / wsum;
    const g = sumG[p] / wsum;
    const b = sumB[p] / wsum;
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (y > yMax) yMax = y;
  }

  const ref = Math.max(0.6, Math.min(4.0, yMax));
  const exposure = 0.9 / ref;

  for (let p = 0; p < n; p++) {
    const wsum = sumW[p] || 1e-6;

    let r = (sumR[p] / wsum) * exposure;
    let g = (sumG[p] / wsum) * exposure;
    let b = (sumB[p] / wsum) * exposure;

    // Luminância no domínio radiance (já “HDR”)
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Lift de sombras
    const yLifted = Math.pow(Math.max(0, y), 1 / shadowLift);

    // Compressão de highlights + gamma
    let yComp = reinhard(yLifted * highlightCompress);
    yComp = Math.pow(yComp, gamma);

    const scale = y > 1e-6 ? yComp / y : 0;

    r = clamp01(r * scale);
    g = clamp01(g * scale);
    b = clamp01(b * scale);

    const idx = p * 4;
    outData[idx] = Math.round(clamp01(linearToSrgb(r)) * 255);
    outData[idx + 1] = Math.round(clamp01(linearToSrgb(g)) * 255);
    outData[idx + 2] = Math.round(clamp01(linearToSrgb(b)) * 255);
    outData[idx + 3] = 255;
  }

  ctx.putImageData(out, 0, 0);

  const mime = getMimeType(args.frames[args.anchorIndex]) || "image/jpeg";
  const outMime = mime === "image/png" ? "image/png" : "image/jpeg";
  const quality: number | undefined = outMime === "image/jpeg" ? 0.92 : undefined;

  return canvas.toDataURL(outMime, quality);
}
