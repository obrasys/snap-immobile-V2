import { GoogleGenerativeAI } from "@google/generative-ai";
import { cleanBase64, getMimeType } from "@/utils/helpers";
import type { PhotoMode } from "@/lib/models";

// Detecção segura da API Key para ambiente Vite
const getApiKey = () => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  console.error("CRITICAL: Gemini API Key not found. Check .env file (VITE_GEMINI_API_KEY)");
  return "";
};

const apiKey = getApiKey();
const ai = new GoogleGenerativeAI(apiKey);

// --- MÉTODOS DE SERVIÇO ---

export const aiService = {
  /**
   * Simula o aprimoramento de imagens de bracketing para gerar uma imagem HDR.
   * @param bracketIds IDs das imagens de bracketing temporárias.
   * @param mode Modo da foto (hp_hdr_exterior, hp_hdr_window).
   * @param options Opções adicionais (ex: scene).
   * @returns Uma URL de dados da imagem HDR final.
   */
  async enhanceBrackets(
    _bracketIds: string[], // No Gemini, passamos a imagem final, não os brackets separados
    mode: "hp_hdr_exterior" | "hp_hdr_window",
    _options: { scene: "interior" | "exterior" },
    base64Image: string, // Adicionado para passar a imagem base64 para o Gemini
  ): Promise<string> {
    if (!apiKey) throw new Error("Chave de API do Gemini não configurada.");

    const contextMap = {
      'hp_hdr_exterior': "CONTEXTO: Exterior/Fachada. Prioridade: Recuperação de Céu e Sombras.",
      'hp_hdr_window': "CONTEXTO: Interior com Alto Contraste. Prioridade: Recuperação total da vista da janela."
    };

    const contextInstruction = contextMap[mode];

    const prompt = `
      SYSTEM / BUILD (ENGINE HDR PRO)
      Tu és o motor de processamento de imagem do Snap Immobile.
      ${contextInstruction}

      OBJETIVO FINAL: Gerar automaticamente, após o upload das 9 exposições, uma imagem HDR imobiliária de alta qualidade, no formato original da captura, com profundidade semelhante ao Nodalview, textura realista e geometria 100% preservada.

      1. FORMATO E FOV (ESSENCIAL):
         - Manter exatamente a proporção original da captura (4:3).
         - Nunca cortar, esticar ou converter para 16:9.
         - Preservar todos os metadados EXIF.
         - Nunca alterar o campo de visão, distância focal, nem perspectiva.
         - Respeitar a geometria original da sala.

      2. HDR PROFISSIONAL COM 9 EXPOSIÇÕES:
         - As exposições esperadas são: –4 EV, –3 EV, –2 EV, –1 EV, 0 EV, +1 EV, +2 EV, +3 EV, +4 EV.
         - O sistema deve:
           - Combinar as 9 exposições preservando dynamic range real.
           - Usar exposições negativas para recuperar highlights.
           - Usar exposições positivas para iluminar sombras.
           - Zero halos, zero brilho artificial.
           - Preservar cor e balanço de branco naturais.
           - Reduzir ruído nas exposições mais altas (+3 e +4 EV) sem borrar textura.

      3. PROFUNDIDADE REAL:
         - A profundidade deve ser aumentada de forma sutil e natural, usando apenas:
           - Microcontraste no piso e superfícies texturizadas.
           - Separação tonal suave entre planos próximos e distantes.
           - Sombras naturais um pouco mais definidas nos objetos distantes.
           - Nitidez seletiva apenas onde há textura real.
           - Reforço leve de textura no piso para criar sensação de espaço.
         - Nunca alterar: perspectiva, ângulo de captura, distâncias entre objetos, proporções da sala, distorção de lente original.
         - A profundidade deve ser igual ou superior à do Nodalview, porém natural.

      4. ILUMINAÇÃO:
         - Iluminar suavemente áreas escuras sem clarear demais.
         - Preservar brilho natural das luzes internas.
         - Nunca saturar ou criar “glow” artificial.
         - Manter cor real do ambiente.

      5. QUALIDADE FINAL:
         - A imagem final deve ser:
           - Limpa, sem ruído.
           - Com textura realista.
           - Com profundidade visível.
           - Com HDR equilibrado.
           - Fiel ao ambiente.
           - Pronta para uso imobiliário profissional.

      6. O QUE NUNCA FAZER:
         - Não alterar formato da imagem.
         - Não converter para widescreen.
         - Não mudar cores.
         - Não modificar sombras reais.
         - Não remover elementos do ambiente.
         - Não distorcer a lente.
         - Não aplicar filtros estilísticos.
      
      OBRIGATÓRIO: Retornar APENAS a imagem processada.
    `;

    try {
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Usando gemini-1.5-flash
      const result = await model.generateContent({
        contents: [{
          role: 'user', // Adicionado o role
          parts: [
            { inlineData: { data: cleanBase64(base64Image), mimeType: getMimeType(base64Image) } },
            { text: prompt },
          ],
        }],
        generationConfig: {
          responseMimeType: "image/png", // Solicita a resposta como imagem PNG
        },
      });
      
      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
              return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
      }
      console.warn("A IA retornou, mas sem imagem gerada.");
      return base64Image; // Fallback para a imagem original
    } catch (error) {
      console.error("[Snap AI] Falha no Melhoramento:", error);
      throw error;
    }
  },

  async editImageWithPrompt(base64Image: string, prompt: string, mode: 'ERASE' | 'STAGE' = 'ERASE'): Promise<string> {
    if (!apiKey) throw new Error("Chave de API do Gemini não configurada.");
    
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
        console.log(`[Snap AI] Iniciando edição modo: ${mode} com modelo gemini-1.5-flash...`);
        
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent({
            contents: [{
              role: 'user', // Adicionado o role
              parts: [
                { inlineData: { data: cleanBase64(base64Image), mimeType: getMimeType(base64Image) } },
                { text: sys + "\n\nUser Instruction: " + prompt },
              ],
            }],
            generationConfig: {
              responseMimeType: "image/png",
            },
          });
          
          const response = result.response;
          const parts = response.candidates?.[0]?.content?.parts || [];
          
          for (const part of parts) {
              if (part.inlineData && part.inlineData.data) {
                  console.log("[Snap AI] Imagem gerada com sucesso.");
                  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              }
          }
          
          const textPart = parts.find(p => p.text);
          if (textPart) {
              console.warn("[Snap AI] Resposta de texto da IA (sem imagem):", textPart.text);
              throw new Error("A IA respondeu com texto em vez de imagem: " + textPart.text);
          }

          throw new Error("A IA não gerou uma imagem de retorno.");
    } catch (error: any) {
        console.error("[Snap AI] Falha na Edição:", error);
        if (error.message?.includes('SAFETY')) {
            throw new Error("A edição foi bloqueada por filtros de segurança.");
        }
        throw error;
    }
  },

  async generateDescription(base64Image: string): Promise<string> {
    if (!apiKey) return "Imóvel (Chave API em falta)";
    
    try {
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent({
            contents: [{
                role: 'user', // Adicionado o role
                parts: [
                    { inlineData: { data: cleanBase64(base64Image), mimeType: getMimeType(base64Image) } },
                    { text: "Descreva esta divisão imobiliária numa frase curta e profissional em PT-PT." }
                ]
            }]
        });
        return result.response.text() ? result.response.text().trim() : "Imóvel"; // Chamando .text()
    } catch (e) { 
        console.warn("[Snap AI] Falha na descrição:", e);
        return "Imóvel"; 
    }
  }
};