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
  
  // Position & Layout
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  relativeTransform?: Array<Array<number>>; // Matrix transform
  rotation?: number; // Rotation in degrees
  x?: number; // X position
  y?: number; // Y position
  
  // Group Support
  isGroup?: boolean;
  groupId?: string;
  
  // Alignment
  layoutAlign?: string; // 'MIN', 'CENTER', 'MAX', 'STRETCH'
  layoutGrow?: number; // Flex grow value
  layoutMode?: string; // 'HORIZONTAL', 'VERTICAL', 'NONE'
  primaryAxisAlignItems?: string; // 'MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN', 'SPACE_AROUND', 'SPACE_EVENLY'
  counterAxisAlignItems?: string; // 'MIN', 'CENTER', 'MAX', 'BASELINE'
  
  // Resizing
  primaryAxisSizingMode?: string; // 'FIXED', 'AUTO'
  counterAxisSizingMode?: string; // 'FIXED', 'AUTO'
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  
  // Spacing & Padding
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  
  // Appearance
  opacity?: number; // 0-1
  visible?: boolean;
  cornerRadius?: number;
  cornerRadiusTopLeft?: number;
  cornerRadiusTopRight?: number;
  cornerRadiusBottomLeft?: number;
  cornerRadiusBottomRight?: number;
  
  // Fill
  fills?: Array<{
    type: string; // 'SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE', 'VIDEO'
    color?: { r: number; g: number; b: number; a?: number };
    imageRef?: string;
    imageUrl?: string;
    gradientStops?: Array<{
      position: number;
      color: { r: number; g: number; b: number; a?: number };
    }>;
    gradientTransform?: Array<Array<number>>;
    opacity?: number;
    blendMode?: string;
  }>;
  
  // Stroke
  strokes?: Array<{
    type: string; // 'SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND'
    color?: { r: number; g: number; b: number; a?: number };
    strokeWeight?: number;
    strokeAlign?: string; // 'INSIDE', 'CENTER', 'OUTSIDE'
    strokeCap?: string; // 'NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL'
    strokeJoin?: string; // 'MITER', 'BEVEL', 'ROUND'
    dashPattern?: Array<number>;
    gradientStops?: Array<{
      position: number;
      color: { r: number; g: number; b: number; a?: number };
    }>;
    gradientTransform?: Array<Array<number>>;
    opacity?: number;
    blendMode?: string;
  }>;
  strokeWeight?: number;
  strokeAlign?: string;
  
  // Effects
  effects?: Array<{
    type: string; // 'INNER_SHADOW', 'DROP_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR'
    visible?: boolean;
    radius?: number;
    color?: { r: number; g: number; b: number; a?: number };
    offset?: { x: number; y: number };
    spread?: number;
    blendMode?: string;
    showShadowBehindNode?: boolean;
  }>;
  
  // Text
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
    textCase?: string; // 'ORIGINAL', 'UPPER', 'LOWER', 'TITLE'
    paragraphIndent?: number;
    paragraphSpacing?: number;
    autoRename?: boolean;
  };
  
  // Mask Support
  isMask?: boolean;
  maskType?: string; // 'ALPHA', 'LUMINANCE'
  
  // Component Support
  componentId?: string;
  componentSetId?: string;
  
  // Z-Index & Stacking
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
  
      // Arrow Support
    arrowStart?: boolean; // Whether arrow starts at the beginning
    arrowEnd?: boolean; // Whether arrow ends at the end
    arrowLength?: number; // Length of arrow head
    arrowWidth?: number; // Width of arrow head
    arrowStyle?: string; // 'ARROW_LINES', 'ARROW_EQUILATERAL', 'ARROW_TRIANGLE', 'ARROW_CIRCLE'
    arrowStartStyle?: string; // Start point arrow style
    arrowEndStyle?: string; // End point arrow style
    
    // Vector Rectangle Support
    mirroring?: string; // Mirroring configuration for vectors
    vectorType?: string; // 'VECTOR', 'RECTANGLE', 'ELLIPSE', etc.
    vectorPath?: string; // SVG path data for vector shapes
    vectorFills?: Array<{
      type: string;
      color?: { r: number; g: number; b: number; a?: number };
      style?: string; // 'AG Light', etc.
    }>;
    vectorStrokes?: Array<{
      type: string;
      color?: { r: number; g: number; b: number; a?: number };
      style?: string; // 'AG Light', etc.
    }>;
    
    // Selection Colors (for debugging/development)
    selectionColors?: {
      fill?: string;
      stroke?: string;
      background?: string;
    };
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

// Enhanced appearance styles with comprehensive support
const getAppearanceStyles = (node: any): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  // Handle opacity
  if (node.opacity !== undefined && node.opacity !== 1) {
    styles.opacity = node.opacity;
  }
  
  // Handle visibility
  if (node.visible === false) {
    styles.display = 'none';
  }
  
  // Handle corner radius with individual corner support
  if (node.cornerRadiusTopLeft || node.cornerRadiusTopRight || node.cornerRadiusBottomLeft || node.cornerRadiusBottomRight) {
    const topLeft = node.cornerRadiusTopLeft || 0;
    const topRight = node.cornerRadiusTopRight || 0;
    const bottomLeft = node.cornerRadiusBottomLeft || 0;
    const bottomRight = node.cornerRadiusBottomRight || 0;
    styles.borderRadius = `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`;
  } else if (node.cornerRadius) {
    styles.borderRadius = getCornerRadius(node.cornerRadius);
  }
  
  // Handle blend modes
  if (node.blendMode) {
    styles.mixBlendMode = node.blendMode.toLowerCase().replace('_', '-');
  }
  
  return styles;
};

// Enhanced stroke styles with comprehensive support
const getEnhancedStrokeStyles = (node: any): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  if (!node.strokes || node.strokes.length === 0) return styles;
  
  const stroke = node.strokes[0];
  
  // Handle stroke color
  if (stroke.type === 'SOLID' && stroke.color) {
    const strokeColor = rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a);
    const strokeWidth = stroke.strokeWeight || node.strokeWeight || 1;
    
    // Handle stroke alignment
    if (stroke.strokeAlign === 'INSIDE') {
      styles.boxSizing = 'border-box';
      styles.border = `${strokeWidth}px solid ${strokeColor}`;
    } else if (stroke.strokeAlign === 'OUTSIDE') {
      styles.boxSizing = 'border-box';
      styles.outline = `${strokeWidth}px solid ${strokeColor}`;
      styles.outlineOffset = '0px';
    } else {
      // CENTER (default)
      styles.boxSizing = 'border-box';
      styles.border = `${strokeWidth}px solid ${strokeColor}`;
    }
    
    // Handle stroke caps and joins for SVG elements
    if (stroke.strokeCap) {
      styles.strokeLinecap = stroke.strokeCap.toLowerCase();
    }
    if (stroke.strokeJoin) {
      styles.strokeLinejoin = stroke.strokeJoin.toLowerCase();
    }
    
    // Handle dash patterns
    if (stroke.dashPattern && stroke.dashPattern.length > 0) {
      styles.borderStyle = 'dashed';
      (styles as any).borderDasharray = stroke.dashPattern.join(', ');
    }
  }
  
  return styles;
};

// Enhanced effects styles with comprehensive support
const getEnhancedEffectStyles = (node: any): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  if (!node.effects || node.effects.length === 0) return styles;
  
  node.effects.forEach((effect: any) => {
    if (!effect.visible) return;
    
    switch (effect.type) {
      case 'DROP_SHADOW':
        const dropShadow = `drop-shadow(${effect.offset?.x || 0}px ${effect.offset?.y || 0}px ${effect.radius || 0}px ${effect.color ? rgbaToCss(effect.color.r, effect.color.g, effect.color.b, effect.color.a) : 'rgba(0,0,0,0.3)'})`;
        styles.filter = styles.filter ? `${styles.filter} ${dropShadow}` : dropShadow;
        break;
        
      case 'INNER_SHADOW':
        // Inner shadows are more complex and may require pseudo-elements
        const innerShadow = `inset ${effect.offset?.x || 0}px ${effect.offset?.y || 0}px ${effect.radius || 0}px ${effect.color ? rgbaToCss(effect.color.r, effect.color.g, effect.color.b, effect.color.a) : 'rgba(0,0,0,0.3)'}`;
        styles.boxShadow = styles.boxShadow ? `${styles.boxShadow}, ${innerShadow}` : innerShadow;
        break;
        
      case 'LAYER_BLUR':
        const blur = `blur(${effect.radius || 0}px)`;
        styles.filter = styles.filter ? `${styles.filter} ${blur}` : blur;
        break;
        
      case 'BACKGROUND_BLUR':
        // Background blur requires backdrop-filter
        styles.backdropFilter = `blur(${effect.radius || 0}px)`;
        break;
    }
  });
  
  return styles;
};

// Arrow rendering utilities
const createArrowPath = (
  x1: number, y1: number, 
  x2: number, y2: number, 
  strokeWidth: number,
  arrowStyle: string = 'ARROW_LINES',
  arrowLength: number = 10,
  arrowWidth: number = 8
): string => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  
  // Calculate arrow head points
  const arrowAngle = Math.PI / 6; // 30 degrees
  const arrowLengthAdjusted = arrowLength + strokeWidth / 2;
  const arrowWidthAdjusted = arrowWidth + strokeWidth / 2;
  
  let arrowPath = '';
  
  switch (arrowStyle) {
    case 'ARROW_LINES':
      // Simple arrow with two lines
      const leftAngle = angle + arrowAngle;
      const rightAngle = angle - arrowAngle;
      
      const leftX = x2 - arrowLengthAdjusted * Math.cos(leftAngle);
      const leftY = y2 - arrowLengthAdjusted * Math.sin(leftAngle);
      const rightX = x2 - arrowLengthAdjusted * Math.cos(rightAngle);
      const rightY = y2 - arrowLengthAdjusted * Math.sin(rightAngle);
      
      arrowPath = `M ${x2} ${y2} L ${leftX} ${leftY} M ${x2} ${y2} L ${rightX} ${rightY}`;
      break;
      
    case 'ARROW_EQUILATERAL':
      // Equilateral triangle arrow
      const leftAngle2 = angle + Math.PI / 3; // 60 degrees
      const rightAngle2 = angle - Math.PI / 3; // 60 degrees
      
      const leftX2 = x2 - arrowLengthAdjusted * Math.cos(leftAngle2);
      const leftY2 = y2 - arrowLengthAdjusted * Math.sin(leftAngle2);
      const rightX2 = x2 - arrowLengthAdjusted * Math.cos(rightAngle2);
      const rightY2 = y2 - arrowLengthAdjusted * Math.sin(rightAngle2);
      
      arrowPath = `M ${x2} ${y2} L ${leftX2} ${leftY2} L ${rightX2} ${rightY2} Z`;
      break;
      
    case 'ARROW_TRIANGLE':
      // Triangle arrow with adjustable width
      const leftAngle3 = angle + Math.atan2(arrowWidthAdjusted / 2, arrowLengthAdjusted);
      const rightAngle3 = angle - Math.atan2(arrowWidthAdjusted / 2, arrowLengthAdjusted);
      
      const leftX3 = x2 - arrowLengthAdjusted * Math.cos(leftAngle3);
      const leftY3 = y2 - arrowLengthAdjusted * Math.sin(leftAngle3);
      const rightX3 = x2 - arrowLengthAdjusted * Math.cos(rightAngle3);
      const rightY3 = y2 - arrowLengthAdjusted * Math.sin(rightAngle3);
      
      arrowPath = `M ${x2} ${y2} L ${leftX3} ${leftY3} L ${rightX3} ${rightY3} Z`;
      break;
      
    case 'ARROW_CIRCLE':
      // Circle at the end
      const radius = arrowWidthAdjusted / 2;
      arrowPath = `M ${x2 - radius} ${y2} A ${radius} ${radius} 0 0 1 ${x2 + radius} ${y2} A ${radius} ${radius} 0 0 1 ${x2 - radius} ${y2}`;
      break;
      
    default:
      // Default to simple lines
      const leftAngleDefault = angle + arrowAngle;
      const rightAngleDefault = angle - arrowAngle;
      
      const leftXDefault = x2 - arrowLengthAdjusted * Math.cos(leftAngleDefault);
      const leftYDefault = y2 - arrowLengthAdjusted * Math.sin(leftAngleDefault);
      const rightXDefault = x2 - arrowLengthAdjusted * Math.cos(rightAngleDefault);
      const rightYDefault = y2 - arrowLengthAdjusted * Math.sin(rightAngleDefault);
      
      arrowPath = `M ${x2} ${y2} L ${leftXDefault} ${leftYDefault} M ${x2} ${y2} L ${rightXDefault} ${rightYDefault}`;
  }
  
  return arrowPath;
};

// Render arrow with comprehensive support
const renderArrow = (node: any, baseStyles: React.CSSProperties) => {
  const { name, absoluteBoundingBox, strokes, strokeWeight, arrowStart, arrowEnd, arrowStyle, arrowLength, arrowWidth, arrowStartStyle, arrowEndStyle } = node;
  
  // Get stroke properties
  const stroke = strokes?.[0];
  const strokeColor = stroke?.type === 'SOLID' && stroke.color ? 
    rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a) : 
    '#000000';
  
  const strokeWidth = strokeWeight || stroke?.strokeWeight || 2;
  const width = absoluteBoundingBox?.width || 100;
  const height = absoluteBoundingBox?.height || 100;
  
  // Calculate line coordinates based on rotation
  const rotation = node.rotation || 0;
  const isVertical = Math.abs(rotation) > 45 && Math.abs(rotation) < 135;
  
  let x1, y1, x2, y2;
  
  if (isVertical) {
    // Vertical arrow
    x1 = width / 2;
    y1 = 0;
    x2 = width / 2;
    y2 = height;
  } else {
    // Horizontal arrow
    x1 = 0;
    y1 = height / 2;
    x2 = width;
    y2 = height / 2;
  }
  
  // Create main line path
  const mainLinePath = `M ${x1} ${y1} L ${x2} ${y2}`;
  
  // Create arrow paths
  let arrowPaths = '';
  const arrowLengthFinal = arrowLength || 10;
  const arrowWidthFinal = arrowWidth || 8;
  
  // Handle start arrow
  if (arrowStart) {
    const startStyle = arrowStartStyle || arrowStyle || 'ARROW_LINES';
    arrowPaths += createArrowPath(x1, y1, x2, y2, strokeWidth, startStyle, arrowLengthFinal, arrowWidthFinal);
  }
  
  // Handle end arrow
  if (arrowEnd) {
    const endStyle = arrowEndStyle || arrowStyle || 'ARROW_LINES';
    arrowPaths += createArrowPath(x2, y2, x1, y1, strokeWidth, endStyle, arrowLengthFinal, arrowWidthFinal);
  }
  
  return (
    <svg
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        ...baseStyles,
      }}
    >
      <path
        d={`${mainLinePath} ${arrowPaths}`}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  
  // Handle rotation with enhanced precision
  if (node.rotation !== undefined && node.rotation !== 0) {
    // Convert radians to degrees for CSS
    const rotationDegrees = (node.rotation * 180) / Math.PI;
    styles.transform = `rotate(${rotationDegrees}deg)`;
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
  if (node.scale) {
    const currentTransform = styles.transform || '';
    const scaleX = node.scale.x || 1;
    const scaleY = node.scale.y || 1;
    styles.transform = `${currentTransform} scale(${scaleX}, ${scaleY})`;
  }
  
  // Handle relative transform (matrix)
  if (node.relativeTransform && Array.isArray(node.relativeTransform)) {
    const matrix = node.relativeTransform.flat();
    styles.transform = `matrix(${matrix.join(', ')})`;
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

// Enhanced mask support utilities
const getMaskStyles = (node: any, parentMask: boolean, parentMaskType: string): React.CSSProperties => {
  const maskStyles: React.CSSProperties = {};
  
  // Handle node as mask
  if (node.isMask) {
    maskStyles.maskImage = 'none';
    (maskStyles as any).webkitMaskImage = 'none';
    maskStyles.maskMode = 'alpha';
    (maskStyles as any).webkitMaskMode = 'alpha';
    return maskStyles;
  }
  
  // Handle parent mask
  if (parentMask) {
    const maskId = `mask-${node.id}`;
    maskStyles.maskImage = `url(#${maskId})`;
    (maskStyles as any).webkitMaskImage = `url(#${maskId})`;
    
    switch (parentMaskType) {
      case 'ALPHA':
        maskStyles.maskMode = 'alpha';
        (maskStyles as any).webkitMaskMode = 'alpha';
        break;
      case 'LUMINANCE':
        maskStyles.maskMode = 'luminance';
        (maskStyles as any).webkitMaskMode = 'luminance';
        break;
      default:
        maskStyles.maskMode = 'alpha';
        (maskStyles as any).webkitMaskMode = 'alpha';
    }
  }
  
  return maskStyles;
};

// Create mask element for children with enhanced mask group support
const createMaskElement = (node: any, children: any[]): React.ReactElement | null => {
  if (!node.isMask || !children || children.length === 0) {
    return null;
  }
  
  const maskId = `mask-${node.id}`;
  const { absoluteBoundingBox, maskType = 'ALPHA' } = node;
  
  // Get mask dimensions
  const width = absoluteBoundingBox?.width || 100;
  const height = absoluteBoundingBox?.height || 100;
  
  return (
    <svg
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          {/* White background for mask */}
          <rect width={width} height={height} fill="white" />
          
          {/* Render mask children */}
          {children.map((child: any, index: number) => (
            <FigmaRenderer
              key={child.id || index}
              node={child}
              showDebug={false}
              parentBoundingBox={node.absoluteBoundingBox}
              imageMap={{}}
              parentMask={true}
              parentMaskType={maskType}
              fileKey=""
              figmaToken=""
              devMode={false}
            />
          ))}
        </mask>
      </defs>
    </svg>
  );
};

// Render rectangles with comprehensive vector support
const renderRectangle = (node: any, baseStyles: React.CSSProperties) => {
  const { 
    name, 
    absoluteBoundingBox, 
    fills, 
    strokes, 
    strokeWeight, 
    cornerRadius,
    mirroring,
    vectorType,
    vectorPath,
    vectorFills,
    vectorStrokes
  } = node;
  
  // Get dimensions
  const width = absoluteBoundingBox?.width || 100;
  const height = absoluteBoundingBox?.height || 100;
  
  // Handle vector-specific fills (prioritize vectorFills over fills)
  let fillColor = 'transparent';
  let fillStyle = '';
  
  if (vectorFills && vectorFills.length > 0) {
    const vectorFill = vectorFills[0];
    if (vectorFill.type === 'SOLID' && vectorFill.color) {
      fillColor = rgbaToCss(vectorFill.color.r, vectorFill.color.g, vectorFill.color.b, vectorFill.color.a);
    }
    fillStyle = vectorFill.style || '';
  } else if (fills?.[0]?.type === 'SOLID' && fills[0].color) {
    fillColor = rgbaToCss(fills[0].color.r, fills[0].color.g, fills[0].color.b, fills[0].color.a);
  }
  
  // Handle vector-specific strokes (prioritize vectorStrokes over strokes)
  let strokeColor = 'transparent';
  let strokeWidth = 0;
  let strokeStyle = '';
  
  if (vectorStrokes && vectorStrokes.length > 0) {
    const vectorStroke = vectorStrokes[0];
    if (vectorStroke.type === 'SOLID' && vectorStroke.color) {
      strokeColor = rgbaToCss(vectorStroke.color.r, vectorStroke.color.g, vectorStroke.color.b, vectorStroke.color.a);
    }
    strokeStyle = vectorStroke.style || '';
    strokeWidth = strokeWeight || 1;
  } else {
    const stroke = strokes?.[0];
    if (stroke?.type === 'SOLID' && stroke.color) {
      strokeColor = rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a);
    }
    strokeWidth = strokeWeight || stroke?.strokeWeight || 0;
  }
  
  // Calculate border radius
  let borderRadius = '0px';
  if (cornerRadius && cornerRadius > 0) {
    borderRadius = `${cornerRadius}px`;
  }
  
  // Handle mirroring transforms
  let transform = baseStyles.transform || '';
  if (mirroring) {
    switch (mirroring) {
      case 'HORIZONTAL':
        transform += ' scaleX(-1)';
        break;
      case 'VERTICAL':
        transform += ' scaleY(-1)';
        break;
      case 'BOTH':
        transform += ' scale(-1, -1)';
        break;
    }
  }
  
  // If it's a vector with path data, render as SVG
  if (vectorType === 'VECTOR' && vectorPath) {
    return (
      <svg
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: transform,
          transformOrigin: 'center center',
        }}
      >
        <path
          d={vectorPath}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  
  // Regular rectangle rendering
  return (
    <div
      style={{
        ...baseStyles,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: fillColor,
        border: strokeWidth > 0 ? `${strokeWidth}px solid ${strokeColor}` : 'none',
        borderRadius: borderRadius,
        boxSizing: 'border-box',
        transform: transform,
        transformOrigin: 'center center',
      }}
      title={`${name} - ${vectorType || 'Rectangle'} (${width}×${height})${fillStyle ? ` - ${fillStyle}` : ''}`}
    />
  );
};

// Render ellipses with proper circular styling
const renderEllipse = (node: any, baseStyles: React.CSSProperties) => {
  const { name, absoluteBoundingBox, fills, strokes, strokeWeight, cornerRadius } = node;
  
  // Get dimensions
  const width = absoluteBoundingBox?.width || 100;
  const height = absoluteBoundingBox?.height || 100;
  
  // Determine if it should be circular
  const isCircular = Math.abs(width - height) < 5 || cornerRadius === Math.min(width, height) / 2;
  
  // Get fill color
  let fillColor = 'transparent';
  if (fills?.[0]?.type === 'SOLID' && fills[0].color) {
    fillColor = rgbaToCss(fills[0].color.r, fills[0].color.g, fills[0].color.b, fills[0].color.a);
  }
  
  // Get stroke properties
  const stroke = strokes?.[0];
  const strokeColor = stroke?.type === 'SOLID' && stroke.color ? 
    rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a) : 
    'transparent';
  
  const strokeWidth = strokeWeight || stroke?.strokeWeight || 0;
  
  // Calculate border radius
  let borderRadius = '0px';
  if (isCircular) {
    borderRadius = '50%';
  } else if (cornerRadius) {
    borderRadius = `${cornerRadius}px`;
  }
  
  return (
    <div
      style={{
        ...baseStyles,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: fillColor,
        border: strokeWidth > 0 ? `${strokeWidth}px solid ${strokeColor}` : 'none',
        borderRadius: borderRadius,
        boxSizing: 'border-box',
      }}
      title={`${name} - Ellipse (${width}×${height})`}
    />
  );
};

// Render vector strokes with proper stroke support
const renderVectorStroke = (node: any, baseStyles: React.CSSProperties) => {
  const { name, absoluteBoundingBox, strokes, strokeWeight, transform, rotation } = node;
  
  // Get stroke properties
  const stroke = strokes?.[0];
  const strokeColor = stroke?.type === 'SOLID' && stroke.color ? 
    rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a) : 
    '#FF004F'; // Default red from your example
  
  const strokeWidth = strokeWeight || stroke?.strokeWeight || 2;
  
  // Get dimensions
  const width = absoluteBoundingBox?.width || 100;
  const height = absoluteBoundingBox?.height || 100;
  
  // Handle transforms
  let transformStyle = '';
  if (transform && Array.isArray(transform)) {
    transformStyle = `matrix(${transform.join(', ')})`;
  } else if (rotation) {
    transformStyle = `rotate(${rotation}deg)`;
  }
  
  // Create SVG path for vector stroke
  const createVectorPath = () => {
    // For vertical lines (like your example)
    if (width < 10 && height > width * 2) {
      return `M ${width/2} 0 L ${width/2} ${height}`;
    }
    // For horizontal lines
    if (height < 10 && width > height * 2) {
      return `M 0 ${height/2} L ${width} ${height/2}`;
    }
    // For diagonal lines
    if (Math.abs(width - height) < 50) {
      return `M 0 0 L ${width} ${height}`;
    }
    // For complex paths, create a rectangle outline
    return `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`;
  };
  
  return (
    <svg
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: transformStyle,
        transformOrigin: '0 0',
      }}
    >
      <path
        d={createVectorPath()}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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

  // Enhanced placeholder component using placeholder.svg
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
        backgroundImage: 'url(/placeholder.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
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
    // Extract all styles with comprehensive support
    const positionStyles = getPositionStyles(node, isRoot ? undefined : parentBoundingBox);
    const layoutStyles = getLayoutStyles(node);
    const fillStyles = getFillStyles(fills, node.id, imageMap);
    const strokeStyles = getEnhancedStrokeStyles(node); // Use enhanced stroke styles
    const shapeStyles = getShapeStyles(node);
    const effectStyles = getEnhancedEffectStyles(node); // Use enhanced effect styles
    const componentStyles = getComponentStyles(node);
    const maskStyles = getMaskStyles(node, parentMask, parentMaskType);
    const appearanceStyles = getAppearanceStyles(node); // Add appearance styles
    
    // Combine all styles with comprehensive support
    const baseStyles: React.CSSProperties = {
      ...positionStyles,
      ...layoutStyles,
      ...fillStyles,
      ...strokeStyles,
      ...shapeStyles,
      ...effectStyles,
      ...componentStyles,
      ...maskStyles,
      ...appearanceStyles,
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
                {isMask && <div className="text-yellow-300">🔒 Mask ({maskType})</div>}
              </div>
            )}
            
            {/* Create mask element if this is a mask */}
            {isMask && createMaskElement(node, children || [])}
            
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

      case 'ELLIPSE':
        // Handle ellipses with proper circular styling
        return (
          <div
            style={baseStyles}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {showDebug && devMode && (
              <div className="absolute -top-8 left-0 bg-green-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                <div className="font-bold">{name}</div>
                <div>{type} - Ellipse</div>
                <div className="text-green-300">⭕ {node.cornerRadius ? `${node.cornerRadius}px radius` : 'circular'}</div>
              </div>
            )}
            
            {renderEllipse(node, baseStyles)}
          </div>
        );

      case 'RECTANGLE':
        // Handle rectangles with comprehensive vector support
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
                <div>{type} - {node.vectorType || 'Rectangle'}</div>
                <div className="text-blue-300">📐 {node.cornerRadius ? `${node.cornerRadius}px radius` : 'sharp corners'}</div>
                {node.mirroring && (
                  <div className="text-blue-300">🪞 {node.mirroring}</div>
                )}
                {node.vectorFills?.[0]?.style && (
                  <div className="text-blue-300">🎨 {node.vectorFills[0].style}</div>
                )}
                {node.vectorStrokes?.[0]?.style && (
                  <div className="text-blue-300">✏️ {node.vectorStrokes[0].style}</div>
                )}
              </div>
            )}
            
            {renderRectangle(node, baseStyles)}
          </div>
        );

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
        if (node.fills && node.fills.some((fill: any) => fill.type === 'IMAGE') ||
            node.name?.toLowerCase().includes('image') ||
            node.name?.toLowerCase().includes('photo') ||
            node.name?.toLowerCase().includes('picture') ||
            node.name?.toLowerCase().includes('img')) {
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

      case 'ARROW':
        // Comprehensive arrow rendering
        return (
          <div
            style={baseStyles}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {showDebug && devMode && (
              <div className="absolute -top-8 left-0 bg-purple-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                <div className="font-bold">{name}</div>
                <div>{type} - Arrow</div>
                <div className="text-purple-300">
                  {node.arrowStart && node.arrowEnd ? '↔️ Both' : 
                   node.arrowStart ? '← Start' : 
                   node.arrowEnd ? '→ End' : '— Line'}
                </div>
                <div className="text-purple-300">📏 {node.strokeWeight || 2}px</div>
              </div>
            )}
            
            {renderArrow(node, baseStyles)}
          </div>
        );

      case 'VECTOR':
        // Handle vector paths with comprehensive support
        return (
          <div
            style={baseStyles}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {showDebug && devMode && (
              <div className="absolute -top-8 left-0 bg-indigo-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                <div className="font-bold">{name}</div>
                <div>{type} - Vector Path</div>
                <div className="text-indigo-300">📐 {node.cornerRadius ? `${node.cornerRadius}px radius` : 'sharp corners'}</div>
                {node.mirroring && (
                  <div className="text-indigo-300">🪞 {node.mirroring}</div>
                )}
                {node.vectorFills?.[0]?.style && (
                  <div className="text-indigo-300">🎨 {node.vectorFills[0].style}</div>
                )}
                {node.vectorStrokes?.[0]?.style && (
                  <div className="text-indigo-300">✏️ {node.vectorStrokes[0].style}</div>
                )}
                {node.vectorPath && (
                  <div className="text-indigo-300">🔄 Path Data</div>
                )}
              </div>
            )}
            
            {renderRectangle(node, baseStyles)}
          </div>
        );

      case 'LINE':
      case 'VECTOR':
        // Enhanced vector stroke rendering
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
                <div>{type} - Vector Stroke</div>
                <div className="text-pink-300">📐 {node.strokes?.[0]?.color ? `#${rgbToHex(node.strokes[0].color.r, node.strokes[0].color.g, node.strokes[0].color.b)}` : 'default'}</div>
              </div>
            )}
            
            {renderVectorStroke(node, baseStyles)}
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