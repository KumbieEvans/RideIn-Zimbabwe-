import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { User, Trip, TripStatus, VehicleType, Bid, PassengerCategory, FreightCategory } from '../types';
import { Button, Card, Badge, Input } from './Shared';
import { xanoService } from '../services/xano';
import { ablyService } from '../services/ably';
import { mapboxService, GeoResult } from '../services/mapbox';
import { geminiService } from '../services/gemini';
import { ActiveTripView } from './ActiveTripView';
import { SideDrawer } from './SideDrawer';
import { ScoutView } from './ScoutView';
import { PASSENGER_CATEGORIES, FREIGHT_CATEGORIES } from '../constants';

const MapView = React.lazy(() => import('./MapView'));

const calculateSuggestedFare = (distanceKm: number) => {
  return Math.max(2, distanceKm <= 3 ? 2 : distanceKm <= 5 ? 3 : 3 + (distanceKm - 5) * 0.5);
};

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
  const [isRouting, setIsRouting] = useState(false);
  
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [nearbyDrivers, setNearbyDrivers] = useState<Map<string, any>>(new Map());
  const [proposedFare, setProposedFare] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>(PASSENGER_CATEGORIES[0].name);
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [fareExplanation, setFareExplanation] = useState<string | null>(null);

  // Address Autocomplete State
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff' | null>(null);
  const searchTimeout = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tactical Initial GPS Lock
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          setMapCenter(coords);
          setPickupCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          mapboxService.reverseGeocode(pos.coords.latitude, pos.coords.longitude).then(setPickup);
        },
        (err) => console.warn("[GPS] Signal acquisition failed", err),
        { enableHighAccuracy: true }
      );
    }

    // Click outside listener to close suggestions
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync with Active Trip
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

  // Presence for Nearby Drivers
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

  // Route Calculation
  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      setIsRouting(true);
      mapboxService.getRoute(pickupCoords, dropoffCoords).then(route => {
        if (route) {
          setRouteGeometry(route.geometry);
          setRouteDetails({ distance: `${route.distance}km`, duration: `${route.duration}m` });
          const fare = calculateSuggestedFare(parseFloat(route.distance));
          setProposedFare(fare);
          setViewState('review');
        }
        setIsRouting(false);
      });
    }
  }, [pickupCoords, dropoffCoords]);

  // Listen for Bids
  useEffect(() => {
    if (activeTrip && activeTrip.status === TripStatus.BIDDING) {
      const unsub = ablyService.subscribeToRideEvents(activeTrip.id, (event) => {
        if (event.id) { // it's a bid
          setBids(prev => prev.some(b => b.id === event.id) ? prev : [...prev, event]);
        }
      });
      return unsub;
    }
  }, [activeTrip]);

  const handleAddressSearch = (query: string, field: 'pickup' | 'dropoff') => {
    if (field === 'pickup') setPickup(query);
    else setDropoff(query);
    setActiveField(field);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      const results = await mapboxService.searchAddress(query);
      setSuggestions(results);
    }, 400);
  };

  const handleSelectSuggestion = (res: GeoResult) => {
    if (activeField === 'pickup') {
      setPickup(res.address);
      setPickupCoords({ lat: res.lat, lng: res.lng });
      setMapCenter([res.lng, res.lat]);
    } else {
      setDropoff(res.address);
      setDropoffCoords({ lat: res.lat, lng: res.lng });
    }
    setSuggestions([]);
    setActiveField(null);
  };

  const handleMagicDispatch = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiParsing(true);
    try {
      const result = await geminiService.parseDispatchPrompt(aiPrompt, pickupCoords || undefined);
      if (result) {
        if (result.pickup) {
          setPickup(result.pickup);
          const p = await mapboxService.searchAddress(result.pickup);
          if (p[0]) setPickupCoords({ lat: p[0].lat, lng: p[0].lng });
        }
        if (result.dropoff) {
          setDropoff(result.dropoff);
          const d = await mapboxService.searchAddress(result.dropoff);
          if (d[0]) setDropoffCoords({ lat: d[0].lat, lng: d[0].lng });
        }
        if (result.category) setSelectedCategory(result.category);
        setAiPrompt('');
      }
    } catch (e) {
      console.error("[Magic] Dispatch parse error", e);
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleRequestTrip = async () => {
    if (!pickupCoords || !dropoffCoords) return;
    setLoading(true);
    try {
      const trip = await xanoService.requestTrip({
        riderId: user.id,
        type: activeTab === 'ride' ? VehicleType.PASSENGER : VehicleType.FREIGHT,
        category: selectedCategory,
        pickup: { address: pickup, lat: pickupCoords.lat, lng: pickupCoords.lng },
        dropoff: { address: dropoff, lat: dropoffCoords.lat, lng: dropoffCoords.lng },
        proposed_price: proposedFare,
        distance_km: parseFloat(routeDetails?.distance || "0"),
        duration: parseInt(routeDetails?.duration || "0"),
      });
      setActiveTrip(trip);
      setViewState('bidding');
    } catch (e) {
      alert("Grid error: Trip request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBid = async (bid: Bid) => {
    if (!activeTrip) return;
    setLoading(true);
    try {
      const trip = await xanoService.acceptBid(activeTrip.id, bid.id);
      setActiveTrip(trip);
      setViewState('active');
    } catch (e) {
      alert("Protocol error: Could not secure bid.");
    } finally {
      setLoading(false);
    }
  };

  const handleExplainFare = async () => {
    if (!proposedFare) return;
    setFareExplanation("Consulting Fare Guard...");
    const explanation = await geminiService.explainFare({
      pickup,
      dropoff,
      price: proposedFare.toString()
    });
    setFareExplanation(explanation);
  };

  const mapMarkers = useMemo(() => {
    const markers: any[] = [];
    if (pickupCoords) markers.push({ id: 'pickup', ...pickupCoords, type: 'pickup' });
    if (dropoffCoords) markers.push({ id: 'dropoff', ...dropoffCoords, type: 'dropoff' });
    nearbyDrivers.forEach(d => markers.push({ id: d.driverId, ...d, type: 'driver' }));
    return markers;
  }, [pickupCoords, dropoffCoords, nearbyDrivers]);

  if (viewState === 'active' && activeTrip) {
    return <ActiveTripView trip={activeTrip} role="rider" onClose={() => setViewState('idle')} />;
  }

  return (
    <div className="h-screen flex flex-col bg-[#000814] relative overflow-hidden font-mono">
      <SideDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        user={user} 
        onLogout={onLogout} 
        activeView={activeView} 
        onNavigate={(view) => {
           if (view === 'scout') setShowScout(true);
           else setActiveView(view);
        }} 
        onUserUpdate={onUserUpdate} 
      />

      {showScout && <ScoutView onClose={() => setShowScout(false)} />}

      {/* Header HUD */}
      <div className="absolute top-0 inset-x-0 z-30 p-6 pt-12 safe-top bg-gradient-to-b from-[#000814] to-transparent pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <button onClick={() => setIsDrawerOpen(true)} className="w-12 h-12 bg-white/5 backdrop-blur-3xl rounded-2xl flex items-center justify-center text-white border border-white/10 haptic-press shadow-2xl">
            <i className="fa-solid fa-bars-staggered text-xl"></i>
          </button>
          
          <div className="flex bg-white/5 backdrop-blur-3xl rounded-2xl p-1 border border-white/10 shadow-2xl">
            <button onClick={() => setActiveTab('ride')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ride' ? 'bg-brand-orange text-white shadow-lg' : 'text-white/30'}`}>Rider</button>
            <button onClick={() => setActiveTab('freight')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'freight' ? 'bg-brand-orange text-white shadow-lg' : 'text-white/30'}`}>Freight</button>
          </div>

          <div className="w-12 h-12"></div>
        </div>
      </div>

      {/* Core Map Logic */}
      <div className="flex-1 relative">
        <Suspense fallback={<div className="w-full h-full bg-[#000814] animate-pulse" />}>
          <MapView 
            center={mapCenter} 
            markers={mapMarkers} 
            routeGeometry={routeGeometry} 
            zoom={14} 
            onLocationPick={(lat, lng) => {
              if (!pickupCoords) {
                setPickupCoords({ lat, lng });
                mapboxService.reverseGeocode(lat, lng).then(setPickup);
              } else if (!dropoffCoords) {
                setDropoffCoords({ lat, lng });
                mapboxService.reverseGeocode(lat, lng).then(setDropoff);
              }
            }}
          />
        </Suspense>

        {/* Tactical UI Overlays */}
        {viewState === 'idle' && (
          <div className="absolute bottom-10 inset-x-6 z-30 space-y-4 animate-slide-up" ref={containerRef}>
            <Card variant="glass" className="!p-4 bg-black/80 backdrop-blur-2xl border-white/10 shadow-2xl rounded-[2.5rem] relative">
              <div className="relative mb-4">
                <Input 
                  variant="glass" 
                  placeholder="Where to, Commander?" 
                  icon="wand-magic-sparkles" 
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  className="!bg-transparent border-0"
                  onKeyDown={e => e.key === 'Enter' && handleMagicDispatch()}
                />
                {aiPrompt && (
                  <button onClick={handleMagicDispatch} disabled={isAiParsing} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-brand-orange rounded-xl text-white shadow-lg haptic-press">
                    {isAiParsing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-bolt"></i>}
                  </button>
                )}
              </div>
              
              <div className="space-y-3 relative">
                {/* Pickup Field */}
                <div className="relative">
                  <Input 
                    variant="glass" 
                    placeholder="Tactical Pickup Point" 
                    icon="location-crosshairs"
                    value={pickup}
                    onChange={(e) => handleAddressSearch(e.target.value, 'pickup')}
                    onFocus={() => setActiveField('pickup')}
                    className="!bg-white/5 border-white/5 focus:!bg-white/10"
                  />
                  {activeField === 'pickup' && suggestions.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden z-[60] shadow-2xl">
                      {suggestions.map((s, i) => (
                        <button key={i} onClick={() => handleSelectSuggestion(s)} className="w-full px-5 py-4 text-left hover:bg-white/10 border-b border-white/5 last:border-0 flex items-center gap-3">
                          <i className="fa-solid fa-location-dot text-brand-orange text-xs"></i>
                          <span className="text-[11px] font-bold text-white/80 truncate">{s.address}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Destination Field */}
                <div className="relative">
                  <Input 
                    variant="glass" 
                    placeholder="Mission Destination" 
                    icon="flag-checkered"
                    value={dropoff}
                    onChange={(e) => handleAddressSearch(e.target.value, 'dropoff')}
                    onFocus={() => setActiveField('dropoff')}
                    className="!bg-white/5 border-white/5 focus:!bg-white/10"
                  />
                  {activeField === 'dropoff' && suggestions.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden z-[60] shadow-2xl">
                      {suggestions.map((s, i) => (
                        <button key={i} onClick={() => handleSelectSuggestion(s)} className="w-full px-5 py-4 text-left hover:bg-white/10 border-b border-white/5 last:border-0 flex items-center gap-3">
                          <i className="fa-solid fa-location-dot text-brand-orange text-xs"></i>
                          <span className="text-[11px] font-bold text-white/80 truncate">{s.address}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {viewState === 'review' && (
          <div className="absolute bottom-10 inset-x-6 z-30 animate-slide-up">
            <Card variant="glass" className="bg-black/90 backdrop-blur-3xl border-white/10 rounded-[3rem] p-8 shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-[10px] font-black text-brand-orange uppercase tracking-[0.4em] mb-1">Deployment Payload</p>
                  <h3 className="text-3xl font-black text-white italic tracking-tighter">Strategic {activeTab === 'ride' ? 'Ride' : 'Freight'}</h3>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-white tracking-tighter">${proposedFare.toFixed(2)}</div>
                  <button onClick={handleExplainFare} className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1 hover:text-white transition-colors">Why this price?</button>
                </div>
              </div>

              {fareExplanation && (
                <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[11px] font-bold text-blue-200 leading-relaxed italic animate-fade-in">
                  "{fareExplanation}"
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-10">
                {(activeTab === 'ride' ? PASSENGER_CATEGORIES : FREIGHT_CATEGORIES).map(cat => (
                  <button 
                    key={cat.id} 
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all haptic-press ${selectedCategory === cat.name ? 'bg-brand-orange border-brand-orange shadow-[0_10px_20px_rgba(255,95,0,0.3)]' : 'bg-white/5 border-white/5 text-white/30'}`}
                  >
                    <i className={`fa-solid fa-${cat.icon} text-lg`}></i>
                    <span className="text-[8px] font-black uppercase tracking-widest">{cat.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <Button variant="ghost" className="flex-1 py-6 text-[10px] font-black uppercase tracking-widest text-white/20" onClick={() => { setViewState('idle'); setDropoffCoords(null); setRouteGeometry(null); }}>Abort</Button>
                <Button variant="secondary" className="flex-[2] py-6 text-[12px] font-black uppercase tracking-[0.4em] shadow-2xl" onClick={handleRequestTrip} loading={loading}>Deploy Node</Button>
              </div>
            </Card>
          </div>
        )}

        {viewState === 'bidding' && (
          <div className="absolute bottom-10 inset-x-6 z-30 animate-slide-up">
            <Card variant="glass" className="bg-black/95 backdrop-blur-3xl border-brand-orange/20 rounded-[3rem] p-10 text-center shadow-2xl">
              <div className="relative w-24 h-24 mx-auto mb-8">
                 <div className="absolute inset-0 border-4 border-brand-orange/20 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fa-solid fa-satellite-dish text-2xl text-brand-orange animate-pulse"></i>
                 </div>
              </div>
              
              <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-4">Scanning Market Grid</h3>
              <p className="text-blue-200/40 text-[11px] font-bold uppercase tracking-[0.3em] mb-12">Negotiating with elite partners in your sector...</p>

              <div className="space-y-4 max-h-[30vh] overflow-y-auto no-scrollbar pb-6">
                {bids.length === 0 ? (
                  <div className="py-10 text-[9px] font-black text-white/10 uppercase tracking-[0.5em] animate-pulse">Awaiting incoming signals...</div>
                ) : (
                  bids.map(bid => (
                    <Card key={bid.id} className="!p-5 bg-white/5 border-white/5 rounded-3xl flex items-center justify-between animate-scale-in">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-800 overflow-hidden border border-white/10">
                             <img src={`https://ui-avatars.com/api/?name=${bid.driverName}&background=random`} alt={bid.driverName} />
                          </div>
                          <div className="text-left">
                             <div className="text-sm font-black text-white">{bid.driverName}</div>
                             <div className="flex items-center gap-2 mt-1">
                                <i className="fa-solid fa-star text-[10px] text-brand-orange"></i>
                                <span className="text-[10px] font-bold text-white/40">{bid.driverRating}</span>
                             </div>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-xl font-black text-white">${bid.amount}</div>
                          <button onClick={() => handleAcceptBid(bid)} className="mt-2 bg-brand-orange text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg haptic-press">Accept</button>
                       </div>
                    </Card>
                  ))
                )}
              </div>

              <button 
                onClick={async () => {
                  if (activeTrip) await xanoService.cancelTrip(activeTrip.id);
                  setViewState('idle');
                }} 
                className="mt-8 text-[9px] font-black text-red-500/50 uppercase tracking-[0.4em] hover:text-red-500 transition-colors"
              >
                Terminate Request
              </button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};