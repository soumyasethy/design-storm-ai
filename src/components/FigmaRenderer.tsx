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
  
  // Enhanced Rectangle & Vector Support
  isRectangle?: boolean; // Indicates if this is a rectangle
  isVector?: boolean; // Indicates if this is a vector
  vectorPaths?: Array<{
    path: string; // SVG path data
    fillRule?: 'NONZERO' | 'EVENODD';
    windingRule?: 'NONZERO' | 'EVENODD';
  }>;
  
  // Enhanced Vector Support
  vectorType?: string; // 'LINE', 'RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR', 'CUSTOM'
  vectorPoints?: Array<{ x: number; y: number }>; // Vector points for complex shapes
  vectorClosed?: boolean; // Whether the vector path is closed
  vectorFillRule?: 'NONZERO' | 'EVENODD'; // Fill rule for vector
  vectorWindingRule?: 'NONZERO' | 'EVENODD'; // Winding rule for vector
  
  // Enhanced Vector Rotation Support
  vectorRotation?: number; // Vector-specific rotation in degrees
  vectorRotationCenter?: { x: number; y: number }; // Rotation center point
  vectorRotationAxis?: 'X' | 'Y' | 'Z' | 'CENTER'; // Rotation axis
  vectorRotationMode?: 'ABSOLUTE' | 'RELATIVE' | 'INCREMENTAL'; // Rotation mode
  
  // Vector Position & Alignment
  vectorX?: number; // X position for vector
  vectorY?: number; // Y position for vector
  vectorAlign?: string; // 'LEFT', 'CENTER', 'RIGHT', 'TOP', 'BOTTOM'
  vectorAnchor?: { x: number; y: number }; // Anchor point for vector
  
  // Vector Mirroring Support
  vectorMirror?: boolean; // Whether vector is mirrored
  vectorMirrorAxis?: 'HORIZONTAL' | 'VERTICAL' | 'BOTH'; // Mirror axis
  vectorMirrorAngle?: number; // Mirror angle in degrees
  vectorMirrorLength?: number; // Mirror length
  vectorMirrorTransform?: Array<Array<number>>; // Mirror transformation matrix
  
  // Vector Fill Support
  vectorFill?: {
    type: string; // 'SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND'
    color?: { r: number; g: number; b: number; a?: number };
    gradientStops?: Array<{
      position: number;
      color: { r: number; g: number; b: number; a?: number };
    }>;
    gradientTransform?: Array<Array<number>>;
    opacity?: number;
  };
  
  // Vector Stroke Support
  vectorStroke?: {
    color?: { r: number; g: number; b: number; a?: number };
    weight?: number; // Stroke weight
    position?: string; // 'INSIDE', 'CENTER', 'OUTSIDE'
    cap?: string; // 'NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL'
    join?: string; // 'MITER', 'BEVEL', 'ROUND'
    dashPattern?: Array<number>; // Dash pattern for dashed strokes
    gradientStops?: Array<{
      position: number;
      color: { r: number; g: number; b: number; a?: number };
    }>;
    gradientTransform?: Array<Array<number>>;
    opacity?: number;
  };
  
  // Vector Corner Radius Support
  vectorCornerRadius?: number; // Corner radius for vector
  vectorCornerRadiusTopLeft?: number;
  vectorCornerRadiusTopRight?: number;
  vectorCornerRadiusBottomLeft?: number;
  vectorCornerRadiusBottomRight?: number;
  
  // Mirroring & Transform Support
  isMirrored?: boolean; // Indicates if element is mirrored
  mirrorAxis?: 'HORIZONTAL' | 'VERTICAL' | 'BOTH'; // Mirror axis
  mirrorTransform?: Array<Array<number>>; // Mirror transformation matrix
  
  // Aspect Ratio Support
  aspectRatio?: number; // Width/Height ratio
  maintainAspectRatio?: boolean; // Whether to maintain aspect ratio
  aspectRatioLocked?: boolean; // Whether aspect ratio is locked
  
  // Individual Corner Support
  cornerRadiusLocked?: boolean; // Whether corner radius is locked
  
  // Dimension Support
  width?: number; // Explicit width
  height?: number; // Explicit height
  originalWidth?: number; // Original width before transforms
  originalHeight?: number; // Original height before transforms
  dimensionLocked?: boolean; // Whether dimensions are locked
  
  // Union & Boolean Operations
  isUnion?: boolean; // Indicates if this is a union operation
  unionChildren?: FigmaNode[]; // Children for union operations
  booleanOperation?: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'; // Boolean operation type
  
  // Enhanced Blend Mode Support
  blendMode?: string; // Element blend mode
  isolation?: boolean; // Whether to create isolation layer
  
  // Show/Hide Support
  isVisible?: boolean; // Element visibility
  isLocked?: boolean; // Whether element is locked
  isHidden?: boolean; // Whether element is hidden
  
  // Enhanced mask group support
  isMaskGroup?: boolean; // Indicates if this is a mask group
  maskGroupId?: string; // ID of the mask group
  maskGroupMode?: 'ADD' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'; // Mask group operation mode
  maskGroupChildren?: FigmaNode[]; // Children that are part of the mask group
  maskGroupParent?: string; // Parent mask group ID
  maskGroupIndex?: number; // Index within the mask group
  maskGroupOpacity?: number; // Opacity for mask group elements
  maskGroupBlendMode?: string; // Blend mode for mask group elements
  
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

// Advanced rotation debugging utility
const debugRotationMapping = (originalRotation: number, nodeName: string, nodeType: string) => {
  console.log(`🔍 ROTATION DEBUG for ${nodeName} (${nodeType}):`);
  console.log(`   Original value: ${originalRotation}`);
  console.log(`   Is radians: ${Math.abs(originalRotation) <= Math.PI}`);
  
  let degrees = originalRotation;
  if (Math.abs(originalRotation) <= Math.PI) {
    degrees = (originalRotation * 180) / Math.PI;
    console.log(`   Converted to degrees: ${degrees}°`);
  }
  
  console.log(`   Expected behavior:`);
  console.log(`     - If ${degrees}° should be VERTICAL → CSS should be 180°`);
  console.log(`     - If ${degrees}° should be HORIZONTAL → CSS should be 0°`);
  console.log(`   Current mapping result: ${getFigmaToCssRotation(degrees)}°`);
};

// Advanced Figma to CSS rotation mapping function
const getFigmaToCssRotation = (figmaRotation: number): number => {
  // Map Figma rotations to CSS rotations based on your specific cases
  if (Math.abs(figmaRotation - 90) < 0.1) {
    // Figma 90° should be CSS 180° (vertical)
    return 180;
  } else if (Math.abs(figmaRotation - (-90)) < 0.1) {
    // Figma -90° should be CSS 180° (vertical)
    return 180;
  } else if (Math.abs(figmaRotation - 0) < 0.1) {
    // Figma 0° should be CSS 0° (horizontal)
    return 0;
  } else if (Math.abs(figmaRotation - 180) < 0.1) {
    // Figma 180° should be CSS 180° (horizontal)
    return 180;
  } else {
    // For other angles, use the same value (no inversion)
    return figmaRotation;
  }
};

// Test function to verify rotation mapping (you can call this in console)
const testRotationMapping = () => {
  console.log('🧪 TESTING ROTATION MAPPING (FINAL FIX):');
  console.log('Figma 90° → CSS', getFigmaToCssRotation(90), '° (should be vertical)');
  console.log('Figma -90° → CSS', getFigmaToCssRotation(-90), '° (should be vertical)');
  console.log('Figma 0° → CSS', getFigmaToCssRotation(0), '° (should be horizontal)');
  console.log('Figma 180° → CSS', getFigmaToCssRotation(180), '° (should be horizontal)');
  console.log('Figma 45° → CSS', getFigmaToCssRotation(45), '°');
  console.log('Figma -45° → CSS', getFigmaToCssRotation(-45), '°');
};

// Enhanced vector rotation utility function
const getVectorRotationTransform = (
  vectorRotation?: number,
  vectorRotationCenter?: { x: number; y: number },
  vectorRotationAxis?: string,
  rotation?: number,
  width?: number,
  height?: number
): string => {
  let transformStyle = '';
  
  // Handle vector-specific rotation with center point support
  if (vectorRotation !== undefined && vectorRotation !== 0) {
    if (vectorRotationCenter) {
      // Rotate around specific center point
      transformStyle += `rotate(${vectorRotation}deg ${vectorRotationCenter.x} ${vectorRotationCenter.y}) `;
    } else if (vectorRotationAxis === 'CENTER') {
      // Rotate around center of the element
      transformStyle += `rotate(${vectorRotation}deg ${(width || 0)/2} ${(height || 0)/2}) `;
    } else {
      // Default rotation around origin
      transformStyle += `rotate(${vectorRotation}deg) `;
    }
  } else if (rotation !== undefined && rotation !== 0) {
    // Handle general rotation - check if it's in radians and convert to degrees
    let rotationDegrees = rotation;
    
    // If rotation is in radians (typically between -π and π), convert to degrees
    if (Math.abs(rotationDegrees) <= Math.PI) {
      rotationDegrees = (rotationDegrees * 180) / Math.PI;
    }
    
    // Use the same mapping as the main function
    rotationDegrees = getFigmaToCssRotation(rotationDegrees);
    
    // Round to 2 decimal places to avoid floating point issues
    rotationDegrees = Math.round(rotationDegrees * 100) / 100;
    
    transformStyle += `rotate(${rotationDegrees}deg) `;
  }
  
  return transformStyle;
};

// Enhanced fill styles with improved color handling and gradient support
const getFillStyles = (fills: any[], nodeId?: string, imageMap?: Record<string, string>): React.CSSProperties => {
  if (!fills || fills.length === 0) {
    // Return a light gray background for debugging when no fills are provided
    return { backgroundColor: 'rgba(200, 200, 200, 0.3)' };
  }
  
  const fill = fills[0];
  const styles: React.CSSProperties = {};
  
     if (fill.type === 'SOLID' && fill.color) {
    // Use rgbaToCss for better color accuracy and opacity handling
     styles.backgroundColor = rgbaToCss(fill.color.r, fill.color.g, fill.color.b, fill.color.a);
   } else if (fill.type === 'IMAGE') {
    const imageUrl = fill.imageUrl || (nodeId && imageMap && imageMap[nodeId]);
     if (imageUrl) {
       styles.backgroundImage = `url('${imageUrl}')`;
       styles.backgroundSize = 'cover';
       styles.backgroundPosition = 'center';
       styles.backgroundRepeat = 'no-repeat';
     }
  } else if (fill.gradientStops && fill.gradientStops.length > 0) {
    // Enhanced gradient support for all types
    const stops = fill.gradientStops.map((stop: any) => {
      const rgbaColor = rgbaToCss(stop.color.r, stop.color.g, stop.color.b, stop.color.a);
      return `${rgbaColor} ${stop.position * 100}%`;
    }).join(', ');
    
    // Handle gradient transform for direction/angle
    let gradientDirection = '';
    if (fill.gradientTransform && Array.isArray(fill.gradientTransform)) {
      const transform = fill.gradientTransform.flat();
      // Calculate angle from transform matrix
      const angle = Math.atan2(transform[1], transform[0]) * (180 / Math.PI);
      gradientDirection = `${angle}deg`;
    }
    
    switch (fill.type) {
      case 'GRADIENT_LINEAR':
        styles.background = `linear-gradient(${gradientDirection || 'to bottom'}, ${stops})`;
        break;
      case 'GRADIENT_RADIAL':
        styles.background = `radial-gradient(circle at center, ${stops})`;
        break;
      case 'GRADIENT_ANGULAR':
        // Angular gradient (conic gradient in CSS)
        styles.background = `conic-gradient(from ${gradientDirection || '0deg'}, ${stops})`;
        break;
      case 'GRADIENT_DIAMOND':
        // Diamond gradient (radial gradient with diamond shape)
        styles.background = `radial-gradient(ellipse at center, ${stops})`;
        // Add clip-path for diamond shape
        styles.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
        break;
      default:
        // Fallback to linear gradient
        styles.background = `linear-gradient(${gradientDirection || 'to bottom'}, ${stops})`;
        break;
     }
   }
  
  return styles;
};

// Enhanced stroke styles with comprehensive support
// Enhanced border and stroke styles with comprehensive support
const getEnhancedStrokeStyles = (node: any): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  // Handle both strokes and vectorStroke properties
  const stroke = node.strokes?.[0] || node.vectorStroke;
  
  if (!stroke) return styles;
  
  // Get stroke color with enhanced support
  let strokeColor = 'transparent';
  let strokeWidth = 0;
  let strokeAlign = 'CENTER';
  let strokeCap = 'NONE';
  let strokeJoin = 'MITER';
  let dashPattern: number[] = [];
  
  if (stroke.type === 'SOLID' && stroke.color) {
    strokeColor = rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a);
    strokeWidth = stroke.strokeWeight || node.strokeWeight || 1;
    strokeAlign = stroke.strokeAlign || 'CENTER';
    strokeCap = stroke.strokeCap || 'NONE';
    strokeJoin = stroke.strokeJoin || 'MITER';
    dashPattern = stroke.dashPattern || [];
  } else if (stroke.color) {
    // Handle vectorStroke format
    strokeColor = rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a);
    strokeWidth = stroke.weight || 1;
    strokeAlign = stroke.position || 'CENTER';
    strokeCap = stroke.cap || 'NONE';
    strokeJoin = stroke.join || 'MITER';
    dashPattern = stroke.dashPattern || [];
  }
  
  // Apply border styles based on stroke alignment
  if (strokeWidth > 0) {
    styles.boxSizing = 'border-box';
    
    if (strokeAlign === 'INSIDE') {
      // Inside stroke - border shrinks the content area
      styles.border = `${strokeWidth}px solid ${strokeColor}`;
    } else if (strokeAlign === 'OUTSIDE') {
      // Outside stroke - outline extends beyond the element
      styles.outline = `${strokeWidth}px solid ${strokeColor}`;
      styles.outlineOffset = '0px';
    } else {
      // CENTER (default) - border is centered on the element edge
      styles.border = `${strokeWidth}px solid ${strokeColor}`;
    }
    
    // Handle dash patterns for borders
    if (dashPattern && dashPattern.length > 0) {
      if (strokeAlign === 'OUTSIDE') {
        // For outline, we need to use a different approach
        styles.outlineStyle = 'dashed';
        (styles as any).outlineDasharray = dashPattern.join(', ');
      } else {
        styles.borderStyle = 'dashed';
        (styles as any).borderDasharray = dashPattern.join(', ');
      }
    }
  }
  
  // Handle stroke caps and joins for SVG elements
  if (strokeCap && strokeCap !== 'NONE') {
    styles.strokeLinecap = strokeCap.toLowerCase() as any;
  }
  if (strokeJoin && strokeJoin !== 'MITER') {
    styles.strokeLinejoin = strokeJoin.toLowerCase() as any;
  }
  
  // Handle gradient strokes
  if (stroke.type === 'GRADIENT_LINEAR' || stroke.type === 'GRADIENT_RADIAL') {
    // For gradient strokes, we'll use SVG or CSS gradients
    if (stroke.gradientStops && stroke.gradientStops.length > 0) {
      const gradientStops = stroke.gradientStops
        .map((stop: any) => `${rgbaToCss(stop.color.r, stop.color.g, stop.color.b, stop.color.a)} ${stop.position * 100}%`)
        .join(', ');
      
      if (stroke.type === 'GRADIENT_LINEAR') {
        styles.borderImage = `linear-gradient(to right, ${gradientStops}) 1`;
      } else {
        styles.borderImage = `radial-gradient(circle, ${gradientStops}) 1`;
      }
    }
  }
  
  return styles;
};

// Enhanced stroke styles with comprehensive border support
const getStrokeStyles = (strokes: any[], strokeWeight?: number): React.CSSProperties => {
  if (!strokes || strokes.length === 0) return {};
  
  const stroke = strokes[0];
  const styles: React.CSSProperties = {};
  
  if (stroke.type === 'SOLID' && stroke.color) {
    const weight = stroke.strokeWeight || strokeWeight || 2; // Default to 2px for better visibility
    const strokeColor = rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a);
    
    // Handle stroke alignment
    if (stroke.strokeAlign === 'INSIDE') {
      styles.boxSizing = 'border-box';
      styles.border = `${weight}px solid ${strokeColor}`;
    } else if (stroke.strokeAlign === 'OUTSIDE') {
      styles.boxSizing = 'border-box';
      styles.outline = `${weight}px solid ${strokeColor}`;
      styles.outlineOffset = '0px';
    } else {
      // CENTER (default)
      styles.boxSizing = 'border-box';
      styles.border = `${weight}px solid ${strokeColor}`;
    }
    
    // Handle dash patterns
    if (stroke.dashPattern && stroke.dashPattern.length > 0) {
      if (stroke.strokeAlign === 'OUTSIDE') {
        styles.outlineStyle = 'dashed';
        (styles as any).outlineDasharray = stroke.dashPattern.join(', ');
      } else {
        styles.borderStyle = 'dashed';
        (styles as any).borderDasharray = stroke.dashPattern.join(', ');
      }
    }
  } else if (stroke.type === 'GRADIENT_LINEAR' || stroke.type === 'GRADIENT_RADIAL') {
    // Handle gradient strokes
    if (stroke.gradientStops && stroke.gradientStops.length > 0) {
      const weight = stroke.strokeWeight || strokeWeight || 2;
      const gradientStops = stroke.gradientStops
        .map((stop: any) => `${rgbaToCss(stop.color.r, stop.color.g, stop.color.b, stop.color.a)} ${stop.position * 100}%`)
        .join(', ');
      
      if (stroke.type === 'GRADIENT_LINEAR') {
        styles.borderImage = `linear-gradient(to right, ${gradientStops}) 1`;
        styles.borderWidth = `${weight}px`;
        styles.borderStyle = 'solid';
      } else {
        styles.borderImage = `radial-gradient(circle, ${gradientStops}) 1`;
        styles.borderWidth = `${weight}px`;
        styles.borderStyle = 'solid';
      }
    }
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
  
  // Handle corner radius with comprehensive support
  const borderRadius = getIndividualCornerRadius(node);
  if (borderRadius !== '0px') {
    styles.borderRadius = borderRadius;
  }
  
  // Handle blend modes
  if (node.blendMode) {
    styles.mixBlendMode = node.blendMode.toLowerCase().replace('_', '-');
  }
  
  return styles;
};

// Enhanced corner radius handling
// Enhanced border radius support with comprehensive handling
const getCornerRadius = (radius: number, width?: number, height?: number): string => {
  if (!radius || radius === 0) return '0px';
  
  // Handle circular elements (when radius is very large relative to size)
  if (width && height) {
    const minDimension = Math.min(width, height);
    if (radius >= minDimension / 2) {
      return '50%';
    }
  }
  
  // Handle very large radius values
  if (radius >= 50) {
    return '50%';
  }
  
  return `${radius}px`;
};

// Enhanced border radius with individual corner support
const getIndividualCornerRadius = (node: any): string => {
  const { 
    cornerRadius, 
    cornerRadiusTopLeft, 
    cornerRadiusTopRight, 
    cornerRadiusBottomLeft, 
    cornerRadiusBottomRight,
    absoluteBoundingBox 
  } = node;
  
  // If individual corners are specified, use them
  if (cornerRadiusTopLeft !== undefined || cornerRadiusTopRight !== undefined || 
      cornerRadiusBottomLeft !== undefined || cornerRadiusBottomRight !== undefined) {
    const topLeft = cornerRadiusTopLeft ?? cornerRadius ?? 0;
    const topRight = cornerRadiusTopRight ?? cornerRadius ?? 0;
    const bottomLeft = cornerRadiusBottomLeft ?? cornerRadius ?? 0;
    const bottomRight = cornerRadiusBottomRight ?? cornerRadius ?? 0;
    
    return `${getCornerRadius(topLeft)} ${getCornerRadius(topRight)} ${getCornerRadius(bottomRight)} ${getCornerRadius(bottomLeft)}`;
  }
  
  // Use general corner radius
  if (cornerRadius !== undefined) {
    const width = absoluteBoundingBox?.width;
    const height = absoluteBoundingBox?.height;
    return getCornerRadius(cornerRadius, width, height);
  }
  
  return '0px';
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

// Enhanced positioning utilities with comprehensive support
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
  
  // Enhanced rotation support for all component types
  let transformParts: string[] = [];
  
  // Handle vector-specific rotation with priority
  if (node.vectorRotation !== undefined && node.vectorRotation !== 0) {
    if (node.vectorRotationCenter) {
      // Rotate around specific center point
      transformParts.push(`rotate(${node.vectorRotation}deg ${node.vectorRotationCenter.x} ${node.vectorRotationCenter.y})`);
    } else if (node.vectorRotationAxis === 'CENTER') {
      // Rotate around center of the element
      const centerX = node.absoluteBoundingBox ? node.absoluteBoundingBox.width / 2 : 0;
      const centerY = node.absoluteBoundingBox ? node.absoluteBoundingBox.height / 2 : 0;
      transformParts.push(`rotate(${node.vectorRotation}deg ${centerX} ${centerY})`);
    } else {
      // Default rotation around origin
      transformParts.push(`rotate(${node.vectorRotation}deg)`);
    }
      } else if (node.rotation !== undefined && node.rotation !== 0) {
      // Handle general rotation - check if it's in radians and convert to degrees
      let rotationDegrees = node.rotation;
      
      // Advanced rotation debugging
      debugRotationMapping(node.rotation, node.name, node.type);
      
      // If rotation is in radians (typically between -π and π), convert to degrees
      if (Math.abs(rotationDegrees) <= Math.PI) {
        rotationDegrees = (rotationDegrees * 180) / Math.PI;
      }
      
      // Use the advanced mapping function
      let finalRotation = getFigmaToCssRotation(rotationDegrees);
      
      // Round to 2 decimal places to avoid floating point issues
      finalRotation = Math.round(finalRotation * 100) / 100;
      
      transformParts.push(`rotate(${finalRotation}deg)`);
    }
  
  // Handle complex transforms for geometric elements
  if (node.transform && Array.isArray(node.transform)) {
    transformParts.push(`matrix(${node.transform.join(', ')})`);
  }
  
  // Handle skew transforms
  if (node.skew !== undefined && node.skew !== 0) {
    transformParts.push(`skew(${node.skew}deg)`);
  }
  
  // Handle scale transforms
  if (node.scale && (node.scale.x !== 1 || node.scale.y !== 1)) {
    transformParts.push(`scale(${node.scale.x}, ${node.scale.y})`);
  }
  
  // Handle mirroring transforms
  if (node.isMirrored && node.mirrorAxis) {
    switch (node.mirrorAxis) {
      case 'HORIZONTAL':
        transformParts.push('scaleX(-1)');
        break;
      case 'VERTICAL':
        transformParts.push('scaleY(-1)');
        break;
      case 'BOTH':
        transformParts.push('scale(-1, -1)');
        break;
    }
  }
  
  // Combine all transforms
  if (transformParts.length > 0) {
    styles.transform = transformParts.join(' ');
    styles.transformOrigin = 'center center';
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
  
  // Handle corner radius with comprehensive support
  const borderRadius = getIndividualCornerRadius(node);
  if (borderRadius !== '0px') {
    styles.borderRadius = borderRadius;
    
    // Special handling for circular elements
    if (isCircularElement(node)) {
      styles.borderRadius = '50%';
      // Ensure perfect circle for social media icons
      if (node.name?.toLowerCase().includes('linkedin') || 
          node.name?.toLowerCase().includes('instagram') || 
          node.name?.toLowerCase().includes('youtube')) {
        styles.border = '2px solid #FF0A54'; // Pink border for footer icons
      }
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
  
  // Handle relative transform (matrix)
  if (node.relativeTransform && Array.isArray(node.relativeTransform)) {
    const matrix = node.relativeTransform.flat();
    styles.transform = `matrix(${matrix.join(', ')})`;
  }
  
  // Handle min/max dimensions
  if (node.minWidth !== undefined) {
    styles.minWidth = `${node.minWidth}px`;
  }
  if (node.maxWidth !== undefined) {
    styles.maxWidth = `${node.maxWidth}px`;
  }
  if (node.minHeight !== undefined) {
    styles.minHeight = `${node.minHeight}px`;
  }
  if (node.maxHeight !== undefined) {
    styles.maxHeight = `${node.maxHeight}px`;
  }
  
  // Handle z-index
  if (node.zIndex !== undefined) {
    styles.zIndex = node.zIndex;
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

// Enhanced mask support utilities with mask group support
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

// Detect if a node is part of a mask group
const isMaskGroupNode = (node: any): boolean => {
  return node.isMaskGroup || 
         node.maskGroupId || 
         node.maskGroupParent ||
         (node.name && node.name.toLowerCase().includes('mask group'));
};

// Get mask group operation mode
const getMaskGroupMode = (node: any): string => {
  if (!isMaskGroupNode(node)) return 'normal';
  
  switch (node.maskGroupMode) {
    case 'ADD':
      return 'add';
    case 'SUBTRACT':
      return 'subtract';
    case 'INTERSECT':
      return 'intersect';
    case 'EXCLUDE':
      return 'exclude';
    default:
      return 'normal';
  }
};

// Create mask element for children with enhanced mask group support
// Enhanced mask element creation with image + rectangle support
const createMaskElement = (node: any, children: any[], imageMap: Record<string, string> = {}, fileKey?: string, figmaToken?: string, devMode: boolean = false): React.ReactElement | null => {
  if (!node.isMask || !children || children.length === 0) {
    return null;
  }
  
  const maskId = `mask-${node.id}`;
  const { absoluteBoundingBox, maskType = 'ALPHA', isMaskGroup, maskGroupMode } = node;
  
  // Get mask dimensions
  const width = absoluteBoundingBox?.width || 100;
  const height = absoluteBoundingBox?.height || 100;
  
  // Handle mask group operations
  const getMaskGroupOperation = () => {
    if (!isMaskGroup) return 'normal';
    
    switch (maskGroupMode) {
      case 'ADD':
        return 'add';
      case 'SUBTRACT':
        return 'subtract';
      case 'INTERSECT':
        return 'intersect';
      case 'EXCLUDE':
        return 'exclude';
      default:
        return 'normal';
    }
  };

  // Enhanced function to render mask group children with image + rectangle support
  const renderMaskGroupChild = (child: any, index: number) => {
    const childMaskMode = getMaskGroupOperation();
    
    // Handle different child types for mask groups
    if (child.type === 'RECTANGLE') {
      // Render rectangle as mask element
      const fill = child.fills?.[0];
      const fillColor = fill?.type === 'SOLID' && fill.color ? 
        rgbaToCss(fill.color.r, fill.color.g, fill.color.b, fill.color.a) : 
        'black';
      
      const borderRadius = getIndividualCornerRadius(child);
      const { x = 0, y = 0, width: childWidth = 100, height: childHeight = 100 } = 
        child.absoluteBoundingBox || {};
      
      return (
        <g key={child.id || index} mask={childMaskMode}>
          <rect
            x={x}
            y={y}
            width={childWidth}
            height={childHeight}
            fill={fillColor}
            rx={borderRadius !== '0px' ? parseFloat(borderRadius) : 0}
            ry={borderRadius !== '0px' ? parseFloat(borderRadius) : 0}
          />
        </g>
      );
    } else if (child.type === 'IMAGE' || child.fills?.some((fill: any) => fill.type === 'IMAGE')) {
      // Render image as mask element
      const imageFill = child.fills?.find((fill: any) => fill.type === 'IMAGE');
      const imageUrl = imageFill?.imageUrl || imageMap[child.id];
      
      if (imageUrl) {
        const { x = 0, y = 0, width: childWidth = 100, height: childHeight = 100 } = 
          child.absoluteBoundingBox || {};
        
        return (
          <g key={child.id || index} mask={childMaskMode}>
            <image
              href={imageUrl}
              x={x}
              y={y}
              width={childWidth}
              height={childHeight}
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        );
      }
    } else if (child.type === 'VECTOR' || child.isVector) {
      // Render vector as mask element
      const fill = child.vectorFill || child.fills?.[0];
      const fillColor = fill?.type === 'SOLID' && fill.color ? 
        rgbaToCss(fill.color.r, fill.color.g, fill.color.b, fill.color.a) : 
        'black';
      
      const { x = 0, y = 0, width: childWidth = 100, height: childHeight = 100 } = 
        child.absoluteBoundingBox || {};
      
      // Create vector path
      let vectorPath = '';
      if (child.vectorPaths && child.vectorPaths.length > 0) {
        vectorPath = child.vectorPaths[0].path;
      } else if (child.vectorType === 'RECTANGLE') {
        const radius = child.vectorCornerRadius || 0;
        vectorPath = `M 0 ${radius} Q 0 0 ${radius} 0 L ${childWidth - radius} 0 Q ${childWidth} 0 ${childWidth} ${radius} L ${childWidth} ${childHeight - radius} Q ${childWidth} ${childHeight} ${childWidth - radius} ${childHeight} L ${radius} ${childHeight} Q 0 ${childHeight} 0 ${childHeight - radius} Z`;
      } else if (child.vectorType === 'ELLIPSE') {
        const centerX = childWidth / 2;
        const centerY = childHeight / 2;
        const radiusX = childWidth / 2;
        const radiusY = childHeight / 2;
        vectorPath = `M ${centerX - radiusX} ${centerY} A ${radiusX} ${radiusY} 0 1 1 ${centerX + radiusX} ${centerY} A ${radiusX} ${radiusY} 0 1 1 ${centerX - radiusX} ${centerY} Z`;
      }
      
      return (
        <g key={child.id || index} mask={childMaskMode}>
          <path
            d={vectorPath}
            fill={fillColor}
            transform={`translate(${x}, ${y})`}
          />
        </g>
      );
    } else if (child.type === 'FRAME' || child.type === 'GROUP') {
      // Render frame/group children recursively
      return (
        <g key={child.id || index} mask={childMaskMode}>
          {child.children?.map((grandChild: any, grandIndex: number) => 
            renderMaskGroupChild(grandChild, grandIndex)
          )}
        </g>
      );
    } else {
      // Fallback to regular FigmaRenderer for other types
      return (
        <g key={child.id || index} mask={childMaskMode}>
          <FigmaRenderer
            node={child}
            showDebug={false}
            parentBoundingBox={node.absoluteBoundingBox}
            imageMap={imageMap}
            parentMask={true}
            parentMaskType={maskType}
            fileKey={fileKey}
            figmaToken={figmaToken}
            devMode={devMode}
          />
        </g>
      );
    }
  };
  
  return (
    <svg
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      aria-hidden="true"
    >
      <defs>
        <mask 
          id={maskId} 
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
        >
          {/* White background for mask */}
          <rect width={width} height={height} fill="white" />
          
          {/* Render mask children with enhanced image + rectangle support */}
          {children.map((child: any, index: number) => renderMaskGroupChild(child, index))}
        </mask>
      </defs>
    </svg>
  );
};

// Enhanced rectangle rendering with comprehensive support
const renderRectangle = (node: any, baseStyles: React.CSSProperties, showDebug: boolean = false, devMode: boolean = false) => {
  const { 
    name, 
    absoluteBoundingBox, 
    fills, 
    strokes, 
    strokeWeight, 
    cornerRadius,
    cornerRadiusTopLeft,
    cornerRadiusTopRight,
    cornerRadiusBottomLeft,
    cornerRadiusBottomRight,
    strokeAlign,
    effects,
    isMirrored,
    mirrorAxis,
    aspectRatio,
    blendMode,
    isVisible,
    isHidden
  } = node;
  
  // Skip hidden elements
  if (isHidden || isVisible === false) {
    return null;
  }
  
  // Get dimensions
  const width = absoluteBoundingBox?.width || 100;
  const height = absoluteBoundingBox?.height || 100;
  
  // Get enhanced fill styles with comprehensive gradient support
  const fillStyles = getFillStyles(fills, node.id, {});
  
  // Debug logging for fill issues
  if (devMode && showDebug) {
    console.log('Rectangle Fill Debug:', {
      name,
      fills,
      fillStyles,
      hasFills: fills && fills.length > 0,
      fillType: fills?.[0]?.type,
      fillColor: fills?.[0]?.color
    });
  }
  
  // Get stroke properties with enhanced support
  const stroke = strokes?.[0];
  const strokeColor = stroke?.type === 'SOLID' && stroke.color ? 
    rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a) : 
    'transparent';
  
  const strokeWidth = strokeWeight || stroke?.strokeWeight || 0;
  
  // Calculate border radius with comprehensive support
  const borderRadius = getIndividualCornerRadius(node);
  
  // Get enhanced stroke styles
  const strokeStyles = getEnhancedStrokeStyles(node);
  
  // Handle stroke alignment with comprehensive support
  let borderStyle = 'none';
  let outlineStyle = {};
  
  if (strokeWidth > 0) {
    if (strokeAlign === 'INSIDE') {
      borderStyle = `${strokeWidth}px solid ${strokeColor}`;
    } else if (strokeAlign === 'OUTSIDE') {
      // For outside stroke, we'll use outline
      outlineStyle = {
        outline: `${strokeWidth}px solid ${strokeColor}`,
        outlineOffset: '0px',
      };
      
      // Handle dash patterns for outline
      if (stroke?.dashPattern && stroke.dashPattern.length > 0) {
        outlineStyle = {
          ...outlineStyle,
          outlineStyle: 'dashed',
          outlineDasharray: stroke.dashPattern.join(', '),
        };
      }
    } else {
      // CENTER (default)
      borderStyle = `${strokeWidth}px solid ${strokeColor}`;
    }
    
    // Handle dash patterns for border
    if (stroke?.dashPattern && stroke.dashPattern.length > 0 && strokeAlign !== 'OUTSIDE') {
      borderStyle = `${strokeWidth}px dashed ${strokeColor}`;
    }
  }
  
  // Handle mirroring
  let transform = baseStyles.transform || '';
  if (isMirrored && mirrorAxis) {
    switch (mirrorAxis) {
      case 'HORIZONTAL':
        transform += ' scaleX(-1) ';
        break;
      case 'VERTICAL':
        transform += ' scaleY(-1) ';
        break;
      case 'BOTH':
        transform += ' scale(-1, -1) ';
        break;
    }
  }
  
  // Handle aspect ratio
  let aspectRatioStyle = {};
  if (aspectRatio && aspectRatio > 0) {
    aspectRatioStyle = { aspectRatio: aspectRatio.toString() };
  }
  
  return (
    <div
      style={{
        ...baseStyles,
        width: `${width}px`,
        height: `${height}px`,
        border: borderStyle,
        borderRadius: borderRadius,
        boxSizing: 'border-box',
        mixBlendMode: blendMode?.toLowerCase().replace('_', '-') || 'normal',
        transform: transform,
        ...aspectRatioStyle,
        ...fillStyles,
        ...strokeStyles,
        ...outlineStyle,
      }}
      title={`${name} - Rectangle (${width}×${height})`}
    />
  );
};

// Union and boolean operation rendering
const renderUnion = (node: any, baseStyles: React.CSSProperties) => {
  const { 
    name, 
    unionChildren, 
    booleanOperation, 
    blendMode, 
    isVisible, 
    isHidden 
  } = node;
  
  // Skip hidden elements
  if (isHidden || isVisible === false) {
    return null;
  }
  
  if (!unionChildren || unionChildren.length === 0) {
    return null;
  }
  
  // Create SVG for boolean operations
  const getBooleanOperation = () => {
    switch (booleanOperation) {
      case 'UNION':
        return 'add';
      case 'SUBTRACT':
        return 'subtract';
      case 'INTERSECT':
        return 'intersect';
      case 'EXCLUDE':
        return 'exclude';
      default:
        return 'add';
    }
  };
  
  return (
    <svg
      width={baseStyles.width}
      height={baseStyles.height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        mixBlendMode: blendMode?.toLowerCase().replace('_', '-') || 'normal',
      }}
    >
      <defs>
        <mask id={`union-${node.id}`}>
          <rect width="100%" height="100%" fill="white" />
          {unionChildren.map((child: any, index: number) => (
            <g key={child.id || index} mask={getBooleanOperation()}>
              <FigmaRenderer
                node={child}
                showDebug={false}
                parentBoundingBox={node.absoluteBoundingBox}
                imageMap={{}}
                parentMask={true}
                parentMaskType="ALPHA"
                fileKey=""
                figmaToken=""
                devMode={false}
              />
            </g>
          ))}
        </mask>
      </defs>
      <rect 
        width="100%" 
        height="100%" 
        fill="currentColor"
        mask={`url(#union-${node.id})`}
      />
    </svg>
  );
};

// Enhanced vector rendering with comprehensive support
const renderVector = (node: any, baseStyles: React.CSSProperties) => {
  const { 
    name, 
    absoluteBoundingBox, 
    vectorPaths, 
    fills, 
    strokes, 
    strokeWeight,
    strokeAlign,
    strokeCap,
    strokeJoin,
    dashPattern,
    effects,
    blendMode,
    isVisible,
    isHidden,
    // Enhanced vector properties
    vectorType,
    vectorPoints,
    vectorClosed,
    vectorFillRule,
    vectorWindingRule,
    vectorX,
    vectorY,
    vectorAlign,
    vectorAnchor,
    vectorMirror,
    vectorMirrorAxis,
    vectorMirrorAngle,
    vectorMirrorLength,
    vectorMirrorTransform,
    vectorFill,
    vectorStroke,
    vectorCornerRadius,
    vectorCornerRadiusTopLeft,
    vectorCornerRadiusTopRight,
    vectorCornerRadiusBottomLeft,
    vectorCornerRadiusBottomRight,
    // Transform properties
    transform,
    rotation,
    scale,
    skew,
    // Enhanced vector rotation properties
    vectorRotation,
    vectorRotationCenter,
    vectorRotationAxis,
    vectorRotationMode
  } = node;
  
  // Skip hidden elements
  if (isHidden || isVisible === false) {
    return null;
  }
  
  // Get dimensions
  const width = absoluteBoundingBox?.width || 100;
  const height = absoluteBoundingBox?.height || 100;
  
  // Get fill color with enhanced vector fill support
  let fillColor = 'transparent';
  if (vectorFill?.type === 'SOLID' && vectorFill.color) {
    fillColor = rgbaToCss(vectorFill.color.r, vectorFill.color.g, vectorFill.color.b, vectorFill.color.a);
  } else if (fills?.[0]?.type === 'SOLID' && fills[0].color) {
    fillColor = rgbaToCss(fills[0].color.r, fills[0].color.g, fills[0].color.b, fills[0].color.a);
  }
  
  // Get stroke properties with enhanced vector stroke support
  let strokeColor = 'transparent';
  let strokeWidth = 0;
  let strokeCapStyle: 'inherit' | 'round' | 'butt' | 'square' = 'butt';
  let strokeJoinStyle: 'inherit' | 'round' | 'bevel' | 'miter' = 'miter';
  let strokeDashArray = 'none';
  
  if (vectorStroke) {
    strokeColor = vectorStroke.color ? 
      rgbaToCss(vectorStroke.color.r, vectorStroke.color.g, vectorStroke.color.b, vectorStroke.color.a) : 
      'transparent';
    strokeWidth = vectorStroke.weight || 0;
    strokeCapStyle = vectorStroke.cap?.toLowerCase() || 'butt';
    strokeJoinStyle = vectorStroke.join?.toLowerCase() || 'miter';
    strokeDashArray = vectorStroke.dashPattern?.join(', ') || 'none';
  } else {
    const stroke = strokes?.[0];
    strokeColor = stroke?.type === 'SOLID' && stroke.color ? 
      rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a) : 
      'transparent';
    strokeWidth = strokeWeight || stroke?.strokeWeight || 0;
    strokeCapStyle = strokeCap?.toLowerCase() || 'butt';
    strokeJoinStyle = strokeJoin?.toLowerCase() || 'miter';
    strokeDashArray = dashPattern?.join(', ') || 'none';
  }
  
  // Handle vector positioning
  let vectorXPos = vectorX || 0;
  let vectorYPos = vectorY || 0;
  
  // Handle vector alignment
  if (vectorAlign) {
    switch (vectorAlign) {
      case 'CENTER':
        vectorXPos = width / 2;
        vectorYPos = height / 2;
        break;
      case 'RIGHT':
        vectorXPos = width;
        break;
      case 'BOTTOM':
        vectorYPos = height;
        break;
    }
  }
  
  // Handle mirroring
  let mirrorTransform = '';
  if (vectorMirror) {
    if (vectorMirrorAxis === 'HORIZONTAL') {
      mirrorTransform = 'scaleX(-1) ';
    } else if (vectorMirrorAxis === 'VERTICAL') {
      mirrorTransform = 'scaleY(-1) ';
    } else if (vectorMirrorAxis === 'BOTH') {
      mirrorTransform = 'scale(-1, -1) ';
    }
    
    // Handle mirror angle and length
    if (vectorMirrorAngle !== undefined) {
      mirrorTransform += `rotate(${vectorMirrorAngle}deg) `;
    }
    
    if (vectorMirrorLength !== undefined) {
      mirrorTransform += `scale(${vectorMirrorLength}) `;
    }
  }
  
  // Handle transforms
  let transformStyle = '';
  if (transform && Array.isArray(transform)) {
    transformStyle = `matrix(${transform.join(', ')}) `;
  }
  if (rotation !== undefined && rotation !== 0) {
    transformStyle += `rotate(${rotation}deg) `;
  }
  if (scale) {
    transformStyle += `scale(${scale.x || 1}, ${scale.y || 1}) `;
  }
  if (skew !== undefined && skew !== 0) {
    transformStyle += `skew(${skew}deg) `;
  }
  
  // Combine all transforms
  const combinedTransform = `${mirrorTransform}${transformStyle}`.trim();
  
  // Create SVG paths with enhanced support
  const paths = vectorPaths || [];
  
  // Generate vector path based on type if no paths provided
  let generatedPath = '';
  if (paths.length === 0 && vectorType) {
    switch (vectorType) {
      case 'LINE':
        if (vectorPoints && vectorPoints.length >= 2) {
          const start = vectorPoints[0];
          const end = vectorPoints[1];
          generatedPath = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
        } else {
          // Default vertical line
          generatedPath = `M ${width/2} 0 L ${width/2} ${height}`;
        }
        break;
      case 'RECTANGLE':
        const cornerRadius = vectorCornerRadius || 0;
        if (cornerRadius > 0) {
          generatedPath = `M ${cornerRadius} 0 L ${width - cornerRadius} 0 Q ${width} 0 ${width} ${cornerRadius} L ${width} ${height - cornerRadius} Q ${width} ${height} ${width - cornerRadius} ${height} L ${cornerRadius} ${height} Q 0 ${height} 0 ${height - cornerRadius} L 0 ${cornerRadius} Q 0 0 ${cornerRadius} 0 Z`;
        } else {
          generatedPath = `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`;
        }
        break;
      case 'ELLIPSE':
        const rx = width / 2;
        const ry = height / 2;
        const cx = width / 2;
        const cy = height / 2;
        generatedPath = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx - rx} ${cy} Z`;
        break;
    }
  }
  
  return (
    <svg
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        mixBlendMode: blendMode?.toLowerCase().replace('_', '-') || 'normal',
        transform: combinedTransform || undefined,
      }}
    >
      {/* Render generated path if available */}
      {generatedPath && (
        <path
          d={generatedPath}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap={strokeCapStyle}
          strokeLinejoin={strokeJoinStyle}
          strokeDasharray={strokeDashArray}
          fillRule={vectorFillRule?.toLowerCase() || 'nonzero'}
        />
      )}
      
      {/* Render vector paths with enhanced winding rule support */}
      {paths.map((pathData: any, index: number) => (
        <path
          key={index}
          d={pathData.path}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap={strokeCapStyle}
          strokeLinejoin={strokeJoinStyle}
          strokeDasharray={strokeDashArray}
          fillRule={pathData.fillRule?.toLowerCase() || vectorFillRule?.toLowerCase() || 'nonzero'}
          clipRule={pathData.windingRule?.toLowerCase() || vectorWindingRule?.toLowerCase() || 'nonzero'}
        />
      ))}
    </svg>
  );
};

// Enhanced vector stroke rendering with comprehensive support
const renderVectorStroke = (node: any, baseStyles: React.CSSProperties) => {
  const { 
    name, 
    absoluteBoundingBox, 
    strokes, 
    strokeWeight, 
    transform, 
    rotation,
    // Enhanced vector properties
    vectorStroke,
    vectorType,
    vectorPoints,
    vectorMirror,
    vectorMirrorAxis,
    vectorMirrorAngle,
    vectorMirrorLength,
    vectorMirrorTransform,
    vectorX,
    vectorY,
    vectorAlign,
    vectorAnchor,
    vectorWindingRule,
    // Enhanced vector rotation properties
    vectorRotation,
    vectorRotationCenter,
    vectorRotationAxis,
    vectorRotationMode,
    scale,
    skew
  } = node;
  
  // Get stroke properties with enhanced vector stroke support
  let strokeColor = '#FF004F'; // Default red from your example
  let strokeWidth = 2;
  let strokeCapStyle: 'inherit' | 'round' | 'butt' | 'square' = 'butt';
  let strokeJoinStyle: 'inherit' | 'round' | 'bevel' | 'miter' = 'miter';
  let strokeDashArray = 'none';
  
  if (vectorStroke) {
    strokeColor = vectorStroke.color ? 
      rgbaToCss(vectorStroke.color.r, vectorStroke.color.g, vectorStroke.color.b, vectorStroke.color.a) : 
      '#FF004F';
    strokeWidth = vectorStroke.weight || 2;
    strokeCapStyle = (vectorStroke.cap?.toLowerCase() as any) || 'butt';
    strokeJoinStyle = (vectorStroke.join?.toLowerCase() as any) || 'miter';
    strokeDashArray = vectorStroke.dashPattern?.join(', ') || 'none';
  } else {
    const stroke = strokes?.[0];
    strokeColor = stroke?.type === 'SOLID' && stroke.color ? 
      rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a) : 
      '#FF004F';
    strokeWidth = strokeWeight || stroke?.strokeWeight || 2;
  }
  
  // Get dimensions
  const width = absoluteBoundingBox?.width || 100;
  const height = absoluteBoundingBox?.height || 100;
  
  // Handle vector positioning
  let vectorXPos = vectorX || 0;
  let vectorYPos = vectorY || 0;
  
  // Handle vector alignment
  if (vectorAlign) {
    switch (vectorAlign) {
      case 'CENTER':
        vectorXPos = width / 2;
        vectorYPos = height / 2;
        break;
      case 'RIGHT':
        vectorXPos = width;
        break;
      case 'BOTTOM':
        vectorYPos = height;
        break;
    }
  }
  
  // Handle mirroring
  let mirrorTransform = '';
  if (vectorMirror) {
    if (vectorMirrorAxis === 'HORIZONTAL') {
      mirrorTransform = 'scaleX(-1) ';
    } else if (vectorMirrorAxis === 'VERTICAL') {
      mirrorTransform = 'scaleY(-1) ';
    } else if (vectorMirrorAxis === 'BOTH') {
      mirrorTransform = 'scale(-1, -1) ';
    }
    
    // Handle mirror angle and length
    if (vectorMirrorAngle !== undefined) {
      mirrorTransform += `rotate(${vectorMirrorAngle}deg) `;
    }
    
    if (vectorMirrorLength !== undefined) {
      mirrorTransform += `scale(${vectorMirrorLength}) `;
    }
  }
  
  // Handle transforms
  let transformStyle = '';
  if (transform && Array.isArray(transform)) {
    transformStyle = `matrix(${transform.join(', ')}) `;
  }
  if (rotation !== undefined && rotation !== 0) {
    transformStyle += `rotate(${rotation}deg) `;
  }
  if (scale) {
    transformStyle += `scale(${scale.x || 1}, ${scale.y || 1}) `;
  }
  if (skew !== undefined && skew !== 0) {
    transformStyle += `skew(${skew}deg) `;
  }
  
  // Combine all transforms
  const combinedTransform = `${mirrorTransform}${transformStyle}`.trim();
  
    // Create SVG path for vector stroke with enhanced support
  const createVectorPath = () => {
    // Handle vector points if provided
    if (vectorPoints && vectorPoints.length >= 2) {
      const start = vectorPoints[0];
      const end = vectorPoints[1];
      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }
    
    // Handle vector type
    if (vectorType === 'LINE') {
      // For vertical lines (like your example)
      if (width < 10 && height > width * 2) {
        return `M ${width/2} 0 L ${width/2} ${height}`;
      }
      // For horizontal lines
      if (height < 10 && width > height * 2) {
        return `M 0 ${height/2} L ${width} ${height/2}`;
      }
      // For diagonal lines
      return `M 0 0 L ${width} ${height}`;
    }
    
    // Default vertical line
    return `M ${width/2} 0 L ${width/2} ${height}`;
  };
  
  const pathData = createVectorPath();
  
  return (
    <svg
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: combinedTransform || undefined,
      }}
    >
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap={strokeCapStyle}
        strokeLinejoin={strokeJoinStyle}
        strokeDasharray={strokeDashArray}
      />
    </svg>
  );
};

// Render geometric accent lines with exact positioning and styling
// Enhanced ellipse rendering with comprehensive support
const renderEllipse = (node: any, baseStyles: React.CSSProperties) => {
  const { 
    name, 
    absoluteBoundingBox, 
    fills, 
    strokes, 
    strokeWeight, 
    strokeAlign,
    effects,
    isMirrored,
    mirrorAxis,
    aspectRatio,
    blendMode,
    isVisible,
    isHidden,
    rotation,
    scale,
    skew,
    relativeTransform,
    opacity,
    // Enhanced rotation properties
    vectorRotation,
    vectorRotationCenter,
    vectorRotationAxis,
    vectorRotationMode,
    transform
  } = node;
  
  // Skip hidden elements
  if (isHidden || isVisible === false) {
    return null;
  }
  
  // Get dimensions
  const width = absoluteBoundingBox?.width || 100;
  const height = absoluteBoundingBox?.height || 100;
  
  // Get fill color with enhanced support
  let fillColor = 'transparent';
  if (fills && fills.length > 0) {
    const fill = fills[0];
    if (fill.type === 'SOLID' && fill.color) {
      fillColor = rgbaToCss(fill.color.r, fill.color.g, fill.color.b, fill.color.a);
    }
  }
  
  // Get stroke properties with enhanced support
  const stroke = strokes?.[0];
  const strokeColor = stroke?.type === 'SOLID' && stroke.color ? 
    rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a) : 
    'transparent';
  
  const strokeWidth = strokeWeight || stroke?.strokeWeight || 0;
  
  // Get enhanced stroke styles
  const strokeStyles = getEnhancedStrokeStyles(node);
  
  // Handle stroke alignment with comprehensive support
  let borderStyle = 'none';
  let outlineStyle = {};
  
  if (strokeWidth > 0) {
    if (strokeAlign === 'INSIDE') {
      borderStyle = `${strokeWidth}px solid ${strokeColor}`;
    } else if (strokeAlign === 'OUTSIDE') {
      // For outside stroke, we'll use outline
      outlineStyle = {
        outline: `${strokeWidth}px solid ${strokeColor}`,
        outlineOffset: '0px',
      };
      
      // Handle dash patterns for outline
      if (stroke?.dashPattern && stroke.dashPattern.length > 0) {
        outlineStyle = {
          ...outlineStyle,
          outlineStyle: 'dashed',
          outlineDasharray: stroke.dashPattern.join(', '),
        };
      }
    } else {
      // CENTER (default)
      borderStyle = `${strokeWidth}px solid ${strokeColor}`;
    }
    
    // Handle dash patterns for border
    if (stroke?.dashPattern && stroke.dashPattern.length > 0 && strokeAlign !== 'OUTSIDE') {
      borderStyle = `${strokeWidth}px dashed ${strokeColor}`;
    }
  }
  
  // Calculate transform style with enhanced rotation support
  const getTransformStyle = () => {
    let transformParts: string[] = [];
    
    // Handle vector-specific rotation with priority
    if (vectorRotation !== undefined && vectorRotation !== 0) {
      if (vectorRotationCenter) {
        // Rotate around specific center point
        transformParts.push(`rotate(${vectorRotation}deg ${vectorRotationCenter.x} ${vectorRotationCenter.y})`);
      } else if (vectorRotationAxis === 'CENTER') {
        // Rotate around center of the element
        const centerX = width / 2;
        const centerY = height / 2;
        transformParts.push(`rotate(${vectorRotation}deg ${centerX} ${centerY})`);
      } else {
        // Default rotation around origin
        transformParts.push(`rotate(${vectorRotation}deg)`);
      }
    } else if (rotation !== undefined && rotation !== 0) {
      // Handle general rotation
      transformParts.push(`rotate(${rotation}deg)`);
    }
    
    // Handle scale
    if (scale) {
      transformParts.push(`scale(${scale.x}, ${scale.y})`);
    }
    
    // Handle skew
    if (skew !== undefined && skew !== 0) {
      transformParts.push(`skew(${skew}deg)`);
    }
    
    // Handle matrix transform
    if (relativeTransform) {
      const matrix = relativeTransform.flat();
      transformParts.push(`matrix(${matrix.join(', ')})`);
    }
    
    // Handle transform array
    if (transform && Array.isArray(transform)) {
      transformParts.push(`matrix(${transform.join(', ')})`);
    }
    
    // Handle mirroring
    if (isMirrored) {
      if (mirrorAxis === 'HORIZONTAL') {
        transformParts.push('scaleX(-1)');
      } else if (mirrorAxis === 'VERTICAL') {
        transformParts.push('scaleY(-1)');
      } else if (mirrorAxis === 'BOTH') {
        transformParts.push('scale(-1, -1)');
      }
    }
    
    return transformParts.join(' ');
  };
  
  // Handle aspect ratio
  const aspectRatioStyle: React.CSSProperties = {};
  if (aspectRatio && aspectRatio > 0) {
    aspectRatioStyle.aspectRatio = aspectRatio.toString();
  }
  
  // Create ellipse styles
  const ellipseStyles: React.CSSProperties = {
    ...baseStyles,
    width: `${width}px`,
    height: `${height}px`,
    backgroundColor: fillColor,
    border: borderStyle,
    borderRadius: '50%', // Make it circular/elliptical
    boxSizing: 'border-box',
    mixBlendMode: blendMode?.toLowerCase().replace('_', '-') || 'normal',
    transform: getTransformStyle(),
    ...aspectRatioStyle,
    ...strokeStyles,
    ...outlineStyle,
  };
  
  return (
    <div
      style={ellipseStyles}
      title={`${name} - Ellipse (${width}×${height})`}
    />
  );
};

const renderGeometricLine = (node: any, baseStyles: React.CSSProperties) => {
  const { 
    name, 
    absoluteBoundingBox, 
    lineStart, 
    lineEnd, 
    angleDegrees, 
    geometricType, 
    transform,
    // Enhanced rotation properties
    rotation,
    vectorRotation,
    vectorRotationCenter,
    vectorRotationAxis,
    vectorRotationMode,
    scale,
    skew,
    isMirrored,
    mirrorAxis
  } = node;
  
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

  // Handle matrix transform with enhanced rotation support
  const getTransformStyle = () => {
    let transformParts: string[] = [];
    
    // Handle vector-specific rotation with priority
    if (vectorRotation !== undefined && vectorRotation !== 0) {
      if (vectorRotationCenter) {
        // Rotate around specific center point
        transformParts.push(`rotate(${vectorRotation}deg ${vectorRotationCenter.x} ${vectorRotationCenter.y})`);
      } else if (vectorRotationAxis === 'CENTER') {
        // Rotate around center of the element
        const centerX = width / 2;
        const centerY = height / 2;
        transformParts.push(`rotate(${vectorRotation}deg ${centerX} ${centerY})`);
      } else {
        // Default rotation around origin
        transformParts.push(`rotate(${vectorRotation}deg)`);
      }
    } else if (rotation !== undefined && rotation !== 0) {
      // Handle general rotation - check if it's in radians and convert to degrees
      let rotationDegrees = rotation;
      
      // If rotation is in radians (typically between -π and π), convert to degrees
      if (Math.abs(rotationDegrees) <= Math.PI) {
        rotationDegrees = (rotationDegrees * 180) / Math.PI;
      }
      
      // Use the same mapping as the main function
      rotationDegrees = getFigmaToCssRotation(rotationDegrees);
      
      // Round to 2 decimal places to avoid floating point issues
      rotationDegrees = Math.round(rotationDegrees * 100) / 100;
      
      transformParts.push(`rotate(${rotationDegrees}deg)`);
    } else if (angleDegrees) {
      // Handle angle-based rotation
      transformParts.push(`rotate(${angleDegrees}deg)`);
    }
    
    // Handle scale
    if (scale) {
      transformParts.push(`scale(${scale.x}, ${scale.y})`);
    }
    
    // Handle skew
    if (skew !== undefined && skew !== 0) {
      transformParts.push(`skew(${skew}deg)`);
    }
    
    // Handle matrix transform
    if (transform && Array.isArray(transform)) {
      transformParts.push(`matrix(${transform.join(', ')})`);
    }
    
    // Handle mirroring
    if (isMirrored) {
      if (mirrorAxis === 'HORIZONTAL') {
        transformParts.push('scaleX(-1)');
      } else if (mirrorAxis === 'VERTICAL') {
        transformParts.push('scaleY(-1)');
      } else if (mirrorAxis === 'BOTH') {
        transformParts.push('scale(-1, -1)');
      }
    }
    
    return transformParts.join(' ');
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
      // Use selection colors if available, otherwise use default debug colors
      if (node.selectionColors) {
        baseStyles.border = `1px solid ${node.selectionColors.stroke || '#3b82f6'}`;
        baseStyles.backgroundColor = node.selectionColors.background || 'rgba(59, 130, 246, 0.1)';
      } else {
        baseStyles.border = '1px solid #3b82f6';
        baseStyles.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      }
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
                {isMaskGroupNode(node) && <div className="text-purple-300">🎭 Mask Group ({getMaskGroupMode(node)})</div>}
                {node.isGroup && <div className="text-green-300">👥 Group</div>}
                {node.layoutMode && <div className="text-purple-300">📐 {node.layoutMode}</div>}
                {node.primaryAxisAlignItems && <div className="text-indigo-300">↔️ {node.primaryAxisAlignItems}</div>}
                {node.counterAxisAlignItems && <div className="text-indigo-300">↕️ {node.counterAxisAlignItems}</div>}
                {node.itemSpacing && <div className="text-cyan-300">📏 {node.itemSpacing}px</div>}
              </div>
            )}
            
            {/* Create mask element if this is a mask */}
            {isMask && createMaskElement(node, children || [], imageMap, fileKey, figmaToken, devMode)}
            
            {/* Handle mask group children */}
            {isMaskGroupNode(node) ? (
              <svg
                width={absoluteBoundingBox?.width || 100}
                height={absoluteBoundingBox?.height || 100}
                style={{ position: 'absolute', top: 0, left: 0 }}
              >
                <defs>
                  <mask id={`mask-group-${node.id}`}>
                    <rect width="100%" height="100%" fill="white" />
            {children?.map((child: any, index: number) => (
                      <g key={child.id || index} mask={getMaskGroupMode(child)}>
                        <FigmaRenderer
                          node={child}
                          showDebug={false}
                          parentBoundingBox={node.absoluteBoundingBox}
                          imageMap={imageMap}
                          parentMask={true}
                          parentMaskType={maskType}
                          fileKey={fileKey}
                          figmaToken={figmaToken}
                          devMode={false}
                        />
                      </g>
                    ))}
                  </mask>
                </defs>
                <rect 
                  width="100%" 
                  height="100%" 
                  fill="currentColor"
                  mask={`url(#mask-group-${node.id})`}
                />
              </svg>
            ) : (
              /* Regular children rendering */
              children?.map((child: any, index: number) => (
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
              ))
            )}
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
        // Enhanced rectangle rendering with comprehensive support
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
                  {node.isMirrored && <div className="text-orange-300">🪞 Mirrored ({node.mirrorAxis})</div>}
                  {node.aspectRatio && <div className="text-cyan-300">📐 Aspect: {node.aspectRatio}</div>}
                  {node.blendMode && <div className="text-pink-300">🎨 {node.blendMode}</div>}
                </div>
              )}
              
              {renderImage(node, imageUrl, baseStyles, showDebug)}
            </div>
          );
        }
        
        // Handle union operations
        if (node.isUnion || node.unionChildren) {
        return (
          <div
              style={baseStyles}
              title={`${name} (Union ${type})`}
              data-figma-node-id={node.id}
              data-figma-node-type={type}
              data-figma-node-name={name}
            >
              {showDebug && devMode && (
                <div className="absolute -top-8 left-0 bg-purple-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                  <div className="font-bold">{name}</div>
                  <div>{type} - Union ({node.booleanOperation})</div>
                  <div className="text-purple-300">🔗 {node.unionChildren?.length || 0} children</div>
                  {node.isMirrored && <div className="text-orange-300">🪞 Mirrored ({node.mirrorAxis})</div>}
                  {node.aspectRatio && <div className="text-cyan-300">📐 Aspect: {node.aspectRatio}</div>}
                </div>
              )}
              {renderUnion(node, baseStyles)}
            </div>
          );
        }
        
        // Enhanced rectangle rendering
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
                <div className="text-blue-300">📐 {node.cornerRadius ? `${node.cornerRadius}px radius` : 'sharp corners'}</div>
                {node.isMirrored && <div className="text-orange-300">🪞 Mirrored ({node.mirrorAxis})</div>}
                {node.aspectRatio && <div className="text-cyan-300">📐 Aspect: {node.aspectRatio}</div>}
                {node.blendMode && <div className="text-pink-300">🎨 {node.blendMode}</div>}
                {node.isHidden && <div className="text-red-300">👁️ Hidden</div>}
              </div>
            )}
            {renderRectangle(node, baseStyles, showDebug, devMode)}
          </div>
        );

      case 'ELLIPSE':
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
                <div className="absolute -top-8 left-0 bg-green-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                  <div className="font-bold">{name}</div>
                  <div>{type} - {baseStyles.width}×{baseStyles.height}</div>
                  <div className="text-green-300">🖼️ Image loaded</div>
                  {node.isMirrored && <div className="text-orange-300">🪞 Mirrored ({node.mirrorAxis})</div>}
                  {node.aspectRatio && <div className="text-cyan-300">📐 Aspect: {node.aspectRatio}</div>}
                </div>
              )}
              
              {renderImage(node, imageUrl, baseStyles, showDebug)}
            </div>
          );
        }
        
        // Enhanced ellipse rendering with comprehensive support
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
                <div>{type} - {baseStyles.width}×{baseStyles.height}</div>
                <div className="text-green-300">⭕ Ellipse</div>
                {node.isMirrored && <div className="text-orange-300">🪞 Mirrored ({node.mirrorAxis})</div>}
                {node.aspectRatio && <div className="text-cyan-300">📐 Aspect: {node.aspectRatio}</div>}
                {node.blendMode && <div className="text-pink-300">🎨 {node.blendMode}</div>}
                {node.isHidden && <div className="text-red-300">👁️ Hidden</div>}
                {node.rotation && <div className="text-yellow-300">🔄 {node.rotation}°</div>}
              </div>
            )}
            {renderEllipse(node, baseStyles)}
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
                <div className="absolute -top-8 left-0 bg-red-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                  <div className="font-bold">{name}</div>
                  <div>{type} - {baseStyles.width}×{baseStyles.height}</div>
                  <div className="text-red-300">🖼️ Image loaded</div>
                  {node.isMirrored && <div className="text-orange-300">🪞 Mirrored ({node.mirrorAxis})</div>}
                  {node.blendMode && <div className="text-pink-300">🎨 {node.blendMode}</div>}
                </div>
              )}
              
              {renderImage(node, imageUrl, baseStyles, showDebug)}
            </div>
          );
        }
        
        // Handle vector strokes
        if (strokes && strokes.length > 0) {
          return (
            <div
              style={baseStyles}
              title={`${name} (${type})`}
              data-figma-node-id={node.id}
              data-figma-node-type={type}
              data-figma-node-name={name}
            >
              {showDebug && devMode && (
                <div className="absolute -top-8 left-0 bg-red-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                  <div className="font-bold">{name}</div>
                  <div>{type} - Vector Stroke</div>
                  <div className="text-red-300">🎯 {node.vectorPaths?.length || 0} paths</div>
                  {node.isMirrored && <div className="text-orange-300">🪞 Mirrored ({node.mirrorAxis})</div>}
                  {node.blendMode && <div className="text-pink-300">🎨 {node.blendMode}</div>}
                </div>
              )}
              {renderVectorStroke(node, baseStyles)}
            </div>
          );
        }
        
        // Handle complex vectors with paths
        if (node.vectorPaths && node.vectorPaths.length > 0) {
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
                  <div>{type} - Complex Vector</div>
                  <div className="text-indigo-300">🎯 {node.vectorPaths.length} paths</div>
                  {node.isMirrored && <div className="text-orange-300">🪞 Mirrored ({node.mirrorAxis})</div>}
                  {node.blendMode && <div className="text-pink-300">🎨 {node.blendMode}</div>}
                </div>
              )}
              {renderVector(node, baseStyles)}
            </div>
          );
        }
        
        // Handle geometric lines
        if (node.geometricType === 'line' || node.name?.toLowerCase().includes('line')) {
          return renderGeometricLine(node, baseStyles);
        }
        
        // Default vector rendering
        return (
          <div
            style={baseStyles}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {showDebug && devMode && (
              <div className="absolute -top-8 left-0 bg-gray-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                <div className="font-bold">{name}</div>
                <div>{type} - {baseStyles.width}×{baseStyles.height}</div>
                <div className="text-gray-300">📐 Vector shape</div>
              </div>
            )}
          </div>
        );
        
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