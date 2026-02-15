import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ToolType, CardState, PageID, ASSETS, Point, CardElement, PageState, DrawingPath } from './types';

const encodeState = (state: CardState): string => btoa(JSON.stringify(state));
const decodeState = (hash: string): CardState | null => {
  try { return JSON.parse(atob(hash)); } catch { return null; }
};

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const EMPTY_PAGE: PageState = { elements: [] };

const WATERCOLOR_COLORS = [
  { name: 'Dark Gray', hex: '#2d3436' },
  { name: 'Sun', hex: '#FFEE8C' },
  { name: 'Mint', hex: '#C9E4DE' },
  { name: 'Sky Blue', hex: '#C6DEF1' },
  { name: 'Lavender', hex: '#DBCDF0' },
  { name: 'Blush', hex: '#F2C6DE' },
  { name: 'Peach', hex: '#F7D9C4' },
];

const FONTS = [
  { name: 'Oooh Baby', family: "'Oooh Baby', cursive" },
  { name: 'EB Garamond', family: "'EB Garamond', serif" },
  { name: 'Gaegu', family: "'Gaegu', cursive" }
];

const createInitialBin = (): CardElement[] => {
  const bin: CardElement[] = [];
  const centerX = 200;
  const centerY = 240;
  const jitter = 160;

  ASSETS.scraps.forEach(s => {
    bin.push({
      id: `scrap-${Math.random().toString(36).substr(2, 9)}`,
      type: 'scrap',
      content: s.src,
      x: centerX + (Math.random() - 0.5) * jitter,
      y: centerY + (Math.random() - 0.5) * jitter,
      rotation: (Math.random() - 0.5) * 40,
      scale: 0.8 + Math.random() * 0.4
    });
  });

  ASSETS.flowers.forEach((f, i) => {
    bin.push({
      id: `flower-${i}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'sticker',
      content: f.src,
      x: centerX + (Math.random() - 0.5) * jitter,
      y: centerY + (Math.random() - 0.5) * jitter,
      rotation: (Math.random() - 0.5) * 60,
      scale: 0.6 + Math.random() * 0.3
    });
  });

  ASSETS.stickers.forEach((s, i) => {
    bin.push({
      id: `sticker-${i}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'sticker',
      content: s.src,
      x: centerX + (Math.random() - 0.5) * jitter,
      y: centerY + (Math.random() - 0.5) * jitter,
      rotation: (Math.random() - 0.5) * 60,
      scale: 0.6 + Math.random() * 0.3
    });
  });

  return bin;
};

const INITIAL_STATE: CardState = {
  pages: { 
    front: { ...EMPTY_PAGE }, 
    insideLeft: { ...EMPTY_PAGE }, 
    insideRight: { ...EMPTY_PAGE }, 
    back: { ...EMPTY_PAGE } 
  },
  bin: createInitialBin()
};

const STEPS = [
  { label: 'Front', pages: ['front'] as PageID[] },
  { label: 'Middle', pages: ['insideLeft', 'insideRight'] as PageID[] },
  { label: 'Back', pages: ['back'] as PageID[] }
];

const CARD_WIDTH = 380;
const CARD_HEIGHT = 520;

const TOOL_ASSET_URLS: Record<ToolType, string> = {
  pencil: 'https://image2url.com/r2/default/images/1771116677757-a35cfb94-7229-4f83-ba15-55765e5e312a.png', 
  brush: 'https://image2url.com/r2/default/images/1771116705704-6e5159e2-87b4-4dfc-8662-f74c16985c98.png',
  marker: 'https://image2url.com/r2/default/images/1771116588502-2c262b07-96a3-4df7-a383-ccc234af3f5a.png',
  crayon: 'https://image2url.com/r2/default/images/1771116718993-9ec6e94c-14c6-47d8-998f-20ba12ae0cf1.png'
};

function StaticCanvas({ paths, width, height, offsetX = 0 }: { paths: DrawingPath[], width: number, height: number, offsetX?: number, key?: React.Key }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    if (!tempCanvasRef.current) tempCanvasRef.current = document.createElement('canvas');
    const tctx = tempCanvasRef.current.getContext('2d');
    if (!tctx) return;
    tempCanvasRef.current.width = width;
    tempCanvasRef.current.height = height;

    paths.forEach((h, pathIdx) => {
      ctx.save();
      ctx.strokeStyle = h.color;
      ctx.fillStyle = h.color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (h.tool === 'pencil') {
        ctx.shadowBlur = 1.2;
        ctx.shadowColor = h.color;
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = h.size * 1.1;
        ctx.beginPath();
        h.points.forEach((pt, j) => j === 0 ? ctx.moveTo(pt.x + offsetX, pt.y) : ctx.lineTo(pt.x + offsetX, pt.y));
        ctx.stroke();
      } else if (h.tool === 'brush') {
        tctx.clearRect(0, 0, width, height);
        tctx.save();
        tctx.strokeStyle = h.color;
        tctx.lineCap = 'round';
        tctx.lineJoin = 'round';
        tctx.globalAlpha = 1.0;
        tctx.shadowBlur = 6;
        tctx.shadowColor = h.color;
        let lastWidth = h.size;
        for (let j = 1; j < h.points.length; j++) {
          const p1 = h.points[j - 1];
          const p2 = h.points[j];
          const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
          const speedFactor = Math.min(dist / 90, 1);
          const targetWidth = Math.max(h.size * 0.4, h.size * (1.1 - speedFactor));
          const smoothedWidth = lastWidth + (targetWidth - lastWidth) * 0.08;
          lastWidth = smoothedWidth;
          tctx.lineWidth = smoothedWidth;
          tctx.beginPath();
          tctx.moveTo(p1.x + offsetX, p1.y);
          tctx.lineTo(p2.x + offsetX, p2.y);
          tctx.stroke();
        }
        tctx.restore();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.45;
        ctx.drawImage(tempCanvasRef.current!, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
      } else if (h.tool === 'crayon') {
        for (let j = 1; j < h.points.length; j++) {
          const p1 = h.points[j - 1];
          const p2 = h.points[j];
          const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
          const density = Math.floor(h.size * 1.8);
          const steps = Math.max(1, Math.floor(dist / 1.5));
          for (let s = 0; s < steps; s++) {
            const lerp = s / steps;
            const baseSeed = (pathIdx * 133) + (j * 71) + (s * 37);
            const sjX = (seededRandom(baseSeed + 1) - 0.5) * (h.size * 0.15);
            const sjY = (seededRandom(baseSeed + 2) - 0.5) * (h.size * 0.15);
            const cx = p1.x + (p2.x - p1.x) * lerp + offsetX + sjX;
            const cy = p1.y + (p2.y - p1.y) * lerp + sjY;
            for (let d = 0; d < density; d++) {
              const pSeed = baseSeed + (d * 17);
              if (seededRandom(pSeed + 3) > 0.85) continue;
              const r = seededRandom(pSeed + 4) * (h.size / 2);
              const theta = seededRandom(pSeed + 5) * Math.PI * 2;
              const px = cx + Math.cos(theta) * r;
              const py = cy + Math.sin(theta) * r;
              const pSize = seededRandom(pSeed + 6) * 1.8 + 0.4;
              ctx.globalAlpha = seededRandom(pSeed + 7) * 0.35 + 0.05;
              ctx.fillRect(px, py, pSize, pSize);
            }
          }
        }
      } else {
        ctx.lineWidth = h.size;
        ctx.beginPath();
        h.points.forEach((pt, j) => j === 0 ? ctx.moveTo(pt.x + offsetX, pt.y) : ctx.lineTo(pt.x + offsetX, pt.y));
        ctx.stroke();
      }
      ctx.restore();
    });
  }, [paths, width, height, offsetX]);

  return <canvas ref={canvasRef} width={width} height={height} className="absolute inset-0 pointer-events-none" />;
}

function PhysicalTool({ type, active, onClick }: { type: ToolType, active: boolean, onClick: () => void, key?: React.Key }) {
  const fallbacks: Record<ToolType, string> = { pencil: '#d2b48c', brush: '#ffcc80', marker: '#2563eb', crayon: '#f87171' };
  return (
    <div className="flex flex-col items-center cursor-pointer group" onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <div className={`tool-body ${active ? 'active' : ''}`}>
        <img src={TOOL_ASSET_URLS[type]} className="w-full h-full object-contain drop-shadow-xl select-none pointer-events-none" alt={type} onError={(e) => {
            const el = e.target as HTMLImageElement; el.style.display = 'none';
            if (el.parentElement) { el.parentElement.style.backgroundColor = fallbacks[type]; el.parentElement.style.borderRadius = '6px'; el.parentElement.style.width = '54px'; el.parentElement.style.boxShadow = '2px 4px 6px rgba(0,0,0,0.2)'; }
        }} />
      </div>
      <span className="text-[12px] font-bold mt-10 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest text-white/60">{type}</span>
    </div>
  );
}

function DraggableElement({ element, isSelected, canResize, isReadOnly, onSelect, onDrop, onResize, onRotate, onUpdate, onDelete, onInteractionStart, containerRef, uiPortalRef, cardRef, offsetX = 0 }: any) {
  const [isDragging, setIsDragging] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeMode, setResizeMode] = useState<'uniform' | 'width' | 'height' | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [screenPos, setScreenPos] = useState({ x: 0, y: 0 });
  const meta = useRef({ 
    dragOffset: { x: 0, y: 0 }, 
    startPos: { x: 0, y: 0 }, 
    resizeStart: { dist: 0, scale: 1, width: 200, height: 100 }, 
    rotateStart: { angle: 0, initialRotation: 0 } 
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isReadOnly || isReturning || !containerRef.current) return;
    onInteractionStart?.();
    const rect = containerRef.current.getBoundingClientRect();
    const x = rect.left + offsetX + element.x;
    const y = rect.top + element.y;
    onSelect?.(); 
    setIsDragging(true);
    meta.current.startPos = { x: e.clientX, y: e.clientY };
    meta.current.dragOffset = { x: e.clientX - x, y: e.clientY - y };
    setScreenPos({ x, y }); 
    e.stopPropagation();
  };

  const handleResizeStart = (e: React.MouseEvent, mode: 'uniform' | 'width' | 'height' = 'uniform') => {
    if (isReadOnly || !canResize || !containerRef.current) return;
    onInteractionStart?.();
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + offsetX + element.x;
    const cy = rect.top + element.y;
    
    const dist = Math.sqrt(Math.pow(e.clientX - cx, 2) + Math.pow(e.clientY - cy, 2));
    meta.current.resizeStart = { 
      dist, 
      scale: element.scale, 
      width: element.width || 200, 
      height: element.height || 100 
    };
    
    setIsResizing(true); 
    setResizeMode(mode);
    e.stopPropagation(); 
    e.preventDefault();
  };

  const handleRotateStart = (e: React.MouseEvent) => {
    if (isReadOnly || !containerRef.current) return;
    onInteractionStart?.();
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + offsetX + element.x;
    const cy = rect.top + element.y;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
    meta.current.rotateStart = { angle, initialRotation: element.rotation };
    setIsRotating(true); e.stopPropagation(); e.preventDefault();
  };

  useEffect(() => {
    if (isReadOnly) return;
    const move = (e: MouseEvent) => {
      if (isDragging) {
        let nextX = e.clientX - meta.current.dragOffset.x;
        let nextY = e.clientY - meta.current.dragOffset.y;
        if (element.type === 'text' && cardRef?.current) {
          const cardRect = cardRef.current.getBoundingClientRect();
          nextX = Math.max(cardRect.left, Math.min(cardRect.right, nextX));
          nextY = Math.max(cardRect.top, Math.min(cardRect.bottom, nextY));
        }
        setScreenPos({ x: nextX, y: nextY });
      }
      
      if (isResizing && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const cx = rect.left + offsetX + element.x;
        const cy = rect.top + element.y;
        
        const rad = -element.rotation * (Math.PI / 180);
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const localX = Math.abs(dx * Math.cos(rad) - dy * Math.sin(rad));
        const localY = Math.abs(dx * Math.sin(rad) + dy * Math.cos(rad));

        if (resizeMode === 'width') {
          onUpdate({ width: Math.max(50, localX * 2) });
        } else if (resizeMode === 'height') {
          onUpdate({ height: Math.max(20, localY * 2) });
        } else {
          const dist = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
          onResize(Math.max(0.1, (dist / meta.current.resizeStart.dist) * meta.current.resizeStart.scale));
        }
      }

      if (isRotating && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const cx = rect.left + offsetX + element.x;
        const cy = rect.top + element.y;
        const currentAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
        const delta = (currentAngle - meta.current.rotateStart.angle) * (180 / Math.PI);
        onRotate(meta.current.rotateStart.initialRotation + delta);
      }
    };

    const up = (e: MouseEvent) => {
      if (isDragging) {
        setIsDragging(false);
        const moved = Math.sqrt(Math.pow(e.clientX - meta.current.startPos.x, 2) + Math.pow(e.clientY - meta.current.startPos.y, 2)) > 5;
        if (moved) { 
          if (!onDrop(screenPos.x, screenPos.y)) { 
            setIsReturning(true); 
            setTimeout(() => setIsReturning(false), 300); 
          } 
        }
      }
      setIsResizing(false); 
      setResizeMode(null);
      setIsRotating(false);
    };

    if (isDragging || isResizing || isRotating) {
      window.addEventListener('mousemove', move); 
      window.addEventListener('mouseup', up);
    }
    return () => { 
      window.removeEventListener('mousemove', move); 
      window.removeEventListener('mouseup', up); 
    };
  }, [isDragging, isResizing, resizeMode, isRotating, element.x, element.y, offsetX, screenPos, element.rotation, isReadOnly]);

  const elWidth = element.width || 200;
  const elHeight = element.height || 40;
  const baseTransform = `translate(-50%, -50%) rotate(${element.rotation}deg) scale(${element.scale})`;
  
  const layoutStyles: React.CSSProperties = {
    width: element.type === 'text' ? `${elWidth}px` : 'max-content',
    height: element.type === 'text' ? `${elHeight}px` : 'auto',
    transform: baseTransform,
    position: isDragging || isReturning ? 'fixed' : 'absolute',
    transition: isDragging ? 'none' : 'all 0.5s cubic-bezier(0.2, 1, 0.3, 1)',
  };

  const contentStyle: React.CSSProperties = {
    ...layoutStyles,
    left: isDragging ? screenPos.x : (isReturning ? (containerRef.current!.getBoundingClientRect().left + offsetX + element.x) : element.x),
    top: isDragging ? screenPos.y : (isReturning ? (containerRef.current!.getBoundingClientRect().top + element.y) : element.y),
    zIndex: isSelected ? 10 : 'auto',
    overflow: element.type === 'text' ? 'hidden' : 'visible', 
    pointerEvents: isReadOnly ? 'none' : 'auto',
  };

  const uiStyle: React.CSSProperties = {
    ...layoutStyles,
    left: isDragging ? screenPos.x : (isReturning ? (containerRef.current!.getBoundingClientRect().left + offsetX + element.x) : element.x + offsetX),
    top: isDragging ? screenPos.y : (isReturning ? (containerRef.current!.getBoundingClientRect().top + element.y) : element.y),
    zIndex: 100,
    overflow: 'visible', 
    pointerEvents: 'none',
  };

  const selectionUI = !isReadOnly && isSelected && !isReturning && uiPortalRef?.current ? createPortal(
    <div style={uiStyle} className="pointer-events-none" onMouseDown={e => e.stopPropagation()}>
       <div className="absolute -inset-2 border-2 border-blue-500/80 border-dashed rounded-xl pointer-events-none" />
       
       <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex items-center gap-3 z-[110] pointer-events-auto">
          <div onMouseDown={handleRotateStart} title="Rotate" className="w-8 h-8 bg-white border-2 border-blue-500 rounded-full shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
          </div>
          <div onMouseDown={handleMouseDown} title="Move" className="w-8 h-8 bg-blue-500 border-2 border-white rounded-full shadow-lg hover:scale-110 transition-transform cursor-move flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
          </div>
          {element.type === 'text' && (
            <div onMouseDown={(e) => { e.stopPropagation(); onDelete(); }} title="Discard" className="w-8 h-8 bg-red-500 border-2 border-white rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
            </div>
          )}
       </div>

       {element.type === 'text' && (
         <div onMouseDown={(e) => e.stopPropagation()} className="absolute -bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 bg-white/95 backdrop-blur-sm p-2 rounded-xl shadow-xl border border-white min-w-[200px] pointer-events-auto z-[200]">
           <div className="flex gap-1 w-full justify-between">
             {FONTS.map(f => (
               <button key={f.name} onClick={(e) => { e.stopPropagation(); onUpdate({ fontFamily: f.family }); }} className={`px-2 py-0.5 rounded-md text-[9px] transition-all ${element.fontFamily === f.family ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`} style={{ fontFamily: f.family }}>{f.name}</button>
             ))}
           </div>
           <div className="flex items-center gap-2 w-full px-1">
             <span className="text-[8px] uppercase tracking-tight font-bold text-gray-400">Size</span>
             <input type="range" min="5" max="80" value={element.fontSize || 20} onClick={e => e.stopPropagation()} onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })} className="flex-1 accent-blue-500 h-1" />
           </div>
         </div>
       )}

       {canResize && ['-top-5 -left-5', '-top-5 -right-5', '-bottom-5 -left-5', '-bottom-5 -right-5'].map((p, i) => (
         <div key={`c-${i}`} onMouseDown={(e) => handleResizeStart(e, 'uniform')} className={`absolute ${p} w-4 h-4 bg-white border-2 border-blue-500 rounded-sm shadow hover:scale-125 transition-transform z-[110] cursor-nwse-resize pointer-events-auto`} />
       ))}

       {canResize && element.type === 'text' && (
         <>
           <div onMouseDown={(e) => handleResizeStart(e, 'width')} className="absolute top-1/2 -right-5 -translate-y-1/2 w-2 h-8 bg-blue-500/50 hover:bg-blue-500 rounded-full cursor-ew-resize pointer-events-auto z-[110] shadow-sm" />
           <div onMouseDown={(e) => handleResizeStart(e, 'width')} className="absolute top-1/2 -left-5 -translate-y-1/2 w-2 h-8 bg-blue-500/50 hover:bg-blue-500 rounded-full cursor-ew-resize pointer-events-auto z-[110] shadow-sm" />
           <div onMouseDown={(e) => handleResizeStart(e, 'height')} className="absolute left-1/2 -top-5 -translate-x-1/2 h-2 w-8 bg-blue-500/50 hover:bg-blue-500 rounded-full cursor-ns-resize pointer-events-auto z-[110] shadow-sm" />
           <div onMouseDown={(e) => handleResizeStart(e, 'height')} className="absolute left-1/2 -bottom-5 -translate-x-1/2 h-2 w-8 bg-blue-500/50 hover:bg-blue-500 rounded-full cursor-ns-resize pointer-events-auto z-[110] shadow-sm" />
         </>
       )}
    </div>,
    uiPortalRef.current
  ) : null;

  return (
    <div onMouseDown={handleMouseDown} onClick={e => e.stopPropagation()} className="relative" style={contentStyle}>
      <div className="pointer-events-none flex items-center justify-center w-full h-full">
        {element.type === 'scrap' && <img src={element.content} draggable="false" className="w-96 h-auto shadow-sm block" style={{ clipPath: 'polygon(5% 0%, 95% 2%, 100% 90%, 2% 100%)', maxWidth: 'none' }} />}
        {element.type === 'sticker' && <img src={element.content} draggable="false" className="w-48 h-auto drop-shadow-md block" style={{ maxWidth: 'none' }} />}
        {element.type === 'text' && (
          <div 
            className={`flex items-center justify-center pointer-events-auto w-full h-full p-2 overflow-hidden ${isSelected && !isReadOnly ? 'bg-blue-500/5' : ''}`}
            style={{ 
              color: element.color, 
              fontFamily: element.fontFamily || FONTS[0].family,
              fontSize: `${element.fontSize || 20}px`,
              lineHeight: 1.2
            }}
          >
            {isSelected && !isReadOnly ? (
              <textarea
                value={element.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                onMouseDown={(e) => e.stopPropagation()}
                className="bg-transparent border-none outline-none text-center resize-none p-0 overflow-hidden w-full h-full"
                autoFocus
                onFocus={(e) => {
                   const val = e.target.value;
                   e.target.value = '';
                   e.target.value = val;
                }}
              />
            ) : (
              <div className="whitespace-pre-wrap text-center w-full h-full break-words overflow-hidden">{element.content || ' '}</div>
            )}
          </div>
        )}
      </div>
      {selectionUI}
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<CardState>(INITIAL_STATE);
  const [past, setPast] = useState<CardState[]>([]);
  const [future, setFuture] = useState<CardState[]>([]);
  
  // Critical: Store a snapshot of state BEFORE an interaction starts
  const checkpointRef = useRef<CardState | null>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [activeColor, setActiveColor] = useState(WATERCOLOR_COLORS[0].hex);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [activeTab, setActiveTab] = useState<'paper' | 'flowers' | 'stickers'>('paper');
  const [selected, setSelected] = useState<{ pg?: PageID, id: string } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const binRef = useRef<HTMLDivElement>(null);
  const uiPortalRef = useRef<HTMLDivElement>(null);

  // New: Check for View Mode
  const isViewMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'true';
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const s = decodeState(hash);
    if (s) setState(s);
  }, []);

  const pushToHistory = (snap: CardState) => {
    setPast(prev => [...prev.slice(-49), snap]);
    setFuture([]);
  };

  const undo = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setFuture(prev => [state, ...prev]);
    setPast(prev => prev.slice(0, -1));
    setState(previous);
    setSelected(null); 
  };

  const redo = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (future.length === 0) return;
    const next = future[0];
    setPast(prev => [...prev, state]);
    setFuture(prev => prev.slice(1));
    setState(next);
    setSelected(null);
  };

  const startInteraction = () => {
    if (isViewMode) return;
    checkpointRef.current = { ...state };
  };

  const getPos = (e: any): Point => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.touches ? e.touches[0].clientX : e.clientX) - r.left, y: (e.touches ? e.touches[0].clientY : e.clientY) - r.top };
  };

  const startDraw = (e: any) => {
    if (isViewMode) return;
    setSelected(null);
    if (!activeTool) return;
    
    startInteraction();
    const p = getPos(e);
    let size = 5;
    if (activeTool === 'brush') size = 60;
    else if (activeTool === 'pencil') size = 2.2;
    else if (activeTool === 'marker') size = 10;
    else if (activeTool === 'crayon') size = 28;
    
    setCurrentPath({
      tool: activeTool,
      color: activeColor, 
      points: [{ x: p.x, y: p.y }],
      size
    });
  };

  const draw = (e: any) => {
    if (!currentPath || isViewMode) return;
    const p = getPos(e);
    setCurrentPath(prev => prev ? ({ ...prev, points: [...prev.points, p] }) : null);
  };

  const endDraw = () => {
    if (!currentPath || isViewMode) return;
    if (checkpointRef.current) pushToHistory(checkpointRef.current);

    const lastP = currentPath.points[0];
    let pg: PageID = currentStep === 1 ? (lastP.x < CARD_WIDTH ? 'insideLeft' : 'insideRight') : STEPS[currentStep].pages[0];
    let offsetX = (currentStep === 1 && pg === 'insideRight') ? -CARD_WIDTH : 0;
    
    const finalizedPath: DrawingPath = {
      ...currentPath,
      points: currentPath.points.map(pt => ({ x: pt.x + offsetX, y: pt.y }))
    };

    const newEl: CardElement = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'path',
      content: '',
      x: 0, y: 0, rotation: 0, scale: 1,
      pathData: finalizedPath
    };

    setState(s => ({
      ...s,
      pages: { ...s.pages, [pg]: { ...s.pages[pg], elements: [...s.pages[pg].elements, newEl] } }
    }));
    setCurrentPath(null);
  };

  const getRenderGroups = (elements: CardElement[]) => {
    const groups: (CardElement | { type: 'path-group', id: string, paths: DrawingPath[] })[] = [];
    let currentPathGroup: DrawingPath[] = [];
    let groupStartId = '';
    
    elements.forEach(el => {
      if (el.type === 'path' && el.pathData) {
        if (currentPathGroup.length === 0) groupStartId = el.id;
        currentPathGroup.push(el.pathData);
      } else {
        if (currentPathGroup.length > 0) {
          groups.push({ type: 'path-group', id: groupStartId, paths: [...currentPathGroup] } as any);
          currentPathGroup = [];
        }
        groups.push(el);
      }
    });
    if (currentPathGroup.length > 0) {
      groups.push({ type: 'path-group', id: groupStartId, paths: currentPathGroup } as any);
    }
    return groups;
  };

  const addEl = (type: 'sticker' | 'text' | 'scrap', content: string, x: number, y: number, r: number) => {
    if (isViewMode) return;
    pushToHistory(state);
    let pg: PageID = currentStep === 1 ? (x < CARD_WIDTH ? 'insideLeft' : 'insideRight') : STEPS[currentStep].pages[0];
    let lx = currentStep === 1 && pg === 'insideRight' ? x - CARD_WIDTH : x;
    const el: CardElement = { 
      id: Math.random().toString(36).substr(2, 9), 
      type, 
      content, 
      x: lx, 
      y, 
      rotation: r, 
      scale: 1, 
      width: type === 'text' ? 180 : undefined,
      height: type === 'text' ? 120 : undefined,
      color: type === 'text' ? activeColor : undefined,
      fontFamily: type === 'text' ? FONTS[0].family : undefined,
      fontSize: type === 'text' ? 24 : undefined
    };
    setState(s => ({ ...s, pages: { ...s.pages, [pg]: { ...s.pages[pg], elements: [...s.pages[pg].elements, el] } } }));
    setSelected({ pg, id: el.id });
  };

  const dropEl = (id: string, src: 'page' | 'bin', cx: number, cy: number, sid?: PageID) => {
    if (isViewMode) return false;
    const cr = cardRef.current?.getBoundingClientRect(); const br = binRef.current?.getBoundingClientRect();
    const elToDrop = (src === 'page' ? state.pages[sid!].elements : state.bin).find(e => e.id === id);
    if (!elToDrop) return false;

    if (elToDrop.type === 'text' && br && cx >= br.left && cx <= br.right && cy >= br.top && cy <= br.bottom) {
      return false;
    }

    if (checkpointRef.current) pushToHistory(checkpointRef.current);

    if (br && cx >= br.left && cx <= br.right && cy >= br.top && cy <= br.bottom) {
      setState(s => {
        const n = JSON.parse(JSON.stringify(s)); 
        n.bin = n.bin.filter((e: any) => e.id !== id);
        Object.keys(n.pages).forEach((k) => {
          n.pages[k].elements = n.pages[k].elements.filter((e: any) => e.id !== id);
        });
        
        n.bin.push({ ...elToDrop, x: cx - br.left, y: cy - br.top });
        return n;
      });
      setSelected({ pg: undefined, id }); return true;
    }

    if (cr && cx >= cr.left && cx <= cr.right && cy >= cr.top && cy <= cr.bottom) {
      const lx = cx - cr.left;
      let pg: PageID = currentStep === 1 ? (lx < CARD_WIDTH ? 'insideLeft' : 'insideRight') : STEPS[currentStep].pages[0];
      const localX = (currentStep === 1 && pg === 'insideRight') ? lx - CARD_WIDTH : lx;
      setState(s => {
        const n = JSON.parse(JSON.stringify(s));
        n.bin = n.bin.filter((e: any) => e.id !== id);
        Object.keys(n.pages).forEach((k) => {
          n.pages[k].elements = n.pages[k].elements.filter((e: any) => e.id !== id);
        });

        n.pages[pg].elements.push({ ...elToDrop, x: localX, y: cy - cr.top });
        return n;
      });
      setSelected({ pg, id }); return true;
    }
    return false;
  };

  const scaleEl = (id: string, pg: PageID | undefined, s: number) => {
    if (isViewMode) return;
    setState(prev => {
      const n = { ...prev };
      if (pg) n.pages[pg].elements = n.pages[pg].elements.map(e => e.id === id ? { ...e, scale: s } : e);
      else n.bin = n.bin.map(e => e.id === id ? { ...e, scale: s } : e);
      return n;
    });
  };

  const rotateEl = (id: string, pg: PageID | undefined, r: number) => {
    if (isViewMode) return;
    setState(prev => {
      const n = { ...prev };
      if (pg) n.pages[pg].elements = n.pages[pg].elements.map(e => e.id === id ? { ...e, rotation: r } : e);
      else n.bin = n.bin.map(e => e.id === id ? { ...e, scale: 1, rotation: r } : e);
      return n;
    });
  };

  const updateEl = (id: string, pg: PageID | undefined, updates: Partial<CardElement>) => {
    if (isViewMode) return;
    const discreteKeys = ['fontFamily', 'fontSize', 'color'];
    const isDiscrete = Object.keys(updates).some(k => discreteKeys.includes(k));
    if (isDiscrete) pushToHistory(state);
    
    setState(prev => {
      const n = { ...prev };
      if (pg) n.pages[pg].elements = n.pages[pg].elements.map(e => e.id === id ? { ...e, ...updates } : e);
      else n.bin = n.bin.map(e => e.id === id ? { ...e, ...updates } : e);
      return n;
    });
  };

  const deleteEl = (id: string, pg: PageID | undefined) => {
    if (isViewMode) return;
    pushToHistory(state);
    setState(prev => {
      const n = { ...prev };
      if (pg) {
        n.pages[pg].elements = n.pages[pg].elements.filter(e => e.id !== id);
      } else {
        n.bin = n.bin.filter(e => e.id !== id);
      }
      return n;
    });
    setSelected(null);
  };

  const getFilteredBin = () => {
    return state.bin.filter(item => {
      if (activeTab === 'paper') return item.type === 'scrap';
      if (activeTab === 'flowers') return item.type === 'sticker' && ASSETS.flowers.some(f => f.src === item.content);
      if (activeTab === 'stickers') return item.type === 'sticker' && ASSETS.stickers.some(s => s.src === item.content);
      return false;
    })
  };

  useEffect(() => {
    if (selected?.id && !isViewMode) {
      const el = selected.pg ? state.pages[selected.pg].elements.find(e => e.id === selected.id) : state.bin.find(e => e.id === selected.id);
      if (el?.type === 'text') {
        updateEl(selected.id, selected.pg, { color: activeColor });
      }
    }
  }, [activeColor]);

  const activeDrawLayer = useMemo(() => {
    if (!currentPath || isViewMode) return null;
    return <StaticCanvas paths={[currentPath]} width={currentStep === 1 ? CARD_WIDTH * 2 : CARD_WIDTH} height={CARD_HEIGHT} />;
  }, [currentPath, currentStep, isViewMode]);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const encoded = encodeState(state);
    // Create the "View Only" URL
    const shareUrl = `${window.location.origin}${window.location.pathname}?view=true#${encoded}`;
    
    navigator.clipboard.writeText(shareUrl);
    alert('Shareable link copied to clipboard! Share this with your friends.');
    
    // Optional: Open in new tab to preview
    window.open(shareUrl, '_blank');
  };

  return (
    <div className={`flex flex-col md:flex-row h-screen select-none overflow-hidden text-[#2d3436] ${isViewMode ? 'bg-[#917b6d]' : ''}`} onClick={() => setSelected(null)}>
      
      {!isViewMode && (
        <div className="w-full md:w-[40%] h-full flex flex-col pt-12 bg-[#ba9477] border-r border-black/10 relative z-20 overflow-visible" onClick={e => e.stopPropagation()}>
          <div className="px-4 flex flex-col overflow-visible">
            <div className="flex justify-evenly w-full mb-8 items-end h-40">
              {(['pencil', 'brush', 'marker', 'crayon'] as ToolType[]).map(t => (
                <PhysicalTool key={t} type={t} active={activeTool === t} onClick={() => setActiveTool(prev => prev === t ? null : t)} />
              ))}
            </div>
            <div className="flex flex-wrap gap-4 justify-center mb-24 px-8">
              {WATERCOLOR_COLORS.map(c => (
                <div key={c.hex} onClick={(e) => { e.stopPropagation(); setActiveColor(c.hex); }} className={`w-10 h-10 rounded-full cursor-pointer transition-all duration-300 relative border-2 ${activeColor === c.hex ? 'border-white scale-125 shadow-lg' : 'border-transparent shadow-sm hover:scale-110'}`} style={{ backgroundColor: c.hex, boxShadow: activeColor === c.hex ? `0 0 15px ${c.hex}88` : 'inset 0 4px 6px rgba(0,0,0,0.1)' }}>
                  {activeColor === c.hex && <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-pulse" />}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-6 mb-8 justify-center">
              {['paper', 'flowers', 'stickers'].map((t: any) => (
                <span key={t} onClick={() => setActiveTab(t)} className={`nav-link ${activeTab === t ? 'active' : ''}`}>{t}</span>
              ))}
            </div>
          </div>
          <div className="relative flex-1 overflow-visible">
            <div ref={binRef} className="absolute inset-0 overflow-visible" onClick={() => setSelected(null)}>
              {getFilteredBin().map(e => (
                <DraggableElement 
                  key={e.id} 
                  element={e} 
                  isSelected={selected?.id === e.id} 
                  canResize={true} 
                  isReadOnly={false}
                  onInteractionStart={startInteraction}
                  onSelect={() => setSelected({ pg: undefined, id: e.id })} 
                  onDrop={(cx, cy) => dropEl(e.id, 'bin', cx, cy)} 
                  onResize={(s: number) => scaleEl(e.id, undefined, s)} 
                  onRotate={(r: number) => rotateEl(e.id, undefined, r)} 
                  onUpdate={(u: any) => updateEl(e.id, undefined, u)} 
                  onDelete={() => deleteEl(e.id, undefined)}
                  containerRef={binRef} 
                  cardRef={cardRef}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className={`flex-1 h-full flex flex-col items-center justify-center relative ${isViewMode ? '' : 'bg-[#917b6d]'} overflow-visible z-10`}>
        
        {!isViewMode && (
          <div className="absolute top-12 left-12 flex gap-10 z-[200]">
            <button 
              disabled={past.length === 0}
              onClick={undo}
              className={`text-lg uppercase tracking-[0.2em] font-bold transition-all ${past.length === 0 ? 'opacity-10 cursor-not-allowed scale-90' : 'opacity-40 hover:opacity-100 hover:scale-110 text-white'}`}
            >
              Undo
            </button>
            <button 
              disabled={future.length === 0}
              onClick={redo}
              className={`text-lg uppercase tracking-[0.2em] font-bold transition-all ${future.length === 0 ? 'opacity-10 cursor-not-allowed scale-90' : 'opacity-40 hover:opacity-100 hover:scale-110 text-white'}`}
            >
              Redo
            </button>
          </div>
        )}
        
        {!isViewMode ? (
          <button onClick={handleShare} className="absolute top-12 right-12 text-lg uppercase tracking-[0.2em] font-bold opacity-40 hover:opacity-100 text-white">Share Link</button>
        ) : (
          <div className="absolute top-12 left-12 text-lg uppercase tracking-[0.2em] font-bold text-white/40">A card for you</div>
        )}

        <span className="mb-4 text-sm uppercase tracking-widest font-bold text-white/50">{STEPS[currentStep].label}</span>
        
        <div ref={cardRef} className="relative mb-12 flex-shrink-0 overflow-visible" style={{ width: currentStep === 1 ? CARD_WIDTH * 2 : CARD_WIDTH, height: CARD_HEIGHT }}>
          <div className={`w-full h-full paper-blank physical-shadow ${currentStep === 1 ? 'paper-crease' : ''} overflow-visible`} 
               onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
               onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}>
            
            <div className="paper-texture-layer" />
            <div ref={uiPortalRef} className="absolute inset-0 pointer-events-none overflow-visible z-[100]" />

            <div className="absolute inset-0 overflow-visible">
              {STEPS[currentStep].pages.map((pg, pageIdx) => (
                <div key={pg} className="absolute top-0 bottom-0 overflow-visible" style={{ left: pageIdx * CARD_WIDTH, width: CARD_WIDTH }}>
                  <div className="page-surface-depth" />
                  <div className="relative w-full h-full overflow-hidden">
                    {getRenderGroups(state.pages[pg].elements).map((layer: any) => {
                      if (layer.type === 'path-group') {
                        return <StaticCanvas key={layer.id} paths={layer.paths} width={CARD_WIDTH} height={CARD_HEIGHT} />;
                      }
                      return (
                        <DraggableElement 
                          key={layer.id} 
                          element={layer} 
                          isSelected={selected?.id === layer.id} 
                          canResize={!isViewMode} 
                          isReadOnly={isViewMode}
                          onInteractionStart={startInteraction}
                          onSelect={() => setSelected({ pg, id: layer.id })} 
                          onDrop={(cx, cy) => dropEl(layer.id, 'page', cx, cy, pg)} 
                          onResize={(s: number) => scaleEl(layer.id, pg, s)} 
                          onRotate={(r: number) => rotateEl(layer.id, pg, r)}
                          onUpdate={(u: any) => updateEl(layer.id, pg, u)}
                          onDelete={() => deleteEl(layer.id, pg)}
                          containerRef={cardRef} 
                          uiPortalRef={uiPortalRef}
                          cardRef={cardRef}
                          offsetX={pageIdx * CARD_WIDTH} 
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <canvas ref={canvasRef} width={currentStep === 1 ? CARD_WIDTH * 2 : CARD_WIDTH} height={CARD_HEIGHT} 
                    className="absolute inset-0 z-[60] pointer-events-none w-full h-full overflow-visible" 
                    style={{ cursor: !isViewMode && activeTool ? 'crosshair' : 'default' }} />
            <div className="absolute inset-0 z-[61] pointer-events-none overflow-visible">
              {activeDrawLayer}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 opacity-40 hover:opacity-100 text-white">
            {currentStep > 0 && <button onClick={(e) => { e.stopPropagation(); setCurrentStep(s => s - 1); }} className="hover:scale-125 transition-transform text-2xl">←</button>}
            <span className="text-lg tracking-widest uppercase">Flip Page</span>
            {currentStep < 2 && <button onClick={(e) => { e.stopPropagation(); setCurrentStep(s => s + 1); }} className="hover:scale-125 transition-transform text-2xl">→</button>}
          </div>
          
          {!isViewMode ? (
            <button onClick={(e) => { e.stopPropagation(); addEl('text', 'Type here...', CARD_WIDTH / 2, CARD_HEIGHT / 2, 0); }} className="text-lg uppercase tracking-widest opacity-40 hover:opacity-100 text-white">Add Text</button>
          ) : (
            <button onClick={() => window.location.href = window.location.pathname} className="text-[12px] uppercase tracking-[0.3em] font-bold opacity-30 hover:opacity-100 text-white mt-4 border border-white/20 px-4 py-2 rounded-full transition-all">Make Your Own Card</button>
          )}
        </div>
      </div>
    </div>
  );
}