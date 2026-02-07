import { useEffect, useState } from 'react';
import React from 'react';

export const SplashAnimation: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => (p >= 100 ? 100 : p + 2));
    }, 30);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center font-sans">
      <div className="relative z-20 flex flex-col items-center">
        <h1 className="text-5xl font-black text-black tracking-tighter uppercase mb-12">
          RIDE<span className="text-brand-orange">IN</span>
        </h1>
        <div className="w-64 h-1 bg-zinc-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-brand-blue transition-all duration-75" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};