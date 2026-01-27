export function cleanBase64(base64String: string): string {
  // Remove o prefixo "data:image/jpeg;base64," ou similar
  return base64String.split(",")[1] || base64String;
}

export function getMimeType(base64String: string): string {
  const match = base64String.match(/^data:(.*?);base64,/);
  return match ? match[1] : "image/jpeg"; // Default para JPEG se não conseguir detectar
}