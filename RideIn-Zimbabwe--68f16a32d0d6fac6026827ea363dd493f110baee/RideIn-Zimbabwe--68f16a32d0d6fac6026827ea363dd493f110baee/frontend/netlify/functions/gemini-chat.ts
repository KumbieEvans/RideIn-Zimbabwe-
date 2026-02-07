import { GoogleGenAI, Type } from "@google/genai";

export const handler = async (event: any) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (!process.env.API_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: "API key missing" }) };

  try {
    const body = JSON.parse(event.body || "{}");
    const { mode, prompt, location, context } = body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // 1. AI DISPATCHER
    if (mode === "dispatch") {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `User Request: "${prompt}". Current User Location: ${location?.lat || 'unknown'}, ${location?.lng || 'unknown'}. 
        Translate this into a ride request. If the user implies starting from their current position, set pickup to "Current Location".`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              pickup: { type: Type.STRING, description: "Name of the pickup point" },
              dropoff: { type: Type.STRING, description: "Name of the destination" },
              category: { type: Type.STRING, enum: ["Standard", "Premium", "Luxury"], description: "Vehicle class" },
              type: { type: Type.STRING, enum: ["ride", "freight"], description: "Type of transport" }
            },
            required: ["pickup", "dropoff"]
          },
          systemInstruction: "You are the RideIn Zimbabwe Dispatcher. Be precise with Zimbabwean locations. Always return JSON."
        }
      });
      return { statusCode: 200, headers, body: response.text || "{}" };
    }

    // 2. FARE GUARD
    if (context === "fare-guard") {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: "You are the Fare Guard. Use Google Search to check current fuel prices and traffic in Zimbabwe. Explain the price fairly and transparently to the rider."
        }
      });
      return { statusCode: 200, headers, body: JSON.stringify({ text: response.text || "" }) };
    }

    // 3. SCOUT
    if (mode === "scout") {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt || "Find taxi ranks or landmarks nearby",
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
          systemInstruction: "You are RideIn Scout. Help users navigate Zimbabwe. Use Maps grounding to show exactly where things are. Provide URLs from the grounding chunks."
        }
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          text: response.text || "",
          grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
        })
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt || "How can I help you?",
    });
    return { statusCode: 200, headers, body: JSON.stringify({ text: response.text || "" }) };

  } catch (error: any) {
    console.error("Gemini Production Function Error:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "AI Intelligence Node currently offline." }) };
  }
};