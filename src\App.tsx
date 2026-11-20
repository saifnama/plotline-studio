import React, { useState, useRef, useEffect } from 'react';
import { Save, FileUp, FileDown, Share2, Moon, Sun, ChevronLeft, ChevronRight, Database, Network, Trash2, Home, X, Check, ClipboardCopy } from 'lucide-react';
import { useDiagram } from './hooks/useDiagram';
import DiagramCanvas, { DiagramCanvasHandle } from './components/DiagramCanvas';
import Toolbar from './components/Toolbar';
import { parseSQLToDBML, parseDBMLToSQL } from './lib/sql-parser';
import { parseDBML, generateMermaidER } from './lib/dbml-parser';
import MarkmapCanvas from './components/MarkmapCanvas';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const {
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
  } = useDiagram();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [panMode, setPanMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [fileName, setFileName] = useState('Untitled Diagram');
  const [hasStarted, setHasStarted] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [sqlImportModalOpen, setSqlImportModalOpen] = useState(false);
  const [sqlImportText, setSqlImportText] = useState('');
  const [exportBg, setExportBg] = useState<'transparent' | 'light' | 'dark'>('transparent');
  const [isCopied, setIsCopied] = useState(false);
  const canvasRef = useRef<DiagramCanvasHandle>(null);

  // Only compute Mermaid DBML if active tab is database
  const diagramCode = state.activeTab === 'database'
    ? (() => {
      try {
        return generateMermaidER(parseDBML(state.dbmlCode), state.dbDetailLevel);
      } catch (e) {
        console.error('Failed to parse DBML:', e);
        return 'erDiagram\n'; // Return empty diagram on error
      }
    })()
    : state.activeTab === 'flowchart' ? state.flowchartCode : state.markmapCode;

  const handleExportSQL = () => {
    try {
      const sql = parseDBMLToSQL(state.dbmlCode);
      const blob = new Blob([sql], { type: 'text/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.sql`;
      a.click();
    } catch (e) {
      console.error('Failed to export SQL:', e);
      alert('Failed to parse DBML. Please check your DBML syntax.');
    }
  };

  const handleImportSQL = () => {
    setSqlImportText('');
    setSqlImportModalOpen(true);
  };

  const submitSQLImport = (sqlString: string) => {
    if (!sqlString.trim()) return;
    try {
      const dbml = parseSQLToDBML(sqlString);
      setDbmlCode(dbml);
      setSqlImportModalOpen(false);
      setTab('database');
    } catch (e) {
      console.error('Failed to parse SQL:', e);
      alert('Failed to parse SQL. Please check your SQL syntax.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      submitSQLImport(content);
    };
    reader.readAsText(file);

    // Reset input so the same file can be uploaded again if needed
    e.target.value = '';
  };

  // Get the live SVG and its content bounding box (works because it's in the DOM)
  const getLiveSvgWithBounds = () => {
    const liveSvg = canvasRef.current?.getSvg();
    if (!liveSvg) return null;

    let innerG = liveSvg.querySelector('.mermaid-main-g') as SVGGElement;
    if (!innerG) innerG = liveSvg.querySelector('g') as SVGGElement;
    if (!innerG) return null;

    const bbox = innerG.getBBox();
    if (!bbox || (bbox.width === 0 && bbox.height === 0)) return null;

    return { liveSvg, bbox };
  };

  // Create a clean, export-ready SVG clone with proper framing
  const createExportClone = (padding = 20) => {
    const result = getLiveSvgWithBounds();
    if (!result) return null;
    const { liveSvg, bbox } = result;

    const clone = liveSvg.cloneNode(true) as SVGSVGElement;

    // Remove d3-zoom transform from the inner group
    let cloneG = clone.querySelector('.mermaid-main-g') as SVGGElement;
    if (!cloneG) cloneG = clone.querySelector('g') as SVGGElement;
    if (cloneG) cloneG.removeAttribute('transform');

    const w = bbox.width + padding * 2;
    const h = bbox.height + padding * 2;

    // Set proper viewBox and dimensions for standalone rendering
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${w} ${h}`);
    clone.setAttribute('width', String(w));
    clone.setAttribute('height', String(h));
    // Clear editor-specific inline styles
    clone.style.cssText = '';

    return { clone, width: w, height: h, bbox };
  };

  const handleExportSVG = () => {
    const result = createExportClone(20);
    if (!result) return;
    const { clone, bbox } = result;

    // Use a rect element for background (more reliable than CSS background in SVG files)
    if (exportBg === 'light' || exportBg === 'dark') {
      const vb = clone.getAttribute('viewBox')!.split(' ').map(Number);
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(vb[0]));
      rect.setAttribute('y', String(vb[1]));
      rect.setAttribute('width', String(vb[2]));
      rect.setAttribute('height', String(vb[3]));
      rect.setAttribute('fill', exportBg === 'dark' ? '#18181b' : '#ffffff');
      clone.insertBefore(rect, clone.firstChild);
    }

    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportImage = (format: 'png' | 'jpeg') => {
    const result = createExportClone(40);
    if (!result) return;
    const { clone, width, height } = result;

    const svgData = new XMLSerializer().serializeToString(clone);
    // Use data URL for maximum compatibility (avoids CORS/blob issues with Image)
    const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;

      if (ctx) {
        // Draw background first
        if (exportBg === 'dark') {
          ctx.fillStyle = '#18181b';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (exportBg === 'light' || format === 'jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imgUrl = canvas.toDataURL(`image/${format}`, 1.0);
        const a = document.createElement('a');
        a.href = imgUrl;
        a.download = `${fileName}.${format === 'jpeg' ? 'jpg' : 'png'}`;
        a.click();
      }
    };
    img.onerror = (e) => console.error('Failed to load SVG for export:', e);
    img.src = svgDataUrl;
  };

  const copyDiagramToClipboard = () => {
    const result = createExportClone(40);
    if (!result) return;
    const { clone, width, height } = result;

    const svgData = new XMLSerializer().serializeToString(clone);
    const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;

      if (ctx) {
        // Draw background based on current main app theme
        if (state.isDarkMode) {
          ctx.fillStyle = '#18181b';
        } else {
          ctx.fillStyle = '#ffffff';
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
            } catch (err) {
              console.error('Failed to copy image to clipboard:', err);
              alert('Failed to copy image to clipboard. Your browser might not support this feature or requires a secure context (HTTPS).');
            }
          }
        }, 'image/png', 1.0);
      }
    };
    img.onerror = (e) => console.error('Failed to load SVG for clipboard:', e);
    img.src = svgDataUrl;
  };

  const handleFullscreen = () => {
    const result = createExportClone(20);
    if (!result) return;
    const { clone } = result;

    clone.removeAttribute('width');
    clone.removeAttribute('height');

    const svgData = new XMLSerializer().serializeToString(clone);
    const bg = state.isDarkMode ? '#18181b' : '#f4f4f5';
    const html = `<!DOCTYPE html><html><head><title>${fileName}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:${bg}}svg{max-width:90vw;max-height:90vh}</style></head><body>${svgData}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleZoomIn = () => {
    canvasRef.current?.zoomIn?.();
  };

  const handleZoomOut = () => {
    canvasRef.current?.zoomOut?.();
  };

  const handleImportFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = state.activeTab === 'flowchart' ? '.mermaid,.txt' : '.dbml,.sql,.txt';
    if (state.activeTab === 'markmap') input.accept = '.md,.txt'; // Added for markmap
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (re: any) => {
        const content = re.target.result;
        try {
          if (state.activeTab === 'flowchart') {
            setFlowchartCode(content);
          } else if (state.activeTab === 'database') {
            if (file.name.endsWith('.sql')) {
              setDbmlCode(parseSQLToDBML(content));
            } else {
              setDbmlCode(content);
            }
          } else if (state.activeTab === 'markmap') { // Added for markmap
            setMarkmapCode(content);
          }
        } catch (e) {
          console.error('Failed to parse file:', e);
          alert('Failed to parse file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        console.log('Saved!');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleImportFile();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        canvasRef.current?.fitToScreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.activeTab]);

  return (
    <div className={cn("flex flex-col h-screen overflow-hidden", state.isDarkMode && "dark")}>
      {/* App Bar */}
      <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {hasStarted && (
              <button
                onClick={() => setHasStarted(false)}
                className="p-2 mr-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
                title="Dashboard"
              >
                <Home size={18} />
              </button>
            )}
            <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded-lg flex items-center justify-center">
              <Network className="text-white dark:text-zinc-900" size={18} />
            </div>
            <h1 className="font-bold text-zinc-900 dark:text-white hidden sm:block">Plotline Studio</h1>
          </div>
          {hasStarted && (
            <>
              <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-2" />
              <input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-medium text-zinc-600 dark:text-zinc-400 w-40"
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button onClick={toggleDarkMode} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors">
              {state.isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {hasStarted && (
              <div className="flex items-center gap-2">
                <button
                  onClick={copyDiagramToClipboard}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"
                  title="Copy Diagram to Clipboard"
                >
                  {isCopied ? <Check size={18} className="text-green-500" /> : <ClipboardCopy size={18} />}
                </button>
                <button
                  onClick={() => setExportModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Export <FileDown size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden bg-white dark:bg-zinc-950 relative">
        {/* SQL Import Modal */}
        {sqlImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-2xl w-[600px] max-w-full border border-zinc-200 dark:border-zinc-800 transform scale-100 transition-all flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Import SQL</h3>
                <button onClick={() => setSqlImportModalOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 flex flex-col min-h-[200px] mb-6">
                <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase shrink-0">Paste SQL CREATE TABLE statements</label>
                <textarea
                  value={sqlImportText}
                  onChange={(e) => setSqlImportText(e.target.value)}
                  className="w-full flex-1 p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono text-sm text-zinc-700 dark:text-zinc-300 resize-none focus:ring-2 focus:ring-blue-500/50 outline-none"
                  placeholder="CREATE TABLE IF NOT EXISTS users..."
                />
              </div>

              <div className="shrink-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="relative overflow-hidden group">
                    <button className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-bold transition-colors">
                      <FileUp size={16} />
                      Choose SQL File
                    </button>
                    <input
                      type="file"
                      accept=".sql,.txt"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={() => submitSQLImport(sqlImportText)}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                  >
                    <Check size={16} />
                    Import Code
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {exportModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-2xl w-[400px] border border-zinc-200 dark:border-zinc-800 transform scale-100 transition-all">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Export Diagram</h3>
                <button onClick={() => setExportModalOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase">Background Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setExportBg('transparent')} className={cn("py-2 rounded-lg text-sm font-medium border transition-colors", exportBg === 'transparent' ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800')}>Transparent</button>
                    <button onClick={() => setExportBg('light')} className={cn("py-2 rounded-lg text-sm font-medium border transition-colors", exportBg === 'light' ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800')}>Light</button>
                    <button onClick={() => setExportBg('dark')} className={cn("py-2 rounded-lg text-sm font-medium border transition-colors", exportBg === 'dark' ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800')}>Dark</button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase">Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { exportImage('png'); setExportModalOpen(false); }} className="flex items-center justify-center gap-2 py-3 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-sm font-bold text-zinc-900 dark:text-white transition-all">PNG Image</button>
                    <button onClick={() => { exportImage('jpeg'); setExportModalOpen(false); }} className="flex items-center justify-center gap-2 py-3 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-sm font-bold text-zinc-900 dark:text-white transition-all">JPG Image</button>
                    <button onClick={() => { handleExportSVG(); setExportModalOpen(false); }} className="flex items-center justify-center gap-2 py-3 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-sm font-bold text-zinc-900 dark:text-white transition-all">SVG Vector</button>
                    {state.activeTab === 'database' && (
                      <button onClick={() => { handleExportSQL(); setExportModalOpen(false); }} className="flex items-center justify-center gap-2 py-3 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-sm font-bold text-zinc-900 dark:text-white transition-all">SQL Script</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!hasStarted ? (
          <div className="absolute inset-0 z-40 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-8 overflow-y-auto">
            {/* Decorative background pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

            <div className="relative z-10 flex flex-col items-center max-w-5xl mx-auto mt-8 mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-6 border border-blue-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Diagramming Reimagined
              </div>

              <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 mb-6 text-center tracking-tight">
                Plotline Studio
              </h1>

              <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 text-center max-w-2xl leading-relaxed">
                The all-in-one visual workspace for developers. Map out your architecture, design database schemas, and brainstorm ideas entirely in your browser. Fully offline capable.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl relative z-10 pb-12">
              {/* Flowchart Card */}
              <button
                onClick={() => { setTab('flowchart'); setHasStarted(true); }}
                className="group flex flex-col text-left p-8 bg-white dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800/80 rounded-3xl hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                <div className="w-14 h-14 mb-6 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 transition-transform group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-blue-500/20 relative z-10">
                  <Network size={28} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3 relative z-10">Flowchart Engine</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed relative z-10">
                  Build complex architectural diagrams and process flows instantly using intuitive Mermaid code. Features auto-coloring and smart auto-layout routing.
                </p>
              </button>

              {/* Database Card */}
              <button
                onClick={() => { setTab('database'); setHasStarted(true); }}
                className="group flex flex-col text-left p-8 bg-white dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800/80 rounded-3xl hover:border-emerald-500 dark:hover:border-emerald-500 transition-all hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                <div className="w-14 h-14 mb-6 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 transition-transform group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-emerald-500/20 relative z-10">
                  <Database size={28} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3 relative z-10">Database Modeler</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed relative z-10">
                  Design complex Entity-Relationship schemas blazingly fast using rapid DBML syntax. Preview instantly and export directly to ready-to-use pure SQL.
                </p>
              </button>

              {/* Mindmap Card */}
              <button
                onClick={() => { setTab('markmap'); setHasStarted(true); }}
                className="group flex flex-col text-left p-8 bg-white dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800/80 rounded-3xl hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                <div className="w-14 h-14 mb-6 rounded-2xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 transition-transform group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-purple-500/20 relative z-10">
                  <Network size={28} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3 relative z-10">Markmap Canvas</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed relative z-10">
                  Transform simple bulleted Markdown text into vibrant, interactive mindmaps precisely engineered for dynamic brainstorming and knowledge mapping.
                </p>
              </button>
            </div>
          </div>
        ) : null}

        {/* Sidebar / Editor */}
        {isSidebarOpen && (
          <div
            className="relative flex flex-col w-[400px] bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shrink-0"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Editor</span>
              <div className="flex items-center gap-2">
                {state.activeTab === 'database' && (
                  <button
                    onClick={handleImportSQL}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                  >
                    IMPORT SQL
                  </button>
                )}
                <button
                  onClick={resetToDefault}
                  className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-red-500 transition-colors"
                  title="Reset to Default"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden p-4">
              <textarea
                value={state.activeTab === 'flowchart' ? state.flowchartCode : state.activeTab === 'database' ? state.dbmlCode : state.markmapCode}
                onChange={(e) => {
                  if (state.activeTab === 'flowchart') setFlowchartCode(e.target.value);
                  else if (state.activeTab === 'database') setDbmlCode(e.target.value);
                  else if (state.activeTab === 'markmap') setMarkmapCode(e.target.value);
                }}
                className="w-full h-full bg-transparent border-none focus:ring-0 font-mono text-sm text-zinc-700 dark:text-zinc-300 resize-none"
                spellCheck={false}
              />
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/50 space-y-3">
              {state.activeTab === 'flowchart' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Auto Coloring</span>
                    <button
                      onClick={toggleAutoColor}
                      className={cn(
                        "w-8 h-4 rounded-full transition-colors relative",
                        state.autoColor ? "bg-zinc-900 dark:bg-white" : "bg-zinc-300 dark:bg-zinc-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-3 h-3 rounded-full transition-all",
                        state.autoColor ? "right-0.5 bg-white dark:bg-zinc-900" : "left-0.5 bg-white"
                      )} />
                    </button>
                  </div>
                </div>
              )}

              {state.activeTab === 'database' && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Detail Level</span>
                  <select
                    value={state.dbDetailLevel}
                    onChange={(e) => setDbDetailLevel(e.target.value as any)}
                    className="bg-transparent border-none text-[10px] font-bold text-zinc-600 dark:text-zinc-400 focus:ring-0 cursor-pointer"
                  >
                    <option value="all">Show All Columns</option>
                    <option value="pk">Primary Keys Only</option>
                    <option value="none">Hide Columns</option>
                  </select>
                </div>
              )}


            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 relative">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute top-4 left-4 p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-md z-20 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all"
          >
            {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>

          {state.activeTab === 'markmap' ? (
            <MarkmapCanvas
              ref={canvasRef as any}
              code={diagramCode}
              isDarkMode={state.isDarkMode}
              showGrid={state.showGrid}
              panMode={panMode}
              zoomLevel={zoomLevel}
              onZoomChange={setZoomLevel}
              mindmapLinesOnly={state.mindmapLinesOnly}
              mindmapPadding={state.mindmapPadding}
            />
          ) : (
            <DiagramCanvas
              ref={canvasRef}
              code={diagramCode}
              isDarkMode={state.isDarkMode}
              showGrid={state.showGrid}
              panMode={panMode}
              autoColor={state.autoColor}
              zoomLevel={zoomLevel}
              onZoomChange={setZoomLevel}
            />
          )}

          <Toolbar
            zoomLevel={zoomLevel}
            onZoomIn={() => canvasRef.current?.zoomIn?.()}
            onZoomOut={() => canvasRef.current?.zoomOut?.()}
            panMode={panMode}
            onTogglePan={() => setPanMode(!panMode)}
            onReset={() => canvasRef.current?.fitToScreen()}
            showGrid={state.showGrid}
            onToggleGrid={toggleGrid}
            onFullscreen={handleFullscreen}
          />
        </div>
      </main>
    </div>
  );
}
