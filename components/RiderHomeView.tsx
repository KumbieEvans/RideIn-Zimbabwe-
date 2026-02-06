import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { User, Trip, TripStatus, VehicleType, Bid } from '../types';
import { Button, Card, Input } from './Shared';
import { xanoService } from '../services/xano';
import { ablyService } from '../services/ably';
import { mapboxService, GeoResult } from '../services/mapbox';
import { geminiService } from '../services/gemini';
import { ActiveTripView } from './ActiveTripView';
import { SideDrawer } from './SideDrawer';
import { ScoutView } from './ScoutView';
import { PASSENGER_CATEGORIES, FREIGHT_CATEGORIES } from '../constants';

const MapView = React.lazy(() => import('./MapView'));

const calculateSuggestedFare = (distanceKm: number) => Math.max(2, distanceKm <= 3 ? 2 : distanceKm <= 5 ? 3 : 3 + (distanceKm - 5) * 0.5);

export const RiderHomeView: React.FC<{ user: User; onLogout: () => void; onUserUpdate: (user: User) => void }> = ({ user, onLogout, onUserUpdate }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeView, setActiveView] = useState('map');
  const [activeTab, setActiveTab] = useState<'ride' | 'freight'>('ride');
  const [viewState, setViewState] = useState<'idle' | 'review' | 'bidding' | 'active'>('idle');
  const [showScout, setShowScout] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{lat: number, lng: number} | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{lat: number, lng: number} | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([31.0335, -17.8252]);
  const [routeGeometry, setRouteGeometry] = useState<any>(null);
  const [routeDetails, setRouteDetails] = useState<{distance: string, duration: string} | null>(null);
  
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [nearbyDrivers, setNearbyDrivers] = useState<Map<string, any>>(new Map());
  const [proposedFare, setProposedFare] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>(PASSENGER_CATEGORIES[0].name);
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [fareExplanation, setFareExplanation] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff' | null>(null);
  const searchTimeout = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapCenter([pos.coords.longitude, pos.coords.latitude]);
          setPickupCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          mapboxService.reverseGeocode(pos.coords.latitude, pos.coords.longitude).then(setPickup);
        },
        null,
        { enableHighAccuracy: true }
      );
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
    const cleanup = ablyService.subscribeToNearbyDrivers(user.city || 'Harare', mapCenter[1], mapCenter[0], (driver) => {
      setNearbyDrivers(prev => {
        const next = new Map(prev);
        next.set(driver.driverId, driver);
        return next;
      });
    });
    return cleanup;
  }, [mapCenter, user.city]);

  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      mapboxService.getRoute(pickupCoords, dropoffCoords).then(route => {
        if (route) {
          setRouteGeometry(route.geometry);
          setRouteDetails({ distance: `${route.distance}km`, duration: `${route.duration}m` });
          setProposedFare(calculateSuggestedFare(parseFloat(route.distance)));
          setViewState('review');
        }
      });
    }
  }, [pickupCoords, dropoffCoords]);

  const handleAddressSearch = (query: string, field: 'pickup' | 'dropoff') => {
    if (field === 'pickup') setPickup(query); else setDropoff(query);
    setActiveField(field);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 3) { setSuggestions([]); return; }
    searchTimeout.current = setTimeout(async () => {
      const results = await mapboxService.searchAddress(query);
      setSuggestions(results);
    }, 400);
  };

  const handleSelectSuggestion = (res: GeoResult) => {
    if (activeField === 'pickup') { setPickup(res.address); setPickupCoords({ lat: res.lat, lng: res.lng }); setMapCenter([res.lng, res.lat]); }
    else { setDropoff(res.address); setDropoffCoords({ lat: res.lat, lng: res.lng }); }
    setSuggestions([]); setActiveField(null);
  };

  const handleMagicDispatch = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiParsing(true);
    try {
      const result = await geminiService.parseDispatchPrompt(aiPrompt, pickupCoords || undefined);
      if (result) {
        if (result.pickup) { setPickup(result.pickup); const p = await mapboxService.searchAddress(result.pickup); if (p[0]) setPickupCoords({ lat: p[0].lat, lng: p[0].lng }); }
        if (result.dropoff) { setDropoff(result.dropoff); const d = await mapboxService.searchAddress(result.dropoff); if (d[0]) setDropoffCoords({ lat: d[0].lat, lng: d[0].lng }); }
        if (result.category) setSelectedCategory(result.category);
        setAiPrompt('');
      }
    } catch (e) { console.error(e); } finally { setIsAiParsing(false); }
  };

  const handleRequestTrip = async () => {
    if (!pickupCoords || !dropoffCoords) return;
    setLoading(true);
    try {
      const trip = await xanoService.requestTrip({
        riderId: user.id, type: activeTab === 'ride' ? VehicleType.PASSENGER : VehicleType.FREIGHT, category: selectedCategory,
        pickup: { address: pickup, lat: pickupCoords.lat, lng: pickupCoords.lng },
        dropoff: { address: dropoff, lat: dropoffCoords.lat, lng: dropoffCoords.lng },
        proposed_price: proposedFare, distance_km: parseFloat(routeDetails?.distance || "0"), duration: parseInt(routeDetails?.duration || "0"),
      });
      setActiveTrip(trip); setViewState('bidding');
    } catch (e) { alert("Operational Failure: Deployment denied."); } finally { setLoading(false); }
  };

  const handleAcceptBid = async (bid: Bid) => {
    setLoading(true);
    try {
      const trip = await xanoService.acceptBid(activeTrip!.id, bid.id);
      setActiveTrip(trip); setViewState('active');
    } catch (e) { alert("Protocol Failure: Handshake unsuccessful."); } finally { setLoading(false); }
  };

  const mapMarkers = useMemo(() => {
    const markers: any[] = [];
    if (pickupCoords) markers.push({ id: 'pickup', ...pickupCoords, type: 'pickup' });
    if (dropoffCoords) markers.push({ id: 'dropoff', ...dropoffCoords, type: 'dropoff' });
    nearbyDrivers.forEach(d => markers.push({ id: d.driverId, ...d, type: 'driver' }));
    return markers;
  }, [pickupCoords, dropoffCoords, nearbyDrivers]);

  if (viewState === 'active' && activeTrip) return <ActiveTripView trip={activeTrip} role="rider" onClose={() => setViewState('idle')} />;

  return (
    <div className="h-screen flex flex-col bg-[#000814] relative overflow-hidden font-sans">
      <SideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} user={user} onLogout={onLogout} activeView={activeView} onNavigate={v => v === 'scout' ? setShowScout(true) : setActiveView(v)} onUserUpdate={onUserUpdate} />
      {showScout && <ScoutView onClose={() => setShowScout(false)} />}

      {/* Operational Header HUD */}
      <div className="absolute top-0 inset-x-0 z-30 p-8 pt-16 safe-top bg-gradient-to-b from-[#000814]/80 to-transparent pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <button onClick={() => setIsDrawerOpen(true)} className="w-14 h-14 bg-white/[0.03] backdrop-blur-3xl rounded-3xl flex items-center justify-center text-white border border-white/5 haptic-press"><i className="fa-solid fa-bars-staggered text-2xl"></i></button>
          <div className="flex bg-white/[0.03] backdrop-blur-3xl rounded-3xl p-1.5 border border-white/5">
            <button onClick={() => setActiveTab('ride')} className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'ride' ? 'bg-brand-orange text-white shadow-xl shadow-brand-orange/20' : 'text-white/20'}`}>Passenger</button>
            <button onClick={() => setActiveTab('freight')} className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'freight' ? 'bg-brand-orange text-white shadow-xl shadow-brand-orange/20' : 'text-white/20'}`}>Freight</button>
          </div>
          <div className="w-14"></div>
        </div>
      </div>

      <div className="flex-1 relative">
        <Suspense fallback={<div className="w-full h-full bg-[#000814] animate-pulse" />}>
          <MapView center={mapCenter} markers={mapMarkers} routeGeometry={routeGeometry} zoom={14} onLocationPick={(lat, lng) => !pickupCoords ? setPickupCoords({lat, lng}) : setDropoffCoords({lat, lng})} />
        </Suspense>

        {/* Mission Input HUD */}
        {viewState === 'idle' && (
          <div className="absolute bottom-12 inset-x-8 z-30 space-y-6" ref={containerRef}>
            <Card variant="glass" className="!p-6 bg-black/80 backdrop-blur-3xl border-white/5 rounded-[3rem] shadow-2xl">
              <div className="relative mb-6">
                <Input variant="glass" placeholder="Specify Mission Protocol..." icon="wand-magic-sparkles" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="!bg-transparent border-0" onKeyDown={e => e.key === 'Enter' && handleMagicDispatch()} />
                {aiPrompt && <button onClick={handleMagicDispatch} disabled={isAiParsing} className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-brand-orange rounded-2xl text-white shadow-xl">{isAiParsing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-bolt"></i>}</button>}
              </div>
              <div className="space-y-4 relative">
                <div className="relative"><Input variant="glass" placeholder="Sector Pickup Point" icon="location-crosshairs" value={pickup} onChange={e => handleAddressSearch(e.target.value, 'pickup')} className="!bg-white/[0.02]" /></div>
                <div className="relative"><Input variant="glass" placeholder="Target Destination" icon="flag-checkered" value={dropoff} onChange={e => handleAddressSearch(e.target.value, 'dropoff')} className="!bg-white/[0.02]" /></div>
                {activeField && suggestions.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-4 bg-black/95 rounded-3xl border border-white/10 overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.8)] z-[60]">
                    {suggestions.map((s, i) => <button key={i} onClick={() => handleSelectSuggestion(s)} className="w-full px-7 py-5 text-left hover:bg-white/[0.03] border-b border-white/5 last:border-0 flex items-center gap-4 transition-colors"><i className="fa-solid fa-location-dot text-brand-orange text-sm"></i><span className="text-[12px] font-black text-white/80 truncate uppercase tracking-widest">{s.address}</span></button>)}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Deployment Review HUD */}
        {viewState === 'review' && (
          <div className="absolute bottom-12 inset-x-8 z-30">
            <Card variant="glass" className="bg-black/90 rounded-[3.5rem] p-10 border border-white/5 shadow-2xl">
              <div className="flex justify-between items-start mb-10">
                <div><p className="text-[11px] font-black text-brand-orange uppercase tracking-[0.6em] mb-2">Tactical Specs</p><h3 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">{activeTab} OPERATION</h3></div>
                <div className="text-right"><div className="text-5xl font-black text-white tracking-tighter">${proposedFare.toFixed(2)}</div></div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-12">
                {(activeTab === 'ride' ? PASSENGER_CATEGORIES : FREIGHT_CATEGORIES).map(cat => (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={`flex flex-col items-center gap-4 p-6 rounded-[2.5rem] border transition-all ${selectedCategory === cat.name ? 'bg-brand-orange border-brand-orange text-white shadow-xl shadow-brand-orange/20' : 'bg-white/[0.02] border-white/5 text-white/20'}`}><i className={`fa-solid fa-${cat.icon} text-2xl`}></i><span className="text-[9px] font-black uppercase tracking-[0.4em]">{cat.name}</span></button>
                ))}
              </div>
              <div className="flex gap-6">
                <Button variant="ghost" className="flex-1 py-7 text-[11px] font-black uppercase tracking-[0.4em] text-white/20" onClick={() => setViewState('idle')}>ABORT</Button>
                <Button variant="secondary" className="flex-[2] py-7 text-[13px] font-black uppercase tracking-[0.6em] rounded-3xl" onClick={handleRequestTrip} loading={loading}>INITIATE DEPLOY</Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};