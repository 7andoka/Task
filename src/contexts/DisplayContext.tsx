import React, { createContext, useContext, useEffect, useState } from 'react';

export type LayoutWidthMode = 'full' | 'ultra' | 'standard' | 'compact';

interface DisplayContextType {
  zoomLevel: number;
  widthMode: LayoutWidthMode;
  setZoomLevel: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setWidthMode: (mode: LayoutWidthMode) => void;
}

const ZOOM_STORAGE_KEY = 'richland_app_zoom_level';
const WIDTH_STORAGE_KEY = 'richland_app_width_mode';

const DisplayContext = createContext<DisplayContextType | undefined>(undefined);

export const DisplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [zoomLevel, setZoomLevelState] = useState<number>(() => {
    try {
      const savedZoom = localStorage.getItem(ZOOM_STORAGE_KEY);
      if (savedZoom) {
        const parsed = parseInt(savedZoom, 10);
        if (!isNaN(parsed) && parsed >= 60 && parsed <= 160) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return 100;
  });

  const [widthMode, setWidthModeState] = useState<LayoutWidthMode>(() => {
    try {
      const savedWidth = localStorage.getItem(WIDTH_STORAGE_KEY) as LayoutWidthMode | null;
      if (savedWidth && ['full', 'ultra', 'standard', 'compact'].includes(savedWidth)) {
        return savedWidth;
      }
    } catch {
      // Ignore
    }
    return 'full';
  });

  // Apply zoom to document body / root
  useEffect(() => {
    const root = document.documentElement;
    const zoomRatio = zoomLevel / 100;
    
    // Modern CSS zoom support
    (root.style as any).zoom = `${zoomRatio}`;
    root.style.setProperty('--app-zoom-factor', `${zoomRatio}`);

    try {
      localStorage.setItem(ZOOM_STORAGE_KEY, String(zoomLevel));
    } catch {
      // Ignore
    }
  }, [zoomLevel]);

  // Apply width mode to local storage
  useEffect(() => {
    try {
      localStorage.setItem(WIDTH_STORAGE_KEY, widthMode);
    } catch {
      // Ignore
    }
  }, [widthMode]);

  const setZoomLevel = (level: number) => {
    const clamped = Math.min(Math.max(level, 60), 160);
    setZoomLevelState(clamped);
  };

  const zoomIn = () => {
    setZoomLevelState(prev => Math.min(prev + 5, 160));
  };

  const zoomOut = () => {
    setZoomLevelState(prev => Math.max(prev - 5, 60));
  };

  const resetZoom = () => {
    setZoomLevelState(100);
  };

  const setWidthMode = (mode: LayoutWidthMode) => {
    setWidthModeState(mode);
  };

  return (
    <DisplayContext.Provider value={{
      zoomLevel,
      widthMode,
      setZoomLevel,
      zoomIn,
      zoomOut,
      resetZoom,
      setWidthMode
    }}>
      {children}
    </DisplayContext.Provider>
  );
};

export const useDisplay = (): DisplayContextType => {
  const context = useContext(DisplayContext);
  if (!context) {
    throw new Error('useDisplay must be used within a DisplayProvider');
  }
  return context;
};
