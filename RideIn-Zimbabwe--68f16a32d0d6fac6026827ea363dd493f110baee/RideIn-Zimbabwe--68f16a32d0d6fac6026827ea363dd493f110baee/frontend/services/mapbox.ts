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
    if (!query || query.length < 3 || !token) {
      return [];
    }
    
    const cacheKey = query.toLowerCase().trim();
    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey)!;
    }

    try {
      const url = `${BASE_GEOCODING_URL}/${encodeURIComponent(query)}.json?access_token=${token}&country=zw&bbox=25.0,-22.5,33.5,-15.5&limit=3`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
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
      return [];
    }
  },

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    const token = getMapboxToken();
    if (!token) return "Pinned Location";
    try {
      const url = `${BASE_GEOCODING_URL}/${lng},${lat}.json?access_token=${token}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (e) {
      return "Pinned Location";
    }
  },

  async getRoute(start: { lat: number, lng: number }, end: { lat: number, lng: number }) {
    const token = getMapboxToken();
    if (!token) return null;

    try {
      const startCoord = `${start.lng},${start.lat}`;
      const endCoord = `${end.lng},${end.lat}`;
      const url = `${BASE_DIRECTIONS_URL}/${startCoord};${endCoord}?geometries=geojson&access_token=${token}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Routing failed`);
      const data = await res.json();

      if (!data.routes || data.routes.length === 0) return null;

      const route = data.routes[0];
      return {
        geometry: route.geometry,
        duration: Math.round(route.duration / 60),
        distance: (route.distance / 1000).toFixed(1)
      };
    } catch (e) {
      console.error("[Mapbox Routing] Error:", e);
      return null;
    }
  }
};