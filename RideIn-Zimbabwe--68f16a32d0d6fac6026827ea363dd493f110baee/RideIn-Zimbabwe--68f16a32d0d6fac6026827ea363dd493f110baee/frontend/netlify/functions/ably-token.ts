
import Ably from "ably";

export const handler = async (event: any) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: "Ably Key Missing" };

  let clientId = "anonymous";
  try {
    if (event.queryStringParameters?.clientId) {
      clientId = event.queryStringParameters.clientId;
    } else if (event.body) {
      const body = JSON.parse(event.body);
      if (body.clientId) clientId = body.clientId;
    }
  } catch (e) {}

  try {
    const client = new Ably.Rest(apiKey);
    const tokenRequestData = await client.auth.createTokenRequest({ clientId });

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(tokenRequestData)
    };
  } catch (error: any) {
    return { statusCode: 500, headers, body: "Token Error" };
  }
};
