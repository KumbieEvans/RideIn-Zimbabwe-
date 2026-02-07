import { useEffect, useRef, useState } from 'react';
import React from 'react';
import mapboxgl from 'mapbox-gl';

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type?: 'driver' | 'default' | 'pickup' | 'dropoff' | 'request';
  rotation?: number;
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  routeGeometry?: any;
}

const MapView: React.FC<MapViewProps> = ({ 
  center = [31.0335, -17.8252], zoom = 13, markers = [], routeGeometry 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;
    mapboxgl.accessToken = process.env.MAPBOX_TOKEN || '';
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center, zoom, pitch: 45, antialias: true
    });

    map.current.on('load', () => {
      setIsLoaded(true);
      if (map.current) {
        map.current.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } } });
        map.current.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#002B5B', 'line-width': 4, 'line-opacity': 0.8 } });
      }
    });

    return () => { map.current?.remove(); };
  }, []);

  useEffect(() => {
    if (!isLoaded || !map.current || !routeGeometry) return;
    const source = map.current.getSource('route') as mapboxgl.GeoJSONSource;
    if (source) source.setData({ type: 'Feature', properties: {}, geometry: routeGeometry });
  }, [routeGeometry, isLoaded]);

  return <div ref={mapContainer} className="w-full h-full" />;
};

export default React.memo(MapView);