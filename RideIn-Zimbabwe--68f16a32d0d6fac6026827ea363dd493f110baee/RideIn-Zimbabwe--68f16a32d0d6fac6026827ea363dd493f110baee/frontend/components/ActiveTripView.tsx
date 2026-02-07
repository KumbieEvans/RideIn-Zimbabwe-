import React, { useEffect, useState, useMemo } from 'react';
import { Trip, TripStatus, UserRole } from '../types';
import { Button, Card, Badge } from './Shared';
import { xanoService } from '../services/xano';
import { ablyService } from '../services/ably';
import { mapboxService } from '../services/mapbox';
import { ChatView } from './ChatView';
import { RatingView } from './RatingView';

const MapView = React.lazy(() => import('./MapView'));

interface ActiveTripViewProps {
  trip: Trip;
  role: UserRole;
  onClose: () => void;
}

export const ActiveTripView: React.FC<ActiveTripViewProps> = ({ trip, role, onClose }) => {
  const [eta] = useState('4 mins');
  const [statusMessage, setStatusMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number, rotation: number} | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<any>(null);
  const [isSafetyHubOpen, setIsSafetyHubOpen] = useState(false);

  const currentUserId = role === 'rider' ? trip.riderId : trip.driverId || 'unknown'; 
  const partnerName = trip.partner || 'Partner';

  useEffect(() => {
    if (trip.pickup && trip.dropoff && !routeGeometry) {
       mapboxService.getRoute(
         { lat: trip.pickup.lat, lng: trip.pickup.lng },
         { lat: trip.dropoff.lat, lng: trip.dropoff.lng }
       ).then(route => {
          if (route) setRouteGeometry(route.geometry);
       });
    }
  }, [trip, routeGeometry]);

  useEffect(() => {
    switch (trip.status) {
      case TripStatus.ARRIVING:
        setStatusMessage(role === 'rider' ? 'Driver is arriving...' : 'Pick up passenger');
        break;
      case TripStatus.IN_PROGRESS:
        setStatusMessage('Heading to destination');
        break;
      case TripStatus.COMPLETED:
        setStatusMessage('Trip Completed');
        break;
      default:
        setStatusMessage('Connecting...');
    }
  }, [trip.status, role]);

  useEffect(() => {
     if (role === 'rider' && trip.driverId && trip.status !== TripStatus.COMPLETED) {
         const unsubscribe = ablyService.subscribeToRideLocation(trip.id, (data: any) => {
             setDriverLocation({
                 lat: data.lat,
                 lng: data.lng,
                 rotation: data.rotation
             });
         });
         return () => unsubscribe();
     }
  }, [trip.id, trip.driverId, trip.status, role]);

  useEffect(() => {
    const handleMessage = (msg: any) => {
        if (!isChatOpen && msg.senderId !== currentUserId && !msg.isSystem) {
            setUnreadCount(prev => prev + 1);
        }
    };
    ablyService.subscribeToChat(trip.id, handleMessage);
    return () => ablyService.unsubscribe(`ride:${trip.id}:chat`);
  }, [trip.id, isChatOpen, currentUserId]);

  const mapMarkers = useMemo(() => {
      const markers: any[] = [];
      if (trip.pickup) markers.push({ ...trip.pickup, type: 'pickup' });
      if (trip.dropoff) markers.push({ ...trip.dropoff, type: 'dropoff' });
      if (driverLocation) markers.push({ ...driverLocation, type: 'driver' });
      return markers;
  }, [trip, driverLocation]);

  const handleUpdateStatus = async (newStatus: TripStatus) => {
    try {
      await xanoService.updateTripStatus(trip.id, newStatus);
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const handleRatingSubmit = async (rating: number, tags: string[], comment: string, isFavorite: boolean) => {
    try {
        await xanoService.submitReview(trip.id, rating, tags, comment, isFavorite);
        onClose();
    } catch (e) {
        console.error("Rating submission failed", e);
    }
  };

  if (trip.status === TripStatus.COMPLETED) {
    return <RatingView trip={trip} role={role} onSubmit={handleRatingSubmit} />;
  }

  return (
    <>
      {isChatOpen && (
        <ChatView tripId={trip.id} currentUserId={currentUserId} partnerName={partnerName} onClose={() => setIsChatOpen(false)} />
      )}

      <div className="fixed inset-0 z-40 flex flex-col bg-white">
        <div className="flex-1 relative">
          <React.Suspense fallback={<div className="w-full h-full bg-gray-100" />}>
              <MapView center={trip.pickup ? [trip.pickup.lng, trip.pickup.lat] : [31.0335, -17.8252]} markers={mapMarkers} routeGeometry={routeGeometry} zoom={14} />
          </React.Suspense>
          
          <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-brand-blue text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-10 animate-slide-up glass-reflection">
              {trip.status === TripStatus.ARRIVING && <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>}
              <span className="font-black text-[10px] uppercase tracking-widest">{statusMessage}</span>
          </div>

          <button onClick={() => setIsSafetyHubOpen(true)} className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-red-500 text-white shadow-2xl flex items-center justify-center animate-pulse z-10 haptic-press">
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
                <button className="w-14 h-14 rounded-full bg-blue-50 text-brand-blue flex items-center justify-center text-lg haptic-press shadow-sm"><i className="fa-solid fa-phone"></i></button>
                <button onClick={() => setIsChatOpen(true)} className={`w-14 h-14 rounded-full flex items-center justify-center text-lg haptic-press shadow-sm relative ${unreadCount > 0 ? 'bg-brand-orange text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                    <i className="fa-solid fa-message"></i>
                    {unreadCount > 0 && <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white">{unreadCount}</div>}
                </button>
              </div>
          </div>

          <Card variant="white" className="flex items-center gap-4 mb-8 !p-4 border-2 border-slate-50">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                <img src={`https://ui-avatars.com/api/?name=${trip.partner}&background=random&bold=true`} alt="Partner" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-slate-900 tracking-tight truncate">{trip.partner}</div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Elite Verified</div>
              </div>
              <div className="text-right">
                <div className="font-black text-slate-900 text-xl tracking-tighter">${(trip.final_price || trip.proposed_price).toFixed(2)}</div>
                <Badge color="blue" className="!px-2 !py-0.5 !text-[8px]">Agreed</Badge>
              </div>
          </Card>

          {role === 'driver' && (
            <Button variant={trip.status === TripStatus.ARRIVING ? 'primary' : 'secondary'} className="w-full py-6 text-sm font-black uppercase tracking-[0.3em]" onClick={() => handleUpdateStatus(trip.status === TripStatus.ARRIVING ? TripStatus.IN_PROGRESS : TripStatus.COMPLETED)}>
              {trip.status === TripStatus.ARRIVING ? 'Engage Trip' : 'Complete Fulfillment'}
            </Button>
          )}
        </div>
      </div>

      {isSafetyHubOpen && (
        <div className="fixed inset-0 z-[100] bg-red-600/95 backdrop-blur-3xl p-8 flex flex-col animate-fade-in text-white">
           <button onClick={() => setIsSafetyHubOpen(false)} className="self-end w-12 h-12 rounded-full bg-white/10 flex items-center justify-center haptic-press"><i className="fa-solid fa-xmark"></i></button>
           <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl text-red-600 animate-pulse"><i className="fa-solid fa-shield-heart text-4xl"></i></div>
              <h2 className="text-4xl font-black tracking-tighter mb-4 uppercase">Safety Hub</h2>
              <p className="text-red-100/60 text-xs font-bold uppercase tracking-widest leading-relaxed mb-12">Emergency protocols active.</p>
              
              <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
                <Button variant="white" className="!text-red-600 py-6 !rounded-[2rem]">Trigger SOS Alert</Button>
                <Button variant="outline" className="!bg-white/10 !border-white/20 !text-white py-6 !rounded-[2rem]">Share Trip Status</Button>
                <Button variant="outline" className="!bg-white/10 !border-white/20 !text-white py-6 !rounded-[2rem]">AI Safety Check-In</Button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};