
import { useEffect, useRef, useState } from 'react';
import React from 'react';
import mapboxgl from 'mapbox-gl';

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type?: 'driver' | 'default' | 'pickup' | 'dropoff' | 'request';
  rotation?: number;
  data?: any;
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  routeGeometry?: any;
  interactive?: boolean;
  isPickingLocation?: boolean;
  onLocationPick?: (lat: number, lng: number) => void;
  onMarkerClick?: (marker: MapMarker) => void;
}

const MapView: React.FC<MapViewProps> = ({ 
  center = [31.0335, -17.8252], 
  zoom = 13, 
  markers = [], 
  routeGeometry,
  interactive = true,
  isPickingLocation = false,
  onLocationPick,
  onMarkerClick
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const staticMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getMapboxToken = () => {
    return process.env.MAPBOX_TOKEN || '';
  };

  const createCustomMarker = (type: string, rotation: number = 0) => {
    const el = document.createElement('div');
    el.className = 'custom-marker';
    
    if (type === 'pickup' || type === 'dropoff') {
      const color = type === 'pickup' ? '#002B5B' : '#FF5F00';
      el.innerHTML = `
        <div style="position: relative; width: 24px; height: 24px;">
          <div class="pulse-ring" style="background: ${color};"></div>
          <div style="position: relative; width: 100%; height: 100%; background: ${color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 10;">
            <i class="fa-solid fa-${type === 'pickup' ? 'circle' : 'location-dot'}" style="color: white; font-size: 10px;"></i>
          </div>
        </div>
      `;
    } else if (type === 'driver') {
      el.innerHTML = `
        <div style="transform: rotate(${rotation}deg); transition: transform 0.5s cubic-bezier(0.2, 0, 0.2, 1); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));">
          <svg width="40" height="40" viewBox="0 0 100 100">
            <path d="M20 70 L20 40 Q20 30 35 25 L65 25 Q80 30 80 40 L80 70 Z" fill="#FF5F00" stroke="white" stroke-width="4"/>
            <rect x="30" y="35" width="40" height="20" rx="5" fill="#002B5B" />
            <circle cx="30" cy="75" r="8" fill="#111"/>
            <circle cx="70" cy="75" r="8" fill="#111"/>
          </svg>
        </div>
      `;
    } else {
      el.innerHTML = `<div style="width: 12px; height: 12px; background: #002B5B; border-radius: 50%; border: 2px solid white;"></div>`;
    }
    return el;
  };

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const token = getMapboxToken();
    if (!token) {
      setError("Grid Intelligence Key Missing (Mapbox Token)");
      return;
    }

    mapboxgl.accessToken = token;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: center,
        zoom: zoom,
        pitch: 45,
        antialias: true,
        interactive: interactive
      });

      map.current.on('load', () => {
        setIsLoaded(true);
        if (map.current) {
          map.current.addSource('route', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
          });
          map.current.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#FF5F00', 'line-width': 4, 'line-opacity': 0.8 }
          });
        }
      });

      map.current.on('error', (e: any) => {
        // Cast to any to handle status check for 401 Unauthorized errors
        if (e.error && (e.error as any).status === 401) {
          setError("Protocol Unauthorized: Invalid Mapbox Token");
        }
      });

      if (isPickingLocation && onLocationPick) {
        map.current.on('click', (e) => {
          onLocationPick(e.lngLat.lat, e.lngLat.lng);
        });
      }
    } catch (err) {
      setError("Core Mapping Engine Failure");
    }

    return () => {
      staticMarkersRef.current.forEach(m => m.remove());
      staticMarkersRef.current.clear();
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (isLoaded && map.current && center) {
      map.current.easeTo({ center: center, duration: 1500, zoom: Math.max(map.current.getZoom(), 14) });
    }
  }, [center, isLoaded]);

  useEffect(() => {
    if (!isLoaded || !map.current || !routeGeometry) return;
    const source = map.current.getSource('route') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({ type: 'Feature', properties: {}, geometry: routeGeometry });
      const bounds = new mapboxgl.LngLatBounds();
      routeGeometry.coordinates.forEach((coord: [number, number]) => bounds.extend(coord));
      map.current.fitBounds(bounds, { padding: 80, duration: 1200 });
    }
  }, [routeGeometry, isLoaded]);

  useEffect(() => {
    if (!isLoaded || !map.current) return;
    const currentMarkerIds = new Set(markers.map(m => m.id));
    
    staticMarkersRef.current.forEach((marker, id) => {
      if (!currentMarkerIds.has(id)) {
        marker.remove();
        staticMarkersRef.current.delete(id);
      }
    });

    markers.forEach(m => {
      const existing = staticMarkersRef.current.get(m.id);
      if (existing) {
        existing.setLngLat([m.lng, m.lat]);
        if (m.type === 'driver') {
          const el = existing.getElement();
          const div = el.querySelector('div');
          if (div) div.style.transform = `rotate(${m.rotation || 0}deg)`;
        }
      } else {
        const el = createCustomMarker(m.type || 'default', m.rotation);
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([m.lng, m.lat])
          .addTo(map.current!);
        if (onMarkerClick) el.addEventListener('click', () => onMarkerClick(m));
        staticMarkersRef.current.set(m.id, marker);
      }
    });
  }, [markers, isLoaded]);

  if (error) {
    return (
      <div className="w-full h-full bg-[#001D3D] flex flex-col items-center justify-center p-12 text-center text-white font-mono">
        <i className="fa-solid fa-triangle-exclamation text-4xl text-brand-orange mb-6"></i>
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Retry Link</button>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-full grayscale-[0.5] contrast-[1.1]" />;
};

export default React.memo(MapView);
