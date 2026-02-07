import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 5000, onClose }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info',
  };

  const styles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  return (
    <div
      className={`${styles[type]} rounded-2xl shadow-2xl p-4 mb-3 flex items-start gap-3 animate-slide-in-right min-w-[280px] max-w-md`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <i className={`fa-solid ${icons[type]} text-xl mt-0.5 flex-shrink-0`}></i>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-tight break-words">{message}</p>
      </div>
      <button
        onClick={() => onClose(id)}
        className="text-white/80 hover:text-white transition-colors flex-shrink-0"
        aria-label="Close notification"
      >
        <i className="fa-solid fa-xmark text-lg"></i>
      </button>
    </div>
  );
};

export default Toast;
