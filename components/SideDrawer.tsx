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
  const isMounted = useRef(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  if (!shouldRender) return null;

  const handleAnimationEnd = () => {
    if (!isOpen) setShouldRender(false);
  };

  const zones = [
    { 
      name: 'Tactical Ops', 
      items: [
        { id: 'map', icon: 'map', label: 'Live Marketplace' },
        { id: 'history', icon: 'clock-rotate-left', label: 'Trip History' },
        { id: 'safety', icon: 'shield-halved', label: 'Safety Hub' }
      ]
    },
    {
      name: 'Intelligence',
      items: [
        { id: 'scout', icon: 'compass', label: 'Scout AI' },
        { id: 'favourites', icon: 'heart', label: 'Trusted Partners' },
        { id: 'promotions', icon: 'ticket', label: 'Vouchers' }
      ]
    },
    {
      name: 'System Control',
      items: [
        { id: 'profile', icon: 'user-gear', label: 'Elite ID' },
        { id: 'settings', icon: 'gear', label: 'Preferences' },
        { id: 'support', icon: 'headset', label: 'Secure Support' }
      ]
    }
  ];

  const handleSwitchMode = async () => {
    const isApprovedDriver = user.driver_approved === true || user.driver_status === 'approved';
    const newRole = user.role === 'rider' ? 'driver' : 'rider';
    
    if (user.role === 'rider' && !isApprovedDriver) {
      alert("Driver access is pending verification. Please wait for approval.");
      return;
    }

    if (confirm(`Synchronize access to ${newRole} mode?`)) {
      setIsSyncing(true);
      try {
        ablyService.prepareRoleSwitch();
        const updatedUser = await xanoService.switchRole(user.id, newRole);
        if (isMounted.current) {
          onUserUpdate(updatedUser);
          onNavigate('map');
          onClose();
        }
      } catch (e) {
        if (isMounted.current) alert("Protocol error: Mode sync failed.");
      } finally {
        if (isMounted.current) setIsSyncing(false);
      }
    }
  };

  const canShowSwitchButton = 
    user.role === 'driver' || 
    (user.role === 'rider' && user.driver_approved === true);

  return (
    <div 
      className={`fixed inset-0 z-50 transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onTransitionEnd={handleAnimationEnd}
    >
      <div className="absolute inset-0 bg-slate-900/60 native-blur" onClick={onClose}></div>

      <div className={`absolute top-0 left-0 bottom-0 w-[85%] max-w-xs bg-white shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        <div className={`p-8 pt-12 text-white relative overflow-hidden shrink-0 ${user.role === 'rider' ? 'bg-brand-blue' : 'bg-brand-orange'}`}>
           <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
           
           <div className="relative z-10">
              <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md mb-4 p-1 border border-white/30 rotate-3 haptic-press">
                 <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`} alt={user.name} className="w-full h-full rounded-2xl object-cover bg-slate-800" />
              </div>
              <h2 className="text-xl font-black tracking-tight uppercase">ELITE ACCESS</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">{user.role} Authorization</p>
                <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-white animate-pulse' : 'bg-emerald-400'}`}></div>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 space-y-8 no-scrollbar">
           {zones.map(zone => (
             <div key={zone.name} className="space-y-1">
                <div className="px-8 text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mb-3">{zone.name}</div>
                <div className="px-3">
                  {zone.items.map(item => (
                     <button
                       key={item.id}
                       onClick={() => { onNavigate(item.id); onClose(); }}
                       className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all haptic-press relative group ${activeView === item.id ? (user.role === 'rider' ? 'bg-blue-50 text-brand-blue' : 'bg-orange-50 text-brand-orange') : 'text-slate-600 hover:bg-slate-50'}`}
                     >
                        {activeView === item.id && <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${user.role === 'rider' ? 'bg-brand-blue' : 'bg-brand-orange'}`}></div>}
                        <div className={`w-8 flex justify-center ${activeView === item.id ? (user.role === 'rider' ? 'text-brand-blue' : 'text-brand-orange') : 'text-gray-400 group-hover:text-slate-600'}`}>
                           <i className={`fa-solid fa-${item.icon} text-lg`}></i>
                        </div>
                        <span className={`text-xs uppercase tracking-widest font-bold ${activeView === item.id ? 'opacity-100' : 'opacity-70'}`}>{item.label}</span>
                     </button>
                  ))}
                </div>
             </div>
           ))}
           
           {canShowSwitchButton && (
             <div className="px-6 pb-4 pt-4">
                <button 
                  onClick={handleSwitchMode}
                  disabled={isSyncing}
                  className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 active:scale-95 haptic-press transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                   <i className={`fa-solid fa-arrows-rotate ${isSyncing ? 'animate-spin' : ''}`}></i>
                   <span>{isSyncing ? 'Synchronizing...' : (user.role === 'rider' ? 'Switch to Driver' : 'Switch to Rider')}</span>
                </button>
             </div>
           )}

           {user.role === 'rider' && !user.driver_approved && (
             <div className="px-6 pb-4 pt-4">
                <div className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400">
                      <i className="fa-solid fa-user-shield"></i>
                   </div>
                   <div className="flex-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verification Status</p>
                      <p className="text-[10px] font-bold text-slate-600 uppercase mt-0.5">Application Pending</p>
                   </div>
                </div>
             </div>
           )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
           <button onClick={onLogout} className="w-full py-3 text-red-500 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-red-50 rounded-xl haptic-press transition-colors">
              Secure Logout
           </button>
        </div>
      </div>
    </div>
  );
};