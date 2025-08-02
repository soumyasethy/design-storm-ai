'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  rgbaToCss, 
  getFontFamilyWithFallback, 
  getCornerRadius, 
  getTextAlign, 
  getVerticalAlign, 
  isFooterComponent, 
  getImageScaleMode, 
  isNodeVisible, 
  getLineStyles 
} from '@/lib/utils';

// Utility function for RGB to Hex conversion
const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `${toHex(r)}${toHex(g)}${toHex(b)}`;
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
    
    // Fix Figma to CSS rotation mapping
    // Figma's rotation system is different from CSS - we need to invert and adjust
    rotationDegrees = -rotationDegrees; // Invert the rotation direction
    
    // Round to 2 decimal places to avoid floating point issues
    rotationDegrees = Math.round(rotationDegrees * 100) / 100;
    
    transformStyle += `rotate(${rotationDegrees}deg) `;
  }
  
  return transformStyle;
};

// Enhanced fill styles with comprehensive gradient support
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

interface SimpleFigmaRendererProps {
  node: any;
  showDebug?: boolean;
  isRoot?: boolean;
  parentBoundingBox?: { x: number; y: number; width: number; height: number };
  imageMap?: Record<string, string>;
  parentMask?: boolean;
  parentMaskType?: string;
  fileKey?: string;
  figmaToken?: string;
  devMode?: boolean;
}

// Enhanced image rendering with footer icon support
const FigmaImage: React.FC<{ 
  node: any; 
  imageUrl: string; 
  baseStyles: React.CSSProperties; 
  showDebug: boolean;
  devMode: boolean;
}> = ({ node, imageUrl, baseStyles, showDebug, devMode }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Add null check to prevent runtime errors
  if (!node || typeof node !== 'object') {
    console.warn('FigmaImage: Invalid node provided', node);
    return <div>Invalid image node</div>;
  }
  
  // Special handling for footer icons and avatars (circular)
  const isFooterIcon = isFooterComponent(node) || 
                      node.name?.toLowerCase().includes('linkedin') || 
                      node.name?.toLowerCase().includes('instagram') || 
                      node.name?.toLowerCase().includes('youtube') ||
                      node.name?.toLowerCase().includes('social');
  
  const isAvatar = node.name?.toLowerCase().includes('avatar') || 
                   node.name?.toLowerCase().includes('profile') ||
                   node.name?.toLowerCase().includes('user') ||
                   (node.absoluteBoundingBox && 
                    node.absoluteBoundingBox.width === node.absoluteBoundingBox.height);
  
  const scaleMode = getImageScaleMode(node);
  
  const imageStyles: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: scaleMode as any,
    borderRadius: (isFooterIcon || isAvatar) ? '50%' : baseStyles.borderRadius,
  };
  
  const handleImageError = () => {
    console.error(`❌ Image failed to load: ${imageUrl}`);
    setImageError(true);
    setImageLoading(false);
  };
  
  const handleImageLoad = () => {
    console.log(`✅ Image loaded successfully: ${node.name}`);
    setImageLoading(false);
  };
  
  // Use placeholder SVG for all images initially or on error
  const shouldUsePlaceholder = imageError || !imageUrl || imageUrl.includes('figma.com') === false;
  
  if (shouldUsePlaceholder) {
    return (
      <div 
        style={{
          ...imageStyles,
          backgroundImage: 'url(/placeholder.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          border: showDebug ? '1px solid #ef4444' : 'none',
          // Apply Figma's default styling as if it were a real image
          ...getFillStyles(node.fills || [], node.id, {}),
          ...getEnhancedStrokeStyles(node),
          ...getEnhancedEffectStyles(node),
        }}
      >
        {showDebug && (
          <div className="absolute -top-8 left-0 bg-red-600 text-white text-xs px-2 py-1 rounded z-20">
            <div className="font-bold">Image Placeholder</div>
            <div>{node.name}</div>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <>
      {imageLoading && (
        <div 
          style={{
            ...imageStyles,
            backgroundImage: 'url(/placeholder.svg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: '0.7',
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

// Enhanced text rendering with pixel-perfect typography
const FigmaText: React.FC<{ 
  node: any; 
  baseStyles: React.CSSProperties; 
  showDebug: boolean;
  devMode: boolean;
}> = ({ node, baseStyles, showDebug, devMode }) => {
  // Add null check to prevent runtime errors
  if (!node || typeof node !== 'object') {
    console.warn('FigmaText: Invalid node provided', node);
    return <div>Invalid text node</div>;
  }
  
  const { characters, style } = node;
  
  if (!characters) return null;
  
  const textStyles: React.CSSProperties = {
    // Font family
    fontFamily: style?.fontFamily ? getFontFamilyWithFallback(style.fontFamily) : 'inherit',
    
    // Font size
    fontSize: style?.fontSize ? `${style.fontSize}px` : 'inherit',
    
    // Font weight
    fontWeight: style?.fontWeight || 'normal',
    
    // Text alignment
    textAlign: style?.textAlignHorizontal ? getTextAlign(style.textAlignHorizontal) as any : 'left',
    
    // Line height
    lineHeight: style?.lineHeightPx ? `${style.lineHeightPx}px` : 
                style?.lineHeightPercent ? `${style.lineHeightPercent}%` : 'normal',
    
    // Letter spacing
    letterSpacing: style?.letterSpacing ? `${style.letterSpacing}px` : 'normal',
    
    // Text decoration
    textDecoration: style?.textDecoration ? style.textDecoration.toLowerCase() : 'none',
    
    // Text color from fills
    color: node.fills?.[0]?.type === 'SOLID' && node.fills[0].color ? 
           rgbaToCss(node.fills[0].color.r, node.fills[0].color.g, node.fills[0].color.b, node.fills[0].color.a) : 
           'inherit',
    
    // Text wrapping and overflow with 5% buffer for font family differences
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    
    // Ensure text fits within bounding box with 5% buffer
               maxWidth: 'calc(100% + 4px)', // Add 4px buffer for font family differences
           maxHeight: '100%',
           width: 'calc(100% + 4px)', // Ensure container is slightly wider
    
    // Debug styling
    ...(showDebug && {
      border: '1px solid #3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
    }),
  };
  
  // Enhanced rich text processing with character style overrides
  const processRichText = (text: string) => {
    // If no character style overrides, return plain text
    if (!node.characterStyleOverrides || !node.styleOverrideTable || node.characterStyleOverrides.length === 0) {
      return text;
    }

    const { characterStyleOverrides, styleOverrideTable } = node;
    const segments: Array<{ text: string; style: any; classes: string[] }> = [];
    let currentStyle = characterStyleOverrides[0] || 0;
    let currentText = '';

    // Process each character and group consecutive characters with same style
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const styleOverride = characterStyleOverrides[i] || 0;
      
      // Handle line breaks
      if (char === '\n') {
        if (currentText) {
          const styleKey = currentStyle.toString();
          const styleData = styleOverrideTable[styleKey] || style;
          segments.push({
            text: currentText,
            style: styleData,
            classes: []
          });
          currentText = '';
        }
        segments.push({
          text: '<br>',
          style: null,
          classes: []
        });
        continue;
      }

      // If style changes, create a new segment
      if (styleOverride !== currentStyle && currentText) {
        const styleKey = currentStyle.toString();
        const styleData = styleOverrideTable[styleKey] || style;
        segments.push({
          text: currentText,
          style: styleData,
          classes: []
        });
        currentText = '';
        currentStyle = styleOverride;
      }

      currentText += char;
    }

    // Add the last segment
    if (currentText) {
      const styleKey = currentStyle.toString();
      const styleData = styleOverrideTable[styleKey] || style;
      segments.push({
        text: currentText,
        style: styleData,
        classes: []
      });
    }

    // Generate HTML with inline styles
    const html = segments.map(segment => {
      if (segment.text === '<br>') {
        return '<br>';
      }
      
      if (!segment.style) {
        return segment.text;
      }

      const spanStyles: string[] = [];
      
      // Font family
      if (segment.style.fontFamily) {
        const fontFamily = getFontFamilyWithFallback(segment.style.fontFamily);
        spanStyles.push(`font-family: ${fontFamily}`);
      }
      
      // Font size
      if (segment.style.fontSize) {
        spanStyles.push(`font-size: ${segment.style.fontSize}px`);
      }
      
      // Font weight
      if (segment.style.fontWeight) {
        spanStyles.push(`font-weight: ${segment.style.fontWeight}`);
      }
      
      // Font style
      if (segment.style.fontStyle) {
        spanStyles.push(`font-style: ${segment.style.fontStyle.toLowerCase()}`);
      }
      
      // Letter spacing
      if (segment.style.letterSpacing) {
        spanStyles.push(`letter-spacing: ${segment.style.letterSpacing}px`);
      }
      
      // Line height
      if (segment.style.lineHeightPx) {
        spanStyles.push(`line-height: ${segment.style.lineHeightPx}px`);
      } else if (segment.style.lineHeightPercent) {
        spanStyles.push(`line-height: ${segment.style.lineHeightPercent}%`);
      }
      
      // Text color from fills
      if (segment.style.fills && segment.style.fills.length > 0) {
        const fill = segment.style.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
          const color = rgbaToCss(fill.color.r, fill.color.g, fill.color.b, fill.color.a);
          spanStyles.push(`color: ${color}`);
        }
      }
      
      // Text decoration
      if (segment.style.textDecoration) {
        spanStyles.push(`text-decoration: ${segment.style.textDecoration.toLowerCase()}`);
      }
      
      // Text case
      if (segment.style.textCase) {
        if (segment.style.textCase === 'UPPER') {
          spanStyles.push('text-transform: uppercase');
        } else if (segment.style.textCase === 'LOWER') {
          spanStyles.push('text-transform: lowercase');
        } else if (segment.style.textCase === 'TITLE') {
          spanStyles.push('text-transform: capitalize');
        }
      }
      
      return spanStyles.length > 0 
        ? `<span style="${spanStyles.join('; ')}">${segment.text}</span>`
        : segment.text;
    }).join('');

    return html;
  };

  // Get proper text alignment with visual design override
  let textAlignment = getTextAlign(style?.textAlignHorizontal || 'LEFT');
  
  // Smart alignment override based on design patterns
  // Main headings and content labels should be left-aligned despite JSON conflicts
  const isMainHeading = style?.fontSize && style.fontSize >= 32; // Large font size indicates heading
  const isContentLabel = style?.fontSize && style.fontSize >= 16 && style.fontSize <= 24; // Medium font size
  const hasCenterConstraint = node.constraints?.horizontal === 'CENTER';
  const hasCenterAlign = style?.textAlignHorizontal === 'CENTER';
  
  // Override CENTER alignment for headings and content labels to match visual design
  if ((isMainHeading || isContentLabel) && (hasCenterConstraint || hasCenterAlign)) {
    textAlignment = 'left';
  }
  
  const combinedStyles = {
    ...baseStyles,
    ...textStyles,
    display: 'flex',
    alignItems: getVerticalAlign(style?.textAlignVertical || 'TOP'),
    // Only use justifyContent for center alignment, let text-align handle left/right
    justifyContent: textAlignment === 'center' ? 'center' : 'flex-start',
    gap: '4px', // Add gap for inline elements
    overflow: 'hidden',
         // Add 4px buffer to container width for font family differences
     width: baseStyles.width ? `calc(${baseStyles.width} + 4px)` : 'calc(100% + 4px)',
    // Ensure text alignment is properly applied
    textAlign: textAlignment as any,
  };
  
  const processedText = processRichText(characters);
  
    return (
    <div
      style={combinedStyles}
      title={`${node.name} (${node.type})`}
      data-figma-node-id={node.id}
      data-figma-node-type={node.type}
      data-figma-node-name={node.name}
    >
      {showDebug && devMode && (
        <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
          <div className="font-bold">{node.name}</div>
          <div>{node.type} - {baseStyles.width}×{baseStyles.height}</div>
          <div className="text-xs">{characters.substring(0, 20)}{characters.length > 20 ? '...' : ''}</div>
          <div>Font: {style?.fontFamily} {style?.fontSize}px</div>
          <div>Align: {style?.textAlignHorizontal} → {textAlignment}</div>
          {textAlignment !== getTextAlign(style?.textAlignHorizontal || 'LEFT') && (
            <div className="text-yellow-300">
              ⚠️ Override: {isMainHeading ? 'Heading' : isContentLabel ? 'Content' : 'Other'} 
              (CENTER→LEFT)
            </div>
          )}
        </div>
      )}
      <span 
        className="block w-full h-full leading-none"
        style={{
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
          overflow: 'hidden',
          fontFamily: style?.fontFamily ? getFontFamilyWithFallback(style.fontFamily) : 'inherit',
          fontSize: style?.fontSize ? `${style.fontSize}px` : 'inherit',
          fontWeight: style?.fontWeight || 'normal',
          textAlign: textAlignment as any,
        }}
        dangerouslySetInnerHTML={{ __html: processedText }}
      />
      </div>
    );
};

// Enhanced shape rendering with better styling
// Enhanced appearance styles with comprehensive support (for SimpleFigmaRenderer)
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

// Enhanced stroke styles with comprehensive support (for SimpleFigmaRenderer)
// Enhanced border and stroke styles with comprehensive support for SimpleFigmaRenderer
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
    
      // Handle dash patterns for borders with enhanced support
  if (dashPattern && dashPattern.length > 0) {
    const dashArray = dashPattern.join(', ');
    if (strokeAlign === 'OUTSIDE') {
      // For outline, we need to use a different approach
      styles.outlineStyle = 'dashed';
      (styles as any).outlineDasharray = dashArray;
    } else {
      styles.borderStyle = 'dashed';
      (styles as any).borderDasharray = dashArray;
    }
  } else if (stroke.dashPattern && stroke.dashPattern.length > 0) {
    // Handle dash pattern from stroke object directly
    const dashArray = stroke.dashPattern.join(', ');
    if (strokeAlign === 'OUTSIDE') {
      styles.outlineStyle = 'dashed';
      (styles as any).outlineDasharray = dashArray;
    } else {
      styles.borderStyle = 'dashed';
      (styles as any).borderDasharray = dashArray;
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

// Utility function to detect icon-like elements
const isIconElement = (node: any): boolean => {
  const { name, absoluteBoundingBox } = node;
  const width = absoluteBoundingBox?.width || 0;
  const height = absoluteBoundingBox?.height || 0;
  
  // Check if it's a small element that could be an icon
  if (width <= 32 && height <= 32) {
    // Check name patterns that suggest icons
    if (name?.toLowerCase().includes('icon') || 
        name?.toLowerCase().includes('bullet') ||
        name?.toLowerCase().includes('dot') ||
        name?.toLowerCase().includes('pin') ||
        name?.toLowerCase().includes('marker') ||
        name?.toLowerCase().includes('symbol')) {
      return true;
    }
    
    // Check if it's a perfect square (common for icons)
    if (Math.abs(width - height) < 2) {
      return true;
    }
  }
  
  return false;
};

// Enhanced effects styles with comprehensive support (for SimpleFigmaRenderer)
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

// Detect if a node is part of a mask group (for SimpleFigmaRenderer)
const isMaskGroupNode = (node: any): boolean => {
  return node.isMaskGroup || 
         node.maskGroupId || 
         node.maskGroupParent ||
         (node.name && node.name.toLowerCase().includes('mask group'));
};

// Get mask group operation mode (for SimpleFigmaRenderer)
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

// Enhanced mask element creation with image + rectangle support for SimpleFigmaRenderer
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
      // Fallback to regular SimpleFigmaRenderer for other types
      return (
        <g key={child.id || index} mask={childMaskMode}>
          <SimpleFigmaRenderer
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

// Enhanced vector stroke rendering with comprehensive support for SimpleFigmaRenderer
const renderSimpleVectorStroke = (node: any, baseStyles: React.CSSProperties) => {
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
    skew,
    isMirrored,
    mirrorAxis
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
    
    // Enhanced dash pattern support for regular strokes
    if (stroke?.dashPattern && stroke.dashPattern.length > 0) {
      strokeDashArray = stroke.dashPattern.join(', ');
    } else if (node.dashPattern && node.dashPattern.length > 0) {
      strokeDashArray = node.dashPattern.join(', ');
    }
  }
  
  // Get dimensions
  const width = absoluteBoundingBox?.width || 100;
  const height = absoluteBoundingBox?.height || 100;
  
  // Handle vector positioning with vectorAnchor support
  let vectorXPos = vectorX || 0;
  let vectorYPos = vectorY || 0;
  
  // Handle vector anchor point
  if (vectorAnchor) {
    vectorXPos = vectorAnchor.x || 0;
    vectorYPos = vectorAnchor.y || 0;
  }
  
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
  
  // Handle mirroring with enhanced vectorMirrorTransform support
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
    
    // Handle vectorMirrorTransform matrix
    if (vectorMirrorTransform && Array.isArray(vectorMirrorTransform)) {
      const matrix = vectorMirrorTransform.flat();
      mirrorTransform += `matrix(${matrix.join(', ')}) `;
    }
  }
  
  // Handle transforms with enhanced vector rotation support
  let transformStyle = '';
  if (transform && Array.isArray(transform)) {
    transformStyle = `matrix(${transform.join(', ')}) `;
  }
  
  // Use enhanced vector rotation utility
  transformStyle += getVectorRotationTransform(
    vectorRotation,
    vectorRotationCenter,
    vectorRotationAxis,
    rotation,
    width,
    height
  );
  
  if (scale) {
    transformStyle += `scale(${scale.x || 1}, ${scale.y || 1}) `;
  }
  if (skew !== undefined && skew !== 0) {
    transformStyle += `skew(${skew}deg) `;
  }
  
  // Combine all transforms
  const combinedTransform = `${mirrorTransform}${transformStyle}`.trim();
  
  // Create SVG path for vector stroke with enhanced support for icons and dashed lines
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
    
    // Handle icon-like elements (small square elements that could be icons)
    if (width <= 24 && height <= 24) {
      // This could be an icon - create a simple geometric shape
      if (name?.toLowerCase().includes('icon') || 
          name?.toLowerCase().includes('bullet') ||
          name?.toLowerCase().includes('dot')) {
        // Create a circle for bullet points or icon dots
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2;
        return `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX + radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX - radius} ${centerY} Z`;
      }
    }
    
    // Handle decorative angled lines (pink/red lines)
    if (name?.toLowerCase().includes('decorative') || 
        name?.toLowerCase().includes('accent') || 
        strokeColor.includes('ff004f') || 
        strokeColor.includes('ff0a54')) {
      // Create angled decorative line
      const angle = 45; // 45 degree angle
      const startX = 0;
      const startY = height * 0.2;
      const endX = width * 0.8;
      const endY = height * 0.8;
      return `M ${startX} ${startY} L ${endX} ${endY}`;
    }
    
    // Handle dashed line patterns
    if (strokeDashArray !== 'none') {
      // For dashed lines, create a simple horizontal or vertical line
      if (width > height) {
        // Horizontal dashed line
        return `M 0 ${height/2} L ${width} ${height/2}`;
    } else {
        // Vertical dashed line
        return `M ${width/2} 0 L ${width/2} ${height}`;
      }
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

// Enhanced rectangle rendering with comprehensive support (for SimpleFigmaRenderer)
// Enhanced ellipse rendering with comprehensive support for SimpleFigmaRenderer
const renderSimpleEllipse = (node: any, baseStyles: React.CSSProperties) => {
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
      // Handle general rotation - check if it's in radians and convert to degrees
      let rotationDegrees = rotation;
      
      // If rotation is in radians (typically between -π and π), convert to degrees
      if (Math.abs(rotationDegrees) <= Math.PI) {
        rotationDegrees = (rotationDegrees * 180) / Math.PI;
      }
      
      // Fix Figma to CSS rotation mapping
      // Figma's rotation system is different from CSS - we need to invert and adjust
      rotationDegrees = -rotationDegrees; // Invert the rotation direction
      
      // Round to 2 decimal places to avoid floating point issues
      rotationDegrees = Math.round(rotationDegrees * 100) / 100;
      
      transformParts.push(`rotate(${rotationDegrees}deg)`);
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

const renderSimpleRectangle = (node: any, baseStyles: React.CSSProperties, showDebug: boolean = false, devMode: boolean = false) => {
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

const FigmaShape: React.FC<{ 
  node: any; 
  baseStyles: React.CSSProperties; 
  showDebug: boolean;
  devMode: boolean;
}> = ({ node, baseStyles, showDebug, devMode }) => {
  // Add null check to prevent runtime errors
  if (!node || typeof node !== 'object') {
    console.warn('FigmaShape: Invalid node provided', node);
    return <div>Invalid shape node</div>;
  }
  
  // Handle different shape types with specialized rendering
  if (node.type === 'ELLIPSE') {
    return renderSimpleEllipse(node, baseStyles);
  } else if (node.type === 'RECTANGLE') {
    return renderSimpleRectangle(node, baseStyles, showDebug, devMode);
  }
  
  // Default shape rendering for other types
  const { fills, strokes, cornerRadius, effects } = node;
  
  const shapeStyles: React.CSSProperties = {
    // Enhanced fill support with comprehensive gradient handling
    ...getFillStyles(fills || [], node.id, {}),
    
    // Enhanced border support with comprehensive stroke handling
    ...getEnhancedStrokeStyles(node),
    
    // Enhanced border radius with comprehensive support
    borderRadius: getIndividualCornerRadius(node),
    
    // Effects (shadows, etc.)
    ...(effects?.reduce((acc: any, effect: any) => {
      if (effect.visible === false) return acc;
      
      switch (effect.type) {
        case 'DROP_SHADOW':
          const offsetX = effect.offset?.x || 0;
          const offsetY = effect.offset?.y || 0;
          const radius = effect.radius || 0;
          const color = effect.color ? rgbaToCss(effect.color.r, effect.color.g, effect.color.b, effect.color.a) : 'rgba(0, 0, 0, 0.5)';
          acc.boxShadow = `${offsetX}px ${offsetY}px ${radius}px ${color}`;
          break;
        case 'INNER_SHADOW':
          const innerOffsetX = effect.offset?.x || 0;
          const innerOffsetY = effect.offset?.y || 0;
          const innerRadius = effect.radius || 0;
          const innerColor = effect.color ? rgbaToCss(effect.color.r, effect.color.g, effect.color.b, effect.color.a) : 'rgba(0, 0, 0, 0.5)';
          acc.boxShadow = `inset ${innerOffsetX}px ${innerOffsetY}px ${innerRadius}px ${innerColor}`;
          break;
        case 'BACKGROUND_BLUR':
          acc.backdropFilter = `blur(${effect.radius || 0}px)`;
          break;
      }
      return acc;
    }, {} as React.CSSProperties) || {}),
  };
  
  const combinedStyles = {
    ...baseStyles,
    ...shapeStyles,
  };

  return (
    <div 
      style={combinedStyles}
      title={`${node.name} (${node.type})`}
      data-figma-node-id={node.id}
      data-figma-node-type={node.type}
      data-figma-node-name={node.name}
    >
      {showDebug && devMode && (
        <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
          <div className="font-bold">{node.name}</div>
          <div>{node.type} - {baseStyles.width}×{baseStyles.height}</div>
          <div>Radius: {cornerRadius || 0}px</div>
          <div>Effects: {effects?.length || 0}</div>
        </div>
      )}
    </div>
  );
};

// Main SimpleFigmaRenderer component
const SimpleFigmaRenderer: React.FC<SimpleFigmaRendererProps> = ({ 
  node, 
  showDebug = false, 
  isRoot = false,
  parentBoundingBox,
  imageMap = {},
  parentMask = false,
  parentMaskType = 'ALPHA',
  fileKey,
  figmaToken,
  devMode = false
}) => {
  // Add null check to prevent runtime errors
  if (!node || typeof node !== 'object') {
    console.warn('SimpleFigmaRenderer: Invalid node provided', node);
    return <div>Invalid node</div>;
  }
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

  const { type, name, absoluteBoundingBox, children, fills, strokes, cornerRadius, characters, style, opacity, effects } = node;

  // Calculate positioning styles with comprehensive support
  const positionStyles: React.CSSProperties = {};
  
  if (absoluteBoundingBox) {
    const { x, y, width, height } = absoluteBoundingBox;
    
    if (parentBoundingBox) {
      // Calculate relative positioning for children
      positionStyles.position = 'absolute';
      positionStyles.left = `${x - parentBoundingBox.x}px`;
      positionStyles.top = `${y - parentBoundingBox.y}px`;
      positionStyles.width = `${width}px`;
      positionStyles.height = `${height}px`;
    } else {
      // Root node positioning
      positionStyles.position = 'relative';
      positionStyles.width = `${width}px`;
      positionStyles.height = `${height}px`;
    }
  }
  
  // Handle min/max dimensions
  if (node.minWidth !== undefined) {
    positionStyles.minWidth = `${node.minWidth}px`;
  }
  if (node.maxWidth !== undefined) {
    positionStyles.maxWidth = `${node.maxWidth}px`;
  }
  if (node.minHeight !== undefined) {
    positionStyles.minHeight = `${node.minHeight}px`;
  }
  if (node.maxHeight !== undefined) {
    positionStyles.maxHeight = `${node.maxHeight}px`;
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
      const centerX = absoluteBoundingBox ? absoluteBoundingBox.width / 2 : 0;
      const centerY = absoluteBoundingBox ? absoluteBoundingBox.height / 2 : 0;
      transformParts.push(`rotate(${node.vectorRotation}deg ${centerX} ${centerY})`);
    } else {
      // Default rotation around origin
      transformParts.push(`rotate(${node.vectorRotation}deg)`);
    }
  } else if (node.rotation !== undefined && node.rotation !== 0) {
    // Handle general rotation - check if it's in radians and convert to degrees
    let rotationDegrees = node.rotation;
    
    // Debug logging for rotation values
    console.log(`SimpleFigmaRenderer Rotation Debug for ${node.name}:`, {
      originalRotation: node.rotation,
      isRadians: Math.abs(node.rotation) <= Math.PI,
      type: node.type,
      id: node.id,
      absoluteBoundingBox: node.absoluteBoundingBox
    });
    
    // If rotation is in radians (typically between -π and π), convert to degrees
    if (Math.abs(rotationDegrees) <= Math.PI) {
      rotationDegrees = (rotationDegrees * 180) / Math.PI;
      console.log(`SimpleFigmaRenderer: Converted from radians: ${node.rotation} → ${rotationDegrees} degrees`);
    }
    
    // Advanced Figma to CSS rotation mapping
    // Figma uses a different coordinate system - we need to map it correctly
    let finalRotation = rotationDegrees;
    
    // Map Figma rotations to CSS rotations
    if (Math.abs(rotationDegrees - 90) < 0.1) {
      // Figma 90° should be CSS 180° (vertical)
      finalRotation = 180;
    } else if (Math.abs(rotationDegrees - (-90)) < 0.1) {
      // Figma -90° should be CSS 180° (vertical)
      finalRotation = 180;
    } else if (Math.abs(rotationDegrees - 0) < 0.1) {
      // Figma 0° should be CSS 0° (horizontal)
      finalRotation = 0;
    } else if (Math.abs(rotationDegrees - 180) < 0.1) {
      // Figma 180° should be CSS 180° (horizontal)
      finalRotation = 180;
    } else {
      // For other angles, use the same value (no inversion)
      finalRotation = rotationDegrees;
    }
    
    // Round to 2 decimal places to avoid floating point issues
    finalRotation = Math.round(finalRotation * 100) / 100;
    
    console.log(`SimpleFigmaRenderer: Final rotation (after advanced mapping): ${finalRotation} degrees`);
    
    transformParts.push(`rotate(${finalRotation}deg)`);
  }
  
  // Handle scale transforms
  if (node.scale && (node.scale.x !== 1 || node.scale.y !== 1)) {
    transformParts.push(`scale(${node.scale.x}, ${node.scale.y})`);
  }
  
  // Handle skew transforms
  if (node.skew !== undefined && node.skew !== 0) {
    transformParts.push(`skew(${node.skew}deg)`);
  }
  
  // Handle relative transform (matrix)
  if (node.relativeTransform && Array.isArray(node.relativeTransform)) {
    const matrix = node.relativeTransform.flat();
    transformParts.push(`matrix(${matrix.join(', ')})`);
  }
  
  // Handle transform array
  if (node.transform && Array.isArray(node.transform)) {
    transformParts.push(`matrix(${node.transform.join(', ')})`);
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
    positionStyles.transform = transformParts.join(' ');
    positionStyles.transformOrigin = 'center center';
  }
  
  // Handle opacity
  if (opacity !== undefined && opacity !== 1) {
    positionStyles.opacity = opacity;
  }
  
  // Handle z-index
  if (node.zIndex !== undefined) {
    positionStyles.zIndex = node.zIndex;
  }
  
  // Add debug styling with selection colors support
  if (showDebug) {
    if (node.selectionColors) {
      positionStyles.border = `1px solid ${node.selectionColors.stroke || '#3b82f6'}`;
      positionStyles.backgroundColor = node.selectionColors.background || 'rgba(59, 130, 246, 0.1)';
    } else {
      positionStyles.border = '1px solid #3b82f6';
      positionStyles.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    }
  }
  
  // Add basic mask support
  if (parentMask) {
    positionStyles.maskMode = parentMaskType === 'LUMINANCE' ? 'luminance' : 'alpha';
    (positionStyles as any).webkitMaskMode = parentMaskType === 'LUMINANCE' ? 'luminance' : 'alpha';
  }
  
  // Add overflow handling for containers
  if (type === 'FRAME' || type === 'GROUP' || type === 'CANVAS' || type === 'PAGE') {
    positionStyles.overflow = 'hidden';
  }
  
  // Handle clip content property
  if (node.clipContent === true) {
    positionStyles.overflow = 'hidden';
  }
  
  // Handle angled sections with clip-path
  if (node.name?.toLowerCase().includes('angled') || node.name?.toLowerCase().includes('section')) {
    // Create angled clip-path for section transitions
    const angle = 15; // 15 degree angle
    const clipPath = `polygon(0 0, 100% ${angle}%, 100% 100%, 0 ${100 - angle}%)`;
    positionStyles.clipPath = clipPath;
    positionStyles.transformOrigin = 'center center';
  }
  
  // Handle effects for background blur and shadows
  if (node.effects && node.effects.length > 0) {
    const effectStyles: string[] = [];
    
    node.effects.forEach((effect: any) => {
      if (effect.visible !== false) {
        switch (effect.type) {
          case 'DROP_SHADOW':
            const shadow = effect;
            const color = shadow.color ? rgbaToCss(shadow.color.r, shadow.color.g, shadow.color.b, shadow.color.a) : 'rgba(0,0,0,0.3)';
            const offsetX = shadow.offset?.x || 0;
            const offsetY = shadow.offset?.y || 0;
            const radius = shadow.radius || 0;
            effectStyles.push(`${offsetX}px ${offsetY}px ${radius}px ${color}`);
            break;
          case 'INNER_SHADOW':
            const innerShadow = effect;
            const innerColor = innerShadow.color ? rgbaToCss(innerShadow.color.r, innerShadow.color.g, innerShadow.color.b, innerShadow.color.a) : 'rgba(0,0,0,0.3)';
            const innerOffsetX = innerShadow.offset?.x || 0;
            const innerOffsetY = innerShadow.offset?.y || 0;
            const innerRadius = innerShadow.radius || 0;
            effectStyles.push(`inset ${innerOffsetX}px ${innerOffsetY}px ${innerRadius}px ${innerColor}`);
            break;
          case 'LAYER_BLUR':
            const blur = effect;
            const blurRadius = blur.radius || 0;
            effectStyles.push(`blur(${blurRadius}px)`);
            break;
          case 'BACKGROUND_BLUR':
            const bgBlur = effect;
            const bgBlurRadius = bgBlur.radius || 0;
            positionStyles.backdropFilter = `blur(${bgBlurRadius}px)`;
            break;
        }
      }
    });
    
    if (effectStyles.length > 0) {
      positionStyles.filter = effectStyles.join(' ');
    }
  }

  // Render based on node type
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
            <SimpleFigmaRenderer 
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
      // Enhanced frame background color support
      const frameStyles = { ...positionStyles };
      
      // Add background color support for frames and groups
      if (node.backgroundColor) {
        frameStyles.backgroundColor = rgbaToCss(
          node.backgroundColor.r, 
          node.backgroundColor.g, 
          node.backgroundColor.b, 
          node.backgroundColor.a
        );
      } else if (node.fills && node.fills.length > 0) {
        // Use fills for background if no specific backgroundColor
        const backgroundFill = node.fills.find((fill: any) => fill.type === 'SOLID');
        if (backgroundFill && backgroundFill.color) {
          frameStyles.backgroundColor = rgbaToCss(
            backgroundFill.color.r,
            backgroundFill.color.g,
            backgroundFill.color.b,
            backgroundFill.color.a
          );
        }
      }
      
      return (
        <div
          className="relative"
          style={frameStyles}
          title={`${name} (${type})`}
          data-figma-node-id={node.id}
          data-figma-node-type={type}
          data-figma-node-name={name}
        >
                                    {showDebug && devMode && (
                <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                  <div className="font-bold">{name}</div>
                  <div>{type} - {positionStyles.width}×{positionStyles.height}</div>
                  {node.isMask && <div className="text-yellow-300">🔒 Mask</div>}
                  {isMaskGroupNode(node) && <div className="text-purple-300">🎭 Mask Group ({getMaskGroupMode(node)})</div>}
                  {node.isGroup && <div className="text-green-300">👥 Group</div>}
                  {node.layoutMode && <div className="text-purple-300">📐 {node.layoutMode}</div>}
                  {node.primaryAxisAlignItems && <div className="text-indigo-300">↔️ {node.primaryAxisAlignItems}</div>}
                  {node.counterAxisAlignItems && <div className="text-indigo-300">↕️ {node.counterAxisAlignItems}</div>}
                  {node.itemSpacing && <div className="text-cyan-300">📏 {node.itemSpacing}px</div>}
                  {(node.backgroundColor || (node.fills && node.fills.some((fill: any) => fill.type === 'SOLID'))) && 
                    <div className="text-orange-300">🎨 Background color</div>}
        </div>
              )}
          
          {/* Handle mask group children with enhanced image + rectangle support */}
          {isMaskGroupNode(node) ? (
            <svg
              width={absoluteBoundingBox?.width || 100}
              height={absoluteBoundingBox?.height || 100}
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0,
                borderRadius: `${Math.min(absoluteBoundingBox?.width || 100, absoluteBoundingBox?.height || 100) / 2}px`,
                zIndex: 1
              }}
            >
              <defs>
                <mask id={`mask-group-${node.id}`}>
                  <rect width="100%" height="100%" fill="white" />
                  {children?.map((child: any, index: number) => {
                    const childMaskMode = getMaskGroupMode(child);
                    
                    // Handle mask child (ELLIPSE with isMask: true)
                    if (child.isMask && child.type === 'ELLIPSE') {
                      const { x = 0, y = 0, width: childWidth = 100, height: childHeight = 100 } = 
                        child.absoluteBoundingBox || {};
                      
                      return (
                        <g key={child.id || index} mask="normal">
                          <ellipse
                            cx={x - (absoluteBoundingBox?.x || 0) + childWidth / 2}
                            cy={y - (absoluteBoundingBox?.y || 0) + childHeight / 2}
                            rx={childWidth / 2}
                            ry={childHeight / 2}
                            fill="white"
                          />
                        </g>
                      );
                    }
                    
                    // Handle content child (RECTANGLE with image)
                    if (child.type === 'RECTANGLE' && child.fills?.some((fill: any) => fill.type === 'IMAGE')) {
                      const { x = 0, y = 0, width: childWidth = 100, height: childHeight = 100 } = 
                        child.absoluteBoundingBox || {};
                      
                      return (
                        <g key={child.id || index} mask="normal">
                          <rect 
                            x={x - (absoluteBoundingBox?.x || 0)}
                            y={y - (absoluteBoundingBox?.y || 0)}
                            width={childWidth}
                            height={childHeight}
                            fill="black"
                            rx={child.cornerRadius || 0}
                            ry={child.cornerRadius || 0}
                          />
                        </g>
                      );
                    }
                    
                    // Handle other child types
                    if (child.type === 'RECTANGLE') {
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
                            x={x - (absoluteBoundingBox?.x || 0)}
                            y={y - (absoluteBoundingBox?.y || 0)}
                            width={childWidth}
                            height={childHeight}
                            fill={fillColor}
                            rx={borderRadius !== '0px' ? parseFloat(borderRadius) : 0}
                            ry={borderRadius !== '0px' ? parseFloat(borderRadius) : 0}
                          />
                        </g>
                      );
                    } else if (child.type === 'ELLIPSE') {
                      const fill = child.fills?.[0];
                      const fillColor = fill?.type === 'SOLID' && fill.color ? 
                        rgbaToCss(fill.color.r, fill.color.g, fill.color.b, fill.color.a) : 
                        'black';
                      
                      const { x = 0, y = 0, width: childWidth = 100, height: childHeight = 100 } = 
                        child.absoluteBoundingBox || {};
                      
                      return (
                        <g key={child.id || index} mask={childMaskMode}>
                          <ellipse
                            cx={x - (absoluteBoundingBox?.x || 0) + childWidth / 2}
                            cy={y - (absoluteBoundingBox?.y || 0) + childHeight / 2}
                            rx={childWidth / 2}
                            ry={childHeight / 2}
                            fill={fillColor}
                          />
                        </g>
                      );
                    } else {
                      // Fallback to regular SimpleFigmaRenderer for other types
                      return (
                        <g key={child.id || index} mask={childMaskMode}>
                          <SimpleFigmaRenderer
                            node={child}
                            showDebug={false}
                            parentBoundingBox={node.absoluteBoundingBox}
                            imageMap={imageMap}
                            parentMask={true}
                            parentMaskType={node.maskType || 'ALPHA'}
                            fileKey={fileKey}
                            figmaToken={figmaToken}
                            devMode={false}
                          />
                        </g>
                      );
                    }
                  })}
                </mask>
              </defs>
              {/* Render the actual content with mask applied */}
              {children?.map((child: any, index: number) => {
                // Find the content child (not the mask child)
                if (!child.isMask && child.type === 'RECTANGLE' && child.fills?.some((fill: any) => fill.type === 'IMAGE')) {
                  const imageFill = child.fills?.find((fill: any) => fill.type === 'IMAGE');
                  const imageUrl = imageFill?.imageUrl || imageMap[child.id];
                  
                                     if (imageUrl) {
                     return (
                       <image
                         key={child.id || index}
                         href={imageUrl}
                         x="0"
                         y="0"
                         width="100%"
                         height="100%"
                         preserveAspectRatio="xMidYMid slice"
                         mask={`url(#mask-group-${node.id})`}
                         style={{
                           zIndex: 1,
                           position: 'relative'
                         }}
                       />
                     );
                                     } else {
                     // Use placeholder if no image URL
                     return (
                       <image
                         key={child.id || index}
                         href="/placeholder.svg"
                         x="0"
                         y="0"
                         width="100%"
                         height="100%"
                         preserveAspectRatio="xMidYMid slice"
                         mask={`url(#mask-group-${node.id})`}
                         style={{
                           zIndex: 1,
                           position: 'relative'
                         }}
                       />
                     );
                   }
                }
                return null;
              })}
              
              {/* Fallback if no content child found */}
              {!children?.some((child: any) => !child.isMask && child.type === 'RECTANGLE' && child.fills?.some((fill: any) => fill.type === 'IMAGE')) && (
                <rect 
                  width="100%" 
                  height="100%" 
                  fill="black"
                  mask={`url(#mask-group-${node.id})`}
                />
              )}
            </svg>
          ) : (
            /* Regular children rendering */
            children?.map((child: any, index: number) => (
              <SimpleFigmaRenderer
                key={child.id || index}
                node={child}
                showDebug={showDebug}
                parentBoundingBox={node.absoluteBoundingBox}
                imageMap={imageMap}
                parentMask={node.isMask}
                parentMaskType={node.maskType || 'ALPHA'}
                fileKey={fileKey}
                figmaToken={figmaToken}
                devMode={devMode}
              />
            ))
      )}
    </div>
  );

    case 'TEXT':
      return <FigmaText node={node} baseStyles={positionStyles} showDebug={showDebug} devMode={devMode} />;

    case 'RECTANGLE':
    case 'ELLIPSE':
    case 'VECTOR':
      // Handle image fills
      if (imageUrl) {
        return (
          <div
            style={positionStyles}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {showDebug && devMode && (
              <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                <div className="font-bold">{name}</div>
                <div>{type} - {positionStyles.width}×{positionStyles.height}</div>
                <div className="text-green-300">🖼️ Image loaded</div>
              </div>
            )}
            
            <FigmaImage node={node} imageUrl={imageUrl} baseStyles={positionStyles} showDebug={showDebug} devMode={devMode} />
          </div>
        );
      }
      
      // Handle nodes that should be images but don't have imageUrl (show placeholder)
      if (node.fills?.some((fill: any) => fill.type === 'IMAGE') || 
          node.name?.toLowerCase().includes('image') ||
          node.name?.toLowerCase().includes('photo') ||
          node.name?.toLowerCase().includes('picture') ||
          node.name?.toLowerCase().includes('img')) {
        return (
          <div
            style={positionStyles}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {showDebug && devMode && (
              <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                <div className="font-bold">{name}</div>
                <div>{type} - {positionStyles.width}×{positionStyles.height}</div>
                <div className="text-yellow-300">🖼️ Placeholder</div>
              </div>
            )}
            
            <div 
              style={{
                width: '100%',
                height: '100%',
                backgroundImage: 'url(/placeholder.svg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                borderRadius: positionStyles.borderRadius,
                // Apply Figma's default styling as if it were a real image
                ...getFillStyles(node.fills || [], node.id, imageMap),
                ...getEnhancedStrokeStyles(node),
                ...getEnhancedEffectStyles(node),
              }}
            />
          </div>
        );
      }
      
      // Handle regular shapes
      return <FigmaShape node={node} baseStyles={positionStyles} showDebug={showDebug} devMode={devMode} />;

    case 'LINE':
    case 'VECTOR':
      // Handle lines and vectors with proper stroke rendering
    return (
        <div
          style={positionStyles}
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
              {isIconElement(node) && <div className="text-yellow-300">🎯 Icon detected</div>}
              {(node.strokes?.[0]?.dashPattern || node.dashPattern) && <div className="text-blue-300">〰️ Dashed line</div>}
            </div>
          )}
          
          {renderSimpleVectorStroke(node, positionStyles)}
      </div>
    );

    case 'INSTANCE':
    case 'COMPONENT':
  return (
    <div 
          style={positionStyles}
          title={`${name} (${type})`}
      data-figma-node-id={node.id}
          data-figma-node-type={type}
          data-figma-node-name={name}
        >
          {showDebug && devMode && (
            <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
              <div className="font-bold">{name}</div>
              <div>{type} - {positionStyles.width}×{positionStyles.height}</div>
              <div className="text-purple-300">🔧 Component</div>
            </div>
          )}
          
          {children?.map((child: any, index: number) => (
            <SimpleFigmaRenderer 
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

    default:
      // Handle any other node types
      if (absoluteBoundingBox) {
        return (
          <div
            style={positionStyles}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {showDebug && devMode && (
              <div className="absolute -top-8 left-1 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                <div className="font-bold">{name}</div>
                <div>{type} - {positionStyles.width}×{positionStyles.height}</div>
                <div className="text-gray-300">❓ Unknown type</div>
        </div>
      )}
            
            {children?.map((child: any, index: number) => (
              <SimpleFigmaRenderer
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
      }
      
      // Handle nodes without bounding box but with children
      if (children && children.length > 0) {
        return (
          <>
            {children.map((child: any, index: number) => (
              <SimpleFigmaRenderer
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

export default SimpleFigmaRenderer; 