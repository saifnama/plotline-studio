import { useState } from 'react';
import { Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut, Hand, MousePointer2, Grid, ExternalLink } from 'lucide-react';

interface ToolbarProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  panMode: boolean;
  onTogglePan: () => void;
  onReset: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onFullscreen: () => void;
}

export default function Toolbar({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  panMode,
  onTogglePan,
  onReset,
  showGrid,
  onToggleGrid,
  onFullscreen
}: ToolbarProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl z-20">
      <div className="flex items-center gap-1 px-2 border-r border-zinc-200 dark:border-zinc-700 mr-1">
        <button 
          onClick={onTogglePan}
          className={`p-2 rounded-xl transition-colors ${panMode ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'}`}
          title={panMode ? "Switch to Select Mode" : "Switch to Pan Mode"}
        >
          {panMode ? <Hand size={18} /> : <MousePointer2 size={18} />}
        </button>
        <button 
          onClick={onToggleGrid}
          className={`p-2 rounded-xl transition-colors ${showGrid ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'}`}
          title="Toggle Grid"
        >
          <Grid size={18} />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button 
          onClick={onZoomOut}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-xl transition-colors" 
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <span className="text-xs font-medium text-zinc-500 w-12 text-center">
          {zoomLevel}%
        </span>
        <button 
          onClick={onZoomIn}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-xl transition-colors" 
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
      </div>

      <div className="flex items-center gap-1 ml-1 border-l border-zinc-200 dark:border-zinc-700 pl-1">
        <button 
          onClick={onReset}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-xl transition-colors" 
          title="Reset View (Fit to Screen)"
        >
          <RotateCcw size={18} />
        </button>
        <button 
          onClick={onFullscreen}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-xl transition-colors" 
          title="Open in New Tab"
        >
          <ExternalLink size={18} />
        </button>
      </div>
    </div>
  );
}
