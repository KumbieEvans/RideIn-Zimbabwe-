import { GoogleGenAI, Type } from "@google/genai";

/**
 * GEMINI SERVICE - Production Release
 * Simplified assistant for Zimbabwean travel and transport needs.
 */
export class GeminiService {
  private ai() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private readonly SYSTEM_PROMPT = "You are the RideIn Assistant for people in Zimbabwe. You help with trip requests, fare estimates, and local navigation in simple, friendly, and professional English. Avoid technical or robotic language. Only provide information related to transport and travel within Zimbabwe.";

  async getMarketIntel(city: string): Promise<string> {
    const ai = this.ai();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `What is the current travel or traffic situation in ${city}, Zimbabwe?`,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: `${this.SYSTEM_PROMPT} Provide a single, helpful travel tip for this area.`
        }
      });
      return response.text?.trim() || "Travel conditions are currently normal.";
    } catch (error) {
      return "Safe travels on your next trip.";
    }
  }

  async parseDispatchPrompt(prompt: string, location?: { lat: number, lng: number }): Promise<any> {
    const ai = this.ai();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `User says: "${prompt}". User is located at: ${location?.lat || 'unknown'}, ${location?.lng || 'unknown'}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              pickup: { type: Type.STRING, description: "The starting point name" },
              dropoff: { type: Type.STRING, description: "The destination name" },
              category: { type: Type.STRING, enum: ["Standard", "Premium", "Luxury"], description: "The vehicle class" },
              type: { type: Type.STRING, enum: ["ride", "freight"], description: "Type of service" }
            },
            required: ["pickup", "dropoff", "category", "type"]
          },
          systemInstruction: `${this.SYSTEM_PROMPT} Extract the pickup and destination from the user's request. Return JSON only.`
        }
      });

      return JSON.parse(response.text || "{}");
    } catch (error) {
      return null;
    }
  }

  async explainFare(details: { pickup: string, dropoff: string, price: string }): Promise<string> {
    const ai = this.ai();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Explain why the fare is $${details.price} for a trip from ${details.pickup} to ${details.dropoff} in Zimbabwe.`,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: `${this.SYSTEM_PROMPT} Briefly justify the price based on distance and local fuel costs in simple terms.`
        }
      });
      return response.text?.trim() || "The fare is based on current distance and local market rates.";
    } catch (error) {
      return "This is the standard rate for this distance.";
    }
  }

  async scout(query: string, location?: { lat: number, lng: number }): Promise<{ text: string, grounding: any[] }> {
    const ai = this.ai();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: query,
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
          systemInstruction: `${this.SYSTEM_PROMPT} Help the user find locations or services nearby using Google Maps.`
        }
      });

      return {
        text: response.text || "Looking for locations...",
        grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      };
    } catch (error) {
      return { text: "Location services are currently busy.", grounding: [] };
    }
  }
}

export const geminiService = new GeminiService();