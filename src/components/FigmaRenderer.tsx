'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { getSpecialColor, isCircularElement, getLineStyles, getFontFamilyWithFallback, isAngledBox } from '@/lib/utils';

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
  devMode?: boolean;
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
    const weight = stroke.strokeWeight || strokeWeight || 2; // Default to 2px for better visibility
    const strokeColor = rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
    styles.border = `${weight}px solid ${strokeColor}`;
    
    // Handle opacity separately for better browser support
    if (stroke.color.a !== undefined && stroke.color.a !== 1) {
      styles.borderColor = rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a);
    }
  }
  
  return styles;
};

// Enhanced corner radius handling
const getCornerRadius = (radius: number): string => {
  if (radius === 0) return '0';
  if (radius >= 50) return '50%';
  return `${radius}px`;
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
  
  // Handle overflow for better content clipping with pixel-perfect precision
  if (node.absoluteBoundingBox) {
    styles.overflow = 'hidden'; // Default to hidden to prevent content bleeding
    styles.boxSizing = 'border-box';
  }
  
  // Enhanced spacing and alignment for pixel-perfect rendering
  if (node.itemSpacing) {
    styles.gap = `${node.itemSpacing}px`;
    styles.flexWrap = 'nowrap'; // Prevent wrapping for exact spacing
  }
  
  // Handle flex properties for better alignment
  if (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL') {
    styles.flexShrink = 0; // Prevent unwanted shrinking
    styles.flexGrow = node.layoutGrow || 0; // Use specified grow value
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
  
  // Auto-detect section transitions based on node names
  if (node.name?.toLowerCase().includes('hero') || 
      node.name?.toLowerCase().includes('integrated') ||
      node.name?.toLowerCase().includes('brand spotlight') ||
      node.name?.toLowerCase().includes('vision mission') ||
      node.name?.toLowerCase().includes('fresh off the field') ||
      node.name?.toLowerCase().includes('get in touch')) {
    // Apply angled transition for major sections
    if (!styles.clipPath) {
      styles.clipPath = 'polygon(0 0, 100% 0, 100% 90%, 0 100%)';
    }
  }
  
  // Handle specific section backgrounds
  if (node.name?.toLowerCase().includes('hero')) {
    styles.backgroundSize = 'cover';
    styles.backgroundPosition = 'center';
    styles.backgroundRepeat = 'no-repeat';
  }
  
  if (node.name?.toLowerCase().includes('vision') || 
      node.name?.toLowerCase().includes('mission')) {
    styles.backgroundColor = '#1E1E1E';
    styles.color = '#FFFFFF';
  }
  
  if (node.name?.toLowerCase().includes('get in touch')) {
    styles.backgroundColor = '#0F766E';
    styles.color = '#FFFFFF';
  }
  
  return styles;
};

// Enhanced positioning utilities
const getPositionStyles = (node: any, parentBoundingBox?: { x: number; y: number; width: number; height: number }): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  if (node.absoluteBoundingBox) {
    const { x, y, width, height } = node.absoluteBoundingBox;
    
    if (parentBoundingBox) {
      // Calculate relative positioning for children with pixel-perfect precision
      styles.position = 'absolute';
      styles.left = `${x - parentBoundingBox.x}px`;
      styles.top = `${y - parentBoundingBox.y}px`;
      styles.width = `${width}px`;
      styles.height = `${height}px`;
      
      // Ensure exact positioning with transform-origin
      styles.transformOrigin = '0 0';
      styles.boxSizing = 'border-box';
    } else {
      // Root node positioning
      styles.position = 'relative';
      styles.width = `${width}px`;
      styles.height = `${height}px`;
      styles.boxSizing = 'border-box';
    }
  }
  
  // Handle z-index and stacking order with enhanced precision
  if (node.zIndex !== undefined) {
    styles.zIndex = node.zIndex;
  } else if (node.name?.toLowerCase().includes('overlay') || node.name?.toLowerCase().includes('modal')) {
    // Auto-assign high z-index for overlay elements
    styles.zIndex = 1000;
  } else if (node.name?.toLowerCase().includes('background')) {
    // Background elements should be behind
    styles.zIndex = -1;
  }
  
  // Handle transform for angled layouts with enhanced precision
  if (node.rotation !== undefined && node.rotation !== 0) {
    styles.transform = `rotate(${node.rotation}rad)`;
    styles.transformOrigin = 'center center';
  }
  
  // Handle complex transforms for geometric elements
  if (node.transform && Array.isArray(node.transform)) {
    styles.transform = `matrix(${node.transform.join(', ')})`;
  }
  
  // Handle skew transforms
  if (node.skew !== undefined && node.skew !== 0) {
    const currentTransform = styles.transform || '';
    styles.transform = `${currentTransform} skew(${node.skew}deg)`;
  }
  
  // Handle scale transforms
  if (node.scale && (node.scale.x !== 1 || node.scale.y !== 1)) {
    const currentTransform = styles.transform || '';
    styles.transform = `${currentTransform} scale(${node.scale.x}, ${node.scale.y})`;
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
        styles.fontFamily = getFontFamilyWithFallback(node.style.fontFamily);
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
    
    // Text decoration - handle underline and other decorations with enhanced visibility
    if (node.style.textDecoration) {
      const decoration = node.style.textDecoration.toLowerCase();
      if (decoration === 'underline') {
        styles.textDecoration = 'underline';
        styles.textDecorationColor = 'currentColor';
        styles.textDecorationThickness = '1px';
        styles.textUnderlineOffset = '2px';
      } else if (decoration === 'strikethrough') {
        styles.textDecoration = 'line-through';
        styles.textDecorationColor = 'currentColor';
        styles.textDecorationThickness = '1px';
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
  // Don't force inline display as it can interfere with underline rendering
  // styles.display = 'inline'; // Ensure text elements are inline by default
  
  // Ensure proper text rendering for pixel-perfect output
  (styles as any).fontSmoothing = 'antialiased';
  (styles as any).webkitFontSmoothing = 'antialiased';
  styles.textRendering = 'optimizeLegibility';
  styles.fontFeatureSettings = '"liga" 1, "kern" 1';
  
  // Enhanced precision for text positioning
  styles.position = 'relative';
  styles.boxSizing = 'border-box';
  styles.maxWidth = '100%';
  
  // Prevent unwanted text transformations
  styles.textTransform = 'none';
  styles.fontVariant = 'normal';
    
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
  
  // Add box shadow for cards and angled elements
  if (node.name?.toLowerCase().includes('card') || 
      node.name?.toLowerCase().includes('manufacturing') ||
      node.name?.toLowerCase().includes('brands') ||
      node.name?.toLowerCase().includes('stores') ||
      node.name?.toLowerCase().includes('lotto') ||
      node.name?.toLowerCase().includes('one8') ||
      node.name?.toLowerCase().includes('news')) {
    styles.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
  }
  
  // Handle angled cards with specific transforms
  if (node.name?.toLowerCase().includes('lotto') || 
      node.name?.toLowerCase().includes('one8') ||
      node.name?.toLowerCase().includes('whats coming') ||
      node.name?.toLowerCase().includes('brand spotlight') ||
      node.name?.toLowerCase().includes('fresh off the field')) {
    // Apply slight skew for angled card effect
    if (!transform.includes('skew')) {
      transform += 'skew(-2deg) ';
    }
  }
  
  // Handle circular icons in the "Integrated. Agile. All-In." section with pixel-perfect precision
  if (node.name?.toLowerCase().includes('manufacturing') ||
      node.name?.toLowerCase().includes('brands') ||
      node.name?.toLowerCase().includes('retail') ||
      node.name?.toLowerCase().includes('circular') ||
      node.name?.toLowerCase().includes('icon') ||
      node.name?.toLowerCase().includes('shoe') ||
      node.name?.toLowerCase().includes('fire') ||
      node.name?.toLowerCase().includes('people')) {
    styles.borderRadius = '50%';
    styles.overflow = 'hidden';
    styles.border = '2px solid #FF0A54'; // Pink border for circular elements
    styles.boxSizing = 'border-box';
  }
  
  // Handle strokes for better border rendering with AG Bright Blue priority
  if (node.strokes && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    if (stroke.type === 'SOLID' && stroke.color) {
      const strokeWidth = stroke.strokeWeight || node.strokeWeight || 2;
      const strokeColor = rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
      styles.border = `${strokeWidth}px solid ${strokeColor}`;
      styles.boxSizing = 'border-box';
    }
  }
  
  // Handle specific color names for AG Dark Teal and AG Bright Blue
  const nodeName = node.name?.toLowerCase() || '';
  if (nodeName.includes('dark teal') || nodeName.includes('ag dark teal')) {
    styles.backgroundColor = '#00282D'; // AG Dark Teal
  }
  if (nodeName.includes('bright blue') || nodeName.includes('ag bright blue')) {
    styles.border = '2px solid #1D1BFB'; // AG Bright Blue
    styles.boxSizing = 'border-box';
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
  const { name, absoluteBoundingBox, lineStart, lineEnd, angleDegrees, geometricType, transform } = node;
  
  // Determine line color based on node name or type
  const getLineColor = () => {
    const nodeName = name?.toLowerCase() || '';
    
    // Check for specific color from strokes first
    if (node.strokes?.[0]?.type === 'SOLID' && node.strokes[0].color) {
      return rgbaToCss(node.strokes[0].color.r, node.strokes[0].color.g, node.strokes[0].color.b, node.strokes[0].color.a);
    }
    
    // Check for specific color names
    if (nodeName.includes('blue') || nodeName.includes('bright blue') || nodeName.includes('ag bright blue')) {
      return '#1D1BFB'; // AG Bright Blue from your example
    }
    if (nodeName.includes('pink') || nodeName.includes('accent') || nodeName.includes('primary')) {
      return '#FF0A54'; // Pink accent
    }
    if (nodeName.includes('red')) {
      return '#ff0055'; // Red
    }
    
    return '#1D1BFB'; // Default to AG Bright Blue
  };

  const lineColor = getLineColor();
  const strokeWidth = node.strokeWeight || 2;
  const width = absoluteBoundingBox?.width || 100;
  const height = absoluteBoundingBox?.height || 100;

  // Handle matrix transform (like matrix(-1, 0, 0, 1, 0, 0) for horizontal flip)
  const getTransformStyle = () => {
    let transformStyle = '';
    
    if (transform && Array.isArray(transform)) {
      transformStyle = `matrix(${transform.join(', ')})`;
    }
    
    if (angleDegrees) {
      const rotation = `rotate(${angleDegrees}deg)`;
      transformStyle = transformStyle ? `${transformStyle} ${rotation}` : rotation;
    }
    
    return transformStyle;
  };

  // Enhanced vector rendering with proper CSS properties
  const vectorStyles: React.CSSProperties = {
    ...baseStyles,
    position: 'absolute',
    width: `${width}px`,
    height: `${height}px`,
    border: `${strokeWidth}px solid ${lineColor}`,
    transform: getTransformStyle(),
    transformOrigin: '0 0',
    boxSizing: 'border-box',
  };

  // For complex geometric lines, use SVG
  if (geometricType === 'diagonal' || (lineStart && lineEnd)) {
    const angle = angleDegrees || 45;
    const length = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
    
    return (
      <div style={vectorStyles}>
        <svg
          width={width}
          height={height}
          style={{ display: 'block' }}
        >
          <line
            x1="0"
            y1="0"
            x2={width}
            y2={height}
            stroke={lineColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  // For simple vectors, use border-based approach (like your CSS example)
  return (
    <div 
      style={vectorStyles}
      title={`${name} - Vector (${width}×${height})`}
    />
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
  
  // Handle specific image types based on node name
  if (node.name?.toLowerCase().includes('hero') || 
      node.name?.toLowerCase().includes('background')) {
    objectFit = 'cover';
  }
  
  if (node.name?.toLowerCase().includes('icon') || 
      node.name?.toLowerCase().includes('logo') ||
      node.name?.toLowerCase().includes('avatar')) {
    objectFit = 'contain';
  }
  
  if (node.name?.toLowerCase().includes('circular') ||
      node.name?.toLowerCase().includes('manufacturing') ||
      node.name?.toLowerCase().includes('brands') ||
      node.name?.toLowerCase().includes('retail')) {
    objectFit = 'cover';
  }
  
  const imageStyles: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: objectFit,
    borderRadius: isCircular ? '50%' : baseStyles.borderRadius,
    objectPosition: 'center',
    // Enhanced pixel-perfect image rendering
    imageRendering: 'crisp-edges',
    backfaceVisibility: 'hidden',
    transform: 'translateZ(0)', // Force hardware acceleration
    willChange: 'transform', // Optimize for animations
  };
  
  // Get appropriate placeholder content based on node type and name
  const getPlaceholderContent = () => {
    const nodeName = node.name?.toLowerCase() || '';
    
    // Hero/Banner images
    if (nodeName.includes('hero') || nodeName.includes('banner')) {
      return { message: 'Hero Image', icon: '🎨', type: 'missing' as const };
    }
    
    // Product images
    if (nodeName.includes('product') || nodeName.includes('shoe') || nodeName.includes('item')) {
      return { message: 'Product Image', icon: '👟', type: 'missing' as const };
    }
    
    // Logo images
    if (nodeName.includes('logo') || nodeName.includes('brand')) {
      return { message: 'Logo', icon: '🏷️', type: 'missing' as const };
    }
    
    // Avatar/Profile images
    if (nodeName.includes('avatar') || nodeName.includes('profile') || nodeName.includes('user')) {
      return { message: 'Avatar', icon: '👤', type: 'missing' as const };
    }
    
    // Background images
    if (nodeName.includes('background') || nodeName.includes('bg')) {
      return { message: 'Background', icon: '🖼️', type: 'missing' as const };
    }
    
    // Icon images
    if (nodeName.includes('icon')) {
      return { message: 'Icon', icon: '🔧', type: 'missing' as const };
    }
    
    // Manufacturing/Business images
    if (nodeName.includes('manufacturing') || nodeName.includes('factory')) {
      return { message: 'Manufacturing', icon: '🏭', type: 'missing' as const };
    }
    
    // Retail/Store images
    if (nodeName.includes('retail') || nodeName.includes('store') || nodeName.includes('shop')) {
      return { message: 'Retail', icon: '🏪', type: 'missing' as const };
    }
    
    // Default fallback
    return { message: 'Image', icon: '🖼️', type: 'missing' as const };
  };

  // Enhanced placeholder component with better visual design
  const PlaceholderImage = ({ 
    message = 'No Image', 
    icon = '🖼️', 
    type = 'error' 
  }: { 
    message?: string; 
    icon?: string; 
    type?: 'error' | 'loading' | 'missing' 
  }) => {
    const getPlaceholderStyles = () => {
      const basePlaceholderStyles = {
        ...imageStyles,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: '500',
        position: 'relative' as const,
      };

      switch (type) {
        case 'error':
          return {
            ...basePlaceholderStyles,
            backgroundColor: '#fef2f2',
            border: '2px dashed #fecaca',
            color: '#dc2626',
          };
        case 'loading':
          return {
            ...basePlaceholderStyles,
            backgroundColor: '#f8fafc',
            border: '2px dashed #cbd5e1',
            color: '#64748b',
          };
        case 'missing':
          return {
            ...basePlaceholderStyles,
            backgroundColor: '#f0f9ff',
            border: '2px dashed #bae6fd',
            color: '#0369a1',
          };
        default:
          return {
            ...basePlaceholderStyles,
            backgroundColor: '#f8fafc',
            border: '2px dashed #cbd5e1',
            color: '#64748b',
          };
      }
    };

    return (
      <div style={getPlaceholderStyles()}>
        <div style={{ textAlign: 'center', padding: '8px' }}>
          <div style={{ 
            fontSize: '20px', 
            marginBottom: '4px', 
            opacity: '0.7',
            lineHeight: '1'
          }}>
            {icon}
          </div>
          <div style={{ 
            fontSize: '11px', 
            lineHeight: '1.2',
            marginBottom: '2px'
          }}>
            {message}
          </div>
          {node.name && (
            <div style={{ 
              fontSize: '10px', 
              opacity: '0.6',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {node.name.length > 15 ? node.name.substring(0, 15) + '...' : node.name}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Show error placeholder if image failed to load
  if (imageError) {
    return <PlaceholderImage message="Failed to Load" icon="⚠️" type="error" />;
  }
  
  // Show loading placeholder while image is loading
  if (imageLoading) {
    return <PlaceholderImage message="Loading..." icon="⏳" type="loading" />;
  }
  
  // If no image URL, show smart placeholder based on node content
  if (!imageUrl) {
    const content = getPlaceholderContent();
    return <PlaceholderImage message={content.message} icon={content.icon} type={content.type} />;
  }
  
  return (
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
  figmaToken,
  devMode = false
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
    
    // Add debug styling only in dev mode
    if (showDebug && devMode) {
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
            {showDebug && devMode && (
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
                devMode={devMode}
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
            {showDebug && devMode && (
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
              // Ensure text decoration is preserved
              textDecoration: textStyles.textDecoration || 'none',
              textDecorationColor: textStyles.textDecorationColor || 'currentColor',
              textDecorationThickness: textStyles.textDecorationThickness || '1px',
              textUnderlineOffset: textStyles.textUnderlineOffset || '2px',
        };
        
        // Enhanced text rendering with dynamic styling based on Figma properties
        const renderRichText = (text: string) => {
          let spanStyles = '';
          
          // Apply font family from Figma style if present
          if (style?.fontFamily) {
            const fontFamily = getFontFamilyWithFallback(style.fontFamily);
            spanStyles += `font-family: ${fontFamily}; `;
          }
          
          // Apply font weight from Figma style if present
          if (style?.fontWeight && style.fontWeight > 400) {
            spanStyles += `font-weight: ${style.fontWeight}; `;
          }
          
          // Apply text decoration from Figma style if present
          if (style?.textDecoration === 'underline') {
            spanStyles += `text-decoration: underline; text-decoration-color: currentColor; text-decoration-thickness: 1px; text-underline-offset: 2px; `;
          }
          
          // Apply letter spacing if present
          if (style?.letterSpacing) {
            spanStyles += `letter-spacing: ${style.letterSpacing}px; `;
          }
          
          // Apply line height if present
          if (style?.lineHeight) {
            spanStyles += `line-height: ${style.lineHeight}px; `;
          } else if (style?.lineHeightPercent) {
            spanStyles += `line-height: ${style.lineHeightPercent}%; `;
          }
          
          // Return styled span if we have styles, otherwise return plain text
          if (spanStyles) {
            return `<span style="${spanStyles.trim()}">${text}</span>`;
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
            {showDebug && devMode && (
              <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                <div className="font-bold">{name}</div>
                <div>{type} - {baseStyles.width}×{baseStyles.height}</div>
                <div className="text-xs">{characters.substring(0, 20)}{characters.length > 20 ? '...' : ''}</div>
                <div>Font: {style?.fontFamily} {style?.fontSize}px</div>
              </div>
            )}
                        <span
              className="block w-full h-full leading-none whitespace-pre-wrap"
              style={{
                fontFamily: style?.fontFamily ? getFontFamilyWithFallback(style.fontFamily) : undefined,
                textDecoration: style?.textDecoration || 'none',
                textDecorationColor: style?.textDecoration === 'underline' ? 'currentColor' : undefined,
                textDecorationThickness: style?.textDecoration === 'underline' ? '1px' : undefined,
                textUnderlineOffset: style?.textDecoration === 'underline' ? '2px' : undefined,
              }}
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
              {showDebug && devMode && (
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
        
        // Handle nodes that should have images but don't have imageUrl (fallback)
        if (node.fills && node.fills.some((fill: any) => fill.type === 'IMAGE')) {
          return (
            <div
              style={baseStyles}
              title={`${name} (${type})`}
              data-figma-node-id={node.id}
              data-figma-node-type={type}
              data-figma-node-name={name}
            >
              {showDebug && devMode && (
                <div className="absolute -top-8 left-0 bg-orange-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                  <div className="font-bold">{name}</div>
                  <div>{type} - {baseStyles.width}×{baseStyles.height}</div>
                  <div className="text-orange-300">⚠️ Image missing</div>
                </div>
              )}
              
              {renderImage(node, '', baseStyles, showDebug)}
            </div>
          );
        }
        
        // Handle angled box vectors with transforms
        if (isAngledBox(node) || (node.transform && Array.isArray(node.transform))) {
          return (
            <div
              style={baseStyles}
              title={`${name} (${type}) - Angled Box`}
              data-figma-node-id={node.id}
              data-figma-node-type={type}
              data-figma-node-name={name}
            >
              {showDebug && devMode && (
                <div className="absolute -top-8 left-0 bg-purple-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                  <div className="font-bold">{name}</div>
                  <div>{type} - Angled Box</div>
                  <div className="text-purple-300">📐 {node.transform ? `matrix(${node.transform.join(', ')})` : 'transformed'}</div>
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
                  devMode={devMode}
                />
              ))}
            </div>
          );
        }
        
        // Handle regular shapes with enhanced fill and stroke support
        return (
          <div
            style={baseStyles}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {showDebug && devMode && (
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
                devMode={devMode}
              />
            ))}
          </div>
        );

      case 'LINE':
      case 'VECTOR':
        // Handle geometric accent lines and vectors
        if (node.geometricType || node.angleDegrees || node.lineStart || node.lineEnd || node.strokes || node.strokeWeight) {
          return (
            <div
              style={baseStyles}
              title={`${name} (${type})`}
              data-figma-node-id={node.id}
              data-figma-node-type={type}
              data-figma-node-name={name}
            >
              {showDebug && devMode && (
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
        
        // Handle regular lines with border styling
        return (
              <div 
                style={{
              ...baseStyles,
              ...getLineStyles(node),
            }}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {showDebug && devMode && (
              <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                <div className="font-bold">{name}</div>
                <div>{type} - {baseStyles.width}×{baseStyles.height}</div>
                <div className="text-pink-300">📏 Line Element</div>
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
                devMode={devMode}
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
            {showDebug && devMode && (
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
                devMode={devMode}
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