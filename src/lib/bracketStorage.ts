import { dataUrlToBlob } from "@/lib/fileActions";

const BRACKET_PREFIX = "snapimmobile.bracket.";

export const bracketStorage = {
  async saveBracket(id: string, blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          localStorage.setItem(BRACKET_PREFIX + id, reader.result);
          resolve();
        } else {
          reject(new Error("Failed to convert blob to data URL."));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  async getBracket(id: string): Promise<Blob | null> {
    const dataUrl = localStorage.getItem(BRACKET_PREFIX + id);
    if (!dataUrl) return null;
    return dataUrlToBlob(dataUrl);
  },

  deleteBracket(id: string): void {
    localStorage.removeItem(BRACKET_PREFIX + id);
  },

  clearAllBrackets(): void {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(BRACKET_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  },
};