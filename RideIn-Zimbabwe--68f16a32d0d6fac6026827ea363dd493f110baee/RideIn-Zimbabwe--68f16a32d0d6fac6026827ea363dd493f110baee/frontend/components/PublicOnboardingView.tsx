
import React, { useState, useEffect } from 'react';
import { Button } from './Shared';

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
  color: string;
  highlight: string;
  tagline: string;
}

export const PublicOnboardingView: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const steps: OnboardingStep[] = [
    {
      title: "TACTICAL_MOBILITY",
      description: "Zimbabwe's premier AI-driven transport marketplace. Deploying optimized routing for riders and heavy freight across the nation.",
      icon: "rocket",
      color: "text-brand-orange",
      highlight: "NETWORK_ACTIVE",
      tagline: "MISSION_READY"
    },
    {
      title: "GEMINI_COGNITION",
      description: "Harness 'Magic Assist' for natural language dispatch. Simply describe your mission parameters and let our AI handle the logistics.",
      icon: "brain",
      color: "text-blue-400",
      highlight: "NEURAL_LINK_v2.5",
      tagline: "CORE_INTELLIGENCE"
    },
    {
      title: "ELITE_MARKETPLACE",
      description: "Strategic bidding protocol for total transparency. Drivers compete for your mission, ensuring market-fair pricing every time.",
      icon: "microchip",
      color: "text-emerald-500",
      highlight: "SECURE_GRID",
      tagline: "PROTOCOL_ALPHA"
    }
  ];

  const step = steps[currentStep];

  useEffect(() => {
    setIsTyping(true);
    setDisplayText('');
    let i = 0;
    const interval = setInterval(() => {
      setDisplayText(step.title.slice(0, i + 1));
      i++;
      if (i >= step.title.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [currentStep, step.title]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#000814] flex flex-col items-center justify-center p-8 animate-fade-in overflow-hidden font-mono text-white">
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/10 rounded-full animate-spin-slow"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full animate-reverse-spin"></div>
      </div>

      <div className="w-full max-w-sm relative z-10 flex flex-col items-center text-center">
        <div className="mb-14 animate-slide-down">
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="text-[9px] font-black text-brand-orange tracking-[0.5em]">PHASE_0{currentStep + 1}</span>
            <div className="h-[1px] w-8 bg-white/10"></div>
            <span className="text-[9px] font-black text-white/20 tracking-[0.5em]">{step.tagline}</span>
          </div>
          <h1 className="text-2xl font-black text-white italic tracking-tighter">RideIn <span className="text-white/20 uppercase font-mono not-italic text-sm ml-1">v2.5</span></h1>
        </div>

        <div className="relative w-72 h-72 mb-14 flex items-center justify-center">
          <div className="absolute inset-0 border border-brand-orange/10 rounded-full animate-pulse"></div>
          <div className="absolute inset-8 border border-white/5 rounded-full animate-reverse-spin"></div>
          <div className="absolute inset-16 border-2 border-brand-orange/5 rounded-full animate-spin-slow"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-brand-orange/10 animate-spin-slow origin-center"></div>

          <div className="w-44 h-44 rounded-[3.5rem] bg-[#001D3D]/60 backdrop-blur-3xl border border-white/10 flex items-center justify-center shadow-2xl relative group overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
             <i className={`fa-solid fa-${step.icon} text-7xl ${step.color} transition-all duration-500 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] z-10`}></i>
             
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                {steps.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= currentStep ? 'bg-brand-orange shadow-[0_0_5px_#FF5F00]' : 'bg-white/10'}`}></div>
                ))}
             </div>
          </div>

          <div className="absolute -bottom-4 bg-brand-orange text-white text-[9px] font-black px-6 py-2 rounded-xl tracking-[0.4em] shadow-2xl whitespace-nowrap z-30 animate-scale-in">
             {step.highlight}
          </div>
        </div>

        <div className="min-h-[160px] flex flex-col justify-start mb-8">
          <h2 className="text-3xl font-black text-white tracking-tighter mb-5 uppercase italic h-10 flex items-center justify-center">
            {displayText}
            {isTyping && <span className="w-2 h-6 bg-brand-orange ml-1 animate-pulse"></span>}
          </h2>
          <p className="text-blue-100/40 text-[14px] font-bold leading-relaxed max-w-[280px] mx-auto animate-fade-in" key={currentStep}>
            {step.description}
          </p>
        </div>

        <div className="w-full space-y-4">
          <Button 
            variant="secondary" 
            className="w-full py-7 text-[12px] font-black uppercase tracking-[0.5em] rounded-[2rem] shadow-[0_20px_40px_rgba(255,95,0,0.15)] haptic-press"
            onClick={handleNext}
          >
            {currentStep === steps.length - 1 ? 'ACTIVATE_NODE' : 'NEXT_PHASE'}
          </Button>

          <button 
            onClick={onComplete}
            className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em] hover:text-brand-orange/60 transition-colors py-3"
          >
            SKIP_ENCRYPTION
          </button>
        </div>
      </div>

      <div className="absolute bottom-12 inset-x-12 flex justify-between items-center opacity-10 text-[9px] font-black text-white tracking-[0.6em]">
        <span>REGION::AFRICA_ZW</span>
        <div className="h-[1px] flex-1 mx-8 bg-white/20"></div>
        <span>UID_GRID_CALIBRATED</span>
      </div>
    </div>
  );
};
