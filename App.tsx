
// Safety: Shim process.env for browser environments immediately
(window as any).process = (window as any).process || { env: {} };
(window as any).process.env = (window as any).process.env || {};

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { User } from './types';
import { xanoService } from './services/xano';
import { ablyService } from './services/ably';
import { SplashAnimation } from './components/SplashAnimation';
import { PublicOnboardingView } from './components/PublicOnboardingView';

const lazyLoad = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<any>, 
  componentName: string
) => {
  return React.lazy((): Promise<{ default: T }> => 
    importFunc()
      .then(module => ({ default: module[componentName] as T }))
      .catch(error => {
        console.error(`[Boot] Resource Offline: ${componentName}`, error);
        return { default: (() => (
          <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[#001D3D] text-white">
            <div className="w-16 h-16 rounded-3xl bg-red-500/20 flex items-center justify-center mb-6 text-red-500">
              <i className="fa-solid fa-link-slash text-2xl"></i>
            </div>
            <h3 className="font-black text-xl mb-2 italic">PROTOCOL FAILURE</h3>
            <p className="text-xs text-white/30 mb-8 uppercase tracking-widest max-w-xs">The component node ${componentName} failed to synchronize with the core.</p>
            <button onClick={() => window.location.reload()} className="px-10 py-4 bg-brand-orange text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px]">Restart Uplink</button>
          </div>
        )) as unknown as T };
      })
  );
};

const LoginView = lazyLoad<React.FC<{ onLogin: (user: User) => void }>>(() => import('./components/LoginView'), 'LoginView');
const RiderHomeView = lazyLoad<React.FC<any>>(() => import('./components/RiderHomeView'), 'RiderHomeView');
const DriverHomeView = lazyLoad<React.FC<any>>(() => import('./components/DriverHomeView'), 'DriverHomeView');
const PendingApprovalView = lazyLoad<React.FC<any>>(() => import('./components/PendingApprovalView'), 'PendingApprovalView');

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [ablyStatus, setAblyStatus] = useState(ablyService.connectionState);
  const [viewKey, setViewKey] = useState(0); 

  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 2500);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const initAuth = async () => {
      try {
        const seen = localStorage.getItem('ridein_intro_seen');
        setHasSeenIntro(seen === 'true');

        const token = localStorage.getItem('ridein_auth_token');
        if (!token) {
          setAuthLoading(false);
          return;
        }
        
        // Attempt secure handshake
        const currentUser = await xanoService.getMe().catch(() => null);
        if (currentUser) {
          setUser(currentUser);
        } else {
          // Fallback to cache if network is unstable but token exists
          const cached = localStorage.getItem('ridein_user_cache');
          if (cached) setUser(JSON.parse(cached));
        }
      } catch (e) {
        console.warn("[App] Auth Handshake Interrupted");
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();
    
    const unsubAbly = ablyService.onConnectionChange((state) => {
      setAblyStatus(state as any);
    });

    return () => {
      clearTimeout(splashTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubAbly();
    };
  }, []);

  useEffect(() => {
    if (user && isOnline) {
      if (user.account_status === 'suspended' || user.account_status === 'banned') {
         xanoService.logout();
         return;
      }
      ablyService.connect(user.id);
    } else {
      ablyService.disconnect();
    }
    setViewKey(v => v + 1); 
  }, [user, isOnline]);

  const handleLogin = (newUser: User) => setUser(newUser);
  const handleLogout = useCallback(() => xanoService.logout(), []);
  const handleUserUpdate = useCallback((updatedUser: User) => setUser(updatedUser), []);

  if (showSplash || authLoading || hasSeenIntro === null) return <SplashAnimation />;

  const renderView = () => {
    if (!user) {
      return hasSeenIntro ? <LoginView onLogin={handleLogin} /> : <PublicOnboardingView onComplete={() => {
        localStorage.setItem('ridein_intro_seen', 'true');
        setHasSeenIntro(true);
      }} />;
    }
    
    if (user.role === 'rider') return <RiderHomeView user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
    
    if (user.role === 'driver') {
      const isApproved = user.driver_approved === true || user.driver_status === 'approved';
      return isApproved 
        ? <DriverHomeView user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
        : <PendingApprovalView user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
    }
    
    return <LoginView onLogin={handleLogin} />;
  };

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#001D3D]" />}>
      {(!isOnline || ablyStatus !== 'connected') && user && (
        <div className="fixed top-0 left-0 right-0 z-[110] bg-brand-orange text-white px-4 py-2 flex items-center justify-center gap-3 shadow-lg">
           <i className="fa-solid fa-circle-notch fa-spin text-[10px]"></i>
           <p className="text-[9px] font-black uppercase tracking-[0.3em]">Syncing Neural Node...</p>
        </div>
      )}
      <div key={viewKey} className="animate-fade-in h-full">
        {renderView()}
      </div>
    </Suspense>
  );
};

export default App;
