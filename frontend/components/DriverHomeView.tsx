import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Trip, TripStatus } from '../types';
import { Button, Card, Badge } from './Shared';
import { xanoService } from '../services/xano';
import { ablyService } from '../services/ably';
import { geminiService } from '../services/gemini';
import { SideDrawer } from './SideDrawer';
import { ActiveTripView } from './ActiveTripView';
import { useToastContext } from '../hooks/useToastContext';

interface DriverHomeViewProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: (user: User) => void;
}

export const DriverHomeView: React.FC<DriverHomeViewProps> = ({ user, onLogout, onUserUpdate }) => {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [location, setLocation] = useState<{ lat: number; lng: number }>({ lat: -17.8252, lng: 31.0335 });
  const [bidPrices, setBidPrices] = useState<{ [key: string]: number }>({});
  const locationRef = useRef<{ lat: number; lng: number }>({ lat: -17.8252, lng: 31.0335 });
  const toast = useToastContext();

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(newCoords);
          locationRef.current = newCoords;
          if (isOnline) {
            ablyService.publishDriverLocation(user.id, user.city || 'Harare', newCoords.lat, newCoords.lng, 0);
          }
        },
        (err) => {
          console.error('Geolocation error:', err);
          toast.error('Unable to fetch your location. Please check your device settings.');
        }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      toast.error('Geolocation is not supported by your browser.');
    }
  }, [isOnline, user.id, user.city, toast]);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    if (isOnline) {
      ablyService.subscribeToRequests(user.city || 'Harare', locationRef.current.lat, locationRef.current.lng, (trip: Trip) => {
        setAvailableTrips((prev: Trip[]) => [trip, ...prev.filter((t) => t.id !== trip.id)]);
        setBidPrices((prevPrices) => ({ ...prevPrices, [trip.id]: trip.proposed_price }));
      }).then((u) => (unsub = u));
    }
    return () => { if (unsub) unsub(); };
  }, [isOnline, user.city]);

  useEffect(() => {
    const unsub = xanoService.subscribeToActiveTrip((trip: Trip | null) => {
      if (trip && [TripStatus.ACCEPTED, TripStatus.ARRIVING, TripStatus.IN_PROGRESS].includes(trip.status)) {
        setActiveTrip(trip);
      } else {
        setActiveTrip(null);
      }
    });
    return unsub;
  }, []);

  const handleAcceptTrip = async (trip: Trip) => {
    try {
      await xanoService.submitBid(trip.id, trip.proposed_price, user);
      toast.success('Bid submitted successfully!');
      setAvailableTrips((p: Trip[]) => p.filter((t) => t.id !== trip.id));
    } catch (err) {
      console.error('Failed to submit bid:', err);
      const message = err instanceof Error ? err.message : 'Failed to submit bid';
      toast.error(message);
    }
  };

  if (activeTrip) {
    return <ActiveTripView trip={activeTrip} role="driver" onClose={() => setActiveTrip(null)} />;
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-50 relative overflow-hidden font-sans">
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user}
        onLogout={onLogout}
        activeView="map"
        onNavigate={() => null}
        onUserUpdate={onUserUpdate}
      />

      <div className="bg-white p-6 pt-12 flex justify-between items-center shadow-sm safe-top border-b border-zinc-100 z-30">
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="w-10 h-10 bg-zinc-50 rounded-full flex items-center justify-center text-black border border-zinc-100"
        >
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="text-center">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Driver Dashboard</p>
          <p className="font-black text-black text-xs uppercase">{isOnline ? 'Online' : 'Offline'}</p>
        </div>
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`px-5 py-2 rounded-full font-bold text-[10px] uppercase transition-all ${isOnline ? 'bg-red-50 text-red-500' : 'bg-brand-blue text-white'}`}
        >
          {isOnline ? 'Stop' : 'Start'}
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4 pb-32 overflow-y-auto no-scrollbar relative">
        {isOnline ? (
          availableTrips.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-300">
              <i className="fa-solid fa-radar text-4xl mb-4 animate-pulse"></i>
              <p className="text-[10px] font-bold uppercase tracking-widest">Waiting for requests...</p>
            </div>
          ) : (
            availableTrips.map((trip: Trip) => (
              <Card key={trip.id} className="bg-white border-zinc-100 shadow-md">
                <div className="flex justify-between items-start mb-6">
                  <Badge color="blue">{trip.category}</Badge>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400 font-bold uppercase tracking-widest mb-1">Your Offer</div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-black">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={bidPrices[trip.id] || trip.proposed_price}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value > 0) {
                            setBidPrices((prev) => ({ ...prev, [trip.id]: value }));
                          }
                        }}
                        className="w-20 text-2xl font-black text-black tracking-tighter bg-transparent border-b-2 border-zinc-200 focus:border-brand-blue outline-none text-right"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex gap-3 text-xs font-bold text-zinc-600 truncate">
                    <div className="w-1.5 h-1.5 bg-zinc-200 rounded-full mt-1.5"></div>
                    {trip.pickup.address}
                  </div>
                  <div className="flex gap-3 text-xs font-bold text-zinc-600 truncate">
                    <div className="w-1.5 h-1.5 bg-brand-orange rounded-full mt-1.5"></div>
                    {trip.dropoff.address}
                  </div>
                  <div className="flex gap-3 text-[10px] text-zinc-400 font-bold">
                    <span>Suggested: ${trip.proposed_price.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 py-3 text-[10px]"
                    onClick={() => setAvailableTrips((p) => p.filter((t) => t.id !== trip.id))}
                  >
                    Skip
                  </Button>
                  <Button
                    variant="dark"
                    className="flex-2 py-3 text-[10px]"
                    onClick={async () => {
                      try {
                        await xanoService.submitBid(trip.id, trip.proposed_price, user);
                        toast.success('Bid accepted successfully!');
                      } catch (err) {
                        console.error('Failed to accept bid:', err);
                        toast.error('Failed to accept bid. Please try again.');
                      }
                    }}
                  >
                    Accept
                  </Button>
                </div>
              </Card>
            ))
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-300">
            <i className="fa-solid fa-power-off text-5xl mb-4"></i>
            <p className="text-[10px] font-bold uppercase tracking-widest">You are offline</p>
          </div>
        )}
      </div>
    </div>
  );
};