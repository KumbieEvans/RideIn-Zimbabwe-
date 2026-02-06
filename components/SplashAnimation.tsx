import { useEffect, useState } from 'react';
import React from 'react';

export const SplashAnimation: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('BOOT_SEQUENCE_');
  const [logs, setLogs] = useState<string[]>([]);

  const systemLogs = [
    "[CORE] Initializing production protocols...",
    "[GRID] Authenticating sector uplink...",
    "[AUTH] Secure handshakes confirmed...",
    "[AI] Grid Controller intelligence ready...",
    "[MAP] Calibrating regional coordinate matrix...",
    "[SYSTEM] All nodes operational."
  ];

  useEffect(() => {
    const duration = 2500; 
    const intervalTime = 16;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const baseProgress = (currentStep / steps) * 100;
      setProgress(baseProgress);

      if (baseProgress > 20 && baseProgress < 45) setLoadingText('SYNCING_LOGISTICS_');
      else if (baseProgress >= 45 && baseProgress < 75) setLoadingText('SECURE_HANDSHAKE_');
      else if (baseProgress >= 75 && baseProgress < 95) setLoadingText('DEPLOYING_GRID_');
      else if (baseProgress >= 95) setLoadingText('UPLINK_ACTIVE');

      if (currentStep % Math.floor(steps / systemLogs.length) === 0 && logs.length < systemLogs.length) {
        setLogs(prev => [...prev, systemLogs[prev.length]]);
      }

      if (currentStep >= steps) {
        clearInterval(timer);
        setProgress(100);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [logs.length]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#000814] flex flex-col items-center justify-center overflow-hidden font-mono text-white">
      {/* Tactical CRT Overlay */}
      <div className="absolute inset-0 pointer-events-none z-[100] opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%]"></div>
      
      {/* Side Log HUD */}
      <div className="absolute top-12 left-12 text-[9px] text-brand-orange/40 space-y-2 z-10 hidden lg:block">
        {logs.map((log, i) => (
          <div key={i} className="animate-fade-in">&gt; {log}</div>
        ))}
      </div>

      <div className="relative z-20 flex flex-col items-center">
        <div className="mb-24 text-center relative animate-fade-in">
          <div className="absolute -inset-32 bg-brand-orange/[0.03] blur-[120px] rounded-full animate-pulse-slow"></div>
          <div className="relative">
            <h1 className="text-7xl font-black text-white tracking-tighter leading-none select-none uppercase">
              GRID <span className="text-brand-orange">ALPHA</span>
            </h1>
            <div className="flex items-center justify-center gap-6 mt-8">
              <div className="h-[1px] w-12 bg-white/10"></div>
              <p className="text-[10px] font-black text-blue-300/30 uppercase tracking-[0.8em] whitespace-nowrap">Tactical Deployment System</p>
              <div className="h-[1px] w-12 bg-white/10"></div>
            </div>
          </div>
        </div>

        <div className="w-80 relative animate-slide-up">
          <div className="flex justify-between items-end mb-6 px-1">
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${progress > 30 ? 'bg-brand-orange shadow-[0_0_8px_#FF5F00]' : 'bg-white/5'}`}></div>
                <div className={`w-1.5 h-1.5 rounded-full ${progress > 60 ? 'bg-brand-orange shadow-[0_0_8px_#FF5F00]' : 'bg-white/5'}`}></div>
                <div className={`w-1.5 h-1.5 rounded-full ${progress > 90 ? 'bg-brand-orange shadow-[0_0_8px_#FF5F00]' : 'bg-white/5'}`}></div>
              </div>
              <span className="text-[11px] font-black text-white/20 uppercase tracking-[0.3em] min-w-[180px]">{loadingText}</span>
            </div>
            <span className="text-[16px] font-black text-brand-orange tracking-tighter w-12 text-right">{Math.round(progress)}%</span>
          </div>
          
          <div className="h-1.5 w-full bg-white/[0.03] rounded-full p-[1px] border border-white/5 overflow-hidden">
            <div 
              className="h-full bg-brand-orange rounded-full transition-all duration-75 ease-out shadow-[0_0_20px_#FF5F00]" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-16 text-center animate-fade-in">
        <div className="flex items-center gap-4 px-8 py-3 rounded-2xl border border-white/5 bg-white/[0.02]">
           <div className="w-2 h-2 rounded-full bg-emerald-500/40 animate-pulse"></div>
           <span className="text-[9px] text-white/30 uppercase font-black tracking-[0.6em]">STATUS: PRODUCTION_ENCRYPTED</span>
        </div>
      </div>
    </div>
  );
};