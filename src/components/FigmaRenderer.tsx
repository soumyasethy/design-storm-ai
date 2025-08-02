'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { getSpecialColor, isCircularElement } from '@/lib/utils';

interface FigmaRendererProps {
  node: any;
  showDebug?: boolean;
  isRoot?: boolean;
  normalizationOffset?: { x: number; y: number };
  parentBoundingBox?: { x: number; y: number; width: number; height: number };
  imageMap?: Record<string, string>;
  parentMask?: boolean;
  parentMaskType?: string;
  fileKey?: string;
  figmaToken?: string;
}

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
  fills?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a?: number };
    imageRef?: string;
    imageUrl?: string;
    gradientStops?: Array<{
      position: number;
      color: { r: number; g: number; b: number; a?: number };
    }>;
  }>;
  strokes?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a?: number };
    strokeWeight?: number;
  }>;
  strokeWeight?: number;
  cornerRadius?: number;
  characters?: string;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    textAlignHorizontal?: string;
    textAlignVertical?: string;
    lineHeight?: number;
    lineHeightPx?: number;
    lineHeightPercent?: number;
    letterSpacing?: number;
    textDecoration?: string;
  };
  opacity?: number;
  visible?: boolean;
  isMask?: boolean;
  maskType?: string;
  effects?: Array<{
    type: string;
    visible?: boolean;
    radius?: number;
    color?: { r: number; g: number; b: number; a?: number };
    offset?: { x: number; y: number };
  }>;
  rotation?: number;
  layoutAlign?: string;
  layoutGrow?: number;
  layoutMode?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  componentId?: string;
  componentSetId?: string;
  zIndex?: number;
  // Enhanced properties for geometric elements and transforms
  transform?: Array<number>; // Matrix transform
  skew?: number; // Skew angle in degrees
  scale?: { x: number; y: number }; // Scale factors
  clipPath?: string; // CSS clip-path
  maskImage?: string; // Mask image URL
  geometricType?: string; // 'line', 'angle', 'diagonal', etc.
  lineStart?: { x: number; y: number }; // For geometric lines
  lineEnd?: { x: number; y: number }; // For geometric lines
  angleDegrees?: number; // For angled elements
  sectionTransition?: string; // 'angled-cut', 'diagonal', etc.
}

// Enhanced color conversion utilities
const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const rgbaToCss = (r: number, g: number, b: number, a: number = 1): string => {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
};

// Enhanced fill styles with improved color handling and gradient support
const getFillStyles = (fills: any[], nodeId?: string, imageMap?: Record<string, string>): React.CSSProperties => {
  if (!fills || fills.length === 0) return {};
  
  const fill = fills[0];
  const styles: React.CSSProperties = {};
  
  if (fill.type === 'SOLID' && fill.color) {
    // Use hex colors for better accuracy
    const hexColor = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
    styles.backgroundColor = hexColor;
    
    // Handle opacity separately for better browser support
    if (fill.color.a !== undefined && fill.color.a !== 1) {
      styles.opacity = fill.color.a;
    }
  } else if (fill.type === 'IMAGE') {
    const imageUrl = fill.imageUrl || (nodeId && imageMap && imageMap[nodeId]);
    if (imageUrl) {
      styles.backgroundImage = `url('${imageUrl}')`;
      styles.backgroundSize = 'cover';
      styles.backgroundPosition = 'center';
      styles.backgroundRepeat = 'no-repeat';
    }
  } else if (fill.type === 'GRADIENT_LINEAR' && fill.gradientStops) {
    const stops = fill.gradientStops.map((stop: any) => {
      const hexColor = rgbToHex(stop.color.r, stop.color.g, stop.color.b);
      return `${hexColor} ${stop.position * 100}%`;
    }).join(', ');
    styles.background = `linear-gradient(to bottom, ${stops})`;
  } else if (fill.type === 'GRADIENT_RADIAL' && fill.gradientStops) {
    const stops = fill.gradientStops.map((stop: any) => {
      const hexColor = rgbToHex(stop.color.r, stop.color.g, stop.color.b);
      return `${hexColor} ${stop.position * 100}%`;
    }).join(', ');
    styles.background = `radial-gradient(circle, ${stops})`;
  }
  
  return styles;
};

// Enhanced stroke styles
const getStrokeStyles = (strokes: any[], strokeWeight?: number): React.CSSProperties => {
  if (!strokes || strokes.length === 0) return {};
  
  const stroke = strokes[0];
  const styles: React.CSSProperties = {};
  
  if (stroke.type === 'SOLID' && stroke.color) {
    const weight = stroke.strokeWeight || strokeWeight || 1;
    styles.border = `${weight}px solid ${rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a)}`;
  }
  
  return styles;
};

// Enhanced corner radius handling
const getCornerRadius = (radius: number): string => {
  if (radius === 0) return '0';
  if (radius >= 50) return '50%';
  return `${radius}px`;
};

// Enhanced font family mapping
const getFontFamily = (family: string): string => {
  if (!family) return 'inherit';
  
  const fontMap: Record<string, string> = {
    'Inter': 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'Roboto': 'Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Open Sans': '"Open Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Lato': 'Lato, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Poppins': 'Poppins, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Montserrat': 'Montserrat, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Source Sans Pro': '"Source Sans Pro", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Raleway': 'Raleway, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Ubuntu': 'Ubuntu, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Nunito': 'Nunito, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Arial': 'Arial, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Helvetica': 'Helvetica, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Times New Roman': '"Times New Roman", Times, serif',
    'Georgia': 'Georgia, serif',
    'Verdana': 'Verdana, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  };
  
  return fontMap[family] || `${family}, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
};

// Enhanced text alignment
const getTextAlign = (align: string): string => {
  switch (align) {
    case 'CENTER': return 'center';
    case 'RIGHT': return 'right';
    case 'JUSTIFIED': return 'justify';
    default: return 'left';
  }
};

const getVerticalAlign = (align: string): string => {
  switch (align) {
    case 'CENTER': return 'center';
    case 'BOTTOM': return 'flex-end';
    default: return 'flex-start';
  }
};

// Enhanced layout utilities
const getLayoutStyles = (node: any): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  // Handle layout mode
  if (node.layoutMode === 'HORIZONTAL') {
    styles.display = 'flex';
    styles.flexDirection = 'row';
  } else if (node.layoutMode === 'VERTICAL') {
    styles.display = 'flex';
    styles.flexDirection = 'column';
  }
  
  // Handle alignment
  if (node.primaryAxisAlignItems) {
    switch (node.primaryAxisAlignItems) {
      case 'CENTER':
        styles.justifyContent = 'center';
        break;
      case 'SPACE_BETWEEN':
        styles.justifyContent = 'space-between';
        break;
      case 'SPACE_AROUND':
        styles.justifyContent = 'space-around';
        break;
      case 'SPACE_EVENLY':
        styles.justifyContent = 'space-evenly';
        break;
      case 'MAX':
        styles.justifyContent = 'flex-end';
        break;
      default:
        styles.justifyContent = 'flex-start';
    }
  }
  
  if (node.counterAxisAlignItems) {
    switch (node.counterAxisAlignItems) {
      case 'CENTER':
        styles.alignItems = 'center';
        break;
      case 'MAX':
        styles.alignItems = 'flex-end';
        break;
      case 'BASELINE':
        styles.alignItems = 'baseline';
        break;
      default:
        styles.alignItems = 'flex-start';
    }
  }
  
  // Handle spacing with exact pixel values
  if (node.itemSpacing) {
    styles.gap = `${node.itemSpacing}px`;
  }
  
  // Handle padding with exact pixel values
  if (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) {
    styles.padding = `${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px`;
  }
  
  // Handle margins if specified
  if (node.marginLeft || node.marginRight || node.marginTop || node.marginBottom) {
    styles.margin = `${node.marginTop || 0}px ${node.marginRight || 0}px ${node.marginBottom || 0}px ${node.marginLeft || 0}px`;
  }
  
  // Handle overflow for better content clipping
  if (node.absoluteBoundingBox) {
    styles.overflow = 'hidden'; // Default to hidden to prevent content bleeding
  }
  
  // Handle section transitions and angled cuts
  if (node.sectionTransition) {
    switch (node.sectionTransition) {
      case 'angled-cut':
        styles.clipPath = 'polygon(0 0, 100% 0, 100% 85%, 0 100%)';
        break;
      case 'diagonal':
        styles.clipPath = 'polygon(0 0, 100% 15%, 100% 100%, 0 85%)';
        break;
      case 'reverse-angled':
        styles.clipPath = 'polygon(0 15%, 100% 0, 100% 100%, 0 85%)';
        break;
    }
  }
  
  return styles;
};

// Enhanced positioning utilities
const getPositionStyles = (node: any, parentBoundingBox?: { x: number; y: number; width: number; height: number }): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  if (node.absoluteBoundingBox) {
    const { x, y, width, height } = node.absoluteBoundingBox;
    
    if (parentBoundingBox) {
      // Calculate relative positioning for children
      styles.position = 'absolute';
      styles.left = `${x - parentBoundingBox.x}px`;
      styles.top = `${y - parentBoundingBox.y}px`;
      styles.width = `${width}px`;
      styles.height = `${height}px`;
    } else {
      // Root node positioning
      styles.position = 'relative';
      styles.width = `${width}px`;
      styles.height = `${height}px`;
    }
  }
  
  // Handle z-index and stacking order
  if (node.zIndex !== undefined) {
    styles.zIndex = node.zIndex;
  } else if (node.name?.toLowerCase().includes('overlay') || node.name?.toLowerCase().includes('modal')) {
    // Auto-assign high z-index for overlay elements
    styles.zIndex = 1000;
  }
  
  // Handle transform for angled layouts
  if (node.rotation !== undefined && node.rotation !== 0) {
    styles.transform = `rotate(${node.rotation}rad)`;
  }
  
  return styles;
};

// Enhanced effect styles
const getEffectStyles = (effects: any[]): React.CSSProperties => {
  if (!effects || effects.length === 0) return {};
  
  const styles: React.CSSProperties = {};
  
  effects.forEach((effect: any) => {
    if (effect.visible === false) return;
    
    switch (effect.type) {
      case 'DROP_SHADOW':
        const offsetX = effect.offset?.x || 0;
        const offsetY = effect.offset?.y || 0;
        const radius = effect.radius || 0;
        const color = effect.color ? rgbaToCss(effect.color.r, effect.color.g, effect.color.b, effect.color.a) : 'rgba(0, 0, 0, 0.5)';
        styles.boxShadow = `${offsetX}px ${offsetY}px ${radius}px ${color}`;
        break;
      case 'INNER_SHADOW':
        const innerOffsetX = effect.offset?.x || 0;
        const innerOffsetY = effect.offset?.y || 0;
        const innerRadius = effect.radius || 0;
        const innerColor = effect.color ? rgbaToCss(effect.color.r, effect.color.g, effect.color.b, effect.color.a) : 'rgba(0, 0, 0, 0.5)';
        styles.boxShadow = `inset ${innerOffsetX}px ${innerOffsetY}px ${innerRadius}px ${innerColor}`;
        break;
      case 'BACKGROUND_BLUR':
        styles.backdropFilter = `blur(${effect.radius || 0}px)`;
        break;
    }
  });
  
  return styles;
};

// Enhanced text styles with rich text support and pixel-perfect rendering
const getTextStyles = (node: any): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  if (node.style) {
    // Font family - prioritize Inter for better rendering
    if (node.style.fontFamily) {
      styles.fontFamily = getFontFamily(node.style.fontFamily);
    } else {
      // Default to Inter if no font family specified
      styles.fontFamily = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    }
    
    // Font size - ensure exact pixel values
    if (node.style.fontSize) {
      styles.fontSize = `${node.style.fontSize}px`;
    }
    
    // Font weight - exact weight matching with fallbacks
    if (node.style.fontWeight) {
      styles.fontWeight = node.style.fontWeight;
    } else {
      // Default font weight for better readability
      styles.fontWeight = 400;
    }
    
    // Text alignment - exact horizontal alignment
    if (node.style.textAlignHorizontal) {
      styles.textAlign = getTextAlign(node.style.textAlignHorizontal) as any;
    }
    
    // Vertical alignment for text containers
    if (node.style.textAlignVertical) {
      styles.display = 'flex';
      styles.alignItems = getVerticalAlign(node.style.textAlignVertical) as any;
    }
    
    // Line height - exact pixel or percentage values
    if (node.style.lineHeightPx) {
      styles.lineHeight = `${node.style.lineHeightPx}px`;
    } else if (node.style.lineHeightPercent) {
      styles.lineHeight = `${node.style.lineHeightPercent}%`;
    } else if (node.style.fontSize) {
      // Default line height based on font size for better readability
      styles.lineHeight = `${node.style.fontSize * 1.2}px`;
    }
    
    // Letter spacing - exact pixel values
    if (node.style.letterSpacing) {
      styles.letterSpacing = `${node.style.letterSpacing}px`;
    }
    
    // Text decoration - handle underline and other decorations
    if (node.style.textDecoration) {
      const decoration = node.style.textDecoration.toLowerCase();
      if (decoration === 'underline') {
        styles.textDecoration = 'underline';
      } else if (decoration === 'strikethrough') {
        styles.textDecoration = 'line-through';
      } else {
        styles.textDecoration = decoration;
      }
    }
  }
  
  // Handle text fills with exact color matching and special color handling
  if (node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID' && fill.color) {
      // Convert to hex for better color accuracy
      const hexColor = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
      // Use special color handling for specific text elements
      styles.color = getSpecialColor(node.name || '', hexColor);
    }
  }
  
  // Enhanced text wrapping properties for better inline rendering
  styles.whiteSpace = 'pre-wrap';
  styles.overflowWrap = 'break-word';
  styles.wordBreak = 'break-word';
  styles.display = 'inline'; // Ensure text elements are inline by default
  
  // Ensure proper text rendering
  (styles as any).fontSmoothing = 'antialiased';
  (styles as any).webkitFontSmoothing = 'antialiased';
  
  return styles;
};

// Enhanced shape styles with improved circular handling and transforms
const getShapeStyles = (node: any): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  // Handle corner radius with improved circular detection
  if (node.cornerRadius) {
    const radius = node.cornerRadius;
    const { width, height } = node.absoluteBoundingBox || {};
    
    // Use enhanced circular detection for footer icons and avatars
    if (isCircularElement(node)) {
      styles.borderRadius = '50%';
      // Ensure perfect circle for social media icons
      if (node.name?.toLowerCase().includes('linkedin') || 
          node.name?.toLowerCase().includes('instagram') || 
          node.name?.toLowerCase().includes('youtube')) {
        styles.border = '2px solid #FF0A54'; // Pink border for footer icons
      }
    } else {
      styles.borderRadius = `${radius}px`;
    }
  }
  
  // Handle complex transforms for angled cards and geometric elements
  let transform = '';
  
  // Handle rotation
  if (node.rotation !== undefined && node.rotation !== 0) {
    transform += `rotate(${node.rotation}rad) `;
  }
  
  // Handle skew for angled cards
  if (node.skew !== undefined && node.skew !== 0) {
    transform += `skew(${node.skew}deg) `;
  }
  
  // Handle scale
  if (node.scale) {
    transform += `scale(${node.scale.x || 1}, ${node.scale.y || 1}) `;
  }
  
  // Handle matrix transform
  if (node.transform && Array.isArray(node.transform)) {
    transform += `matrix(${node.transform.join(', ')}) `;
  }
  
  if (transform) {
    styles.transform = transform.trim();
  }
  
  // Handle clip-path for angled cuts
  if (node.clipPath) {
    styles.clipPath = node.clipPath;
  }
  
  // Handle mask image
  if (node.maskImage) {
    styles.maskImage = `url(${node.maskImage})`;
    styles.maskSize = 'cover';
    styles.maskPosition = 'center';
  }
  
  // Add box shadow for cards
  if (node.name?.toLowerCase().includes('card') || 
      node.name?.toLowerCase().includes('manufacturing') ||
      node.name?.toLowerCase().includes('brands') ||
      node.name?.toLowerCase().includes('stores')) {
    styles.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
  }
  
  // Handle strokes for better border rendering
  if (node.strokes && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    if (stroke.type === 'SOLID' && stroke.color) {
      const strokeWidth = stroke.strokeWeight || node.strokeWeight || 1;
      const strokeColor = rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
      styles.border = `${strokeWidth}px solid ${strokeColor}`;
    }
  }
  
  return styles;
};

// Enhanced component styles with background elements
const getComponentStyles = (node: any): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  // Handle component-specific styling
  if (node.componentId || node.componentSetId) {
    // Add component-specific classes or styles
    styles.position = 'relative';
  }
  
  // Handle background elements and decorative lines
  if (node.name?.toLowerCase().includes('background') || node.name?.toLowerCase().includes('line')) {
    styles.position = 'absolute';
    styles.pointerEvents = 'none';
  }
  
  // Handle section backgrounds
  if (node.name?.toLowerCase().includes('section')) {
    styles.position = 'relative';
    styles.overflow = 'hidden';
  }
  
  return styles;
};

// Enhanced visibility handling
const isNodeVisible = (node: any): boolean => {
  if (node.visible === false) return false;
  if (node.opacity === 0) return false;
  return true;
};

// Render geometric accent lines with exact positioning and styling
const renderGeometricLine = (node: any, baseStyles: React.CSSProperties) => {
  const { name, absoluteBoundingBox, lineStart, lineEnd, angleDegrees, geometricType } = node;
  
  // Determine line color based on node name or type
  const getLineColor = () => {
    const nodeName = name?.toLowerCase() || '';
    if (nodeName.includes('pink') || nodeName.includes('accent') || nodeName.includes('primary')) {
      return '#FF0A54'; // Pink accent
    }
    if (nodeName.includes('blue') || nodeName.includes('secondary')) {
      return '#0066FF'; // Blue
    }
    if (nodeName.includes('red')) {
      return '#ff0055'; // Red
    }
    return '#FF0A54'; // Default pink
  };

  const lineColor = getLineColor();
  const strokeWidth = node.strokeWeight || 2;

  if (geometricType === 'diagonal' || angleDegrees) {
    // Render diagonal/angled line
    const angle = angleDegrees || 45;
    const length = absoluteBoundingBox?.width || 100;
    
    return (
      <div
        style={{
          ...baseStyles,
          position: 'absolute',
          transform: `rotate(${angle}deg)`,
          transformOrigin: '0 0',
        }}
      >
        <svg
          width={length}
          height={strokeWidth}
          style={{ display: 'block' }}
        >
          <line
            x1="0"
            y1={strokeWidth / 2}
            x2={length}
            y2={strokeWidth / 2}
            stroke={lineColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  if (lineStart && lineEnd) {
    // Render line between two points
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    return (
      <div
        style={{
          ...baseStyles,
          position: 'absolute',
          left: `${lineStart.x}px`,
          top: `${lineStart.y}px`,
          transform: `rotate(${angle}deg)`,
          transformOrigin: '0 0',
        }}
      >
        <svg
          width={length}
          height={strokeWidth}
          style={{ display: 'block' }}
        >
          <line
            x1="0"
            y1={strokeWidth / 2}
            x2={length}
            y2={strokeWidth / 2}
            stroke={lineColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  // Default vertical line
  return (
    <div style={baseStyles}>
      <svg
        width={strokeWidth}
        height={absoluteBoundingBox?.height || 100}
        style={{ display: 'block' }}
      >
        <line
          x1={strokeWidth / 2}
          y1="0"
          x2={strokeWidth / 2}
          y2={absoluteBoundingBox?.height || 100}
          stroke={lineColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

// Enhanced image rendering with improved circular handling and centering
const renderImage = (node: any, imageUrl: string, baseStyles: React.CSSProperties, showDebug: boolean) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  const handleImageError = () => {
    console.error(`❌ Image failed to load: ${imageUrl}`);
    setImageError(true);
    setImageLoading(false);
  };
  
  const handleImageLoad = () => {
    console.log(`✅ Image loaded successfully: ${node.name}`);
    setImageLoading(false);
  };
  
  // Enhanced circular detection for icons and avatars
  const isCircular = isCircularElement(node);
  
  // Determine object-fit based on node properties
  let objectFit: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down' = 'cover';
  if (node.scaleMode) {
    switch (node.scaleMode) {
      case 'FILL':
        objectFit = 'cover';
        break;
      case 'FIT':
        objectFit = 'contain';
        break;
      case 'CROP':
        objectFit = 'cover';
        break;
      default:
        objectFit = 'cover';
    }
  }
  
  const imageStyles: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: objectFit,
    borderRadius: isCircular ? '50%' : baseStyles.borderRadius,
    objectPosition: 'center',
  };
  
  if (imageError) {
    return (
      <div 
        style={{
          ...imageStyles,
          backgroundColor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: '12px',
        }}
      >
        <span>Image failed to load</span>
      </div>
    );
  }
  
  return (
    <>
      {imageLoading && (
        <div 
          style={{
            ...imageStyles,
            background: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
        />
      )}
      <Image
        src={imageUrl}
        alt={node.name || 'Figma image'}
        width={parseInt(baseStyles.width as string) || 100}
        height={parseInt(baseStyles.height as string) || 100}
        style={imageStyles}
        onLoad={handleImageLoad}
        onError={handleImageError}
        priority={false}
      />
    </>
  );
};

// Main FigmaRenderer component
const FigmaRenderer: React.FC<FigmaRendererProps> = ({ 
  node, 
  showDebug = false, 
  isRoot = false,
  normalizationOffset,
  parentBoundingBox,
  imageMap = {},
  parentMask = false,
  parentMaskType = 'ALPHA',
  fileKey,
  figmaToken
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Load image if this node has image fills
  useEffect(() => {
    if (node.fills && node.fills.some((fill: any) => fill.type === 'IMAGE') && node.id) {
      const url = imageMap?.[node.id] || node.fills.find((fill: any) => fill.type === 'IMAGE')?.imageUrl;
      if (url && typeof url === 'string' && url.length > 0) {
        setImageUrl(url);
      } else {
        setImageUrl(null);
      }
    }
  }, [node, imageMap]);

  // Skip invisible nodes
  if (!isNodeVisible(node)) {
    return null;
  }

  const { type, name, absoluteBoundingBox, children, fills, strokes, cornerRadius, characters, style, opacity, isMask, maskType, effects } = node;

  // Enhanced recursive renderer for all node types
  const renderNode = () => {
    // Extract all styles
    const positionStyles = getPositionStyles(node, isRoot ? undefined : parentBoundingBox);
    const layoutStyles = getLayoutStyles(node);
    const fillStyles = getFillStyles(fills, node.id, imageMap);
    const strokeStyles = getStrokeStyles(strokes, node.strokeWeight);
    const shapeStyles = getShapeStyles(node);
    const effectStyles = getEffectStyles(effects);
    const componentStyles = getComponentStyles(node);
    
    // Combine all styles
    const baseStyles: React.CSSProperties = {
      ...positionStyles,
      ...layoutStyles,
      ...fillStyles,
      ...strokeStyles,
      ...shapeStyles,
      ...effectStyles,
      ...componentStyles,
      opacity: opacity !== undefined ? opacity : 1,
    };
    
    // Add debug styling
    if (showDebug) {
      baseStyles.border = '1px solid #3b82f6';
      baseStyles.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    }
    
    // Handle different node types
    switch (type) {
      case 'CANVAS':
      case 'PAGE':
        return (
          <div 
            className="relative"
            style={{
              width: `${node.absoluteBoundingBox?.width || 0}px`,
              height: `${node.absoluteBoundingBox?.height || 0}px`,
              ...(showDebug ? { 
                border: '2px dashed #3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
              } : {})
            }}
          >
            {showDebug && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded z-50">
                <div>Canvas: {name}</div>
                <div>Type: {type}</div>
                <div>Children: {children?.length || 0}</div>
              </div>
            )}
            
            {children?.map((child: any, index: number) => (
              <FigmaRenderer
                key={child.id || index}
                node={child}
                showDebug={showDebug}
                parentBoundingBox={node.absoluteBoundingBox}
                imageMap={imageMap}
                fileKey={fileKey}
                figmaToken={figmaToken}
              />
            ))}
          </div>
        );

      case 'FRAME':
      case 'GROUP':
        return (
          <div
            className="relative"
            style={baseStyles}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {showDebug && (
              <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                <div className="font-bold">{name}</div>
                <div>{type} - {baseStyles.width}×{baseStyles.height}</div>
                {isMask && <div className="text-yellow-300">🔒 Mask</div>}
              </div>
            )}
            
            {children?.map((child: any, index: number) => (
              <FigmaRenderer
                key={child.id || index}
                node={child}
                showDebug={showDebug}
                parentBoundingBox={node.absoluteBoundingBox}
                imageMap={imageMap}
                parentMask={isMask}
                parentMaskType={maskType}
                fileKey={fileKey}
                figmaToken={figmaToken}
              />
            ))}
          </div>
        );

      case 'TEXT':
        if (!characters) return null;
        
        const textStyles = getTextStyles(node);
        const combinedTextStyles = {
          ...baseStyles,
          ...textStyles,
          display: 'flex',
          alignItems: getVerticalAlign(style?.textAlignVertical || 'TOP'),
          justifyContent: getTextAlign(style?.textAlignHorizontal || 'LEFT') === 'center' ? 'center' : 
                        getTextAlign(style?.textAlignHorizontal || 'LEFT') === 'right' ? 'flex-end' : 'flex-start',
        };
        
        // Enhanced text rendering with rich text support and inline alignment
        const renderRichText = (text: string) => {
          // Handle special text patterns for rich formatting with proper inline rendering
          if (text.includes('All-In.')) {
            return text.replace(
              /All-In\./g, 
              '<span style="color: #FF0A54; font-weight: 700; display: inline;">All-In.</span>'
            );
          }
          
          if (text.includes('Explore →')) {
            return text.replace(
              /Explore →/g,
              '<span style="color: #0066FF; text-decoration: underline; cursor: pointer; display: inline-flex; align-items: center; gap: 2px; font-weight: 600;">Explore <span style="font-size: 0.9em; margin-left: 2px;">→</span></span>'
            );
          }
          
          // Handle bold text patterns for emphasis
          if (text.includes('largest') || text.includes('futuristic') || text.includes('vertically integrated')) {
            return text
              .replace(/(largest)/g, '<span style="font-weight: 700; display: inline;">$1</span>')
              .replace(/(futuristic)/g, '<span style="font-weight: 700; display: inline;">$1</span>')
              .replace(/(vertically integrated)/g, '<span style="font-weight: 700; display: inline;">$1</span>');
          }
          
          // Handle "Learn More →" buttons with proper spacing and inline alignment
          if (text.includes('Learn More →')) {
            return text.replace(
              /Learn More →/g,
              '<span style="color: #0066FF; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; text-decoration: none;">Learn More <span style="font-size: 0.9em; margin-left: 2px;">→</span></span>'
            );
          }
          
          // Handle section headings with specific styling
          if (text.includes('Sustainable Manufacturing')) {
            return text.replace(
              /Sustainable Manufacturing/g,
              '<span style="font-weight: 700; color: #1E1E1E; display: inline;">Sustainable Manufacturing</span>'
            );
          }
          
          // Handle One8 and other brand names
          if (text.includes('One8')) {
            return text.replace(
              /One8/g,
              '<span style="font-weight: 700; color: #1E1E1E; display: inline;">One8</span>'
            );
          }
          
          // Handle "Integrated. Agile. All-In." with proper spacing
          if (text.includes('Integrated. Agile. All-In.')) {
            return text.replace(
              /Integrated\. Agile\. All-In\./g,
              '<span style="font-weight: 700; color: #1E1E1E; display: inline;">Integrated. Agile. <span style="color: #FF0A54;">All-In.</span></span>'
            );
          }
          
          // Handle "vertically integrated" with bold styling
          if (text.includes('vertically integrated')) {
            return text.replace(
              /vertically integrated/g,
              '<span style="font-weight: 700; display: inline;">vertically integrated</span>'
            );
          }
          
          // Handle "EXPLORE MANUFACTURING @AGILITAS →" with proper inline alignment
          if (text.includes('EXPLORE MANUFACTURING @AGILITAS →')) {
            return text.replace(
              /EXPLORE MANUFACTURING @AGILITAS →/g,
              '<span style="color: #FFFFFF; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">EXPLORE MANUFACTURING @AGILITAS <span style="font-size: 0.9em; margin-left: 2px;">→</span></span>'
            );
          }
          
          // Handle "EXPLORE BRAND @AGILITAS →" with proper inline alignment
          if (text.includes('EXPLORE BRAND @AGILITAS →')) {
            return text.replace(
              /EXPLORE BRAND @AGILITAS →/g,
              '<span style="color: #FFFFFF; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">EXPLORE BRAND @AGILITAS <span style="font-size: 0.9em; margin-left: 2px;">→</span></span>'
            );
          }
          
          // Handle "EXPLORE STORES @AGILITAS →" with proper inline alignment
          if (text.includes('EXPLORE STORES @AGILITAS →')) {
            return text.replace(
              /EXPLORE STORES @AGILITAS →/g,
              '<span style="color: #FFFFFF; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">EXPLORE STORES @AGILITAS <span style="font-size: 0.9em; margin-left: 2px;">→</span></span>'
            );
          }
          
          return text;
        };
        
        const processedText = renderRichText(characters);
        
        return (
          <div
            style={combinedTextStyles}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {showDebug && (
              <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                <div className="font-bold">{name}</div>
                <div>{type} - {baseStyles.width}×{baseStyles.height}</div>
                <div className="text-xs">{characters.substring(0, 20)}{characters.length > 20 ? '...' : ''}</div>
                <div>Font: {style?.fontFamily} {style?.fontSize}px</div>
              </div>
            )}
            <span 
              className="block w-full h-full leading-none whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: processedText }}
            />
          </div>
        );

      case 'RECTANGLE':
      case 'ELLIPSE':
      case 'VECTOR':
        // Handle image fills
        if (imageUrl) {
          return (
            <div
              style={baseStyles}
              title={`${name} (${type})`}
              data-figma-node-id={node.id}
              data-figma-node-type={type}
              data-figma-node-name={name}
            >
              {showDebug && (
                <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                  <div className="font-bold">{name}</div>
                  <div>{type} - {baseStyles.width}×{baseStyles.height}</div>
                  <div className="text-green-300">🖼️ Image loaded</div>
                </div>
              )}
              
              {renderImage(node, imageUrl, baseStyles, showDebug)}
            </div>
          );
        }
        
        // Handle regular shapes
        return (
          <div
            style={baseStyles}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {showDebug && (
              <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                <div className="font-bold">{name}</div>
                <div>{type} - {baseStyles.width}×{baseStyles.height}</div>
              </div>
            )}
            
            {children?.map((child: any, index: number) => (
              <FigmaRenderer
                key={child.id || index}
                node={child}
                showDebug={showDebug}
                parentBoundingBox={node.absoluteBoundingBox}
                imageMap={imageMap}
                parentMask={isMask}
                parentMaskType={maskType}
                fileKey={fileKey}
                figmaToken={figmaToken}
              />
            ))}
          </div>
        );

      case 'LINE':
        // Handle geometric accent lines
        if (node.geometricType || node.angleDegrees || node.lineStart || node.lineEnd) {
          return (
            <div
              style={baseStyles}
              title={`${name} (${type})`}
              data-figma-node-id={node.id}
              data-figma-node-type={type}
              data-figma-node-name={name}
            >
              {showDebug && (
                <div className="absolute -top-8 left-0 bg-pink-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                  <div className="font-bold">{name}</div>
                  <div>{type} - Geometric Line</div>
                  <div className="text-pink-300">📐 {node.geometricType || 'angled'}</div>
                </div>
              )}
              
              {renderGeometricLine(node, baseStyles)}
            </div>
          );
        }
        
        // Handle regular lines
        return (
          <div
            style={baseStyles}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {showDebug && (
              <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                <div className="font-bold">{name}</div>
                <div>{type} - {baseStyles.width}×{baseStyles.height}</div>
              </div>
            )}
            
            {children?.map((child: any, index: number) => (
              <FigmaRenderer
                key={child.id || index}
                node={child}
                showDebug={showDebug}
                parentBoundingBox={node.absoluteBoundingBox}
                imageMap={imageMap}
                parentMask={isMask}
                parentMaskType={maskType}
                fileKey={fileKey}
                figmaToken={figmaToken}
              />
            ))}
          </div>
        );

      case 'INSTANCE':
      case 'COMPONENT':
        return (
          <div
            style={baseStyles}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {showDebug && (
              <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                <div className="font-bold">{name}</div>
                <div>{type} - {baseStyles.width}×{baseStyles.height}</div>
                <div className="text-purple-300">🔧 Component</div>
              </div>
            )}
            
            {children?.map((child: any, index: number) => (
              <FigmaRenderer
                key={child.id || index}
                node={child}
                showDebug={showDebug}
                parentBoundingBox={node.absoluteBoundingBox}
                imageMap={imageMap}
                parentMask={isMask}
                parentMaskType={maskType}
                fileKey={fileKey}
                figmaToken={figmaToken}
              />
            ))}
          </div>
        );

      default:
        // Handle any other node types
        if (absoluteBoundingBox) {
          return (
            <div
              style={baseStyles}
              title={`${name} (${type})`}
              data-figma-node-id={node.id}
              data-figma-node-type={type}
              data-figma-node-name={name}
            >
              {showDebug && (
                <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                  <div className="font-bold">{name}</div>
                  <div>{type} - {baseStyles.width}×{baseStyles.height}</div>
                  <div className="text-gray-300">❓ Unknown type</div>
                </div>
              )}
              
              {children?.map((child: any, index: number) => (
                <FigmaRenderer
                  key={child.id || index}
                  node={child}
                  showDebug={showDebug}
                  parentBoundingBox={node.absoluteBoundingBox}
                  imageMap={imageMap}
                  parentMask={isMask}
                  parentMaskType={maskType}
                  fileKey={fileKey}
                  figmaToken={figmaToken}
                />
              ))}
            </div>
          );
        }
        
        // Handle nodes without bounding box but with children
        if (children && children.length > 0) {
          return (
            <>
              {children.map((child: any, index: number) => (
                <FigmaRenderer
                  key={child.id || index}
                  node={child}
                  showDebug={showDebug}
                  parentBoundingBox={node.absoluteBoundingBox}
                  imageMap={imageMap}
                  parentMask={isMask}
                  parentMaskType={maskType}
                  fileKey={fileKey}
                  figmaToken={figmaToken}
                />
              ))}
            </>
          );
        }
        
        // Log unsupported nodes
        if (showDebug) {
          console.warn(`Unsupported node type: ${type} (${name})`);
        }
        
        return null;
    }
  };

  return renderNode();
};

export default FigmaRenderer; 