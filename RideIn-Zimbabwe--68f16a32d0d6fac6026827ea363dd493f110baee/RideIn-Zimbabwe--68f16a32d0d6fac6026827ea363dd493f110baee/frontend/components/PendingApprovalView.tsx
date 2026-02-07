
import React from 'react';
import { User } from '../types';
import { Button } from './Shared';
import { xanoService } from '../services/xano';
import { ablyService } from '../services/ably';

interface PendingApprovalViewProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: (user: User) => void;
}

export const PendingApprovalView: React.FC<PendingApprovalViewProps> = ({ user, onLogout, onUserUpdate }) => {
  const handleSwitchRole = async () => {
    if (confirm("Switch back to Rider Mode while your application is pending?")) {
      try {
        // Step 1: Cleanup any active channels
        ablyService.prepareRoleSwitch();
        
        // Step 2: Update backend role
        const updatedUser = await xanoService.switchRole(user.id, 'rider');
        
        // Step 3: Refresh UI state
        onUserUpdate(updatedUser);
      } catch (e) {
        alert("System error: Unable to switch roles at this time.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-fade-in font-sans">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-brand-blue italic tracking-tighter">RideIn</h1>
        <div className="h-1 w-12 bg-brand-orange mx-auto mt-2 rounded-full"></div>
      </div>
      
      <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Account Under Review</h2>
      <p className="text-slate-500 text-sm leading-relaxed mb-12 max-w-[280px] font-medium">
        Our compliance team is currently verifying your vehicle documentation and tactical clearance. This usually takes 24-48 hours.
      </p>
      
      <div className="w-full max-w-xs space-y-4">
        <Button variant="uber" className="w-full py-5 rounded-2xl shadow-xl shadow-black/5" onClick={handleSwitchRole}>
          Switch to Rider Mode
        </Button>
        
        <button 
          onClick={onLogout} 
          className="w-full py-4 text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] hover:text-red-500 transition-colors"
        >
          Secure Sign Out
        </button>
      </div>
      
      <div className="mt-auto pt-10 text-[9px] text-gray-300 uppercase tracking-[0.4em] font-black">
        Protocol Node Authorization: #{user.id.substring(0, 8)}
      </div>
    </div>
  );
};
