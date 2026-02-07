/**
 * GEMINI SERVICE - Production Release
 * Simplified assistant for Zimbabwean travel and transport needs.
 * All API calls are proxied through Netlify functions to keep keys secure.
 */
export class GeminiService {
  private async callNetlifyFunction(payload: any): Promise<any> {
    try {
      const response = await fetch('/.netlify/functions/gemini-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }

  async getMarketIntel(city: string): Promise<string> {
    try {
      const response = await this.callNetlifyFunction({
        mode: 'market-intel',
        prompt: `What is the current travel or traffic situation in ${city}, Zimbabwe?`
      });
      return response.text || "Travel conditions are currently normal.";
    } catch (error) {
      return "Safe travels on your next trip.";
    }
  }

  async parseDispatchPrompt(prompt: string, location?: { lat: number, lng: number }): Promise<any> {
    try {
      const response = await this.callNetlifyFunction({
        mode: 'dispatch',
        prompt,
        location
      });
      return response; // Already parsed by response.json()
    } catch (error) {
      return null;
    }
  }

  async explainFare(details: { pickup: string, dropoff: string, price: string }): Promise<string> {
    try {
      const response = await this.callNetlifyFunction({
        context: 'fare-guard',
        prompt: `Explain why the fare is $${details.price} for a trip from ${details.pickup} to ${details.dropoff} in Zimbabwe.`
      });
      return response.text || "The fare is based on current distance and local market rates.";
    } catch (error) {
      return "This is the standard rate for this distance.";
    }
  }

  async scout(query: string, location?: { lat: number, lng: number }): Promise<{ text: string, grounding: any[] }> {
    try {
      const response = await this.callNetlifyFunction({
        mode: 'scout',
        prompt: query,
        location
      });
      return {
        text: response.text || "Looking for locations...",
        grounding: response.grounding || []
      };
    } catch (error) {
      return { text: "Location services are currently busy.", grounding: [] };
    }
  }
}

export const geminiService = new GeminiService();