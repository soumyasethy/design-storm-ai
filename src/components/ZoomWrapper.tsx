import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minus, Plus } from 'lucide-react';

interface ZoomWrapperProps {
  children: React.ReactNode;
  initialScale?: number;
  minScale?: number;
  maxScale?: number;
  step?: number;
  className?: string;
  showControls?: boolean;
  enableMouseWheel?: boolean;
  enablePan?: boolean;
}

const ZoomWrapper: React.FC<ZoomWrapperProps> = ({
  children,
  initialScale = 0.5,
  minScale = 0.1,
  maxScale = 3,
  step = 0.1,
  className = '',
  showControls = true,
  enableMouseWheel = true,
  enablePan = true,
}) => {
  const [scale, setScale] = useState(initialScale);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!enableMouseWheel) return;
    if (e.ctrlKey || e.metaKey) return; // Let browser zoom
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? -step : step;
    setScale((prev) => {
      const next = Math.max(minScale, Math.min(maxScale, prev + delta));
      return Math.round(next * 100) / 100;
    });
  }, [enableMouseWheel, step, minScale, maxScale]);

  // Pan handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enablePan) return;
    if (e.button !== 0) return; // Only left mouse button
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    });
  }, [enablePan, pan.x, pan.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !enablePan) return;
    
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, enablePan, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setScale((prev) => {
      const next = Math.min(maxScale, prev + step);
      return Math.round(next * 100) / 100;
    });
  }, [maxScale, step]);

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(minScale, prev - step);
      return Math.round(next * 100) / 100;
    });
  }, [minScale, step]);

  const resetView = useCallback(() => {
    setScale(initialScale);
    setPan({ x: 0, y: 0 });
  }, [initialScale]);

  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Calculate scale to fit content
    const contentWidth = container.scrollWidth;
    const contentHeight = container.scrollHeight;
    
    const scaleX = containerRect.width / contentWidth;
    const scaleY = containerRect.height / contentHeight;
    const fitScale = Math.min(scaleX, scaleY, maxScale);
    
    setScale(Math.max(minScale, fitScale));
    setPan({ x: 0, y: 0 });
  }, [minScale, maxScale]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== document.body) return;
      
      switch (e.key) {
        case '=':
        case '+':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomOut();
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            resetView();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetView]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Zoom Controls */}
      {showControls && (
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-2 shadow-lg">
          <button
            onClick={zoomIn}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Zoom In (Ctrl/Cmd +)"
          >
            <Plus className="w-4 h-4" />
          </button>
          
          <div className="text-center text-xs font-medium text-gray-600 min-w-[3rem]">
            {Math.round(scale * 100)}%
          </div>
          
          <button
            onClick={zoomOut}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Zoom Out (Ctrl/Cmd -)"
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <div className="border-t border-gray-200 my-1" />
          
          <button
            onClick={resetView}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Reset View (Ctrl/Cmd + 0)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={fitToScreen}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Zoom Info */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 shadow-lg">
        {Math.round(scale * 100)}% • {enablePan ? 'Drag to pan' : 'Pan disabled'} • {enableMouseWheel ? 'Scroll to zoom' : 'Zoom disabled'}
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden border border-gray-200 rounded-lg bg-gray-50"
        style={{ cursor: isDragging ? 'grabbing' : enablePan ? 'grab' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default ZoomWrapper; 