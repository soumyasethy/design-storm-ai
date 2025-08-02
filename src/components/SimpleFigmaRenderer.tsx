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
  
  // Special handling for footer icons (circular)
  const isFooterIcon = isFooterComponent(node) || 
                      node.name?.toLowerCase().includes('linkedin') || 
                      node.name?.toLowerCase().includes('instagram') || 
                      node.name?.toLowerCase().includes('youtube') ||
                      node.name?.toLowerCase().includes('social');
  
  const scaleMode = getImageScaleMode(node);
  
  const imageStyles: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: scaleMode as any,
    borderRadius: isFooterIcon ? '50%' : baseStyles.borderRadius,
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
  
  if (imageError) {
    return (
      <div 
        style={{
          ...imageStyles,
          backgroundColor: '#f3f4f6',
          backgroundImage: 'url(/placeholder.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
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
    
    // Text wrapping
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
  };
  
  // Enhanced rich text processing
  const processRichText = (text: string) => {
    // Handle special text patterns for rich formatting
    if (text.includes('All-In.')) {
      return text.replace(
        /All-In\./g, 
        '<span style="color: #FF0A54; font-weight: 700;">All-In.</span>'
      );
    }
    
    if (text.includes('Explore →')) {
      return text.replace(
        /Explore →/g,
        '<span style="color: #0066FF; text-decoration: underline; cursor: pointer; display: inline-flex; align-items: center; gap: 2px;">Explore <span style="font-size: 0.9em;">→</span></span>'
      );
    }
    
    // Handle bold text patterns for emphasis
    if (text.includes('largest') || text.includes('futuristic') || text.includes('vertically integrated')) {
      return text
        .replace(/(largest)/g, '<span style="font-weight: 700;">$1</span>')
        .replace(/(futuristic)/g, '<span style="font-weight: 700;">$1</span>')
        .replace(/(vertically integrated)/g, '<span style="font-weight: 700;">$1</span>');
    }
    
    // Handle "Learn More →" buttons with proper spacing
    if (text.includes('Learn More →')) {
      return text.replace(
        /Learn More →/g,
        '<span style="color: #0066FF; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">Learn More <span style="font-size: 0.9em; margin-left: 2px;">→</span></span>'
      );
    }
    
    return text;
  };

  const combinedStyles = {
    ...baseStyles,
    ...textStyles,
    display: 'flex',
    alignItems: getVerticalAlign(style?.textAlignVertical || 'TOP'),
    justifyContent: getTextAlign(style?.textAlignHorizontal || 'LEFT') === 'center' ? 'center' : 
                  getTextAlign(style?.textAlignHorizontal || 'LEFT') === 'right' ? 'flex-end' : 'flex-start',
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
        </div>
      )}
      <span 
        className="block w-full h-full leading-none whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: processedText }}
      />
      </div>
    );
};

// Enhanced appearance styles for SimpleFigmaRenderer
const getSimpleAppearanceStyles = (node: any): React.CSSProperties => {
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
    styles.borderRadius = `${node.cornerRadius}px`;
  }
  
  // Handle blend modes
  if (node.blendMode) {
    styles.mixBlendMode = node.blendMode.toLowerCase().replace('_', '-');
  }
  
  return styles;
};

// Enhanced stroke styles for SimpleFigmaRenderer
const getSimpleStrokeStyles = (node: any): React.CSSProperties => {
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
    
    // Handle dash patterns
    if (stroke.dashPattern && stroke.dashPattern.length > 0) {
      styles.borderStyle = 'dashed';
      (styles as any).borderDasharray = stroke.dashPattern.join(', ');
    }
  }
  
  return styles;
};

// Enhanced effects styles for SimpleFigmaRenderer
const getSimpleEffectStyles = (node: any): React.CSSProperties => {
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
        const innerShadow = `inset ${effect.offset?.x || 0}px ${effect.offset?.y || 0}px ${effect.radius || 0}px ${effect.color ? rgbaToCss(effect.color.r, effect.color.g, effect.color.b, effect.color.a) : 'rgba(0,0,0,0.3)'}`;
        styles.boxShadow = styles.boxShadow ? `${styles.boxShadow}, ${innerShadow}` : innerShadow;
        break;
        
      case 'LAYER_BLUR':
        const blur = `blur(${effect.radius || 0}px)`;
        styles.filter = styles.filter ? `${styles.filter} ${blur}` : blur;
        break;
        
      case 'BACKGROUND_BLUR':
        styles.backdropFilter = `blur(${effect.radius || 0}px)`;
        break;
    }
  });
  
  return styles;
};

// Arrow rendering utilities for SimpleFigmaRenderer
const createSimpleArrowPath = (
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

// Render simple arrow for SimpleFigmaRenderer
const renderSimpleArrow = (node: any, baseStyles: React.CSSProperties) => {
  const { name, absoluteBoundingBox, strokes, strokeWeight, arrowStart, arrowEnd, arrowStyle, arrowLength, arrowWidth } = node;
  
  // Get stroke properties
  const stroke = strokes?.[0];
  const strokeColor = stroke?.type === 'SOLID' && stroke.color ? 
    rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a) : 
    '#000000';
  
  const strokeWidth = strokeWeight || stroke?.strokeWeight || 2;
  const width = absoluteBoundingBox?.width || 100;
  const height = absoluteBoundingBox?.height || 100;
  
  // Calculate line coordinates
  const x1 = 0;
  const y1 = height / 2;
  const x2 = width;
  const y2 = height / 2;
  
  // Create main line path
  const mainLinePath = `M ${x1} ${y1} L ${x2} ${y2}`;
  
  // Create arrow paths
  let arrowPaths = '';
  const arrowLengthFinal = arrowLength || 10;
  const arrowWidthFinal = arrowWidth || 8;
  const arrowStyleFinal = arrowStyle || 'ARROW_LINES';
  
  if (arrowEnd) {
    arrowPaths += createSimpleArrowPath(x2, y2, x1, y1, strokeWidth, arrowStyleFinal, arrowLengthFinal, arrowWidthFinal);
  }
  
  if (arrowStart) {
    arrowPaths += createSimpleArrowPath(x1, y1, x2, y2, strokeWidth, arrowStyleFinal, arrowLengthFinal, arrowWidthFinal);
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

// Enhanced shape rendering with better styling
// Render simple rectangles with vector support for SimpleFigmaRenderer
const renderSimpleRectangle = (node: any, baseStyles: React.CSSProperties) => {
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

// Render simple ellipses for SimpleFigmaRenderer
const renderSimpleEllipse = (node: any, baseStyles: React.CSSProperties) => {
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

// Render simple vector strokes for SimpleFigmaRenderer
const renderSimpleVectorStroke = (node: any, baseStyles: React.CSSProperties) => {
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
  const { fills, strokes, cornerRadius, effects } = node;
  
  const shapeStyles: React.CSSProperties = {
    // Background color from fills
    backgroundColor: fills?.[0]?.type === 'SOLID' && fills[0].color ? 
                    rgbaToCss(fills[0].color.r, fills[0].color.g, fills[0].color.b, fills[0].color.a) : 
                    'transparent',
    
    // Border from strokes
    border: strokes?.[0]?.type === 'SOLID' && strokes[0].color ? 
            `${strokes[0].strokeWeight || 1}px solid ${rgbaToCss(strokes[0].color.r, strokes[0].color.g, strokes[0].color.b, strokes[0].color.a)}` : 
            'none',
    
    // Enhanced border radius with circular detection
    borderRadius: cornerRadius ? getCornerRadius(cornerRadius, baseStyles.width as number, baseStyles.height as number) : '0',
    
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

  // Calculate positioning styles
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
  
  // Handle opacity
  if (opacity !== undefined && opacity !== 1) {
    positionStyles.opacity = opacity;
  }
  
  // Handle z-index
  if (node.zIndex !== undefined) {
    positionStyles.zIndex = node.zIndex;
  }
  
  // Add debug styling
  if (showDebug) {
    positionStyles.border = '1px solid #3b82f6';
    positionStyles.backgroundColor = 'rgba(59, 130, 246, 0.1)';
  }
  
  // Add enhanced styles support
  const appearanceStyles = getSimpleAppearanceStyles(node);
  const strokeStyles = getSimpleStrokeStyles(node);
  const effectStyles = getSimpleEffectStyles(node);
  
  // Combine all styles
  Object.assign(positionStyles, appearanceStyles, strokeStyles, effectStyles);
  
  // Add basic mask support
  if (parentMask) {
    positionStyles.maskMode = parentMaskType === 'LUMINANCE' ? 'luminance' : 'alpha';
    (positionStyles as any).webkitMaskMode = parentMaskType === 'LUMINANCE' ? 'luminance' : 'alpha';
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
      return (
        <div
          className="relative"
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
              {node.isMask && <div className="text-yellow-300">🔒 Mask</div>}
            </div>
          )}
          
          {children?.map((child: any, index: number) => (
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
          ))}
        </div>
      );

    case 'TEXT':
      return <FigmaText node={node} baseStyles={positionStyles} showDebug={showDebug} devMode={devMode} />;

    case 'ELLIPSE':
      // Handle ellipses with proper circular styling
      return (
        <div
          style={positionStyles}
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
          
          {renderSimpleEllipse(node, positionStyles)}
        </div>
      );

    case 'RECTANGLE':
      // Handle rectangles with comprehensive vector support
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
          
          {renderSimpleRectangle(node, positionStyles)}
        </div>
      );

    case 'ARROW':
      // Comprehensive arrow rendering
      return (
        <div
          style={positionStyles}
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
          
          {renderSimpleArrow(node, positionStyles)}
        </div>
      );

    case 'VECTOR':
      // Handle vector paths with comprehensive support
      return (
        <div
          style={positionStyles}
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
          
          {renderSimpleRectangle(node, positionStyles)}
        </div>
      );

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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0369a1',
                fontSize: '12px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: '500',
              }}
            >
              <div style={{ textAlign: 'center', padding: '8px' }}>
                <div style={{ fontSize: '16px', marginBottom: '4px', opacity: '0.7' }}>🖼️</div>
                <div style={{ fontSize: '10px', lineHeight: '1.2' }}>Image</div>
                {node.name && (
                  <div style={{ 
                    fontSize: '9px', 
                    opacity: '0.6',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {node.name.length > 12 ? node.name.substring(0, 12) + '...' : node.name}
                  </div>
                )}
              </div>
            </div>
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