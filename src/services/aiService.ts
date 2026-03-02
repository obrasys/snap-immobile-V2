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
      OBJETIVO: Gerar uma imagem HDR imobiliária de alta qualidade.
      
      REQUISITOS:
      1. Manter proporção 4:3.
      2. Combinar as exposições para dynamic range máximo.
      3. Recuperar highlights e iluminar sombras.
      
      RETORNO OBRIGATÓRIO:
      Retorne APENAS a string Base64 da imagem processada. 
      NÃO inclua blocos de código markdown, NÃO inclua o prefixo "data:image...", NÃO inclua explicações.
      Apenas a string Base64 pura.
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
        // Alterado para text/plain pois o modelo não gera arquivos binários diretamente
        generationConfig: { responseMimeType: "text/plain" },
      });
      
      const response = result.response;
      const text = response.text();
      
      // Limpa possíveis blocos de código markdown que a IA possa ter adicionado
      const cleanedBase64 = text.replace(/```[a-z]*\n?|```/g, '').trim();
      
      if (cleanedBase64.length > 100) {
        return `data:image/jpeg;base64,${cleanedBase64}`;
      }
      
      console.warn("[Snap AI] Resposta da IA muito curta, retornando original.");
      return base64Image;
    } catch (error) {
      console.error("[Snap AI] Erro no processamento:", error);
      throw error;
    }
  }
};

export const enhanceImage = aiService.enhanceImage;