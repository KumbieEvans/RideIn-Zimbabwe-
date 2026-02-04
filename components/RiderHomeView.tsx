import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { User, Trip, TripStatus, VehicleType, Bid, PassengerCategory, FreightCategory } from '../types';
import { Button, Card, Badge, Input } from './Shared';
import { xanoService } from '../services/xano';
import { ablyService } from '../services/ably';
import { mapboxService } from '../services/mapbox';
import { geminiService } from '../services/gemini';
import { ActiveTripView } from './ActiveTripView';
import { SideDrawer } from './SideDrawer';
import { OnboardingView } from './OnboardingView';
import { PASSENGER_CATEGORIES, FREIGHT_CATEGORIES } from '../constants';

const MapView = React.lazy(() => import('./MapView'));

const calculateSuggestedFare = (distanceStr: string) => {
  const dist = parseFloat(distanceStr.replace(/[^\d.]/g, '')) || 0;
  return Math.max(2, dist <= 3 ? 2 : dist <= 5 ? 3 : 4 + (dist - 5) * 0.5);
};

export const RiderHomeView: React.FC<{ user: User; onLogout: () => void; onUserUpdate: (user: User) => void }> = ({ user, onLogout, onUserUpdate }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeView, setActiveView] = useState('map');
  const [activeTab, setActiveTab] = useState<'ride' | 'freight'>('ride');
  const [viewState, setViewState] = useState<'idle' | 'review' | 'bidding' | 'active'>('idle');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRequestSuccess, setShowRequestSuccess] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{lat: number, lng: number} | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{lat: number, lng: number} | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<any>(null);
  const [routeDetails, setRouteDetails] = useState<{distance: string, duration: string} | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [proposedFare, setProposedFare] = useState<string>('');
  const [fareExplanation, setFareExplanation] = useState('');
  
  const [isMagicActive, setIsMagicActive] = useState(false);
  const [magicPrompt, setMagicPrompt] = useState('');
  const [aiStatus, setAiStatus] = useState('');

  const currentCategories = activeTab === 'ride' ? PASSENGER_CATEGORIES : FREIGHT_CATEGORIES;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(currentCategories[0].id);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(`onboarding_rider_${user.id}`);
    if (!hasSeenOnboarding) setShowOnboarding(true);
  }, [user.id]);

  useEffect(() => {
    if (routeDetails) {
      const fare = calculateSuggestedFare(routeDetails.distance);
      setProposedFare(fare.toString());
      if (viewState === 'review') {
        geminiService.explainFare({ 
          pickup, 
          dropoff, 
          price: fare.toString() 
        }).then(setFareExplanation);
      }
    }
  }, [routeDetails, viewState]);

  useEffect(() => {
    if (viewState === 'bidding' && activeTrip) {
      const unsub = ablyService.subscribeToRideEvents(activeTrip.id, (data) => {
        if (data.id && !bids.some(b => b.id === data.id)) {
          setBids(prev => [data as Bid, ...prev]);
        }
      });
      const tripSub = xanoService.subscribeToActiveTrip((updatedTrip) => {
        if (updatedTrip && (updatedTrip.status === TripStatus.ACCEPTED || updatedTrip.status === TripStatus.ARRIVING)) {
          setActiveTrip(updatedTrip);
          setViewState('active');
        }
      });
      return () => { unsub(); tripSub(); };
    }
  }, [viewState, activeTrip, bids]);

  const processLocations = async (p: string, d: string) => {
    setIsRouting(true);
    setAiStatus('Mapping Landmarks...');
    try {
      let startQuery = p;
      if (p.toLowerCase().includes('current') && navigator.geolocation) {
        startQuery = await new Promise<string>((res) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => res(`${pos.coords.latitude},${pos.coords.longitude}`),
            () => res(p)
          );
        });
      }

      const pResults = await mapboxService.searchAddress(startQuery + " Zimbabwe");
      const dResults = await mapboxService.searchAddress(d + " Zimbabwe");
      
      if (pResults[0] && dResults[0]) {
        setPickup(pResults[0].address);
        setDropoff(dResults[0].address);
        setPickupCoords({ lat: pResults[0].lat, lng: pResults[0].lng });
        setDropoffCoords({ lat: dResults[0].lat, lng: dResults[0].lng });
        const route = await mapboxService.getRoute(pResults[0], dResults[0]);
        if (route) {
          setRouteGeometry(route.geometry);
          setRouteDetails({ distance: route.distance + " km", duration: route.duration + " mins" });
          setViewState('review');
        }
      } else {
        alert("Tactical data error: Could not pinpoint locations.");
      }
    } catch (e) { console.error(e); } 
    finally { setIsRouting(false); setAiStatus(''); }
  };

  const handleMagicDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicPrompt.trim() || loading) return;
    
    setLoading(true);
    setAiStatus('Synchronizing Neural Link...');
    
    try {
      const result = await geminiService.parseDispatchPrompt(magicPrompt, pickupCoords || undefined);
      if (!result) throw new Error("Link unstable");

      setActiveTab(result.type === 'freight' ? 'freight' : 'ride');
      
      const cats = result.type === 'freight' ? FREIGHT_CATEGORIES : PASSENGER_CATEGORIES;
      const matchedCat = cats.find(c => c.name.toLowerCase().includes(result.category.toLowerCase())) || cats[0];
      setSelectedCategoryId(matchedCat.id);

      setAiStatus(`Triangulating ${result.dropoff}...`);
      await processLocations(result.pickup, result.dropoff);
      
      setIsMagicActive(false);
      setMagicPrompt('');
    } catch (e) {
      alert("AI Uplink Failed: Please try standard input.");
    } finally {
      setLoading(false);
      setAiStatus('');
    }
  };

  const handleRequestTrip = async () => {
    if (!pickupCoords || !dropoffCoords || !routeDetails) return;
    setLoading(true);
    try {
      const trip = await xanoService.requestTrip({ 
        riderId: user.id, 
        type: activeTab === 'ride' ? VehicleType.PASSENGER : VehicleType.FREIGHT,
        category: currentCategories.find(c => c.id === selectedCategoryId)?.name || 'Standard',
        pickup: { address: pickup, lat: pickupCoords.lat, lng: pickupCoords.lng }, 
        dropoff: { address: dropoff, lat: dropoffCoords.lat, lng: dropoffCoords.lng }, 
        proposed_price: parseFloat(proposedFare), 
        distance_km: parseFloat(routeDetails.distance), 
        duration: routeDetails.duration,
      });
      setActiveTrip(trip);
      setBids([]);
      setShowRequestSuccess(true);
      setTimeout(() => {
        setShowRequestSuccess(false);
        setViewState('bidding');
      }, 2000);
    } catch (e) { alert("Broadcast failed."); } 
    finally { setLoading(false); }
  };

  const mapMarkers = useMemo(() => {
    const markers: any[] = [];
    if (pickupCoords) markers.push({ id: 'p1', ...pickupCoords, type: 'pickup' });
    if (dropoffCoords) markers.push({ id: 'd1', ...dropoffCoords, type: 'dropoff' });
    return markers;
  }, [pickupCoords, dropoffCoords]);

  return (
    <div className="h-screen flex flex-col bg-[#001D3D] relative overflow-y-auto font-sans">
      {showOnboarding && <OnboardingView role="rider" onComplete={() => {
        localStorage.setItem(`onboarding_rider_${user.id}`, 'true');
        setShowOnboarding(false);
      }} />}

      {showRequestSuccess && (
        <div className="fixed inset-0 z-[600] bg-brand-blue flex flex-col items-center justify-center p-8 text-white animate-fade-in">
           <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mb-8 shadow-2xl animate-drive-in">
              <i className="fa-solid fa-check text-4xl"></i>
           </div>
           <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Uplink Active</h2>
           <p className="text-[10px] font-black text-brand-orange uppercase tracking-[0.4em]">Broadcasting to Fleet</p>
        </div>
      )}

      <SideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} user={user} onLogout={onLogout} activeView={activeView} onNavigate={setActiveView} onUserUpdate={onUserUpdate} />
      
      <div className="flex-1 min-h-[50vh] relative">
         <Suspense fallback={<div className="w-full h-full bg-brand-blue/5" />}>
           <MapView markers={mapMarkers} routeGeometry={routeGeometry} />
         </Suspense>
         
         <div className="absolute top-12 inset-x-4 flex justify-between items-center z-20 pointer-events-none">
            <button onClick={() => setIsDrawerOpen(true)} className="w-12 h-12 bg-white/95 rounded-full flex items-center justify-center pointer-events-auto shadow-xl"><i className="fa-solid fa-bars-staggered text-lg text-slate-800"></i></button>
            {viewState === 'idle' && !isMagicActive && (
              <button onClick={() => setIsMagicActive(true)} className="px-6 py-3 bg-brand-orange text-white rounded-full shadow-2xl font-black text-[10px] uppercase tracking-widest pointer-events-auto animate-fade-in hover:scale-105 transition-transform">
                <i className="fa-solid fa-wand-magic-sparkles mr-2"></i> Magic Assist
              </button>
            )}
            <button className="w-12 h-12 bg-white/95 rounded-full shadow-xl flex items-center justify-center pointer-events-auto text-red-500"><i className="fa-solid fa-shield-heart text-lg"></i></button>
         </div>
      </div>

      {isMagicActive && (
        <div className="absolute inset-0 z-[400] bg-brand-blue/98 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center animate-fade-in overflow-y-auto">
          <div className="scanline absolute inset-0 opacity-10 pointer-events-none"></div>
          <button onClick={() => setIsMagicActive(false)} className="absolute top-12 right-6 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white text-xl"><i className="fa-solid fa-xmark"></i></button>
          <div className="mb-12 text-white">
            <h1 className="text-5xl font-black italic tracking-tighter text-brand-orange">Neural Dispatch</h1>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.5em] mt-2">Speak Your Mission</p>
          </div>
          <form onSubmit={handleMagicDispatch} className="w-full max-w-sm">
            <input 
              autoFocus
              className="w-full bg-white/5 border-2 border-white/10 rounded-3xl p-7 text-white text-xl font-bold placeholder-white/10 focus:outline-none focus:border-brand-orange transition-all mb-8 shadow-inner"
              placeholder="e.g. Copa Cabana to Borrowdale..."
              value={magicPrompt}
              onChange={e => setMagicPrompt(e.target.value)}
            />
            {aiStatus && <p className="text-[10px] font-black text-brand-orange uppercase tracking-[0.3em] mb-10 animate-pulse">{aiStatus}</p>}
            <Button type="submit" variant="secondary" className="w-full py-7 text-lg rounded-3xl shadow-2xl" disabled={loading || !magicPrompt.trim()}>
              {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Deploy Logistics'}
            </Button>
          </form>
        </div>
      )}

      {viewState === 'idle' && !isMagicActive && (
         <div className="bg-white p-8 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.2)] safe-bottom animate-slide-up relative z-10 border-t border-slate-100 shrink-0">
            <div className="w-14 h-1.5 bg-slate-100 rounded-full mx-auto mb-8"></div>
            <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-8 border border-slate-100">
                <button onClick={() => setActiveTab('ride')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${activeTab === 'ride' ? 'bg-white text-brand-blue shadow-md' : 'text-slate-400'}`}>PASSENGER</button>
                <button onClick={() => setActiveTab('freight')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${activeTab === 'freight' ? 'bg-white text-brand-blue shadow-md' : 'text-slate-400'}`}>FREIGHT</button>
            </div>
            <form onSubmit={async (e) => { e.preventDefault(); await processLocations(pickup, dropoff); }}>
                <Input label="Point Alpha" placeholder="Pickup Address" value={pickup} onChange={e => setPickup(e.target.value)} icon="circle" required />
                <div className="h-4"></div>
                <Input label="Point Omega" placeholder="Destination" value={dropoff} onChange={e => setDropoff(e.target.value)} icon="location-dot" required />
                
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-6">
                   {currentCategories.map(cat => (
                      <button 
                        key={cat.id} 
                        type="button" 
                        onClick={() => setSelectedCategoryId(cat.id)} 
                        className={`shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all ${selectedCategoryId === cat.id ? 'border-brand-blue bg-blue-50/50 text-brand-blue' : 'border-slate-50 bg-slate-50 text-gray-400'}`}
                      >
                         <i className={`fa-solid fa-${cat.icon} text-sm`}></i>
                         <span className="text-[10px] font-black uppercase tracking-[0.2em]">{cat.name}</span>
                      </button>
                   ))}
                </div>
                <Button type="submit" className="w-full mt-4 py-6 text-sm font-black uppercase tracking-[0.3em]" disabled={isRouting}>
                    {isRouting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Blast Market'}
                </Button>
            </form>
         </div>
      )}

      {viewState === 'review' && (
        <div className="bg-white p-10 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.2)] safe-bottom animate-slide-up relative z-10 shrink-0">
           <div className="flex justify-between items-center mb-10">
              <button onClick={() => setViewState('idle')} className="text-slate-400 font-black uppercase text-[10px] tracking-widest"><i className="fa-solid fa-arrow-left mr-2"></i> Adjust</button>
              <Badge color="blue" className="px-4 py-1.5">{routeDetails?.distance}</Badge>
           </div>
           
           <div className="text-center mb-10">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-4">Proposed Bounty</p>
              <div className="text-8xl font-black text-slate-900 tracking-tighter flex items-center justify-center gap-1">
                <span className="text-2xl text-slate-300 font-bold">$</span>{proposedFare}
              </div>
           </div>

           {fareExplanation && (
             <div className="bg-blue-50/50 p-5 rounded-2xl mb-10 border border-blue-100 flex gap-4">
                <i className="fa-solid fa-shield-check text-brand-blue mt-1"></i>
                <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic">"{fareExplanation}"</p>
             </div>
           )}

           <Button onClick={handleRequestTrip} className="w-full py-7 text-lg font-black uppercase tracking-[0.3em] rounded-3xl shadow-2xl" variant="primary" disabled={loading}>
              {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Confirm & Broadcast'}
           </Button>
        </div>
      )}

      {viewState === 'bidding' && activeTrip && (
        <div className="bg-white p-10 rounded-t-[3rem] shadow-[0_-20px_60px_rgba(0,0,0,0.3)] safe-bottom animate-slide-up h-[75vh] flex flex-col relative z-10 overflow-y-auto">
           <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                 <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                 <h3 className="font-black text-slate-900 tracking-tight text-xl">Scanning Marketplace...</h3>
              </div>
              <button onClick={async () => {
                if(activeTrip) await xanoService.cancelTrip(activeTrip.id);
                setViewState('idle');
              }} className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Abort</button>
           </div>
           
           <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
              {bids.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 opacity-30">
                   <i className="fa-solid fa-satellite-dish text-6xl text-brand-blue animate-pulse mb-6"></i>
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Waiting for Pilots</p>
                </div>
              ) : (
                bids.map(bid => (
                  <Card key={bid.id} className="p-7 border border-slate-100 flex items-center gap-5 animate-slide-up rounded-3xl shadow-lg hover:border-brand-blue transition-colors">
                     <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0">
                        <img src={`https://ui-avatars.com/api/?name=${bid.driverName}&background=random&bold=true`} alt={bid.driverName} className="w-full h-full object-cover" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="font-black text-slate-900 text-lg tracking-tight truncate">{bid.driverName}</div>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                           <span className="text-brand-orange">{bid.driverRating} ★</span>
                           <span className="truncate">{bid.vehicleInfo}</span>
                        </div>
                     </div>
                     <div className="text-right shrink-0">
                        <div className="text-4xl font-black text-brand-blue tracking-tighter mb-2">${bid.amount}</div>
                        <Button variant="secondary" className="px-5 py-2.5 !text-[9px] !rounded-xl font-black uppercase tracking-widest" onClick={() => handleRequestTrip()} disabled={loading}>
                           Engage
                        </Button>
                     </div>
                  </Card>
                ))
              )}
           </div>
        </div>
      )}

      {viewState === 'active' && activeTrip && <ActiveTripView trip={activeTrip} role="rider" onClose={() => { setActiveTrip(null); setViewState('idle'); }} />}
    </div>
  );
};