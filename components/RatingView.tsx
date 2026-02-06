import React, { useState } from 'react';
import { Trip, UserRole } from '../types';
import { Button, Card, Badge } from './Shared';

interface RatingViewProps {
  trip: Trip;
  role: UserRole;
  onSubmit: (rating: number, tags: string[], comment: string, isFavorite: boolean) => void;
}

export const RatingView: React.FC<RatingViewProps> = ({ trip, role, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const RIDER_TAGS = ['Safe Driving', 'Clean Car', 'Polite', 'Good Music', 'Fast Route'];
  const DRIVER_TAGS = ['Polite', 'Punctual', 'Clean', 'Tipper', 'Friendly'];

  const tags = role === 'rider' ? RIDER_TAGS : DRIVER_TAGS;
  const partnerName = trip.partner || 'Partner';
  const partnerAvatar = `https://ui-avatars.com/api/?name=${partnerName}&background=random&size=128`;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async () => {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, selectedTags, comment, isFavorite);
    } catch (e) {
      alert("Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-slide-up overflow-y-auto no-scrollbar">
       <div className="bg-brand-blue text-white p-10 pb-16 rounded-b-[3rem] shadow-2xl relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
             <h1 className="text-3xl font-black tracking-tighter mb-4 uppercase">GRID ALPHA</h1>
             <h2 className="text-xl font-bold tracking-tight mb-2 opacity-80 uppercase">Trip Summary</h2>
             <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-blue-300">$</span>
                <span className="text-5xl font-bold tracking-tighter">{trip.final_price?.toFixed(2)}</span>
             </div>
             <Badge color="blue" className="mt-4 bg-white/10 text-white ring-0 border border-white/10">Cash Payment Received</Badge>
          </div>
       </div>

       <div className="flex-1 px-6 -mt-10 relative z-20 pb-10">
          <Card className="text-center shadow-2xl border-0 mb-8 p-8 bg-white rounded-[3rem]">
             <div className="w-24 h-24 rounded-full bg-gray-200 mx-auto -mt-20 mb-6 border-[6px] border-white shadow-xl overflow-hidden">
                <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
             </div>
             
             <h3 className="text-xl font-bold text-slate-900 mb-1 uppercase">Rate {partnerName}</h3>
             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-8">{role === 'rider' ? trip.category : 'Passenger Mode'}</p>

             <div className="flex justify-center gap-3 mb-10">
                {[1, 2, 3, 4, 5].map((star) => (
                   <button key={star} onClick={() => setRating(star)} className="transition-transform active:scale-90 focus:outline-none">
                      <i className={`fa-solid fa-star text-5xl transition-all duration-300 ${rating >= star ? 'text-brand-orange drop-shadow-lg scale-110' : 'text-gray-100'}`}></i>
                   </button>
                ))}
             </div>

             <div className="flex flex-wrap justify-center gap-2 mb-8">
                {tags.map(tag => (
                   <button
                     key={tag}
                     onClick={() => toggleTag(tag)}
                     className={`px-4 py-2.5 rounded-2xl text-[10px] font-bold border-2 transition-all uppercase tracking-widest ${
                        selectedTags.includes(tag) ? 'border-brand-blue bg-brand-blue text-white shadow-md' : 'border-gray-50 bg-gray-50 text-gray-400'
                     }`}
                   >
                      {tag}
                   </button>
                ))}
             </div>

             <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share your experience (optional)..."
                className="w-full bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-blue/20 rounded-3xl p-6 text-sm font-normal outline-none resize-none h-32 mb-8 transition-all"
             ></textarea>

             <div 
               onClick={() => setIsFavorite(!isFavorite)}
               className={`flex items-center justify-between p-5 rounded-3xl border-2 cursor-pointer transition-all ${isFavorite ? 'border-red-100 bg-red-50/50 shadow-sm' : 'border-slate-50 bg-slate-50/30'}`}
             >
                <div className="flex items-center gap-4">
                   <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isFavorite ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white text-gray-300'}`}>
                      <i className="fa-solid fa-heart"></i>
                   </div>
                   <div className="text-left">
                      <div className={`font-bold text-sm uppercase ${isFavorite ? 'text-red-600' : 'text-slate-900'}`}>Add to Favourites</div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Mutual Trust & Priority</div>
                   </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isFavorite ? 'border-red-500 bg-red-500 text-white' : 'border-gray-200 bg-white'}`}>
                   {isFavorite && <i className="fa-solid fa-check text-[10px]"></i>}
                </div>
             </div>
          </Card>

          <Button 
            variant="primary" 
            className="w-full py-5 text-lg shadow-2xl rounded-3xl uppercase tracking-widest"
            disabled={rating === 0 || submitting}
            onClick={handleSubmit}
          >
            {submitting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Submit Review'}
          </Button>
          <button onClick={() => onSubmit(0, [], '', false)} className="w-full py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4">Skip for now</button>
       </div>
    </div>
  );
};