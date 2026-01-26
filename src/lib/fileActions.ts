export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",");
  const mimeMatch = /data:(.*?);base64/.exec(meta);
  const mime = mimeMatch?.[1] ?? "image/jpeg";
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function shareDataUrl(dataUrl: string, filename: string) {
  const blob = dataUrlToBlob(dataUrl);
  const file = new File([blob], filename, { type: blob.type });

  // Web Share API (mobile browsers)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navAny = navigator as any;
  if (navAny.share && (!navAny.canShare || navAny.canShare({ files: [file] }))) {
    await navAny.share({ files: [file], title: "Snap Immobile HDR" });
    return;
  }

  // fallback: copia um link (dataUrl) — útil em protótipos
  await navigator.clipboard.writeText(dataUrl);
}
