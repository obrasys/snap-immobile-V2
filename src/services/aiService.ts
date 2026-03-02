import { GoogleGenAI } from "@google/genai";
import { cleanBase64, getMimeType } from "../utils/helpers";

// Função para obter a chave de forma segura e reativa ao ambiente do Vite
const getApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || "";
};

// Instancia o cliente apenas se a chave existir, evitando o erro de constructor no browser
const createAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[Snap AI] Gemini API Key não encontrada. Verifique as variáveis de ambiente.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// --- MÉTODOS DE SERVIÇO ---

export const enhanceImage = async (
  base64Image: string, 
  profile: 'hp_hdr_interior' | 'hp_hdr_exterior' | 'hp_hdr_window' = 'hp_hdr_interior'
): Promise<string> => {
  const ai = createAiClient();
  if (!ai) throw new Error("Chave de API não configurada. Adicione VITE_GEMINI_API_KEY.");

  const contextMap = {
      'hp_hdr_interior': "CONTEXTO: Interior de Imóvel. Prioridade: Profundidade e Iluminação Natural.",
      'hp_hdr_exterior': "CONTEXTO: Exterior/Fachada. Prioridade: Recuperação de Céu e Sombras.",
      'hp_hdr_window': "CONTEXTO: Interior com Alto Contraste. Prioridade: Recuperação total da vista da janela."
  };

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
        model: 'gemini-2.5-flash-image-preview',
        contents: {
          parts: [
            { inlineData: { data: cleanBase64(base64Image), mimeType: getMimeType(base64Image) } },
            { text: prompt },
          ],
        },
        config: { responseModalities: ['IMAGE'] },
      });
      
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
              return `data:image/png;base64,${part.inlineData.data}`;
          }
      }
      return base64Image;
  } catch (error) {
    console.error("[Snap AI] Falha no Melhoramento:", error);
    throw error;
  }
};

export const editImageWithPrompt = async (
  base64Image: string, 
  prompt: string, 
  mode: 'ERASE' | 'STAGE' = 'ERASE'
): Promise<string> => {
    const ai = createAiClient();
    if (!ai) throw new Error("Chave de API não configurada.");
    
    const sys = mode === 'ERASE' 
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
            model: 'gemini-2.5-flash-image-preview',
            contents: {
              parts: [
                { inlineData: { data: cleanBase64(base64Image), mimeType: getMimeType(base64Image) } },
                { text: sys + "\n\nUser Instruction: " + prompt },
              ],
            },
            config: { responseModalities: ['IMAGE', 'TEXT'] },
          });
          
          const parts = response.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
              if (part.inlineData && part.inlineData.data) {
                  return `data:image/png;base64,${part.inlineData.data}`;
              }
          }
          throw new Error("A IA não gerou uma imagem de retorno.");
    } catch (error: any) {
        console.error("[Snap AI] Falha na Edição:", error);
        throw error;
    }
};

export const generateDescription = async (base64Image: string): Promise<string> => {
    const ai = createAiClient();
    if (!ai) return "Imóvel";
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: cleanBase64(base64Image), mimeType: getMimeType(base64Image) } },
                    { text: "Descreva esta divisão imobiliária numa frase curta e profissional em PT-PT." }
                ]
            }
        });
        return response.text ? response.text.trim() : "Imóvel";
    } catch (e) { 
        return "Imóvel"; 
    }
};

export const aiService = {
  enhanceImage,
  editImageWithPrompt,
  generateDescription
};