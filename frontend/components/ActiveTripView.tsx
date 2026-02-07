import React, { useEffect, useState, useMemo } from 'react';
import { Trip, TripStatus, UserRole } from '../types';
import { Button, Card, Badge } from './Shared';
import { xanoService } from '../services/xano';
import { ablyService } from '../services/ably';
import { mapboxService } from '../services/mapbox';
import { ChatView } from './ChatView';
import { RatingView } from './RatingView';
import { useToastContext } from '../hooks/useToastContext';

const MapView = React.lazy(() => import('./MapView'));

interface ActiveTripViewProps {
  trip: Trip;
  role: UserRole;
  onClose: () => void;
}

export const ActiveTripView: React.FC<ActiveTripViewProps> = ({ trip, role, onClose }) => {
  const [eta, setEta] = useState<string>(trip.duration ? `${trip.duration} min` : 'Calculating...');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number; rotation: number } | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<any>(null);
  const [isSafetyHubOpen, setIsSafetyHubOpen] = useState<boolean>(false);

  const toast = useToastContext();

  useEffect(() => {
    if (trip.pickup && trip.dropoff && !routeGeometry) {
      mapboxService
        .getRoute(
          { lat: trip.pickup.lat, lng: trip.pickup.lng },
          { lat: trip.dropoff.lat, lng: trip.dropoff.lng }
        )
        .then((route) => {
          if (route) {
            setRouteGeometry(route.geometry);
            setEta(`${route.duration} min`);
          }
        })
        .catch((err) => {
          console.error('Failed to load route:', err);
          toast.error('Unable to calculate route. Please try again.');
        });
    }
  }, [trip, routeGeometry, toast]);

  useEffect(() => {
    // Define the type for the update parameter
    interface TripUpdate {
      location?: { lat: number; lng: number; rotation: number };
      statusMessage?: string;
      unreadCount?: number;
    }

    const unsubscribe = ablyService.subscribeToTripUpdates(trip.id, (update: TripUpdate) => {
      if (update.location) {
        setDriverLocation(update.location);
      }
      if (update.statusMessage) {
        setStatusMessage(update.statusMessage);
      }
      if (update.unreadCount !== undefined) {
        setUnreadCount((prev) => prev + (update.unreadCount ?? 0)); // Use nullish coalescing operator
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [trip.id]);

  const handleRatingSubmit = async (rating: number) => {
    try {
      await xanoService.submitRating(trip.id, rating);
      toast.success('Rating submitted successfully!');
      onClose();
    } catch (err) {
      console.error('Failed to submit rating:', err);
      toast.error('Failed to submit rating. Please try again.');
    }
  };

  if (trip.status === TripStatus.COMPLETED) {
    return <RatingView trip={trip} role={role} onSubmit={handleRatingSubmit} />;
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      <div className="flex-1 relative">
        <React.Suspense fallback={<div className="w-full h-full bg-gray-100" />}>
          <MapView trip={trip} driverLocation={driverLocation} routeGeometry={routeGeometry} />
        </React.Suspense>

        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-brand-blue text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-10 animate-slide-up glass-reflection">
          {trip.status === TripStatus.ARRIVING && (
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
          )}
          <span className="font-black text-[10px] uppercase tracking-widest">{statusMessage}</span>
        </div>

        <button
          onClick={() => setIsSafetyHubOpen(true)}
          className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-red-500 text-white shadow-2xl flex items-center justify-center animate-pulse z-20"
        >
          <i className="fa-solid fa-shield-heart text-xl"></i>
        </button>
      </div>

      <div className="bg-white rounded-t-[3.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] p-8 pb-10 animate-slide-up relative z-20">
        <div className="w-14 h-1.5 bg-gray-100 rounded-full mx-auto mb-8"></div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">{eta}</div>
            <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-1">SLA Target</div>
          </div>
          <div className="flex gap-3">
            <button className="w-14 h-14 rounded-full bg-blue-50 text-brand-blue flex items-center justify-center text-lg haptic-press shadow-sm">
              <i className="fa-solid fa-phone"></i>
            </button>
            <button
              onClick={() => setIsChatOpen(true)}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-lg haptic-press shadow-sm relative ${
                unreadCount > 0 ? 'bg-brand-orange text-white' : 'bg-blue-50 text-brand-blue'
              }`}
            >
              <i className="fa-solid fa-message"></i>
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white">
                  {unreadCount}
                </div>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
            <img
              src={`https://ui-avatars.com/api/?name=${trip.partner}&background=random&bold=true`}
              alt="Partner"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-slate-900 tracking-tight truncate">{trip.partner}</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Elite Verified</div>
          </div>
          <Badge color="blue">{trip.category}</Badge>
        </div>

        <div className="mt-8 space-y-4">
          <Button variant="dark" className="w-full py-5 rounded-2xl shadow-xl shadow-black/5" onClick={onClose}>
            End Trip
          </Button>
        </div>
      </div>
    </div>
  );
};