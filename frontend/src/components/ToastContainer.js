import React, { useState, useCallback } from 'react';
import Toast from './Toast';

let toastId = 0;

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 5000) => {
    const id = ++toastId;
    const newToast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    return id;
  }, []);

  // Expose the addToast function globally
  React.useEffect(() => {
    window.showToast = addToast;
    return () => {
      delete window.showToast;
    };
  }, [addToast]);

  return (
    <div className="toast-container">
      {toasts.map((toast, index) => (
        <div 
          key={toast.id} 
          style={{ 
            position: 'fixed',
            top: `${20 + index * 70}px`,
            right: '20px',
            zIndex: 10000 + index
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

// Helper functions for easy use
export const showToast = {
  success: (message, duration) => window.showToast?.(message, 'success', duration),
  error: (message, duration) => window.showToast?.(message, 'error', duration),
  warning: (message, duration) => window.showToast?.(message, 'warning', duration),
  info: (message, duration) => window.showToast?.(message, 'info', duration),
  beaver: (message, duration) => window.showToast?.(message, 'beaver', duration)
};

export default ToastContainer; 