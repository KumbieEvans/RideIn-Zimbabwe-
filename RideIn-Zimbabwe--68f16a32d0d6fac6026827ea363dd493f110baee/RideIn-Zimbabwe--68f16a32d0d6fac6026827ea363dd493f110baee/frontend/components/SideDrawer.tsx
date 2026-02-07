import React, { useRef, useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { xanoService } from '../services/xano';
import { ablyService } from '../services/ably';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
  onNavigate: (view: string) => void;
  activeView: string;
  onUserUpdate: (user: User) => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  onLogout, 
  onNavigate, 
  activeView,
  onUserUpdate 
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  if (!shouldRender) return null;

  const handleAnimationEnd = () => {
    if (!isOpen) setShouldRender(false);
  };

  const menuSections = [
    { 
      name: 'Main Menu', 
      items: [
        { id: 'map', icon: 'map', label: 'Book a Ride' },
        { id: 'history', icon: 'clock-rotate-left', label: 'My Trips' },
        { id: 'safety', icon: 'shield-halved', label: 'Safety Center' }
      ]
    },
    {
      name: 'Services',
      items: [
        { id: 'scout', icon: 'compass', label: 'Find Places' },
        { id: 'favourites', icon: 'heart', label: 'Saved Drivers' },
        { id: 'promotions', icon: 'ticket', label: 'Offers' }
      ]
    },
    {
      name: 'Account',
      items: [
        { id: 'profile', icon: 'user-gear', label: 'My Profile' },
        { id: 'support', icon: 'headset', label: 'Help & Support' }
      ]
    }
  ];

  const handleSwitchMode = async () => {
    const newRole = user.role === 'rider' ? 'driver' : 'rider';
    if (confirm(`Switch to ${newRole} mode?`)) {
      setIsSyncing(true);
      try {
        ablyService.prepareRoleSwitch();
        const updatedUser = await xanoService.switchRole(user.id, newRole);
        onUserUpdate(updatedUser);
        onNavigate('map');
        onClose();
      } catch (e) {
        alert("Failed to switch modes.");
      } finally {
        setIsSyncing(false);
      }
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onTransitionEnd={handleAnimationEnd}
    >
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose}></div>
      <div className={`absolute top-0 left-0 bottom-0 w-[85%] max-w-xs bg-white shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        <div className={`p-8 pt-12 text-white shrink-0 ${user.role === 'rider' ? 'bg-brand-blue' : 'bg-brand-orange'}`}>
           <div className="relative z-10">
              <div className="w-16 h-16 rounded-3xl bg-white/20 mb-4 p-1 border border-white/30 rotate-3">
                 <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`} alt={user.name} className="w-full h-full rounded-2xl object-cover bg-slate-800" />
              </div>
              <h2 className="text-xl font-black tracking-tight uppercase">My Account</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{user.role} Mode Active</p>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 space-y-8 no-scrollbar">
           {menuSections.map(section => (
             <div key={section.name} className="space-y-1">
                <div className="px-8 text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-3">{section.name}</div>
                <div className="px-3">
                  {section.items.map(item => (
                     <button
                       key={item.id}
                       onClick={() => { onNavigate(item.id); onClose(); }}
                       className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all ${activeView === item.id ? 'bg-blue-50 text-brand-blue' : 'text-slate-600 hover:bg-slate-50'}`}
                     >
                        <div className="w-8 flex justify-center"><i className={`fa-solid fa-${item.icon} text-lg`}></i></div>
                        <span className="text-xs uppercase tracking-widest font-bold">{item.label}</span>
                     </button>
                  ))}
                </div>
             </div>
           ))}
           
           <div className="px-6 pb-4 pt-4">
              <button 
                onClick={handleSwitchMode}
                disabled={isSyncing}
                className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"
              >
                 <i className={`fa-solid fa-arrows-rotate ${isSyncing ? 'animate-spin' : ''}`}></i>
                 <span>{isSyncing ? 'Switching...' : (user.role === 'rider' ? 'Drive on RideIn' : 'Use as Rider')}</span>
              </button>
           </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
           <button onClick={onLogout} className="w-full py-3 text-red-500 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-50">
              Sign Out
           </button>
        </div>
      </div>
    </div>
  );
};