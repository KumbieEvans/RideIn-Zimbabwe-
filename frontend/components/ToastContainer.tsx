import React from 'react';
import Toast, { ToastProps } from './Toast';

export interface ToastContainerProps {
  toasts: Omit<ToastProps, 'onClose'>[];
  onClose: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col items-end pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      <div className="pointer-events-auto">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={onClose} />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
