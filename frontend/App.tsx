import React, { useState, useEffect, Suspense } from 'react';
import { User } from './types';
import { xanoService } from './services/xano';
import { ablyService } from './services/ably';
import { SplashAnimation } from './components/SplashAnimation';
import { PublicOnboardingView } from './components/PublicOnboardingView';
import ToastContainer from './components/ToastContainer';
import OfflineBanner from './components/OfflineBanner';
import { ToastProvider, useToastContext } from './hooks/useToastContext';
import { useNetworkStatus } from './hooks/useNetworkStatus';

/**
 * Resilient Lazy Loader with fallback error component
 */
const lazyLoad = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<any>, 
  componentName: string
) => {
  return React.lazy((): Promise<{ default: T }> => 
    importFunc()
      .then(module => ({ default: module[componentName] as T }))
      .catch(error => {
        console.error(`[Boot] Resource Offline: ${componentName}`, error);
        const ErrorComponent: React.FC = () => (
          <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[#001D3D] text-white font-mono">
            <div className="w-16 h-16 rounded-3xl bg-red-500/20 flex items-center justify-center mb-6 text-red-500">
              <i className="fa-solid fa-link-slash text-2xl"></i>
            </div>
            <h3 className="font-black text-xl mb-2 italic uppercase text-brand-orange">PROTOCOL_FAILURE</h3>
            <p className="text-[10px] text-white/30 mb-8 uppercase tracking-widest max-w-xs leading-relaxed">
              The component node {componentName} failed to synchronize with the core grid.
            </p>
            <button onClick={() => window.location.reload()} className="px-10 py-4 bg-brand-orange text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] haptic-press shadow-xl shadow-brand-orange/20">
              Restart Uplink
            </button>
          </div>
        );
        return { default: ErrorComponent as unknown as T };
      })
  );
};

// Strategic View Imports
const LoginView = lazyLoad<React.FC<{ onLogin: (user: User) => void }>>(() => import('./components/LoginView'), 'LoginView');
const RiderHomeView = lazyLoad<React.FC<any>>(() => import('./components/RiderHomeView'), 'RiderHomeView');
const DriverHomeView = lazyLoad<React.FC<any>>(() => import('./components/DriverHomeView'), 'DriverHomeView');
const PendingApprovalView = lazyLoad<React.FC<any>>(() => import('./components/PendingApprovalView'), 'PendingApprovalView');

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean | null>(null);
  
  const { isOnline } = useNetworkStatus();
  const toast = useToastContext();

  useEffect(() => {
    // Guaranteed Splash visibility for initial brand engagement
    const splashTimer = setTimeout(() => setShowSplash(false), 2600);

    const initAuth = async () => {
      try {
        const seen = localStorage.getItem('ridein_intro_seen');
        setHasSeenIntro(seen === 'true');

        const token = localStorage.getItem('ridein_auth_token');
        if (!token) {
          setAuthLoading(false);
          return;
        }
        
        // Attempt Core Uplink
        const currentUser = await xanoService.getMe().catch(() => null);
        if (currentUser) {
          setUser(currentUser);
          ablyService.connect(currentUser.id);
        } else {
          // Fallback to cached identity if link is weak
          const cached = localStorage.getItem('ridein_user_cache');
          if (cached) {
            const parsed = JSON.parse(cached);
            setUser(parsed);
            ablyService.connect(parsed.id);
          }
        }
      } catch (e) {
        console.error("[Auth] Link sequence error during boot:", e);
        toast.error('Failed to restore session. Please log in again.');
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();
    
    return () => {
      clearTimeout(splashTimer);
    };
  }, [toast]);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    if (newUser.id) {
      ablyService.connect(newUser.id);
    }
  };

  const handleLogout = () => {
    xanoService.logout();
    setUser(null);
  };

  const handleCompleteIntro = () => {
    localStorage.setItem('ridein_intro_seen', 'true');
    setHasSeenIntro(true);
  };

  // Condition 1: Splash or Initial Load
  if (showSplash || authLoading || hasSeenIntro === null) {
    return <SplashAnimation />;
  }

  // Condition 2: First-time tactical onboarding
  if (!hasSeenIntro) {
    return <PublicOnboardingView onComplete={handleCompleteIntro} />;
  }

  // Condition 3: Unauthorized state
  if (!user) {
    return (
      <Suspense fallback={<SplashAnimation />}>
        <LoginView onLogin={handleLogin} />
      </Suspense>
    );
  }

  // Role-based routing logic
  const isDriver = user.role === 'driver';
  const isApproved = user.driver_approved === true || user.driver_status === 'approved';

  return (
    <Suspense fallback={<SplashAnimation />}>
      {isDriver ? (
        isApproved ? (
          <DriverHomeView 
            user={user} 
            onLogout={handleLogout} 
            onUserUpdate={setUser} 
          />
        ) : (
          <PendingApprovalView 
            user={user} 
            onLogout={handleLogout} 
            onUserUpdate={setUser} 
          />
        )
      ) : (
        <RiderHomeView 
          user={user} 
          onLogout={handleLogout} 
          onUserUpdate={setUser} 
        />
      )}
      
      {/* Global Connectivity Overlay - tactical feedback */}
      <OfflineBanner isOnline={isOnline} />
      
      {/* Global Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </Suspense>
  );
};

export default App;