import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'brand-dark' | 'white' | 'uber';
  children?: React.ReactNode;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
}

export const Button = React.memo((props: ButtonProps) => {
  const { 
    children, 
    variant = 'primary', 
    className = '', 
    loading = false,
    disabled,
    ...rest 
  } = props;

  const base = "relative px-6 py-4 rounded-xl font-bold transition-all duration-300 haptic-press flex items-center justify-center gap-2 tracking-wide disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group";
  
  const variants = {
    primary: "bg-brand-blue text-white shadow-lg shadow-brand-blue/10 active:shadow-none",
    secondary: "bg-brand-orange text-white shadow-lg shadow-brand-orange/10 active:shadow-none",
    "brand-dark": "bg-black text-white active:bg-zinc-900",
    uber: "bg-black text-white hover:bg-zinc-800 text-sm uppercase tracking-widest active:scale-95",
    outline: "bg-white border-2 border-slate-100 text-slate-900 hover:border-black active:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200",
    ghost: "bg-transparent text-slate-500 hover:bg-black/5 active:bg-black/10",
    white: "bg-white text-black shadow-md active:shadow-sm"
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : children}
    </button>
  );
});

export const Card = React.memo<{ 
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void;
  variant?: 'elevated' | 'glass' | 'white' | 'uber';
}>(({ children, className = '', onClick, variant = 'uber' }) => {
  const variants = {
    elevated: "bg-white shadow-xl border border-gray-50",
    glass: "glass-morphism",
    white: "bg-white border border-gray-100 shadow-sm",
    uber: "bg-white border border-gray-100"
  };

  return (
    <div 
      onClick={onClick}
      className={`rounded-2xl p-6 ${variants[variant]} ${onClick ? 'cursor-pointer haptic-press transition-all active:bg-slate-50' : ''} ${className}`}
    >
      {children}
    </div>
  );
});

export const Input = React.memo<InputProps>(({ 
  label, 
  icon, 
  className = '', 
  variant = 'light',
  prefixText,
  error,
  ...rest 
}) => {
  
  const styles = {
    light: {
      label: "text-zinc-500 font-bold",
      input: "bg-zinc-50 border-transparent border-b-zinc-200 border-b-2 text-black focus:border-black focus:bg-zinc-100 rounded-t-xl",
      icon: "text-zinc-400 group-focus-within:text-black"
    },
    dark: {
      label: "text-neutral-500",
      input: "bg-neutral-800 border-b-2 border-neutral-700 text-white focus:border-brand-blue/50 rounded-t-xl",
      icon: "text-neutral-500 group-focus-within:text-white"
    },
    glass: {
      label: "text-zinc-400 font-bold tracking-[0.1em]",
      input: "bg-zinc-50 border-b-2 border-zinc-100 text-black placeholder-zinc-300 focus:border-black transition-all rounded-t-xl",
      icon: "text-zinc-300 group-focus-within:text-black transition-colors"
    }
  };

  const s = styles[variant];
  let paddingClass = icon ? 'pl-12 pr-6' : 'px-6';
  if (prefixText) paddingClass = icon ? 'pl-24 pr-6' : 'pl-16 pr-6';

  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className={`text-[10px] uppercase tracking-[0.1em] ml-1 block ${s.label}`}>{label}</label>}
      <div className="relative group">
        {icon && (
          <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center transition-colors ${s.icon}`}>
             <i className={`fa-solid fa-${icon} text-sm`}></i>
          </div>
        )}
        {prefixText && (
          <div className={`absolute top-1/2 -translate-y-1/2 font-bold text-sm pointer-events-none ${s.icon} ${icon ? 'left-12' : 'left-6'}`}>
            {prefixText}
          </div>
        )}
        <input
          {...rest}
          className={`w-full ${paddingClass} py-4 font-medium text-base focus:outline-none transition-all ${s.input} ${error ? 'border-red-500 focus:border-red-500' : ''}`}
        />
      </div>
      {error && <p className="text-[10px] font-bold text-red-500 ml-1 mt-1 uppercase tracking-wider">{error}</p>}
    </div>
  );
});

export const Badge = React.memo<{ children: React.ReactNode; color?: string; className?: string }>(({ children, color = 'blue', className = '' }) => {
  const colors: Record<string, string> = {
    blue: "bg-zinc-100 text-black",
    orange: "bg-orange-50 text-brand-orange",
    emerald: "bg-emerald-50 text-emerald-700",
    gray: "bg-slate-100 text-slate-600"
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest ${colors[color] || colors.blue} ${className}`}>
      {children}
    </span>
  );
});

export const Toggle = React.memo<{ 
  active: boolean; 
  onToggle: (val: boolean) => void; 
  label: string; 
  icon?: string;
  className?: string;
}>(({ active, onToggle, label, icon, className = '' }) => {
  return (
    <div className={`flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border-2 border-transparent transition-all haptic-press ${active ? 'border-brand-blue/10 bg-blue-50/50' : ''} ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-brand-blue text-white' : 'bg-white text-zinc-400 border border-zinc-100'}`}>
            <i className={`fa-solid fa-${icon} text-xs`}></i>
          </div>
        )}
        <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-brand-blue' : 'text-zinc-400'}`}>{label}</span>
      </div>
      <button
        type="button"
        onClick={() => onToggle(!active)}
        className={`w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none ${active ? 'bg-brand-blue' : 'bg-zinc-200'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${active ? 'left-7 shadow-lg' : 'left-1 shadow-sm'}`}></div>
      </button>
    </div>
  );
});

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: string;
  variant?: 'light' | 'dark' | 'glass';
  prefixText?: string;
  error?: string;
}