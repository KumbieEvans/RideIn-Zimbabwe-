import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { User, Trip, TripStatus, VehicleType } from '../types';
import { Button, Card, Input } from './Shared';
import { xanoService } from '../services/xano';
import { mapboxService, GeoResult } from '../services/mapbox';
import { geminiService } from '../services/gemini';
import { ActiveTripView } from './ActiveTripView';
import { SideDrawer } from './SideDrawer';
import { ScoutView } from './ScoutView';
import { PASSENGER_CATEGORIES, FREIGHT_CATEGORIES } from '../constants';

const MapView = React.lazy(() => import('./MapView'));

export const RiderHomeView: React.FC<{ user: User; onLogout: () => void; onUserUpdate: (user: User) => void }> = ({ user, onLogout, onUserUpdate }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ride' | 'freight'>('ride');
  const [viewState, setViewState] = useState<'idle' | 'review' | 'bidding' | 'active'>('idle');
  const [showScout, setShowScout] = useState(false);
  
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{lat: number, lng: number} | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{lat: number, lng: number} | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([31.0335, -17.8252]);
  const [routeGeometry, setRouteGeometry] = useState<any>(null);
  
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [proposedFare, setProposedFare] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>(PASSENGER_CATEGORIES[0].name);
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff' | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setMapCenter([pos.coords.longitude, pos.coords.latitude]);
        setPickupCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        mapboxService.reverseGeocode(pos.coords.latitude, pos.coords.longitude).then(setPickup);
      });
    }
  }, []);

  useEffect(() => {
    const unsub = xanoService.subscribeToActiveTrip((trip) => {
      if (trip && trip.status !== TripStatus.COMPLETED && trip.status !== TripStatus.CANCELLED) {
        setActiveTrip(trip);
        setViewState('active');
      } else if (viewState === 'active') {
        setActiveTrip(null);
        setViewState('idle');
      }
    });
    return unsub;
  }, [viewState]);

  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      mapboxService.getRoute(pickupCoords, dropoffCoords).then(route => {
        if (route) {
          setRouteGeometry(route.geometry);
          setProposedFare(Math.max(2, parseFloat(route.distance) * 0.8));
          setViewState('review');
        }
      });
    }
  }, [pickupCoords, dropoffCoords]);

  const handleAddressSearch = async (query: string, field: 'pickup' | 'dropoff') => {
    if (field === 'pickup') setPickup(query); else setDropoff(query);
    setActiveField(field);
    if (query.length > 2) {
      const results = await mapboxService.searchAddress(query);
      setSuggestions(results);
    }
  };

  const handleSelectSuggestion = (res: GeoResult) => {
    if (activeField === 'pickup') { setPickup(res.address); setPickupCoords({ lat: res.lat, lng: res.lng }); }
    else { setDropoff(res.address); setDropoffCoords({ lat: res.lat, lng: res.lng }); }
    setSuggestions([]); setActiveField(null);
  };

  const handleMagicAssist = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiParsing(true);
    const result = await geminiService.parseDispatchPrompt(aiPrompt, pickupCoords || undefined);
    if (result) {
      if (result.pickup) { setPickup(result.pickup); const p = await mapboxService.searchAddress(result.pickup); if (p[0]) setPickupCoords({ lat: p[0].lat, lng: p[0].lng }); }
      if (result.dropoff) { setDropoff(result.dropoff); const d = await mapboxService.searchAddress(result.dropoff); if (d[0]) setDropoffCoords({ lat: d[0].lat, lng: d[0].lng }); }
      if (result.category) setSelectedCategory(result.category);
      setAiPrompt('');
    }
    setIsAiParsing(false);
  };

  const handleRequestTrip = async () => {
    if (!pickupCoords || !dropoffCoords) return;
    const trip = await xanoService.requestTrip({
      riderId: user.id, type: activeTab === 'ride' ? VehicleType.PASSENGER : VehicleType.FREIGHT, category: selectedCategory,
      pickup: { address: pickup, lat: pickupCoords.lat, lng: pickupCoords.lng },
      dropoff: { address: dropoff, lat: dropoffCoords.lat, lng: dropoffCoords.lng },
      proposed_price: proposedFare, distance_km: 0, duration: 0,
    });
    setActiveTrip(trip); setViewState('bidding');
  };

  if (viewState === 'active' && activeTrip) return <ActiveTripView trip={activeTrip} role="rider" onClose={() => setViewState('idle')} />;

  return (
    <div className="h-screen flex flex-col bg-white relative overflow-hidden font-sans">
      <SideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} user={user} onLogout={onLogout} activeView="map" onNavigate={v => v === 'scout' ? setShowScout(true) : null} onUserUpdate={onUserUpdate} />
      {showScout && <ScoutView onClose={() => setShowScout(false)} />}

      <div className="absolute top-0 inset-x-0 z-30 p-8 pt-16 safe-top bg-gradient-to-b from-white/90 to-transparent pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <button onClick={() => setIsDrawerOpen(true)} className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black border border-zinc-100 shadow-sm haptic-press"><i className="fa-solid fa-bars text-xl"></i></button>
          <div className="flex bg-zinc-100 rounded-full p-1 border border-zinc-200">
            <button onClick={() => setActiveTab('ride')} className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'ride' ? 'bg-white text-black shadow-sm' : 'text-zinc-400'}`}>Passenger</button>
            <button onClick={() => setActiveTab('freight')} className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'freight' ? 'bg-white text-black shadow-sm' : 'text-zinc-400'}`}>Freight</button>
          </div>
          <div className="w-12"></div>
        </div>
      </div>

      <div className="flex-1 relative">
        <Suspense fallback={<div className="w-full h-full bg-zinc-50" />}>
          <MapView center={mapCenter} markers={pickupCoords ? [{id:'p', ...pickupCoords, type:'pickup'}] : []} routeGeometry={routeGeometry} zoom={14} />
        </Suspense>

        {viewState === 'idle' && (
          <div className="absolute bottom-12 inset-x-8 z-30">
            <Card className="!p-6 bg-white border border-zinc-100 shadow-xl rounded-3xl">
              <div className="relative mb-4">
                <Input variant="light" placeholder="Describe your trip..." icon="wand-magic-sparkles" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleMagicAssist()} />
                {aiPrompt && <button onClick={handleMagicAssist} disabled={isAiParsing} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-brand-orange text-white rounded-lg">{isAiParsing ? '...' : 'Go'}</button>}
              </div>
              <div className="space-y-3">
                <Input variant="light" placeholder="Pickup location" icon="location-dot" value={pickup} onChange={e => handleAddressSearch(e.target.value, 'pickup')} onFocus={() => setActiveField('pickup')} />
                <Input variant="light" placeholder="Where to?" icon="flag-checkered" value={dropoff} onChange={e => handleAddressSearch(e.target.value, 'dropoff')} onFocus={() => setActiveField('dropoff')} />
                {activeField && suggestions.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-2xl z-50">
                    {suggestions.map((s, i) => <button key={i} onClick={() => handleSelectSuggestion(s)} className="w-full px-6 py-4 text-left hover:bg-zinc-50 border-b border-zinc-100 last:border-0 text-sm font-bold truncate">{s.address}</button>)}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {viewState === 'review' && (
          <div className="absolute bottom-12 inset-x-8 z-30 animate-slide-up">
            <Card className="bg-white rounded-3xl p-8 border border-zinc-100 shadow-2xl">
              <div className="flex justify-between items-start mb-8">
                <div><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Estimated Fare</p><div className="text-4xl font-black text-black tracking-tighter">${proposedFare.toFixed(2)}</div></div>
              </div>
              <div className="flex gap-4 mb-8">
                {(activeTab === 'ride' ? PASSENGER_CATEGORIES : FREIGHT_CATEGORIES).map(cat => (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${selectedCategory === cat.name ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-zinc-100 text-zinc-300'}`}><i className={`fa-solid fa-${cat.icon} text-xl`}></i><span className="text-[8px] font-bold uppercase">{cat.name}</span></button>
                ))}
              </div>
              <Button variant="dark" className="w-full py-5 rounded-2xl shadow-lg" onClick={handleRequestTrip}>Request Ride</Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};