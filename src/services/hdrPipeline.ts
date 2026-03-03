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

function drawContain(ctx: CanvasRenderingContext2D, img: ImageBitmap, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);

  const scale = Math.min(w / img.width, h / img.height);
  const dw = Math.round(img.width * scale);
  const dh = Math.round(img.height * scale);
  const dx = Math.floor((w - dw) / 2);
  const dy = Math.floor((h - dh) / 2);

  // Fill with black padding (no crop)
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, dx, dy, dw, dh);
}

function tonemapReinhard(y: number) {
  return y / (1 + y);
}

export async function fuseHdr9Exposure(args: {
  frames: string[]; // 9 dataURLs (jpeg)
  evs: number[]; // length 9
  anchorIndex: number; // index of 0EV
  look: "interior" | "exterior" | "window";
}): Promise<string> {
  if (args.frames.length !== 9 || args.evs.length !== 9) {
    throw new Error("HDR9 requer exatamente 9 frames.");
  }
  if (args.anchorIndex < 0 || args.anchorIndex >= 9) throw new Error("anchorIndex inválido");

  const anchorBmp = await dataUrlToImageBitmap(args.frames[args.anchorIndex]);
  const w = anchorBmp.width;
  const h = anchorBmp.height;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas não suportado");

  // Anchor data for ghosting
  drawContain(ctx, anchorBmp, w, h);
  const anchor = ctx.getImageData(0, 0, w, h).data;

  const n = w * h;
  const sumR = new Float32Array(n);
  const sumG = new Float32Array(n);
  const sumB = new Float32Array(n);
  const sumW = new Float32Array(n);

  // Look parameters (rápido: melhora interior sem reescrever o pipeline)
  const sigma =
    args.look === "interior" ? 0.42 : args.look === "window" ? 0.32 : 0.26;
  const invTwoSigma2 = 1 / (2 * sigma * sigma);

  const shadowLift =
    args.look === "interior" ? 1.48 : args.look === "window" ? 1.22 : 1.08;

  const highlightCompress =
    args.look === "exterior" ? 1.1 : args.look === "window" ? 1.18 : 1.06;

  const gamma =
    args.look === "interior" ? 0.9 : args.look === "window" ? 0.95 : 1.0;

  const ghostThresh =
    args.look === "interior" ? 0.45 : args.look === "window" ? 0.35 : 0.28;

  const ghostMul =
    args.look === "interior" ? 0.3 : args.look === "window" ? 0.18 : 0.08;

  for (let i = 0; i < 9; i++) {
    const bmp = i === args.anchorIndex ? anchorBmp : await dataUrlToImageBitmap(args.frames[i]);
    drawContain(ctx, bmp, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    const ev = args.evs[i] ?? 0;

    for (let p = 0; p < n; p++) {
      const idx = p * 4;
      const r8 = data[idx];
      const g8 = data[idx + 1];
      const b8 = data[idx + 2];

      const r = srgbToLinear(r8 / 255);
      const g = srgbToLinear(g8 / 255);
      const b = srgbToLinear(b8 / 255);

      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      // Well-exposedness weight (Mertens-style) — sigma maior p/ interior
      const wExp = Math.exp(-Math.pow(y - 0.5, 2) * invTwoSigma2);

      // Saturation weight
      const mu = (r + g + b) / 3;
      const sat = Math.sqrt(((r - mu) ** 2 + (g - mu) ** 2 + (b - mu) ** 2) / 3);

      const wBase = wExp * (0.15 + sat);

      // EV bias: favorece EV+ em sombras e EV- em highlights
      let wEv = 1;
      if (y < 0.35) wEv = 1 + 0.14 * Math.max(0, ev);
      else if (y > 0.75) wEv = 1 + 0.14 * Math.max(0, -ev);

      let wFinal = wBase * wEv;

      // Ghosting: em interior, o anchor pode ser muito diferente dos frames claros.
      // Ajustamos threshold e multiplicador por look.
      if (i !== args.anchorIndex) {
        const ar = srgbToLinear(anchor[idx] / 255);
        const ag = srgbToLinear(anchor[idx + 1] / 255);
        const ab = srgbToLinear(anchor[idx + 2] / 255);
        const ay = 0.2126 * ar + 0.7152 * ag + 0.0722 * ab;
        if (Math.abs(ay - y) > ghostThresh) {
          wFinal *= ghostMul;
        }
      }

      sumR[p] += r * wFinal;
      sumG[p] += g * wFinal;
      sumB[p] += b * wFinal;
      sumW[p] += wFinal;
    }
  }

  // Write output
  const out = ctx.createImageData(w, h);
  const outData = out.data;

  for (let p = 0; p < n; p++) {
    const wsum = sumW[p] || 1e-6;
    let r = sumR[p] / wsum;
    let g = sumG[p] / wsum;
    let b = sumB[p] / wsum;

    // Tone mapping in luminance domain
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Shadow lift
    const yLifted = Math.min(10, Math.pow(y, 1 / shadowLift));

    // Highlight compression + gamma (gamma<1 clareia)
    let yComp = tonemapReinhard(yLifted * highlightCompress);
    yComp = Math.pow(yComp, gamma);

    const scale = y > 1e-6 ? yComp / y : 0;
    r = r * scale;
    g = g * scale;
    b = b * scale;

    // Clamp
    r = Math.min(1, Math.max(0, r));
    g = Math.min(1, Math.max(0, g));
    b = Math.min(1, Math.max(0, b));

    const idx = p * 4;
    outData[idx] = Math.round(Math.min(1, Math.max(0, linearToSrgb(r))) * 255);
    outData[idx + 1] = Math.round(Math.min(1, Math.max(0, linearToSrgb(g))) * 255);
    outData[idx + 2] = Math.round(Math.min(1, Math.max(0, linearToSrgb(b))) * 255);
    outData[idx + 3] = 255;
  }

  ctx.putImageData(out, 0, 0);

  // Keep original format as close as possible (we only have dataURLs, no HEIC in browser capture)
  const mime = getMimeType(args.frames[args.anchorIndex]) || "image/jpeg";
  const outMime = mime === "image/png" ? "image/png" : "image/jpeg";
  const quality: number | undefined = outMime === "image/jpeg" ? 0.92 : undefined;

  return canvas.toDataURL(outMime, quality);
}