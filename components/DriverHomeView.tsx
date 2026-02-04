import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Trip, VehicleType } from '../types';
import { Button, Card, Badge } from './Shared';
import { xanoService } from '../services/xano';
import { ablyService } from '../services/ably';
import { SideDrawer } from './SideDrawer';
import { ActiveTripView } from './ActiveTripView';
import { getHaversineDistance } from '../services/utils';

export const DriverHomeView: React.FC<{ user: User; onLogout: () => void; onUserUpdate: (user: User) => void }> = ({ user, onLogout, onUserUpdate }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [activeView, setActiveView] = useState('map');
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [biddingTrip, setBiddingTrip] = useState<Trip | null>(null);
  const [counterAmount, setCounterAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [location, setLocation] = useState<{lat: number, lng: number}>({ lat: -17.8252, lng: 31.0335 });
  const lastPublishedLocation = useRef<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        undefined,
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    let unsubRequests: (() => void) | null = null;
    if (isOnline) {
      ablyService.enterDriverPresence(user.city || 'Harare', location.lat, location.lng, { 
        userId: user.id, 
        role: 'driver' 
      });
      ablyService.subscribeToRequests(user.city || 'Harare', location.lat, location.lng, (data: Trip) => {
         setAvailableTrips(prev => prev.some(t => t.id === data.id) ? prev : [data, ...prev]);
      }).then(cleanup => { unsubRequests = cleanup; });
    }
    return () => { 
      if (unsubRequests) unsubRequests();
      if (isOnline) ablyService.leaveDriverPresence(user.city || 'Harare', location.lat, location.lng); 
    };
  }, [isOnline, user.city, location.lat, location.lng]);

  const sortedTrips = useMemo(() => {
    return availableTrips
      .map(trip => ({
        ...trip,
        dist: getHaversineDistance(location.lat, location.lng, trip.pickup.lat, trip.pickup.lng)
      }))
      .filter(trip => trip.dist < 15)
      .sort((a, b) => a.dist - b.dist);
  }, [availableTrips, location]);

  const handleOpenBidding = (trip: Trip) => {
    setBiddingTrip(trip);
    setCounterAmount(trip.proposed_price.toString());
  };

  const handlePlaceBid = async () => {
    if (!biddingTrip) return;
    setLoading(true);
    try {
      await xanoService.submitBid(biddingTrip.id, parseFloat(counterAmount), user);
      setBiddingTrip(null);
      setAvailableTrips(prev => prev.filter(t => t.id !== biddingTrip.id));
    } catch (e) { alert("Bid failed."); } 
    finally { setLoading(false); }
  };

  return (
    <div className="h-screen flex flex-col bg-[#000814] relative overflow-y-auto">
      <SideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} user={user} onLogout={onLogout} activeView={activeView} onNavigate={setActiveView} onUserUpdate={onUserUpdate} />
      
      <div className="bg-[#001D3D] p-6 pt-12 flex justify-between items-center shadow-2xl safe-top border-b border-white/5 shrink-0">
         <button onClick={() => setIsDrawerOpen(true)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white"><i className="fa-solid fa-bars-staggered text-xl"></i></button>
         <div className="text-center">
            <p className="text-[10px] font-black text-brand-orange uppercase tracking-[0.3em] mb-1">Fleet Node: {user.name.split(' ')[0]}</p>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-white/10'}`}></div>
              <p className="font-black text-white text-[11px] uppercase tracking-widest">{isOnline ? 'Online Protocol' : 'Dormant'}</p>
            </div>
         </div>
         <button onClick={() => setIsOnline(!isOnline)} className={`px-5 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all ${isOnline ? 'bg-brand-orange text-white' : 'bg-white/10 text-white/40'}`}>
            {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
         </button>
      </div>

      <div className="flex-1 p-4 space-y-4 pb-24 no-scrollbar overflow-y-auto">
         {isOnline ? (
            sortedTrips.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center py-20 text-white/20 text-center animate-fade-in">
                  <i className="fa-solid fa-satellite-dish text-6xl mb-6 animate-pulse"></i>
                  <h3 className="text-xs font-black uppercase tracking-[0.4em] mb-2">Scanning Grid...</h3>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Awaiting tactical dispatches in {user.city}</p>
               </div>
            ) : (
               sortedTrips.map(trip => (
                  <Card key={trip.id} className="p-7 animate-slide-up bg-[#001D3D] border-0 rounded-[2.5rem] shadow-2xl relative overflow-hidden group border border-white/5">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/5 rounded-bl-[4rem] -mr-8 -mt-8"></div>
                     <div className="flex justify-between items-start mb-6">
                        <Badge color={trip.type === VehicleType.FREIGHT ? 'orange' : 'blue'}>{trip.category}</Badge>
                        <div className="text-right">
                           <div className="text-3xl font-black text-white tracking-tighter">${trip.proposed_price}</div>
                           <div className="text-[9px] font-black text-brand-orange uppercase tracking-widest mt-1">{trip.dist.toFixed(1)}km away</div>
                        </div>
                     </div>
                     <div className="space-y-4 mb-8">
                        <div className="flex gap-4">
                           <div className="w-1.5 h-1.5 bg-brand-orange rounded-full mt-1.5"></div>
                           <p className="text-xs font-bold text-white/70 truncate">{trip.pickup.address}</p>
                        </div>
                        <div className="flex gap-4">
                           <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>
                           <p className="text-xs font-bold text-white/70 truncate">{trip.dropoff.address}</p>
                        </div>
                     </div>
                     <div className="flex gap-3">
                        <Button variant="ghost" className="flex-1 py-4 text-[9px] font-black uppercase tracking-widest !rounded-2xl text-white/30" onClick={() => setAvailableTrips(prev => prev.filter(t => t.id !== trip.id))}>Skip</Button>
                        <Button className="flex-[2] py-4 text-[9px] font-black uppercase tracking-widest !rounded-2xl" variant="secondary" onClick={() => handleOpenBidding(trip)}>Engage Mission</Button>
                     </div>
                  </Card>
               ))
            )
         ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 text-white/10 animate-fade-in">
               <i className="fa-solid fa-moon text-7xl mb-6"></i>
               <h3 className="text-lg font-black tracking-tight uppercase">Dormant Node</h3>
               <p className="text-[10px] font-bold mt-4 uppercase tracking-[0.2em]">Activate protocol to receive dispatches</p>
            </div>
         )}
      </div>

      {biddingTrip && (
         <div className="fixed inset-0 z-[500] flex items-end justify-center bg-black/80 backdrop-blur-xl p-6 animate-fade-in">
            <div className="bg-[#001D3D] w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-slide-up border border-white/10">
               <div className="flex justify-between items-center mb-10">
                  <h3 className="text-2xl font-black tracking-tighter text-white uppercase italic">Deploy Bounty</h3>
                  <button onClick={() => setBiddingTrip(null)} className="text-white/40"><i className="fa-solid fa-xmark"></i></button>
               </div>
               <div className="mb-14 text-center">
                  <p className="text-[10px] font-black text-brand-orange uppercase tracking-[0.3em] mb-6">Strategic Counter ($)</p>
                  <input 
                     type="number"
                     autoFocus
                     value={counterAmount}
                     onChange={e => setCounterAmount(e.target.value)}
                     className="bg-transparent border-0 text-center text-8xl font-black text-white outline-none w-full tracking-tighter"
                  />
               </div>
               <Button className="w-full py-7 text-sm font-black uppercase tracking-[0.3em] rounded-3xl" variant="secondary" onClick={handlePlaceBid} disabled={loading}>
                 {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Execute Bid'}
               </Button>
            </div>
         </div>
      )}

      {activeTrip && <ActiveTripView trip={activeTrip} role="driver" onClose={() => setActiveTrip(null)} />}
    </div>
  );
};