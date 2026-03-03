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

function luminance(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Peso triangular (evita sombras muito escuras e highlights estourados)
function triangularWeight(y: number) {
  // y em linear [0..1] aproximado. Pico no meio
  const w = 1 - 2 * Math.abs(y - 0.5);
  return Math.max(0, w);
}

function boxBlur1D(
  src: Float32Array,
  w: number,
  h: number,
  radius: number,
  horizontal: boolean,
) {
  const dst = new Float32Array(src.length);
  if (radius <= 0) {
    dst.set(src);
    return dst;
  }

  const win = radius * 2 + 1;

  if (horizontal) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      const row = y * w;

      // init window
      for (let x = -radius; x <= radius; x++) {
        const xx = Math.min(w - 1, Math.max(0, x));
        sum += src[row + xx];
      }

      for (let x = 0; x < w; x++) {
        dst[row + x] = sum / win;

        const xOut = x - radius;
        const xIn = x + radius + 1;

        const xxOut = Math.min(w - 1, Math.max(0, xOut));
        const xxIn = Math.min(w - 1, Math.max(0, xIn));

        sum += src[row + xxIn] - src[row + xxOut];
      }
    }
  } else {
    for (let x = 0; x < w; x++) {
      let sum = 0;

      for (let y = -radius; y <= radius; y++) {
        const yy = Math.min(h - 1, Math.max(0, y));
        sum += src[yy * w + x];
      }

      for (let y = 0; y < h; y++) {
        dst[y * w + x] = sum / win;

        const yOut = y - radius;
        const yIn = y + radius + 1;

        const yyOut = Math.min(h - 1, Math.max(0, yOut));
        const yyIn = Math.min(h - 1, Math.max(0, yIn));

        sum += src[yyIn * w + x] - src[yyOut * w + x];
      }
    }
  }

  return dst;
}

function boxBlur2D(src: Float32Array, w: number, h: number, radius: number) {
  const tmp = boxBlur1D(src, w, h, radius, true);
  return boxBlur1D(tmp, w, h, radius, false);
}

// Tone mapping local via base/detail em log luminance
function localTonemapLogLuma(
  Y: Float32Array,
  w: number,
  h: number,
  params: {
    radius: number; // 8..24
    baseCompression: number; // 0.35..0.65
    detailBoost: number; // 1.0..1.25
    gamma: number; // 0.88..1.0
    highlight: number; // 1.05..1.25
    shadow: number; // 1.1..1.7
  },
) {
  const eps = 1e-6;
  const logY = new Float32Array(Y.length);

  for (let i = 0; i < Y.length; i++) {
    logY[i] = Math.log(Math.max(eps, Y[i]));
  }

  // base = blur(logY)
  const base = boxBlur2D(logY, w, h, params.radius);

  const outY = new Float32Array(Y.length);

  for (let i = 0; i < Y.length; i++) {
    const detail = logY[i] - base[i];

    // compressão do base
    const baseCompressed = base[i] * params.baseCompression;

    // reconstrução log
    let logOut = baseCompressed + detail * params.detailBoost;

    // volta pra linear
    let y = Math.exp(logOut);

    // shadow lift
    y = Math.pow(y, 1 / params.shadow);

    // highlight compression (Reinhard-like)
    y = (y * params.highlight) / (1 + y * params.highlight);

    // gamma final
    y = Math.pow(Math.max(0, y), params.gamma);

    outY[i] = y;
  }

  return outY;
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

      const y = luminance(r, g, b);

      // Peso base: evita extremos
      let wBase = triangularWeight(y);

      // Se frame muito escuro/estourado, quase ignora
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
        const ay = luminance(ar, ag, ab);

        if (Math.abs(ay - y) > ghostThresh) {
          wFinal *= ghostMul;
        }
      }

      // Radiance aproximada: linear / 2^EV
      sumR[p] += r * invExposure * wFinal;
      sumG[p] += g * invExposure * wFinal;
      sumB[p] += b * invExposure * wFinal;
      sumW[p] += wFinal;
    }
  }

  // Auto-exposure global simples: usa yMax como referência (com clamp)
  let yMax = 0;
  for (let p = 0; p < n; p++) {
    const wsum = sumW[p] || 1e-6;
    const r = sumR[p] / wsum;
    const g = sumG[p] / wsum;
    const b = sumB[p] / wsum;
    const y = luminance(r, g, b);
    if (y > yMax) yMax = y;
  }

  const ref = Math.max(0.8, Math.min(3.0, yMax));
  const exposure = 0.75 / ref;

  // Nível 3: tone mapping local (base/detail) em log-luma

  // 1) monta luminância HDR já exposta
  const Yin = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const wsum = sumW[p] || 1e-6;
    const r = (sumR[p] / wsum) * exposure;
    const g = (sumG[p] / wsum) * exposure;
    const b = (sumB[p] / wsum) * exposure;
    Yin[p] = luminance(r, g, b);
  }

  // 2) parâmetros por look (Nodalview-like)
  const ltParams =
    args.look === "interior"
      ? {
          radius: 16,
          baseCompression: 0.6,
          detailBoost: 1.08,
          gamma: 0.96,
          highlight: 1.1,
          shadow: 1.3,
        }
      : args.look === "window"
        ? {
            radius: 14,
            baseCompression: 0.62,
            detailBoost: 1.06,
            gamma: 0.97,
            highlight: 1.18,
            shadow: 1.2,
          }
        : {
            radius: 10,
            baseCompression: 0.68,
            detailBoost: 1.03,
            gamma: 1.0,
            highlight: 1.1,
            shadow: 1.08,
          };

  const Yout = localTonemapLogLuma(Yin, w, h, ltParams);

  // 3) escreve imagem final mantendo cor (chroma)
  const out = ctx.createImageData(w, h);
  const outData = out.data;

  for (let p = 0; p < n; p++) {
    const wsum = sumW[p] || 1e-6;

    let r = (sumR[p] / wsum) * exposure;
    let g = (sumG[p] / wsum) * exposure;
    let b = (sumB[p] / wsum) * exposure;

    const yIn = Yin[p];
    const yOut = Yout[p];

    const scale = yIn > 1e-6 ? yOut / yIn : 0;

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