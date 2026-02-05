
import fetch from "node-fetch";

/**
 * PRODUCTION XANO PROXY WITH ADVANCED FIREWALL
 * Routes requests to specific API groups based on path prefixes.
 * Aggressively scrubs 'email' AND 'reference-email' from Body, Query, AND Headers.
 */
export const handler = async (event: any) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // Environment Variables
  const XANO_AUTH_BASE_URL = process.env.XANO_AUTH_BASE_URL;
  const XANO_TRIPS_BASE_URL = process.env.XANO_TRIPS_BASE_URL;
  const XANO_RIDER_BASE_URL = process.env.XANO_RIDER_BASE_URL;
  const XANO_DRIVER_BASE_URL = process.env.XANO_DRIVER_BASE_URL;

  const path = event.path.replace("/.netlify/functions/xano", "");
  let baseUrl = XANO_RIDER_BASE_URL; 
  if (path.startsWith("/auth") || path.startsWith("/switch-role")) {
    baseUrl = XANO_AUTH_BASE_URL;
  } else if (path.startsWith("/trips")) {
    baseUrl = XANO_TRIPS_BASE_URL;
  } else if (path.startsWith("/location")) {
    baseUrl = XANO_DRIVER_BASE_URL;
  }
  
  // 1. SCRUB HEADERS
  const forwardedHeaders: any = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  if (event.headers.authorization) {
    forwardedHeaders["Authorization"] = event.headers.authorization;
  }

  // 2. SCRUB QUERY PARAMETERS
  const queryParams = event.queryStringParameters || {};
  const cleanQueryParams = new URLSearchParams();
  const forbiddenKeys = ['email', 'mail', 'user_email', 'reference-email', 'reference_email'];

  for (const [key, value] of Object.entries(queryParams)) {
    const k = key.toLowerCase();
    if (forbiddenKeys.some(forbidden => k === forbidden || k.includes('reference-email'))) {
       console.debug(`[Proxy Firewall] Scrubbing Query: ${key}`);
       continue;
    }
    cleanQueryParams.append(key, value as string);
  }
  const queryString = cleanQueryParams.toString();
  const url = `${baseUrl}${path}${queryString ? '?' + queryString : ''}`;

  // 3. SCRUB JSON BODY
  let scrubbedBody = event.body;
  if (event.httpMethod !== "GET" && event.body) {
    try {
      const parsed = JSON.parse(event.body);
      
      const scrubRecursive = (obj: any): any => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(scrubRecursive);
        const clean: any = {};
        for (const key in obj) {
          const k = key.toLowerCase();
          if (forbiddenKeys.some(forbidden => k === forbidden || k.includes('reference-email'))) {
            console.debug(`[Proxy Firewall] Scrubbing Body Key: ${key}`);
            continue;
          }
          clean[key] = scrubRecursive(obj[key]);
        }
        return clean;
      };

      scrubbedBody = JSON.stringify(scrubRecursive(parsed));
    } catch (e) {
      console.warn("[Proxy Firewall] Non-JSON payload detected.");
    }
  }

  try {
    const response = await fetch(url, {
      method: event.httpMethod,
      headers: forwardedHeaders,
      body: event.httpMethod !== "GET" ? scrubbedBody : undefined
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { message: "Raw server response", content: responseText };
    }

    return {
      statusCode: response.status,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(responseData)
    };
  } catch (error: any) {
    console.error(`[Xano Proxy Fail] Routing ${path}:`, error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Backend Intelligence Link Unstable." })
    };
  }
};
