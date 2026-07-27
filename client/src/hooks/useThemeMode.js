import { useState, useEffect } from 'react';
import { getStoredMode, applyMode } from '../theme-mode';

// Returns [mode, toggle]. Applies the mode to <html> and persists it.
export function useThemeMode() {
  const [mode, setMode] = useState(getStoredMode);
  useEffect(() => { applyMode(mode); }, [mode]);
  const toggle = () => setMode(m => (m === 'dark' ? 'light' : 'dark'));
  return [mode, toggle];
}
