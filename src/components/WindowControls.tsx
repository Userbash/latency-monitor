// src/components/WindowControls.tsx
import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export const WindowControls: React.FC = () => {
  const handleMinimize = () => {
    window.electronAPI?.windowControl('minimize');
  };

  const handleClose = () => {
    window.electronAPI?.windowControl('close');
  };

  const handleMaximize = () => {
    window.electronAPI?.windowControl('maximize');
  };

  return (
    <div className="window-controls no-drag">
      <button
        onClick={handleMinimize}
        className="window-control-btn window-control-btn-min"
        title="Minimize"
      >
        <Minus size={16} />
      </button>
      <button
        onClick={handleMaximize}
        className="window-control-btn window-control-btn-max"
        title="Maximize"
      >
        <Square size={14} />
      </button>
      <button
        onClick={handleClose}
        className="window-control-btn window-control-btn-close"
        title="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
};
