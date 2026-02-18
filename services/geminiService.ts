
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

const SYSTEM_INSTRUCTION = `
You are the AI Design Strategist for Ender, a world-class visual architect.
Ender specializes in crafting visual narratives across four core pillars:
1. Logo Design (e.g., Aether Identity, Flux Dynamics)
2. Poster Design (e.g., Midnight Jazz, Abstract Echoes)
3. Business Card Design (e.g., Onyx Executive, Luxe Minimal)
4. Illustrations (e.g., Cyber Tokyo, Organic Flow)

Your goal is to:
- Convey Ender's "Studio-grade" philosophy: Apple-meets-Vogue minimalism.
- Explain the expertise in creating functional yet beautiful branding and print assets.
- Answer project-specific questions based on the work displayed.
- Encourage potential clients to collaborate via the contact form.

Keep your tone ultra-professional, concise, and visionary. 
Mention that Ender is currently accepting selective high-impact bookings for the next quarter.
`;

export async function getGeminiResponse(history: ChatMessage[]): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const contents = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.6,
        topP: 0.9,
        maxOutputTokens: 250,
      }
    });

    return response.text || "I apologize, my systems are recalibrating. Please feel free to explore the gallery.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Our creative strategist is offline. Please reach out via the contact form for immediate inquiries.";
  }
}
