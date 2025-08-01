// ===== FIGMA OPTIMIZATION ENGINE =====
// Centralized optimization utilities for Figma rendering

import React from 'react';

// 1. TEXT VISIBILITY AUTO-FIX SYSTEM
export const calculateContrastRatio = (color1: string, color2: string): number => {
  const getLuminance = (color: string): number => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const [rs, gs, bs] = [r, g, b].map(c => {
      if (c <= 0.03928) return c / 12.92;
      return Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

export const getOptimalTextColor = (backgroundColor: string): string => {
  // Convert RGBA to hex for contrast calculation
  const rgbaMatch = backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch;
    const hex = `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
    
    const whiteContrast = calculateContrastRatio(hex, '#ffffff');
    const blackContrast = calculateContrastRatio(hex, '#000000');
    
    return whiteContrast > blackContrast ? '#ffffff' : '#000000';
  }
  
  // Fallback based on brightness
  const brightness = parseInt(backgroundColor.replace(/[^\d]/g, '')) || 0;
  return brightness > 128 ? '#000000' : '#ffffff';
};

export const generateTextShadow = (backgroundColor: string): string => {
  const isLight = backgroundColor.includes('255') || backgroundColor.includes('white') || backgroundColor.includes('light');
  return isLight ? '0 1px 2px rgba(0,0,0,0.8)' : '0 1px 2px rgba(255,255,255,0.8)';
};

// 2. LINES/BORDERS SMART DETECTION
export const convertStrokeToCSS = (stroke: any): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  if (stroke.type === 'SOLID' && stroke.color) {
    const { r, g, b, a = 1 } = stroke.color;
    const color = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
    const width = stroke.strokeWeight || 1;
    
    styles.border = `${width}px solid ${color}`;
    
    // Add responsive scaling
    if (width > 2) {
      styles.borderWidth = `${Math.max(1, width * 0.5)}px`;
    }
  }
  
  return styles;
};

// 3. BACKGROUND IMAGES DYNAMIC LOADING
export const extractImageUrl = (fills: any[], nodeId: string, imageMap: Record<string, string>): string | null => {
  const imageFill = fills?.find(fill => fill.type === 'IMAGE');
  
  if (imageFill) {
    // Priority: imageMap > imageUrl > imageRef
    return imageMap[nodeId] || imageFill.imageUrl || imageFill.imageRef || null;
  }
  
  return null;
};

export const getBackgroundStyles = (fills: any[], nodeId: string, imageMap: Record<string, string>): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  if (!fills || fills.length === 0) return styles;
  
  const fill = fills[0];
  
  if (fill.type === 'SOLID' && fill.color) {
    const { r, g, b, a = 1 } = fill.color;
    styles.backgroundColor = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  } else if (fill.type === 'IMAGE') {
    const imageUrl = extractImageUrl(fills, nodeId, imageMap);
    if (imageUrl) {
      styles.backgroundImage = `url('${imageUrl}')`;
      styles.backgroundSize = 'cover';
      styles.backgroundPosition = 'center';
      styles.backgroundRepeat = 'no-repeat';
      
      // Add fallback background color
      const fallbackColor = fill.color ? 
        `rgba(${Math.round(fill.color.r * 255)}, ${Math.round(fill.color.g * 255)}, ${Math.round(fill.color.b * 255)}, ${fill.color.a || 1})` :
        'rgba(0,0,0,0.1)';
      styles.backgroundColor = fallbackColor;
    }
  } else if (fill.type === 'GRADIENT_LINEAR') {
    if (fill.gradientStops && fill.gradientStops.length > 0) {
      const stops = fill.gradientStops.map((stop: any) => 
        `${rgbaToCss(stop.color.r, stop.color.g, stop.color.b, stop.color.a)} ${stop.position * 100}%`
      ).join(', ');
      styles.background = `linear-gradient(to bottom, ${stops})`;
    }
  }
  
  return styles;
};

// 4. LAYOUT PRECISION ENGINE
export const convertToResponsiveUnits = (value: number, containerWidth: number): string => {
  // Convert Figma pixels to responsive units
  const remValue = value / 16; // Base font size
  const vwValue = (value / containerWidth) * 100;
  
  if (value < 16) return `${value}px`; // Small values stay as pixels
  if (vwValue < 5) return `${remValue.toFixed(2)}rem`; // Use rem for medium values
  return `${vwValue.toFixed(2)}vw`; // Use vw for large values
};

export const detectLayoutType = (children: any[]): 'grid' | 'flex' | 'absolute' => {
  if (!children || children.length === 0) return 'absolute';
  
  // Check if children are arranged in a grid pattern
  const positions = children.map(child => child.absoluteBoundingBox).filter(Boolean);
  if (positions.length < 2) return 'absolute';
  
  // Simple grid detection based on alignment
  const xPositions = positions.map(p => p.x);
  const yPositions = positions.map(p => p.y);
  const xVariance = Math.max(...xPositions) - Math.min(...xPositions);
  const yVariance = Math.max(...yPositions) - Math.min(...yPositions);
  
  if (xVariance > yVariance * 2) return 'flex'; // Horizontal layout
  if (yVariance > xVariance * 2) return 'flex'; // Vertical layout
  
  return 'grid'; // Grid layout
};

// 5. COLOR ACCURACY SYSTEM
export const extractExactColor = (color: any): string => {
  if (!color) return 'transparent';
  
  const { r, g, b, a = 1 } = color;
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
};

export const generateHoverState = (color: string): string => {
  // Generate a slightly darker/lighter version for hover
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    const [, r, g, b, a = '1'] = rgbaMatch;
    const factor = 0.9; // Darken by 10%
    const newR = Math.max(0, Math.min(255, Math.round(parseInt(r) * factor)));
    const newG = Math.max(0, Math.min(255, Math.round(parseInt(g) * factor)));
    const newB = Math.max(0, Math.min(255, Math.round(parseInt(b) * factor)));
    return `rgba(${newR}, ${newG}, ${newB}, ${a})`;
  }
  return color;
};

// Helper functions
export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const rgbaToCss = (r: number, g: number, b: number, a: number = 1): string => {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
};

export const getCornerRadius = (radius: number): string => {
  if (radius === 0) return '0';
  if (radius >= 50) return '50%';
  return `${radius}px`;
};

export const getFontFamily = (family: string): string => {
  if (!family) return 'inherit';
  
  const fontMap: Record<string, string> = {
    'Inter': 'Inter, system-ui, sans-serif',
    'Roboto': 'Roboto, system-ui, sans-serif',
    'Open Sans': 'Open Sans, system-ui, sans-serif',
    'Lato': 'Lato, system-ui, sans-serif',
    'Poppins': 'Poppins, system-ui, sans-serif',
    'Montserrat': 'Montserrat, system-ui, sans-serif',
    'Source Sans Pro': 'Source Sans Pro, system-ui, sans-serif',
    'Raleway': 'Raleway, system-ui, sans-serif',
    'Ubuntu': 'Ubuntu, system-ui, sans-serif',
    'Nunito': 'Nunito, system-ui, sans-serif',
  };
  
  return fontMap[family] || `${family}, system-ui, sans-serif`;
};

export const getTextAlign = (align: string): string => {
  switch (align) {
    case 'CENTER': return 'center';
    case 'RIGHT': return 'right';
    case 'JUSTIFIED': return 'justify';
    default: return 'left';
  }
};

export const getVerticalAlign = (align: string): string => {
  switch (align) {
    case 'CENTER': return 'center';
    case 'BOTTOM': return 'flex-end';
    default: return 'flex-start';
  }
};

// 6. COMPREHENSIVE STYLE EXTRACTION WITH OPTIMIZATION
export const extractNodeStyles = (node: any, parentBoundingBox?: { x: number; y: number; width: number; height: number }): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  // Handle absoluteBoundingBox positioning with responsive units
  if (node.absoluteBoundingBox) {
    const { x, y, width, height } = node.absoluteBoundingBox;
    
    if (parentBoundingBox) {
      // Calculate relative positioning for children
      styles.position = 'absolute';
      styles.left = convertToResponsiveUnits(x - parentBoundingBox.x, parentBoundingBox.width);
      styles.top = convertToResponsiveUnits(y - parentBoundingBox.y, parentBoundingBox.height);
      styles.width = convertToResponsiveUnits(width, parentBoundingBox.width);
      styles.height = convertToResponsiveUnits(height, parentBoundingBox.height);
    } else {
      // Root node positioning
      styles.position = 'relative';
      styles.width = convertToResponsiveUnits(width, 1200); // Default container width
      styles.height = convertToResponsiveUnits(height, 800); // Default container height
    }
  }
  
  // Handle fills with dynamic background loading
  if (node.fills && node.fills.length > 0) {
    Object.assign(styles, getBackgroundStyles(node.fills, node.id, {}));
  }
  
  // Handle strokes with smart detection
  if (node.strokes && node.strokes.length > 0) {
    Object.assign(styles, convertStrokeToCSS(node.strokes[0]));
  }
  
  // Handle corner radius
  if (node.cornerRadius) {
    styles.borderRadius = getCornerRadius(node.cornerRadius);
  }
  
  // Handle opacity
  if (node.opacity !== undefined && node.opacity !== 1) {
    styles.opacity = node.opacity;
  }
  
  // Handle rotation
  if (node.rotation !== undefined && node.rotation !== 0) {
    styles.transform = `rotate(${node.rotation}rad)`;
  }
  
  // Handle effects (shadows, etc.)
  if (node.effects && node.effects.length > 0) {
    const shadow = node.effects.find((effect: any) => effect.type === 'DROP_SHADOW' && effect.visible !== false);
    if (shadow) {
      styles.boxShadow = `${shadow.offset?.x || 0}px ${shadow.offset?.y || 0}px ${shadow.radius || 0}px ${rgbaToCss(shadow.color?.r || 0, shadow.color?.g || 0, shadow.color?.b || 0, shadow.color?.a || 0.5)}`;
    }
  }
  
  // Handle background blur
  const blurEffect = node.effects?.find((effect: any) => effect.type === 'BACKGROUND_BLUR' && effect.visible !== false);
  if (blurEffect) {
    styles.backdropFilter = `blur(${blurEffect.radius || 0}px)`;
  }
  
  return styles;
};

// 7. TEXT STYLING EXTRACTION WITH VISIBILITY OPTIMIZATION
export const extractTextStyles = (node: any): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  if (node.style) {
    // Font family with fallbacks
    if (node.style.fontFamily) {
      styles.fontFamily = getFontFamily(node.style.fontFamily);
    }
    
    // Font size with responsive scaling
    if (node.style.fontSize) {
      styles.fontSize = convertToResponsiveUnits(node.style.fontSize, 1200);
    }
    
    // Font weight
    if (node.style.fontWeight) {
      styles.fontWeight = node.style.fontWeight;
    }
    
    // Text alignment
    if (node.style.textAlignHorizontal) {
      styles.textAlign = getTextAlign(node.style.textAlignHorizontal) as any;
    }
    
    // Line height
    if (node.style.lineHeightPx) {
      styles.lineHeight = `${node.style.lineHeightPx}px`;
    } else if (node.style.lineHeightPercent) {
      styles.lineHeight = `${node.style.lineHeightPercent}%`;
    }
    
    // Letter spacing
    if (node.style.letterSpacing) {
      styles.letterSpacing = `${node.style.letterSpacing}px`;
    }
  }
  
  // Handle text fills with contrast optimization
  if (node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID' && fill.color) {
      const textColor = extractExactColor(fill.color);
      styles.color = textColor;
      
      // Auto-apply contrast optimization if needed
      const backgroundColor = node.parent?.fills?.[0]?.color ? extractExactColor(node.parent.fills[0].color) : '#ffffff';
      const contrastRatio = calculateContrastRatio(textColor, backgroundColor);
      
      if (contrastRatio < 4.5) { // WCAG AA standard
        styles.color = getOptimalTextColor(backgroundColor);
        styles.textShadow = generateTextShadow(backgroundColor);
      }
    }
  }
  
  // Handle text decoration (underline, etc.)
  if (node.style?.textDecoration) {
    styles.textDecoration = node.style.textDecoration.toLowerCase();
  }
  
  // Text wrapping properties
  styles.whiteSpace = 'pre-wrap';
  styles.overflowWrap = 'break-word';
  
  return styles;
};

// 8. LAYOUT CALCULATION UTILITIES
export const extractAllCoordinates = (node: any): Array<{x: number, y: number, width: number, height: number}> => {
  const coordinates: Array<{x: number; y: number; width: number; height: number}> = [];
  
  if (node.absoluteBoundingBox) {
    coordinates.push(node.absoluteBoundingBox);
  }
  
  if (node.children) {
    node.children.forEach((child: any) => {
      coordinates.push(...extractAllCoordinates(child));
    });
  }
  
  return coordinates;
};

export const calculateLayout = (node: any): { offset: { x: number; y: number }; scale: number; containerSize: { width: number; height: number } } => {
  const coordinates = extractAllCoordinates(node);
  if (coordinates.length === 0) return { offset: { x: 0, y: 0 }, scale: 1, containerSize: { width: 0, height: 0 } };
  
  const minX = Math.min(...coordinates.map(c => c.x));
  const minY = Math.min(...coordinates.map(c => c.y));
  const maxX = Math.max(...coordinates.map(c => c.x + c.width));
  const maxY = Math.max(...coordinates.map(c => c.y + c.height));
  
  // Normalize frame origin to (0,0)
  const offset = { x: minX, y: minY };
  const containerWidth = maxX - minX;
  const containerHeight = maxY - minY;
  
  // Calculate responsive scale
  const maxContainerWidth = 1200;
  const scale = Math.min(1, maxContainerWidth / containerWidth);
  
  return { offset, scale, containerSize: { width: containerWidth, height: containerHeight } };
};

// 9. AUTO-FIX APPLICATOR
export const applyAutoFixes = (node: any, baseStyles: React.CSSProperties): React.CSSProperties => {
  const optimizedStyles = { ...baseStyles };
  
  // Apply text visibility fixes
  if (node.type === 'TEXT' && node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID' && fill.color) {
      const textColor = extractExactColor(fill.color);
      const backgroundColor = node.parent?.fills?.[0]?.color ? extractExactColor(node.parent.fills[0].color) : '#ffffff';
      const contrastRatio = calculateContrastRatio(textColor, backgroundColor);
      
      if (contrastRatio < 4.5) {
        optimizedStyles.color = getOptimalTextColor(backgroundColor);
        optimizedStyles.textShadow = generateTextShadow(backgroundColor);
      }
    }
  }
  
  // Apply responsive unit conversion
  if (optimizedStyles.width && typeof optimizedStyles.width === 'string' && optimizedStyles.width.includes('px')) {
    const widthValue = parseInt(optimizedStyles.width);
    optimizedStyles.width = convertToResponsiveUnits(widthValue, 1200);
  }
  
  if (optimizedStyles.height && typeof optimizedStyles.height === 'string' && optimizedStyles.height.includes('px')) {
    const heightValue = parseInt(optimizedStyles.height);
    optimizedStyles.height = convertToResponsiveUnits(heightValue, 800);
  }
  
  return optimizedStyles;
};

// 10. INTELLIGENT FIXES ENGINE
export const applyIntelligentFixes = (node: any): React.CSSProperties => {
  const fixes: React.CSSProperties = {};
  
  // IF TEXT NOT VISIBLE
  if (node.type === 'TEXT') {
    const backgroundColor = node.parent?.fills?.[0]?.color ? extractExactColor(node.parent.fills[0].color) : '#ffffff';
    fixes.color = 'var(--dynamic-contrast-color)';
    fixes.textShadow = 'var(--auto-shadow-for-readability)';
    
    // Set CSS custom properties
    const isLight = backgroundColor.includes('255') || backgroundColor.includes('white');
    fixes['--dynamic-contrast-color'] = isLight ? '#000000' : '#ffffff';
    fixes['--auto-shadow-for-readability'] = isLight ? '0 1px 2px rgba(0,0,0,0.8)' : '0 1px 2px rgba(255,255,255,0.8)';
  }
  
  return fixes;
}; 