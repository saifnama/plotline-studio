import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import mermaid from 'mermaid';
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DiagramCanvasProps {
  code: string;
  isDarkMode: boolean;
  showGrid: boolean;
  panMode: boolean;
  autoColor: boolean;
  onZoomChange: (zoom: number) => void;
  zoomLevel: number;
  mindmapLinesOnly?: boolean;
  mindmapPadding?: number;
}

export interface DiagramCanvasHandle {
  fitToScreen: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  getSvg: () => SVGSVGElement | null;
}

const DiagramCanvas = forwardRef<DiagramCanvasHandle, DiagramCanvasProps>(({
  code,
  isDarkMode,
  showGrid,
  panMode,
  autoColor,
  onZoomChange,
  zoomLevel,
  mindmapLinesOnly,
  mindmapPadding = 4
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const zoomBehaviorRef = useRef<any>(null);
  const panModeRef = useRef(panMode);

  useEffect(() => {
    panModeRef.current = panMode;
  }, [panMode]);

  const fitToScreen = () => {
    if (!svgRef.current || !containerRef.current || !zoomBehaviorRef.current) {
      return;
    }
    const container = select(containerRef.current);

    // Reset transform so we can measure the unscaled bounding box accurately
    container.call(zoomBehaviorRef.current.transform, zoomIdentity);

    try {
      // Find the main group that contains the diagram content
      let innerG = svgRef.current.querySelector('.mermaid-main-g') as SVGGElement;
      if (!innerG) innerG = svgRef.current.querySelector('g') as SVGGElement;
      if (!innerG) return;

      // Use getBBox() for the actual visual boundaries of the diagram nodes
      const bbox = innerG.getBBox();

      if (!bbox || (bbox.width === 0 && bbox.height === 0)) {
        return;
      }

      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;

      if (cw === 0 || ch === 0) return;

      // Calculate scale with 10% padding
      const scale = Math.min(cw / bbox.width, ch / bbox.height) * 0.9;

      // Calculate translation to place the center of the bounding box at the center of the container
      const tx = (cw / 2) - (bbox.x + bbox.width / 2) * scale;
      const ty = (ch / 2) - (bbox.y + bbox.height / 2) * scale;

      container.call(zoomBehaviorRef.current.transform, zoomIdentity.translate(tx, ty).scale(scale));
    } catch (e) {
      console.warn("Could not calculate bounding box for fitToScreen", e);
    }
  };

  useImperativeHandle(ref, () => ({
    fitToScreen,
    zoomIn: () => {
      if (containerRef.current && zoomBehaviorRef.current) {
        select(containerRef.current).call(zoomBehaviorRef.current.scaleBy, 1.2);
      }
    },
    zoomOut: () => {
      if (containerRef.current && zoomBehaviorRef.current) {
        select(containerRef.current).call(zoomBehaviorRef.current.scaleBy, 0.8);
      }
    },
    getSvg: () => svgRef.current
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    // Use ResizeObserver to keep diagram centered when sidebar toggles or window resizes
    const resizeObserver = new ResizeObserver(() => {
      if (svgRef.current && zoomBehaviorRef.current) {
        fitToScreen();
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    try {
      mermaid.initialize({
        startOnLoad: false,
        suppressErrorRendering: true,
        theme: autoColor ? (isDarkMode ? 'dark' : 'default') : 'neutral',
        securityLevel: 'loose',
        fontFamily: 'Inter, sans-serif',
        themeVariables: autoColor ? {
          primaryColor: '#3b82f6',
          primaryTextColor: isDarkMode ? '#fff' : '#000',
          primaryBorderColor: '#2563eb',
          lineColor: '#6366f1',
          secondaryColor: '#10b981',
          tertiaryColor: '#f59e0b',
        } : {}
      });
    } catch (e) {
      console.error('Mermaid init error', e);
    }
  }, [isDarkMode, autoColor]);

  const renderDiagram = async () => {
    if (!containerRef.current || !code.trim()) {
      if (containerRef.current) containerRef.current.innerHTML = '';
      svgRef.current = null;
      setError(null);
      return;
    }

    try {
      // Use a more robust ID starting with a letter
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      const { svg } = await mermaid.render(id, code);

      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
        const svgElement = containerRef.current.querySelector('svg');
        if (svgElement) {
          // Remove viewBox so SVG user units = CSS pixels.
          // This eliminates the coordinate mismatch between d3-zoom (pixel space)
          // and SVG internals (viewBox space) that causes centering bugs.
          svgElement.removeAttribute('viewBox');
          svgElement.style.width = '100%';
          svgElement.style.height = '100%';
          svgElement.style.maxWidth = 'none';
          svgElement.style.overflow = 'visible';
          svgRef.current = svgElement;
          setupZoom();
          setError(null);
        }
      }
    } catch (e: any) {
      console.error('Mermaid render error', e);
      // Mermaid sometimes throws an error that is actually a string or has a specific structure
      const errorMessage = typeof e === 'string' ? e : (e.message || 'Syntax error in diagram');
      setError(errorMessage);

      // Clear the container on error so we don't show a broken diagram
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      svgRef.current = null;
    }
  };

  useEffect(() => {
    const timer = setTimeout(renderDiagram, 300);
    return () => clearTimeout(timer);
  }, [code, isDarkMode, autoColor]);

  const setupZoom = () => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = select(svgRef.current);
    const container = select(containerRef.current);

    const zoomBehavior = zoom()
      .scaleExtent([0.1, 10])
      .filter((event) => {
        // Always allow wheel (zoom), but only allow drag if panMode is true
        if (event.type === 'wheel') return !event.ctrlKey && !event.button; // standard d3-zoom filter
        return panModeRef.current;
      })
      .on('zoom', (event) => {
        const { transform } = event;
        // Apply transform to the inner content
        let innerG = svg.select('.mermaid-main-g');
        if (innerG.empty()) {
          innerG = svg.select('g');
        }
        innerG.attr('transform', transform as any);
        onZoomChange(Math.round(transform.k * 100));
      });

    zoomBehaviorRef.current = zoomBehavior;
    container.call(zoomBehavior);

    // Initial fit
    fitToScreen();
  };

  // Expose fitToScreen to parent if needed via ref or similar
  // For now, we'll just use it internally on setup

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-white dark:bg-zinc-900"
      style={
        {
          '--mindmap-padding': `${mindmapPadding}px`
        } as React.CSSProperties
      }
    >
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, ${isDarkMode ? '#ffffff' : '#000000'} 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        />
      )}

      <div
        ref={containerRef}
        className={cn(
          "w-full h-full flex items-center justify-center transition-opacity duration-300",
          error ? "opacity-0" : "opacity-100",
          mindmapLinesOnly && "mindmap-lines-only",
          panMode ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        )}
      />
      {error && (
        <div className="absolute top-4 left-4 right-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm font-mono whitespace-pre-wrap z-10">
          <p className="font-bold mb-1">Render Error:</p>
          {error}
        </div>
      )}
    </div>
  );
});

export default DiagramCanvas;
