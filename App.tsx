
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
        console.error(`Failed to load ${componentName}`, error);
        const Fallback = (() => (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
            <h3 className="font-bold text-lg text-gray-900 mb-2">Resource Unavailable</h3>
            <p className="text-sm text-gray-500 mb-6">This component couldn't be loaded. Check your connection.</p>
            <button onClick={() => window.location.reload()} className="px-8 py-4 bg-brand-blue text-white rounded-2xl font-bold">Retry Load</button>
          </div>
        )) as unknown as T;
        return { default: Fallback };
      })
  );
};

interface HomeViewProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: (user: User) => void;
}

const LoginView = lazyLoad<React.FC<{ onLogin: (user: User) => void }>>(() => import('./components/LoginView'), 'LoginView');
const RiderHomeView = lazyLoad<React.FC<HomeViewProps>>(() => import('./components/RiderHomeView'), 'RiderHomeView');
const DriverHomeView = lazyLoad<React.FC<HomeViewProps>>(() => import('./components/DriverHomeView'), 'DriverHomeView');
const PendingApprovalView = lazyLoad<React.FC<HomeViewProps>>(() => import('./components/PendingApprovalView'), 'PendingApprovalView');

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#001D3D]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-[3px] border-white/10 border-t-brand-orange rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Synchronizing Network...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [ablyStatus, setAblyStatus] = useState(ablyService.connectionState);
  const [viewKey, setViewKey] = useState(0); 

  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 3000);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const initAuth = async () => {
      const seen = localStorage.getItem('ridein_intro_seen');
      setHasSeenIntro(seen === 'true');

      // Purge stale user cache if it contains deprecated 'email' parameter
      const cached = localStorage.getItem('ridein_user_cache');
      if (cached && cached.includes('"email"')) {
        console.debug("Purging legacy cache with 'email' param...");
        localStorage.removeItem('ridein_user_cache');
      }

      const token = localStorage.getItem('ridein_auth_token');
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const currentUser = await xanoService.getMe();
        if (currentUser) {
          setUser(currentUser);
        } else {
          xanoService.logout();
        }
      } catch (e) {
        const cachedUser = localStorage.getItem('ridein_user_cache');
        if (cachedUser) setUser(JSON.parse(cachedUser));
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
      if (user.account_status === 'banned') {
         alert("Access Denied: Your account has been suspended.");
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

  const completeOnboarding = () => {
    localStorage.setItem('ridein_intro_seen', 'true');
    setHasSeenIntro(true);
    setViewKey(v => v + 1);
  };

  if (showSplash || authLoading || hasSeenIntro === null) return <SplashAnimation />;

  const showConnAlert = !isOnline || ablyStatus === 'connecting' || ablyStatus === 'disconnected' || ablyStatus === 'suspended';

  const renderView = () => {
    if (!user) {
      if (!hasSeenIntro) {
        return <PublicOnboardingView onComplete={completeOnboarding} />;
      }
      return <LoginView onLogin={handleLogin} />;
    }
    
    if (user.role === 'rider') {
      return <RiderHomeView user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
    }
    
    if (user.role === 'driver') {
      if (user.driver_approved === true || user.driver_status === 'approved') {
        return <DriverHomeView user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
      }
      return <PendingApprovalView user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
    }
    
    return <LoginView onLogin={handleLogin} />;
  };

  return (
    <Suspense fallback={<LoadingScreen />}>
      {showConnAlert && user && (
        <div className="fixed top-0 left-0 right-0 z-[110] bg-brand-orange text-white px-4 py-3 flex items-center justify-center gap-3 animate-slide-down shadow-lg">
           <i className={`fa-solid ${!isOnline ? 'fa-wifi-slash' : 'fa-circle-notch fa-spin'} text-[10px]`}></i>
           <p className="text-[10px] font-black uppercase tracking-[0.3em]">
              {!isOnline ? 'Offline Protocol' : `Node Status: ${ablyStatus}...`}
           </p>
        </div>
      )}
      
      <div key={viewKey} className="animate-fade-in">
        {renderView()}
      </div>
    </Suspense>
  );
};

export default App;
