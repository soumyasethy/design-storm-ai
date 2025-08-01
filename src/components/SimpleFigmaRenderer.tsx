import React from 'react';

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
  // Additional Figma properties for production rendering
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

interface SimpleFigmaRendererProps {
  node: FigmaNode;
  className?: string;
  generateCode?: boolean; // Toggle between visual preview and code generation
  parentOffset?: { x: number; y: number }; // For relative positioning
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

const SimpleFigmaRenderer: React.FC<SimpleFigmaRendererProps> = ({ 
  node, 
  className = '',
  generateCode = false,
  parentOffset = { x: 0, y: 0 }
}) => {
  // Calculate bounding box
  const boundingBox = calculateBoundingBox(node);
  
  if (!boundingBox) {
    console.log('No bounding box for node:', node.name, node.type);
    return null;
  }

  const { x, y, width, height } = boundingBox;
  
  // Apply parent offset for relative positioning
  const adjustedX = x - parentOffset.x;
  const adjustedY = y - parentOffset.y;

  const minWidth = Math.max(width, 1);
  const minHeight = Math.max(height, 1);

  // Convert Figma colors to CSS
  const getBackgroundColor = () => {
    if (node.fills && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        const { r, g, b } = fill.color;
        return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
      }
    }
    // Default color coding for different node types
    switch (node.type) {
      case 'TEXT':
        return 'rgba(59, 130, 246, 0.2)';
      case 'RECTANGLE':
        return 'rgba(34, 197, 94, 0.2)';
      case 'ELLIPSE':
        return 'rgba(168, 85, 247, 0.2)';
      case 'FRAME':
        return 'rgba(168, 85, 247, 0.1)';
      case 'GROUP':
        return 'rgba(251, 146, 60, 0.1)';
      case 'CANVAS':
        return 'rgba(156, 163, 175, 0.05)';
      default:
        return 'rgba(156, 163, 175, 0.15)';
    }
  };

  const getBorderColor = () => {
    if (node.strokes && node.strokes.length > 0) {
      const stroke = node.strokes[0];
      if (stroke.type === 'SOLID' && stroke.color) {
        const { r, g, b } = stroke.color;
        return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
      }
    }
    return '#d1d5db';
  };

  const getTextColor = () => {
    if (node.fills && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        const { r, g, b } = fill.color;
        return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
      }
    }
    return '#111827';
  };

  const getTextContent = () => {
    if (node.type === 'TEXT' && node.characters) {
      return node.characters;
    }
    return `${node.name} (${node.type})`;
  };

  const getFontSize = () => {
    if (node.style?.fontSize) {
      return `${node.style.fontSize}px`;
    }
    return '12px';
  };

  // Generate Tailwind classes for production code
  const generateTailwindClasses = () => {
    const classes = ['absolute'];
    
    // Positioning
    classes.push(`left-[${adjustedX}px]`, `top-[${adjustedY}px]`);
    
    // Dimensions
    classes.push(`w-[${minWidth}px]`, `h-[${minHeight}px]`);
    
    // Background
    if (node.fills && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        const { r, g, b } = fill.color;
        classes.push(`bg-[rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})]`);
      }
    }
    
    // Border
    if (node.strokes && node.strokes.length > 0) {
      classes.push(`border`, `border-[${getBorderColor()}]`);
      if (node.strokeWeight) {
        classes.push(`border-[${node.strokeWeight}px]`);
      }
    }
    
    // Border radius
    if (node.cornerRadius) {
      classes.push(`rounded-[${node.cornerRadius}px]`);
    }
    
    // Typography
    if (node.type === 'TEXT') {
      classes.push('flex', 'items-center', 'justify-center');
      if (node.style?.fontSize) {
        classes.push(`text-[${node.style.fontSize}px]`);
      }
      if (node.style?.fontWeight) {
        classes.push(`font-${node.style.fontWeight >= 700 ? 'bold' : node.style.fontWeight >= 600 ? 'semibold' : 'normal'}`);
      }
      if (node.style?.textAlignHorizontal) {
        const align = node.style.textAlignHorizontal.toLowerCase();
        classes.push(`text-${align === 'center' ? 'center' : align === 'right' ? 'right' : 'left'}`);
      }
    }
    
    // Opacity
    if (node.opacity !== undefined) {
      classes.push(`opacity-${Math.round(node.opacity * 100)}`);
    }
    
    return classes.join(' ');
  };

  // Generate React component code
  const generateComponentCode = () => {
    const tailwindClasses = generateTailwindClasses();
    const componentName = node.name.replace(/[^a-zA-Z0-9]/g, '') || 'Component';
    
    let code = '';
    
    if (node.type === 'TEXT') {
      code = `<div className="${tailwindClasses}">${node.characters || node.name}</div>`;
    } else if (node.children && node.children.length > 0) {
      code = `<div className="${tailwindClasses}">\n`;
      code += `  {/* ${node.name} */}\n`;
      code += `  ${node.children.map(child => 
        `<${child.name.replace(/[^a-zA-Z0-9]/g, '') || 'Child'} />`
      ).join('\n  ')}\n`;
      code += '</div>';
    } else {
      code = `<div className="${tailwindClasses}">\n`;
      code += `  {/* ${node.name} */}\n`;
      code += '</div>';
    }
    
    return code;
  };

  const styles: React.CSSProperties = {
    position: 'absolute',
    left: `${adjustedX}px`,
    top: `${adjustedY}px`,
    width: `${minWidth}px`,
    height: `${minHeight}px`,
    backgroundColor: getBackgroundColor(),
    border: `1px solid ${getBorderColor()}`,
    borderRadius: node.cornerRadius ? `${node.cornerRadius}px` : '0px',
    fontSize: getFontSize(),
    color: getTextColor(),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    overflow: 'hidden',
    wordBreak: 'break-word',
    textAlign: 'center',
    padding: '2px',
    fontFamily: node.style?.fontFamily || 'system-ui, sans-serif',
    fontWeight: node.style?.fontWeight || 'normal',
    zIndex: 1,
    opacity: node.opacity !== undefined ? node.opacity : 1,
  };

  if (generateCode) {
    return (
      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs">
        <div className="mb-2 text-white">Generated Code for: {node.name}</div>
        <pre className="whitespace-pre-wrap">
          {generateComponentCode()}
        </pre>
        <div className="mt-2 text-gray-400">
          Tailwind Classes: {generateTailwindClasses()}
        </div>
      </div>
    );
  }

  return (
    <div 
      style={styles}
      className={`text-xs ${className}`}
      title={`${node.name} (${node.type}) - ${width}x${height} - ${generateTailwindClasses()}`}
      data-figma-node-id={node.id}
      data-figma-node-type={node.type}
      data-figma-node-name={node.name}
    >
      <span style={{ fontSize: 'inherit', color: 'inherit' }}>
        {getTextContent()}
      </span>
      
      {node.children && node.children.length > 0 && (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {node.children.map(child => (
            <SimpleFigmaRenderer 
              key={child.id} 
              node={child} 
              generateCode={generateCode}
              parentOffset={boundingBox}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SimpleFigmaRenderer; 