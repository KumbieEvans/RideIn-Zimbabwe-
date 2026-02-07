import mapboxgl from 'mapbox-gl';

const getMapboxToken = () => {
  return process.env.MAPBOX_TOKEN || '';
};

const BASE_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const BASE_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving';

export interface GeoResult {
  address: string;
  lat: number;
  lng: number;
}

const geocodeCache = new Map<string, GeoResult[]>();

export const mapboxService = {
  async searchAddress(query: string): Promise<GeoResult[]> {
    const token = getMapboxToken();
    if (!query || query.length < 3) {
      return [];
    }
    
    if (!token) {
      console.error('[Mapbox] No API token configured');
      throw new Error('Map service unavailable');
    }
    
    const cacheKey = query.toLowerCase().trim();
    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey)!;
    }

    try {
      const url = `${BASE_GEOCODING_URL}/${encodeURIComponent(query)}.json?access_token=${token}&country=zw&bbox=25.0,-22.5,33.5,-15.5&limit=3`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000), // 10s timeout
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Map service authentication failed');
        } else if (res.status === 429) {
          throw new Error('Too many requests. Please wait a moment.');
        }
        throw new Error(`Geocoding failed (${res.status})`);
      }
      
      const data = await res.json();

      const results = data.features.map((f: any) => ({
        address: f.place_name,
        lng: f.center[0],
        lat: f.center[1]
      }));

      geocodeCache.set(cacheKey, results);
      return results;
    } catch (e) {
      console.error("[Mapbox Geocoding] Error:", e);
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('Address search timed out');
      }
      throw e;
    }
  },

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    const token = getMapboxToken();
    if (!token) {
      console.warn('[Mapbox] No API token for reverse geocoding');
      return "Pinned Location";
    }
    
    try {
      const url = `${BASE_GEOCODING_URL}/${lng},${lat}.json?access_token=${token}&limit=1`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000), // 10s timeout
      });
      
      if (!res.ok) {
        console.error(`Reverse geocoding failed: ${res.status}`);
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
      
      const data = await res.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (e) {
      console.error("[Mapbox Reverse Geocoding] Error:", e);
      return "Pinned Location";
    }
  },

  async getRoute(start: { lat: number, lng: number }, end: { lat: number, lng: number }) {
    const token = getMapboxToken();
    if (!token) {
      console.error('[Mapbox] No API token for routing');
      throw new Error('Map service unavailable');
    }

    try {
      const startCoord = `${start.lng},${start.lat}`;
      const endCoord = `${end.lng},${end.lat}`;
      const url = `${BASE_DIRECTIONS_URL}/${startCoord};${endCoord}?geometries=geojson&access_token=${token}`;

      const res = await fetch(url, {
        signal: AbortSignal.timeout(15000), // 15s timeout for routing
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Map service authentication failed');
        } else if (res.status === 422) {
          throw new Error('Invalid route coordinates');
        }
        throw new Error('Unable to calculate route');
      }
      
      const data = await res.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No route found between locations');
      }

      const route = data.routes[0];
      return {
        geometry: route.geometry,
        duration: Math.round(route.duration / 60),
        distance: (route.distance / 1000).toFixed(1)
      };
    } catch (e) {
      console.error("[Mapbox Routing] Error:", e);
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('Route calculation timed out');
      }
      throw e;
    }
  }
};