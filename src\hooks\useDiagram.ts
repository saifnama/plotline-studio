import { useState, useEffect, useCallback } from 'react';
import { AppState, TabType, DbDetailLevel } from '../types';
import { DEFAULT_FLOWCHART, DEFAULT_DBML, DEFAULT_MARKMAP, STORAGE_KEY } from '../constants';

// Define the initial state structure for easier reference in resetToDefault
const initialAppState: AppState = {
  activeTab: 'flowchart',
  flowchartCode: DEFAULT_FLOWCHART,
  dbmlCode: DEFAULT_DBML,
  markmapCode: DEFAULT_MARKMAP,
  isDarkMode: false,
  showGrid: true,
  autoColor: true,
  dbDetailLevel: 'all'
};

export function useDiagram() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved state', e);
    }
    return initialAppState; // Use the defined initialAppState
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state', e);
    }
  }, [state]);

  // Sync dark mode class on the <html> element so Tailwind dark: classes work
  useEffect(() => {
    if (state.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.isDarkMode]);

  const setTab = (tab: TabType) => setState(s => ({ ...s, activeTab: tab }));
  const setFlowchartCode = (code: string) => setState(s => ({ ...s, flowchartCode: code }));
  const setDbmlCode = (code: string) => setState(s => ({ ...s, dbmlCode: code }));
  const setMarkmapCode = (code: string) => setState(s => ({ ...s, markmapCode: code }));
  const toggleDarkMode = () => setState(s => ({ ...s, isDarkMode: !s.isDarkMode }));

  const toggleGrid = () => setState(s => ({ ...s, showGrid: !s.showGrid }));
  const toggleAutoColor = () => setState(s => ({ ...s, autoColor: !s.autoColor }));
  const setDbDetailLevel = (level: DbDetailLevel) => setState(s => ({ ...s, dbDetailLevel: level }));

  const resetToDefault = useCallback(() => {
    if (state.activeTab === 'flowchart') {
      setFlowchartCode(initialAppState.flowchartCode);
    } else if (state.activeTab === 'database') {
      setDbmlCode(initialAppState.dbmlCode);
    } else if (state.activeTab === 'markmap') {
      setMarkmapCode(initialAppState.markmapCode);
    }
  }, [state.activeTab]);

  return {
    state,
    setTab,
    setFlowchartCode,
    setDbmlCode,
    setMarkmapCode,
    toggleDarkMode,
    toggleGrid,
    toggleAutoColor,
    setDbDetailLevel,
    resetToDefault
  };
}
