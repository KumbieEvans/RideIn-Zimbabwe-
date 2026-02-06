import { GoogleGenAI, Type } from "@google/genai";

/**
 * GEMINI SERVICE - Production Grid Edition
 * Strict logic lock for Zimbabwean transport and logistics operations.
 */
export class GeminiService {
  private ai() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private readonly PRODUCTION_PROMPT = "You are the Production Grid Controller for a professional transport network in Zimbabwe. Your purpose is strictly limited to logistics, fare estimation, market intelligence, and navigation support. Do not engage in creative writing, humor, personal opinions, or casual conversation. Maintain a professional, high-authority tone. Only provide information relevant to travel and logistics within Zimbabwe.";

  async getMarketIntel(city: string): Promise<string> {
    const ai = this.ai();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `STATUS_UPDATE_REQUEST: Sector ${city}, Zimbabwe. Analyze traffic patterns and operational demand.`,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: `${this.PRODUCTION_PROMPT} Provide a single, high-impact tactical update. Use present tense. No conversational filler.`
        }
      });
      return response.text?.trim() || "Grid conditions stable. Sector clear.";
    } catch (error) {
      return "Grid link established. Awaiting market signal.";
    }
  }

  async parseDispatchPrompt(prompt: string, location?: { lat: number, lng: number }): Promise<any> {
    const ai = this.ai();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `MISSION_REQUEST_NATURAL_LANGUAGE: "${prompt}"\nUSER_COORDINATES: ${location?.lat || -17.82}, ${location?.lng || 31.03}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              pickup: { type: Type.STRING, description: "Name of the pickup point" },
              dropoff: { type: Type.STRING, description: "Name of the destination" },
              category: { type: Type.STRING, enum: ["Standard", "Premium", "Luxury"], description: "Vehicle category" },
              type: { type: Type.STRING, enum: ["ride", "freight"], description: "Type of mission" }
            },
            required: ["pickup", "dropoff", "category", "type"]
          },
          systemInstruction: `${this.PRODUCTION_PROMPT} Extract mission parameters from natural language inputs. Identify Zimbabwean locations and landmarks with precision. Return ONLY JSON data.`
        }
      });

      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("[AI Dispatch] Parse failure", error);
      return null;
    }
  }

  async explainFare(details: { pickup: string, dropoff: string, price: string }): Promise<string> {
    const ai = this.ai();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `EXPLAIN_FARE: $${details.price} | ORIGIN: ${details.pickup} | TARGET: ${details.dropoff}. Location: Zimbabwe.`,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: `${this.PRODUCTION_PROMPT} You are the Fare Guard. Justify the calculated price using current Zimbabwean market conditions, fuel costs, and route complexity. Be authoritative and concise.`
        }
      });
      return response.text?.trim() || "Calculated fare aligns with current sector logistics.";
    } catch (error) {
      return "Fare parameters calibrated to current regional standard.";
    }
  }

  async scout(query: string, location?: { lat: number, lng: number }): Promise<{ text: string, grounding: any[] }> {
    const ai = this.ai();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `SCOUT_QUERY: "${query}"`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: location?.lat || -17.8252,
                longitude: location?.lng || 31.0335
              }
            }
          },
          systemInstruction: `${this.PRODUCTION_PROMPT} Utilize Google Maps to identify critical transport infrastructure, landmarks, and facilities nearby. Include precise map URIs in your response.`
        }
      });

      return {
        text: response.text || "Scanning sector coordinates...",
        grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      };
    } catch (error) {
      return { text: "Scout intelligence uplink offline.", grounding: [] };
    }
  }
}

export const geminiService = new GeminiService();