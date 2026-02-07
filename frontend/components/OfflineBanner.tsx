import React, { useEffect, useState } from 'react';

interface OfflineBannerProps {
  isOnline: boolean;
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOnline }) => {
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline && isOnline) {
      // Show reconnected message briefly
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <div 
        className="fixed top-0 inset-x-0 z-[1000] bg-red-600 text-white text-[9px] font-black uppercase tracking-[0.3em] py-2 text-center animate-slide-down shadow-xl"
        role="alert"
        aria-live="assertive"
      >
        <i className="fa-solid fa-wifi-slash mr-2"></i>
        GRID CONNECTION OFFLINE - CHECK SIGNAL
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div 
        className="fixed top-0 inset-x-0 z-[1000] bg-green-600 text-white text-[9px] font-black uppercase tracking-[0.3em] py-2 text-center animate-slide-down shadow-xl"
        role="alert"
        aria-live="polite"
      >
        <i className="fa-solid fa-wifi mr-2"></i>
        CONNECTION RESTORED
      </div>
    );
  }

  return null;
};

export default OfflineBanner;
