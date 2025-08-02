'use client';

import React from 'react';
import { FigmaNode } from './types';

// Base props interface for all renderers
export interface FigmaRendererProps {
  node: FigmaNode;
  showDebug?: boolean;
  isRoot?: boolean;
  normalizationOffset?: { x: number; y: number };
  parentBoundingBox?: { x: number; y: number; width: number; height: number };
  imageMap?: Record<string, string>;
  parentMask?: boolean;
  parentMaskType?: string;
  fileKey?: string;
  figmaToken?: string;
  devMode?: boolean;
}

// Utility functions for dynamic rendering
export const rgbaToCss = (r: number, g: number, b: number, a: number = 1): string => {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
};

export const getFontFamilyWithFallback = (fontFamily: string): string => {
  const fontMap: Record<string, string> = {
    'Inter': 'Inter, system-ui, sans-serif',
    'IBM Plex Sans': 'IBM Plex Sans, system-ui, sans-serif',
    'Space Grotesk': 'Space Grotesk, system-ui, sans-serif',
  };
  return fontMap[fontFamily] || `${fontFamily}, system-ui, sans-serif`;
};

// Dynamic text rendering based on characterStyleOverrides
export const renderStyledText = (
  characters: string,
  characterStyleOverrides: number[],
  styleOverrideTable: Record<string, any>,
  nodeFills: any[]
): string => {
  if (!characterStyleOverrides || !styleOverrideTable) {
    return characters;
  }

  const segments: Array<{ text: string; style: any }> = [];
  let currentStyle = characterStyleOverrides[0] || 0;
  let currentText = '';

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const styleOverride = characterStyleOverrides[i] || 0;
    
    if (char === '\n') {
      if (currentText) {
        const styleKey = currentStyle.toString();
        const styleData = styleOverrideTable[styleKey];
        segments.push({ text: currentText, style: styleData });
        currentText = '';
      }
      segments.push({ text: '<br>', style: null });
      continue;
    }

    if (styleOverride !== currentStyle && currentText) {
      const styleKey = currentStyle.toString();
      const styleData = styleOverrideTable[styleKey];
      segments.push({ text: currentText, style: styleData });
      currentText = '';
      currentStyle = styleOverride;
    }

    currentText += char;
  }

  if (currentText) {
    const styleKey = currentStyle.toString();
    const styleData = styleOverrideTable[styleKey];
    segments.push({ text: currentText, style: styleData });
  }

  return segments.map(segment => {
    if (segment.text === '<br>') return '<br>';
    
    if (!segment.style) return segment.text;
    
    let spanStyles = '';
    
    // Font family
    if (segment.style.fontFamily) {
      spanStyles += `font-family: ${getFontFamilyWithFallback(segment.style.fontFamily)}; `;
    }
    
    // Font size
    if (segment.style.fontSize) {
      spanStyles += `font-size: ${segment.style.fontSize}px; `;
    }
    
    // Font weight
    if (segment.style.fontWeight) {
      spanStyles += `font-weight: ${segment.style.fontWeight}; `;
    }
    
    // Text color - prioritize style-specific fills, then fall back to node fills
    let colorApplied = false;
    if (segment.style.fills && segment.style.fills.length > 0) {
      const fill = segment.style.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        spanStyles += `color: ${rgbaToCss(fill.color.r, fill.color.g, fill.color.b, fill.color.a)}; `;
        colorApplied = true;
      }
    }
    
    if (!colorApplied && nodeFills && nodeFills.length > 0) {
      const fill = nodeFills[0];
      if (fill.type === 'SOLID' && fill.color) {
        spanStyles += `color: ${rgbaToCss(fill.color.r, fill.color.g, fill.color.b, fill.color.a)}; `;
      }
    }
    
    // Text decoration
    if (segment.style.textDecoration === 'underline') {
      spanStyles += `text-decoration: underline; text-decoration-color: currentColor; text-decoration-thickness: 1px; text-underline-offset: 2px; `;
    }
    
    // Letter spacing
    if (segment.style.letterSpacing) {
      spanStyles += `letter-spacing: ${segment.style.letterSpacing}px; `;
    }
    
    // Line height
    if (segment.style.lineHeight) {
      spanStyles += `line-height: ${segment.style.lineHeight}px; `;
    } else if (segment.style.lineHeightPercent) {
      spanStyles += `line-height: ${segment.style.lineHeightPercent}%; `;
    }
    
    return spanStyles ? `<span style="${spanStyles.trim()}">${segment.text}</span>` : segment.text;
  }).join('');
};

// Dynamic style computation from JSON properties
export const computeStyles = (node: FigmaNode): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  // Position and layout
  if (node.absoluteBoundingBox) {
    styles.position = 'absolute';
    styles.left = `${node.absoluteBoundingBox.x}px`;
    styles.top = `${node.absoluteBoundingBox.y}px`;
    styles.width = `${node.absoluteBoundingBox.width}px`;
    styles.height = `${node.absoluteBoundingBox.height}px`;
  }
  
  // Opacity
  if (node.opacity !== undefined) {
    styles.opacity = node.opacity;
  }
  
  // Visibility
  if (node.visible === false) {
    styles.display = 'none';
  }
  
  // Corner radius
  if (node.cornerRadius !== undefined) {
    if (node.cornerRadius === 0) {
      styles.borderRadius = '0';
    } else if (node.cornerRadius > 0) {
      styles.borderRadius = `${node.cornerRadius}px`;
    }
  }
  
  // Individual corner radius
  if (node.cornerRadiusTopLeft || node.cornerRadiusTopRight || node.cornerRadiusBottomLeft || node.cornerRadiusBottomRight) {
    const topLeft = node.cornerRadiusTopLeft || 0;
    const topRight = node.cornerRadiusTopRight || 0;
    const bottomLeft = node.cornerRadiusBottomLeft || 0;
    const bottomRight = node.cornerRadiusBottomRight || 0;
    styles.borderRadius = `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`;
  }
  
  // Rotation
  if (node.rotation !== undefined) {
    styles.transform = `rotate(${node.rotation}deg)`;
  }
  
  // Z-index
  if (node.zIndex !== undefined) {
    styles.zIndex = node.zIndex;
  }
  
  // Blend mode
  if (node.blendMode) {
    styles.mixBlendMode = node.blendMode.toLowerCase().replace('_', '-') as any;
  }
  
  return styles;
};

// Dynamic fill computation
export const computeFillStyles = (node: FigmaNode): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  if (!node.fills || node.fills.length === 0) {
    return styles;
  }
  
  const fill = node.fills[0];
  
  switch (fill.type) {
    case 'SOLID':
      if (fill.color) {
        styles.backgroundColor = rgbaToCss(fill.color.r, fill.color.g, fill.color.b, fill.color.a);
      }
      break;
      
    case 'GRADIENT_LINEAR':
      if (fill.gradientStops && fill.gradientStops.length > 0) {
        const stops = fill.gradientStops.map(stop => 
          `${rgbaToCss(stop.color.r, stop.color.g, stop.color.b, stop.color.a)} ${stop.position * 100}%`
        ).join(', ');
        styles.background = `linear-gradient(to right, ${stops})`;
      }
      break;
      
    case 'GRADIENT_RADIAL':
      if (fill.gradientStops && fill.gradientStops.length > 0) {
        const stops = fill.gradientStops.map(stop => 
          `${rgbaToCss(stop.color.r, stop.color.g, stop.color.b, stop.color.a)} ${stop.position * 100}%`
        ).join(', ');
        styles.background = `radial-gradient(circle, ${stops})`;
      }
      break;
      
    case 'IMAGE':
      if (fill.imageRef) {
        // Use placeholder for broken image refs
        const imageUrl = fill.imageRef.startsWith('http') ? fill.imageRef : '/placeholder.svg';
        styles.backgroundImage = `url(${imageUrl})`;
        styles.backgroundSize = 'cover';
        styles.backgroundPosition = 'center';
        styles.backgroundRepeat = 'no-repeat';
      } else {
        // Fallback to placeholder if no imageRef
        styles.backgroundImage = 'url(/placeholder.svg)';
        styles.backgroundSize = 'cover';
        styles.backgroundPosition = 'center';
        styles.backgroundRepeat = 'no-repeat';
      }
      break;
  }
  
  return styles;
};

// Dynamic stroke computation
export const computeStrokeStyles = (node: FigmaNode): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  if (!node.strokes || node.strokes.length === 0) {
    return styles;
  }
  
  const stroke = node.strokes[0];
  
  if (stroke.type === 'SOLID' && stroke.color) {
    const color = rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a);
    const weight = stroke.strokeWeight || 1;
    
    switch (stroke.strokeAlign) {
      case 'INSIDE':
        styles.border = `${weight}px solid ${color}`;
        break;
      case 'CENTER':
        styles.outline = `${weight}px solid ${color}`;
        styles.outlineOffset = `-${weight}px`;
        break;
      case 'OUTSIDE':
        styles.outline = `${weight}px solid ${color}`;
        break;
      default:
        styles.border = `${weight}px solid ${color}`;
    }
  }
  
  return styles;
};

// Dynamic effects computation
export const computeEffectStyles = (node: FigmaNode): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  if (!node.effects || node.effects.length === 0) {
    return styles;
  }
  
  const effects = node.effects.filter(effect => effect.visible !== false);
  
  effects.forEach(effect => {
    switch (effect.type) {
      case 'DROP_SHADOW':
        if (effect.color && effect.radius !== undefined) {
          const color = rgbaToCss(effect.color.r, effect.color.g, effect.color.b, effect.color.a);
          const offsetX = effect.offset?.x || 0;
          const offsetY = effect.offset?.y || 0;
          const blur = effect.radius;
          const spread = effect.spread || 0;
          styles.boxShadow = `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${color}`;
        }
        break;
        
      case 'INNER_SHADOW':
        if (effect.color && effect.radius !== undefined) {
          const color = rgbaToCss(effect.color.r, effect.color.g, effect.color.b, effect.color.a);
          const offsetX = effect.offset?.x || 0;
          const offsetY = effect.offset?.y || 0;
          const blur = effect.radius;
          const spread = effect.spread || 0;
          styles.boxShadow = `inset ${offsetX}px ${offsetY}px ${blur}px ${spread}px ${color}`;
        }
        break;
        
      case 'LAYER_BLUR':
        if (effect.radius !== undefined) {
          styles.filter = `blur(${effect.radius}px)`;
        }
        break;
        
      case 'BACKGROUND_BLUR':
        if (effect.radius !== undefined) {
          styles.backdropFilter = `blur(${effect.radius}px)`;
        }
        break;
    }
  });
  
  return styles;
};

// Component registry - maps node types to renderer components
export const componentRegistry: Record<string, React.FC<FigmaRendererProps>> = {};

// Register a component renderer
export const registerComponent = (type: string, component: React.FC<FigmaRendererProps>) => {
  componentRegistry[type] = component;
};

// Get renderer for a node type
export const getRenderer = (type: string): React.FC<FigmaRendererProps> => {
  return componentRegistry[type] || componentRegistry['DEFAULT'];
};

// Default renderer for unknown types
export const DefaultRenderer: React.FC<FigmaRendererProps> = ({ node, showDebug, ...props }) => {
  const styles = {
    ...computeStyles(node),
    ...computeFillStyles(node),
    ...computeStrokeStyles(node),
    ...computeEffectStyles(node),
  };
  
  return (
    <div style={styles}>
      {showDebug && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          background: 'rgba(255, 0, 0, 0.2)', 
          color: 'red', 
          fontSize: '10px',
          padding: '2px'
        }}>
          {node.type} - {node.name}
        </div>
      )}
      {node.children?.map((child, index) => (
        <DynamicRenderer key={child.id || index} node={child} showDebug={showDebug} {...props} />
      ))}
    </div>
  );
};

// Dynamic renderer that uses the component registry
export const DynamicRenderer: React.FC<FigmaRendererProps> = (props) => {
  const Renderer = getRenderer(props.node.type);
  return <Renderer {...props} />;
};

// Register default renderer
registerComponent('DEFAULT', DefaultRenderer); 