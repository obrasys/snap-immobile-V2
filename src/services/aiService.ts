import { GoogleGenerativeAI } from "@google/generative-ai";
import { cleanBase64, getMimeType } from "@/utils/helpers";
import type { PhotoMode } from "@/lib/models";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenerativeAI(apiKey || "dummy-key");

export const aiService = {
  async enhanceImage(
    base64Image: string,
    mode: "hp_hdr_interior" | "hp_hdr_exterior" | "hp_hdr_window"
  ): Promise<string> {
    if (!apiKey) throw new Error("Chave de API do Gemini não configurada.");

    const contextMap = {
      'hp_hdr_interior': "CONTEXTO: Interior Residencial. Prioridade: Equilíbrio de luz e cores naturais.",
      'hp_hdr_exterior': "CONTEXTO: Exterior/Fachada. Prioridade: Recuperação de Céu e Sombras.",
      'hp_hdr_window': "CONTEXTO: Interior com Janela. Prioridade: Recuperação total da vista exterior através da janela."
    };

    const prompt = `
      SYSTEM / ENGINE HDR PRO (SNAP IMMOBILE)
      ${contextMap[mode]}
      OBJETIVO: Gerar uma imagem HDR imobiliária de alta qualidade (estilo Nodalview).
      
      REQUISITOS:
      1. Manter proporção 4:3 e geometria original.
      2. Combinar as exposições para dynamic range máximo.
      3. Recuperar highlights (janelas/céu) e iluminar sombras sem ruído.
      4. Nitidez profissional e microcontraste em texturas (piso/paredes).
      5. Cores naturais, sem saturação excessiva.
      
      RETORNAR APENAS A IMAGEM PROCESSADA EM BASE64.
    `;

    try {
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { data: cleanBase64(base64Image), mimeType: getMimeType(base64Image) } },
            { text: prompt },
          ],
        }],
        generationConfig: { responseMimeType: "image/png" },
      });
      
      const response = result.response;
      const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (part?.inlineData?.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
      return base64Image;
    } catch (error) {
      console.error("[Snap AI] Erro no processamento:", error);
      throw error;
    }
  }
};

// Alias para manter compatibilidade se necessário
export const enhanceImage = aiService.enhanceImage;