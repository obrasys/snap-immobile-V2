import { cleanBase64, getMimeType } from "@/utils/helpers";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

export const aiService = {
  async enhanceImage(
    base64Image: string,
    mode: "hp_hdr_interior" | "hp_hdr_exterior" | "hp_hdr_window"
  ): Promise<string> {
    if (!apiKey) throw new Error("Chave de API do Gemini não configurada.");

    const contextMap = {
      'hp_hdr_interior': "Interior Residencial. Equilíbrio de luz e cores naturais.",
      'hp_hdr_exterior': "Exterior/Fachada. Recuperação de Céu e Sombras.",
      'hp_hdr_window': "Interior com Janela. Recuperação total da vista exterior através da janela."
    };

    const prompt = `
      OBJETIVO: Gerar imagem HDR imobiliária de alta qualidade.
      CONTEXTO: ${contextMap[mode]}
      RETORNO: Retorne APENAS a string Base64 pura da imagem processada. 
      Sem markdown, sem explicações, apenas o código base64.
    `;

    // Forçando o uso do endpoint v1 conforme solicitado
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: getMimeType(base64Image),
              data: cleanBase64(base64Image)
            }
          }
        ]
      }],
      generationConfig: {
        // Removido response_mime_type para evitar incompatibilidades no v1
        temperature: 0.4,
        topP: 1,
        topK: 32
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Gemini API Error]", errorText);
        throw new Error(`Erro na API Gemini (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      // Limpa qualquer resquício de formatação que a IA possa ter enviado
      const cleanedBase64 = textResponse.replace(/```[a-z]*\n?|```/g, '').trim();
      
      if (cleanedBase64.length > 100) {
        return `data:image/jpeg;base64,${cleanedBase64}`;
      }
      
      console.warn("[Snap AI] Resposta inválida ou curta, retornando original.");
      return base64Image;
    } catch (error) {
      console.error("[Snap AI] Falha crítica no processamento:", error);
      throw error;
    }
  }
};

export const enhanceImage = aiService.enhanceImage;