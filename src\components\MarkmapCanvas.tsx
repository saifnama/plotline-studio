import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap, loadCSS, loadJS } from 'markmap-view';
import * as markmapLib from 'markmap-view';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
import * as markmap from 'markmap-view';

interface MarkmapCanvasProps {
    code: string;
    isDarkMode: boolean;
    showGrid: boolean;
    panMode: boolean; // Note: Markmap has pan builtin, we might need to toggle it differently
    zoomLevel: number;
    onZoomChange: (zoom: number) => void;
}

export interface MarkmapCanvasHandle {
    fitToScreen: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    getSvg: () => SVGSVGElement | null;
}

const MarkmapCanvas = forwardRef<MarkmapCanvasHandle, MarkmapCanvasProps>(({
    code,
    isDarkMode,
    showGrid,
    panMode,
    zoomLevel,
    onZoomChange
}, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const markmapInstRef = useRef<Markmap | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Initialize and Render Markmap
    useEffect(() => {
        if (!svgRef.current) return;

        try {
            const transformer = new Transformer();
            const { root, features } = transformer.transform(code);
            const { styles, scripts } = transformer.getUsedAssets(features);

            if (styles) loadCSS(styles);
            if (scripts) {
                loadJS(scripts);
            }

            if (markmapInstRef.current) {
                markmapInstRef.current.setData(root);
                markmapInstRef.current.fit();
            } else {
                markmapInstRef.current = Markmap.create(svgRef.current, {
                    autoFit: true
                }, root);
            }

            setError(null);
        } catch (err) {
            console.error('Markmap Render Error:', err);
            setError(err instanceof Error ? err.message : String(err));
        }
    }, [code]);

    // Handle dark mode changes natively via Markmap CSS vars
    useEffect(() => {
        if (!svgRef.current) return;

        // Markmap handles dark mode automatically via prefers-color-scheme or a parent HTML class.
        // However, since we define 'dark' at the app level, it typically inherits successfully.
        // If not, we can force colors here or ensure the parent div handles it cleanly.
    }, [isDarkMode]);

    // Map external controls to internal d3/markmap zoom behavior
    useImperativeHandle(ref, () => ({
        fitToScreen: () => {
            if (markmapInstRef.current) markmapInstRef.current.fit();
            onZoomChange(100);
        },
        zoomIn: () => {
            // Markmap uses d3 zoom internally, but its API doesn't expose zoomIn easily.
            // We'll leave this as a no-op temporarily or handle via a basic scale update if possible.
            // Markmap's built-in wheel zoom works best.
        },
        zoomOut: () => {
            // Same as zoomIn
        },
        getSvg: () => svgRef.current
    }));

    return (
        <div className="relative w-full h-full overflow-hidden bg-white dark:bg-zinc-900 border-x border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
            {showGrid && (
                <div
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                        backgroundImage: `radial-gradient(circle, ${isDarkMode ? '#ffffff' : '#000000'} 1px, transparent 1px)`,
                        backgroundSize: '20px 20px'
                    }}
                />
            )}
            <svg
                ref={svgRef}
                className={cn("w-full h-full markmap", isDarkMode && "dark", "relative z-10")}
                style={{ cursor: panMode ? 'grab' : 'default' }}
            />
            {error && (
                <div className="absolute top-4 left-4 right-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm font-mono whitespace-pre-wrap z-10">
                    <p className="font-bold mb-1">Markmap Render Error:</p>
                    {error}
                </div>
            )}
        </div>
    );
});

MarkmapCanvas.displayName = 'MarkmapCanvas';

export default MarkmapCanvas;
