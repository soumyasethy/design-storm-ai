import React, { useState, useRef, useEffect } from 'react';
import FigmaRenderer from './FigmaRenderer';

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fills?: any[];
  strokes?: any[];
  strokeWeight?: number;
  cornerRadius?: number;
  characters?: string;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    textAlignHorizontal?: string;
    textAlignVertical?: string;
  };
  effects?: any[];
  opacity?: number;
  blendMode?: string;
  layoutMode?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
}

interface FigmaLayoutProps {
  document: FigmaNode;
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
}

// Recursively find all frames and canvases
function findFrames(node: FigmaNode, parentPath: string[] = []): Array<{ node: FigmaNode; path: string[] }> {
  let frames: Array<{ node: FigmaNode; path: string[] }> = [];
  if (node.type === 'FRAME' || node.type === 'CANVAS') {
    frames.push({ node, path: [...parentPath, node.name] });
  }
  if (node.children) {
    for (const child of node.children) {
      frames = frames.concat(findFrames(child, [...parentPath, node.name]));
    }
  }
  return frames;
}

// Calculate bounding box from children if not provided
const calculateBoundingBox = (node: FigmaNode): { x: number; y: number; width: number; height: number } | null => {
  if (node.absoluteBoundingBox) {
    return node.absoluteBoundingBox;
  }
  
  if (node.children && node.children.length > 0) {
    const childBoxes = node.children
      .map(child => calculateBoundingBox(child))
      .filter(Boolean) as Array<{ x: number; y: number; width: number; height: number }>;
    
    if (childBoxes.length > 0) {
      const minX = Math.min(...childBoxes.map(box => box.x));
      const minY = Math.min(...childBoxes.map(box => box.y));
      const maxX = Math.max(...childBoxes.map(box => box.x + box.width));
      const maxY = Math.max(...childBoxes.map(box => box.y + box.height));
      
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    }
  }
  
  return null;
};

const FigmaLayout: React.FC<FigmaLayoutProps> = ({ 
  document, 
  className = '',
  maxWidth = 800,
  maxHeight = 600 
}) => {
  // Find all frames/canvases
  const frames = findFrames(document);
  const [selectedFrameId, setSelectedFrameId] = useState<string>(frames[0]?.node.id || '');
  const selectedFrame = frames.find(f => f.node.id === selectedFrameId)?.node;
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // View mode: preview, json, code, or responsive
  const [viewMode, setViewMode] = useState<'preview' | 'json' | 'code' | 'responsive'>('preview');

  // Debug logging
  console.log('FigmaLayout debug:', {
    totalFrames: frames.length,
    selectedFrameId,
    selectedFrameType: selectedFrame?.type,
    selectedFrameName: selectedFrame?.name,
    hasBoundingBox: !!selectedFrame?.absoluteBoundingBox,
    boundingBox: selectedFrame?.absoluteBoundingBox,
    childrenCount: selectedFrame?.children?.length || 0,
  });

  // Calculate bounding box for the selected frame
  const frameBoundingBox = selectedFrame ? calculateBoundingBox(selectedFrame) : null;
  
  let width = 800;
  let height = 600;
  let frameX = 0;
  let frameY = 0;
  
  if (frameBoundingBox) {
    width = frameBoundingBox.width;
    height = frameBoundingBox.height;
    frameX = frameBoundingBox.x;
    frameY = frameBoundingBox.y;
  }

  // Calculate scale to fit within max dimensions while maintaining aspect ratio
  const scaleX = maxWidth / width;
  const scaleY = maxHeight / height;
  const initialScale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
  const scaledWidth = width * initialScale;
  const scaledHeight = height * initialScale;

  // Auto-center the frame when it changes
  useEffect(() => {
    if (selectedFrame && frameBoundingBox) {
      const { x, y } = frameBoundingBox;
      
      // Calculate center offset to bring frame into view
      const centerX = (maxWidth - scaledWidth) / 2;
      const centerY = (maxHeight - scaledHeight) / 2;
      
      // Adjust pan to center the frame
      const adjustedPanX = centerX - (x * initialScale);
      const adjustedPanY = centerY - (y * initialScale);
      
      setPan({ x: adjustedPanX, y: adjustedPanY });
      setZoom(initialScale);
    }
  }, [selectedFrameId, selectedFrame, frameBoundingBox, maxWidth, maxHeight, scaledWidth, scaledHeight, initialScale]);

  // Handle mouse events for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle wheel for zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(5, prev * delta)));
  };

  // Reset view
  const resetView = () => {
    if (selectedFrame && frameBoundingBox) {
      const { x, y } = frameBoundingBox;
      const centerX = (maxWidth - scaledWidth) / 2;
      const centerY = (maxHeight - scaledHeight) / 2;
      const adjustedPanX = centerX - (x * initialScale);
      const adjustedPanY = centerY - (y * initialScale);
      setPan({ x: adjustedPanX, y: adjustedPanY });
      setZoom(initialScale);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  // Fit to screen
  const fitToScreen = () => {
    setZoom(initialScale);
    if (selectedFrame && frameBoundingBox) {
      const { x, y } = frameBoundingBox;
      const centerX = (maxWidth - scaledWidth) / 2;
      const centerY = (maxHeight - scaledHeight) / 2;
      const adjustedPanX = centerX - (x * initialScale);
      const adjustedPanY = centerY - (y * initialScale);
      setPan({ x: adjustedPanX, y: adjustedPanY });
    } else {
      setPan({ x: 0, y: 0 });
    }
  };

  // Generate full component code for the selected frame
  const generateFullComponentCode = () => {
    if (!selectedFrame) return '';
    
    const componentName = selectedFrame.name.replace(/[^a-zA-Z0-9]/g, '') || 'FigmaComponent';
    
    let code = `import React from 'react';\n\n`;
    code += `interface ${componentName}Props {\n`;
    code += `  className?: string;\n`;
    code += `}\n\n`;
    code += `const ${componentName}: React.FC<${componentName}Props> = ({ className = '' }) => {\n`;
    code += `  return (\n`;
    code += `    <div className={\`relative w-[${width}px] h-[${height}px] \${className}\`}>\n`;
    
    // Generate code for all children recursively
    const generateChildCode = (node: FigmaNode, indent: number = 6): string => {
      const spaces = ' '.repeat(indent);
      const boundingBox = calculateBoundingBox(node);
      if (!boundingBox) return '';
      
      const { x, y, width, height } = boundingBox;
      const minWidth = Math.max(width, 1);
      const minHeight = Math.max(height, 1);
      
      let classes = `absolute left-[${x}px] top-[${y}px] w-[${minWidth}px] h-[${minHeight}px]`;
      
      // Add background color
      if (node.fills && node.fills.length > 0) {
        const fill = node.fills[0];
        if (fill.type === 'SOLID' && fill.color) {
          const { r, g, b } = fill.color;
          classes += ` bg-[rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})]`;
        }
      }
      
      // Add border
      if (node.strokes && node.strokes.length > 0) {
        classes += ' border border-gray-300';
        if (node.strokeWeight) {
          classes += ` border-[${node.strokeWeight}px]`;
        }
      }
      
      // Add border radius
      if (node.cornerRadius) {
        classes += ` rounded-[${node.cornerRadius}px]`;
      }
      
      // Add typography for text nodes
      if (node.type === 'TEXT') {
        classes += ' flex items-center justify-center';
        if (node.style?.fontSize) {
          classes += ` text-[${node.style.fontSize}px]`;
        }
        if (node.style?.fontWeight) {
          classes += ` font-${node.style.fontWeight >= 700 ? 'bold' : node.style.fontWeight >= 600 ? 'semibold' : 'normal'}`;
        }
      }
      
      let code = `${spaces}<div className="${classes}">\n`;
      
      if (node.type === 'TEXT' && node.characters) {
        code += `${spaces}  ${node.characters}\n`;
      } else if (node.children && node.children.length > 0) {
        code += `${spaces}  {/* ${node.name} */}\n`;
        for (const child of node.children) {
          code += generateChildCode(child, indent + 2);
        }
      } else {
        code += `${spaces}  {/* ${node.name} */}\n`;
      }
      
      code += `${spaces}</div>\n`;
      return code;
    };
    
    if (selectedFrame.children) {
      for (const child of selectedFrame.children) {
        code += generateChildCode(child);
      }
    }
    
    code += `    </div>\n`;
    code += `  );\n`;
    code += `};\n\n`;
    code += `export default ${componentName};\n`;
    
    return code;
  };

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="frame-select" className="text-xs text-gray-600">Select Frame/Artboard:</label>
          <select
            id="frame-select"
            className="border rounded px-2 py-1 text-xs"
            value={selectedFrameId}
            onChange={e => setSelectedFrameId(e.target.value)}
          >
            {frames.map(f => (
              <option key={f.node.id} value={f.node.id}>
                {f.path.join(' / ')} ({f.node.type})
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('preview')}
            className={`px-2 py-1 text-xs rounded ${viewMode === 'preview' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
          >
            Preview
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`px-2 py-1 text-xs rounded ${viewMode === 'code' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
          >
            Code
          </button>
          <button
            onClick={() => setViewMode('responsive')}
            className={`px-2 py-1 text-xs rounded ${viewMode === 'responsive' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
          >
            Responsive
          </button>
          <button
            onClick={() => setViewMode('json')}
            className={`px-2 py-1 text-xs rounded ${viewMode === 'json' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
          >
            JSON
          </button>
        </div>
      </div>

      {/* Zoom Controls */}
      {viewMode === 'preview' && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))}
            className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
          >
            Zoom Out
          </button>
          <span className="text-xs text-gray-600 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.min(5, prev + 0.1))}
            className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
          >
            Zoom In
          </button>
          <button
            onClick={resetView}
            className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
          >
            Reset
          </button>
          <button
            onClick={fitToScreen}
            className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
          >
            Fit Screen
          </button>
        </div>
      )}

      {/* View Content */}
      {viewMode === 'preview' && (
        <div className="flex justify-center">
          <div 
            ref={containerRef}
            className="relative bg-white rounded-lg shadow-sm overflow-hidden border"
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <div 
              className="relative"
              style={{
                width: frameBoundingBox?.width || width,
                height: frameBoundingBox?.height || height,
                background: '#f9fafb',
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
            >
              {selectedFrame ? (
                <FigmaRenderer node={selectedFrame} parentOffset={{ x: 0, y: 0 }} />
              ) : (
                <span className="text-xs text-gray-400">No frame selected</span>
              )}
            </div>
            
            {/* Debug overlay */}
            {selectedFrame && (
              <div 
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  zIndex: 1000,
                }}
              >
                <div>Frame: {selectedFrame.name}</div>
                <div>Type: {selectedFrame.type}</div>
                <div>Size: {frameBoundingBox?.width || 'N/A'} x {frameBoundingBox?.height || 'N/A'}</div>
                <div>Children: {selectedFrame.children?.length || 0}</div>
                <div>Position: {frameBoundingBox?.x || 'N/A'}, {frameBoundingBox?.y || 'N/A'}</div>
                <div>Zoom: {Math.round(zoom * 100)}%</div>
                <div>Pan: {Math.round(pan.x)}, {Math.round(pan.y)}</div>
                <div>Has BBox: {selectedFrame.absoluteBoundingBox ? 'Yes' : 'Calculated'}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'code' && (
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-96 overflow-auto">
          <div className="mb-2 text-white">Generated React Component: {selectedFrame?.name}</div>
          <pre className="whitespace-pre-wrap">
            {generateFullComponentCode()}
          </pre>
        </div>
      )}

      {viewMode === 'responsive' && (
        <div className="space-y-4">
          <div className="text-sm font-semibold text-gray-700">Responsive Preview</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mobile */}
            <div className="bg-white border border-gray-200 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-2">Mobile (375px)</div>
              <div className="bg-gray-100 rounded border-2 border-gray-300 mx-auto" style={{ width: '375px', height: '667px' }}>
                <div className="text-xs text-center text-gray-400 p-2">Mobile preview coming soon...</div>
              </div>
            </div>
            
            {/* Tablet */}
            <div className="bg-white border border-gray-200 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-2">Tablet (768px)</div>
              <div className="bg-gray-100 rounded border-2 border-gray-300 mx-auto" style={{ width: '768px', height: '1024px' }}>
                <div className="text-xs text-center text-gray-400 p-2">Tablet preview coming soon...</div>
              </div>
            </div>
            
            {/* Desktop */}
            <div className="bg-white border border-gray-200 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-2">Desktop (1440px)</div>
              <div className="bg-gray-100 rounded border-2 border-gray-300 mx-auto" style={{ width: '1440px', height: '900px' }}>
                <div className="text-xs text-center text-gray-400 p-2">Desktop preview coming soon...</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'json' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-auto">
          <h3 className="text-sm font-semibold mb-2">JSON Structure for: {selectedFrame?.name}</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(selectedFrame, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-2 text-center text-xs text-gray-500">
        Original: {Math.round(width)} × {Math.round(height)}px
        {initialScale < 1 && ` • Initial Scale: ${Math.round(initialScale * 100)}%`}
        {!selectedFrame?.absoluteBoundingBox && ` • Calculated from children`}
        {viewMode === 'preview' && ` • Use mouse wheel to zoom, drag to pan`}
        {viewMode === 'code' && ` • Copy the generated code for your Next.js project`}
        {viewMode === 'responsive' && ` • AI-powered responsive layout coming soon`}
      </div>
    </div>
  );
};

export default FigmaLayout; 