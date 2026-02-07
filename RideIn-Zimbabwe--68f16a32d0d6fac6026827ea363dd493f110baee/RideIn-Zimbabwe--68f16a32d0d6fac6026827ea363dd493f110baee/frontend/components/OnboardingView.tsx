import React, { useState } from 'react';
import { Button } from './Shared';

interface OnboardingStep {
  title: string;
  description: string;
  color: string;
  protocolName: string;
}

interface OnboardingViewProps {
  role: 'rider' | 'driver';
  onComplete: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ role, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const riderSteps: OnboardingStep[] = [
    {
      protocolName: "Neural Link",
      title: "Smart Dispatch",
      description: "Request rides or freight deliveries using natural language. Our AI understand landmarks and local context instantly.",
      color: "text-brand-blue"
    },
    {
      protocolName: "Market Grid",
      title: "Bidding Market",
      description: "Drivers compete for your trip in real-time. Choose your partner based on price, rating, and vehicle class.",
      color: "text-brand-orange"
    },
    {
      protocolName: "Secure Path",
      title: "Tactical Safety",
      description: "Every journey is monitored by our security grid. Share your live location with trusted contacts with a single tap.",
      color: "text-brand-blue"
    }
  ];

  const driverSteps: OnboardingStep[] = [
    {
      protocolName: "Ops Control",
      title: "Mission Control",
      description: "Access a constant stream of high-value ride and freight requests across your designated service areas.",
      color: "text-brand-orange"
    },
    {
      protocolName: "Yield Protocol",
      title: "Strategic Bidding",
      description: "Set your own prices. Counter-offer on requests and build your reputation as an elite marketplace partner.",
      color: "text-brand-blue"
    },
    {
      protocolName: "Asset Support",
      title: "Fleet Support",
      description: "Benefit from localized mapping and real-time traffic intelligence optimized for the Zimbabwean landscape.",
      color: "text-brand-orange"
    }
  ];

  const steps = role === 'rider' ? riderSteps : driverSteps;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[500] bg-white flex flex-col font-sans overflow-y-auto">
      {/* Background Stylized Number */}
      <div className="absolute top-0 right-0 p-10 pointer-events-none select-none overflow-hidden h-full flex items-center">
        <span 
          className={`text-[32rem] font-black opacity-[0.04] leading-none transition-all duration-700 ease-in-out transform ${step.color} ${
            currentStep % 2 === 0 ? 'translate-x-12' : '-translate-x-12'
          }`}
          style={{ letterSpacing: '-0.05em' }}
        >
          {currentStep + 1}
        </span>
      </div>

      <div className="flex-1 flex flex-col px-10 pt-24 pb-12 relative z-10 min-h-screen">
        {/* Top Navigation HUD */}
        <div className="flex items-center justify-between mb-16 shrink-0">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-500 ease-out ${
                  i === currentStep ? 'w-12 bg-slate-900' : 'w-4 bg-slate-100'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Step 0{currentStep + 1} / 03</span>
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-center max-w-sm mb-12">
          <div className="mb-6 animate-fade-in">
            <span className={`text-[10px] font-black uppercase tracking-[0.5em] mb-4 block ${step.color}`}>
              {step.protocolName}
            </span>
            <h1 className="text-6xl font-black text-slate-900 leading-[0.9] tracking-tighter uppercase mb-8">
              {step.title}
            </h1>
            <div className="w-12 h-1 bg-slate-900 mb-8"></div>
          </div>

          <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-[280px]">
            {step.description}
          </p>
        </div>

        {/* Action HUD */}
        <div className="mt-auto space-y-6 shrink-0">
          <Button 
            variant={isLastStep ? "primary" : "outline"} 
            className={`w-full py-7 rounded-2xl shadow-2xl transition-all duration-300 font-black uppercase tracking-[0.25em] text-[11px] border-2 ${
              isLastStep 
                ? "bg-slate-900 text-white border-slate-900" 
                : "bg-white text-slate-900 border-slate-100 hover:border-slate-300"
            }`}
            onClick={handleNext}
          >
            {isLastStep ? "Initiate Mode" : "Continue"}
          </Button>
          
          <div className="flex items-center justify-between px-2">
            {!isLastStep && (
              <button 
                onClick={onComplete}
                className="py-2 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] hover:text-slate-500 transition-colors"
              >
                Skip Briefing
              </button>
            )}
            <div className="flex items-center gap-3 ml-auto opacity-20">
              <div className="h-[1px] w-8 bg-slate-900"></div>
              <span className="text-[9px] font-black text-slate-900 uppercase tracking-[0.3em]">RideIn Zimbabwe</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Grid Pattern Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]"></div>
    </div>
  );
};