import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'dark' | 'white';
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

  const base = "relative px-6 py-4 rounded-xl font-bold transition-all duration-200 haptic-press flex items-center justify-center gap-2 tracking-wide disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden";
  
  const variants = {
    primary: "bg-brand-blue text-white shadow-md active:shadow-none",
    secondary: "bg-brand-orange text-white shadow-md active:shadow-none",
    dark: "bg-black text-white active:bg-zinc-900",
    outline: "bg-white border border-zinc-200 text-black hover:bg-zinc-50 active:bg-zinc-100",
    danger: "bg-red-50 text-red-600 active:bg-red-100",
    ghost: "bg-transparent text-zinc-500 hover:bg-black/5 active:bg-black/10",
    white: "bg-white text-black shadow-sm border border-zinc-100"
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
  variant?: 'elevated' | 'outline' | 'white';
}>(({ children, className = '', onClick, variant = 'elevated' }) => {
  const variants = {
    elevated: "bg-white shadow-md border border-zinc-100",
    outline: "bg-white border border-zinc-200",
    white: "bg-white"
  };

  return (
    <div 
      onClick={onClick}
      className={`rounded-2xl p-6 ${variants[variant]} ${onClick ? 'cursor-pointer haptic-press transition-all active:bg-zinc-50' : ''} ${className}`}
    >
      {children}
    </div>
  );
});

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: string;
  variant?: 'light' | 'white';
  prefixText?: string;
  error?: string;
}

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
      input: "bg-zinc-50 border-transparent border-b-zinc-200 border-b text-black focus:border-black focus:bg-zinc-100",
      icon: "text-zinc-400 group-focus-within:text-black"
    },
    white: {
      label: "text-zinc-400 font-bold",
      input: "bg-white border-zinc-200 border text-black focus:border-black",
      icon: "text-zinc-300 group-focus-within:text-black"
    }
  };

  const s = styles[variant];
  const paddingClass = icon ? (prefixText ? 'pl-20 pr-6' : 'pl-12 pr-6') : 'px-6';

  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className={`text-[10px] uppercase tracking-widest ml-1 block ${s.label}`}>{label}</label>}
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
          className={`w-full ${paddingClass} py-4 rounded-xl font-medium text-base focus:outline-none transition-all ${s.input} ${error ? 'border-red-500 focus:border-red-500' : ''}`}
        />
      </div>
      {error && <p className="text-[10px] font-bold text-red-500 ml-1 mt-1 uppercase tracking-wider">{error}</p>}
    </div>
  );
});

export const Badge = React.memo<{ children: React.ReactNode; color?: string; className?: string }>(({ children, color = 'blue', className = '' }) => {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-brand-blue",
    orange: "bg-orange-50 text-brand-orange",
    emerald: "bg-emerald-50 text-emerald-600",
    gray: "bg-zinc-100 text-zinc-600"
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${colors[color] || colors.blue} ${className}`}>
      {children}
    </span>
  );
});