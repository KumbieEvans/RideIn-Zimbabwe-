import React, { useState } from 'react';
import { Trip, TripStatus } from '../types';
import { Badge, Card } from './Shared';

export const ReceiptDetailView: React.FC<{ trip: Trip; userRole: 'rider' | 'driver'; onBack: () => void }> = ({ trip, userRole, onBack }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  
  const handleShare = async () => {
    const text = `Trip Receipt\n${trip.type} Trip\nFare: $${trip.final_price}\nDate: ${new Date(trip.createdAt).toLocaleDateString()}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Trip Receipt',
          text: text,
          url: window.location.href
        });
      } catch (err) { console.error(err); }
    } else {
      await navigator.clipboard.writeText(text);
      alert('Receipt copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto animate-slide-up">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl relative">
        <div className="bg-brand-blue text-white p-6 pb-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="relative z-10 flex items-center justify-between mb-6">
            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
            <span className="text-xs font-bold tracking-widest uppercase opacity-70">Official Receipt</span>
            <button onClick={handleShare} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors">
              <i className="fa-solid fa-share-nodes"></i>
            </button>
          </div>
          
          <div className="text-center relative z-10">
            <div className="text-4xl font-bold tracking-tighter mb-1">${trip.final_price?.toFixed(2)}</div>
            <Badge color={trip.status === TripStatus.COMPLETED ? 'emerald' : 'red'}>{trip.status}</Badge>
          </div>
        </div>

        <div className="px-6 -mt-6 relative z-20">
          <Card className="mb-6 !p-0 overflow-hidden border-0 shadow-xl">
             <div className="p-6 bg-white">
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-dashed border-gray-200">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Date</div>
                    <div className="font-bold text-gray-900">{new Date(trip.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Trip ID</div>
                    <div className="font-mono text-sm text-gray-600">#{trip.id.substring(0, 8)}</div>
                  </div>
                </div>

                <div className="space-y-6 relative">
                  <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gray-100"></div>
                  <div className="relative flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0 z-10 ring-4 ring-white">
                      <div className="w-2 h-2 bg-brand-blue rounded-full"></div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Pickup</div>
                      <div className="font-bold text-gray-900">{trip.pickup.address}</div>
                    </div>
                  </div>
                  <div className="relative flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center shrink-0 z-10 ring-4 ring-white">
                      <div className="w-2 h-2 bg-brand-orange rounded-full"></div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Dropoff</div>
                      <div className="font-bold text-gray-900">{trip.dropoff.address}</div>
                    </div>
                  </div>
                </div>
             </div>
             
             <div className="bg-gray-50 p-6 border-t border-gray-100">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                        <img src={`https://ui-avatars.com/api/?name=${trip.partner}&background=random`} alt="Partner" loading="lazy" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900">{trip.partner}</div>
                        <div className="text-[10px] font-normal text-gray-500">{userRole === 'rider' ? trip.category : 'Passenger'}</div>
                      </div>
                   </div>
                   <button 
                     onClick={() => setIsFavorite(!isFavorite)}
                     className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${isFavorite ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-gray-200 text-gray-400'}`}
                   >
                     <i className={`${isFavorite ? 'fa-solid' : 'fa-regular'} fa-heart`}></i>
                   </button>
                </div>
             </div>
          </Card>

          <div className="space-y-3">
             <div className="flex justify-between p-4 bg-white rounded-2xl border border-gray-100">
               <span className="text-sm font-bold text-gray-500">Distance</span>
               <span className="text-sm font-bold text-gray-900">{trip.distance}</span>
             </div>
             <div className="flex justify-between p-4 bg-white rounded-2xl border border-gray-100">
               <span className="text-sm font-bold text-gray-500">Duration</span>
               <span className="text-sm font-bold text-gray-900">{trip.duration}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};