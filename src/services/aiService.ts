import { GoogleGenAI } from "@google/genai";
import { cleanBase64, getMimeType } from "../utils/helpers";

const getApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || "";
};

const createAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[Snap AI] Gemini API Key não encontrada. Verifique VITE_GEMINI_API_KEY / VITE_API_KEY.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

function extractFirstInlineImageBase64(response: any): string {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part?.inlineData?.data) return part.inlineData.data as string;
  }

  const textPart = parts.find((p: any) => typeof p?.text === "string" && p.text.trim().length > 0);
  if (textPart?.text) {
    throw new Error(`Gemini retornou TEXTO (sem imagem): ${String(textPart.text).slice(0, 220)}`);
  }

  throw new Error("Gemini não retornou imagem (inlineData). Verifique modelo/permissões/chave.");
}

export const enhanceImage = async (
  base64Image: string,
  profile: "hp_hdr_interior" | "hp_hdr_exterior" | "hp_hdr_window" = "hp_hdr_interior",
): Promise<string> => {
  const ai = createAiClient();
  if (!ai) throw new Error("Chave Gemini não configurada (VITE_GEMINI_API_KEY / VITE_API_KEY).");

  const contextMap = {
    hp_hdr_interior: "CONTEXTO: Interior de Imóvel. Prioridade: Profundidade e Iluminação Natural.",
    hp_hdr_exterior: "CONTEXTO: Exterior/Fachada. Prioridade: Recuperação de Céu e Sombras.",
    hp_hdr_window: "CONTEXTO: Interior com Alto Contraste. Prioridade: Recuperação total da vista da janela.",
  } as const;

  const prompt = `
SYSTEM / BUILD (ENGINE HDR PRO)
Tu és o motor de processamento de imagem do Snap Immobile.
${contextMap[profile]}

REGRAS DE GEOMETRIA (ABSOLUTAS):
1. A imagem de entrada é 4:3. A SAÍDA DEVE SER 4:3.
2. PROIBIDO CORTAR (CROP). PROIBIDO ESTICAR (STRETCH).
3. PROIBIDO MUDAR A DISTÂNCIA FOCAL (FOV).

PROCESSAMENTO HDR:
1. Highlight Mapping Inteligente: Recupera brancos estourados.
2. Shadow Recovery Natural: Ilumina sombras sem ruído.

OBRIGATÓRIO: Retornar APENAS a imagem processada.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: {
        parts: [
          { inlineData: { data: cleanBase64(base64Image), mimeType: getMimeType(base64Image) } },
          { text: prompt },
        ],
      },
      config: { responseModalities: ["IMAGE"] },
    });

    const imgBase64 = extractFirstInlineImageBase64(response);
    return `data:image/png;base64,${imgBase64}`;
  } catch (error) {
    console.error("[Snap AI] Falha no Melhoramento:", error);
    throw error;
  }
};

export const editImageWithPrompt = async (
  base64Image: string,
  prompt: string,
  mode: "ERASE" | "STAGE" = "ERASE",
): Promise<string> => {
  const ai = createAiClient();
  if (!ai) throw new Error("Chave Gemini não configurada (VITE_GEMINI_API_KEY / VITE_API_KEY).");

  const sys =
    mode === "ERASE"
      ? `TASK: MAGIC ERASER / INPAINTING.
INPUT: An image with translucent RED STROKES marking objects to remove.
ACTION:
1. Detect pixels covered by red strokes.
2. Remove the objects under the strokes.
3. Inpaint the background realistically to match the surroundings.
4. RETURN ONLY THE CLEAN IMAGE (No red marks).`
      : `TASK: VIRTUAL STAGING. Add furniture: "${prompt}". Match perspective, lighting, and shadows. MAINTAIN ASPECT RATIO.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: {
        parts: [
          { inlineData: { data: cleanBase64(base64Image), mimeType: getMimeType(base64Image) } },
          { text: sys + "\n\nUser Instruction: " + prompt },
        ],
      },
      config: { responseModalities: ["IMAGE", "TEXT"] },
    });

    const imgBase64 = extractFirstInlineImageBase64(response);
    return `data:image/png;base64,${imgBase64}`;
  } catch (error: any) {
    console.error("[Snap AI] Falha na Edição:", error);
    if (error?.message?.includes("SAFETY")) {
      throw new Error("A edição foi bloqueada por filtros de segurança.");
    }
    throw error;
  }
};

export const generateDescription = async (base64Image: string): Promise<string> => {
  const ai = createAiClient();
  if (!ai) return "Imóvel";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { data: cleanBase64(base64Image), mimeType: getMimeType(base64Image) } },
          { text: "Descreva esta divisão imobiliária numa frase curta e profissional em PT-PT." },
        ],
      },
    });
    return response.text ? response.text.trim() : "Imóvel";
  } catch (e) {
    console.warn("[Snap AI] Falha na descrição:", e);
    return "Imóvel";
  }
};

export const aiService = {
  enhanceImage,
  editImageWithPrompt,
  generateDescription,
};