'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';

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

// Enhanced fill styles with gradient support
const getFillStyles = (fills: any[], nodeId?: string, imageMap?: Record<string, string>): React.CSSProperties => {
  if (!fills || fills.length === 0) return {};
  
  const fill = fills[0];
  const styles: React.CSSProperties = {};
  
  if (fill.type === 'SOLID' && fill.color) {
    styles.backgroundColor = rgbaToCss(fill.color.r, fill.color.g, fill.color.b, fill.color.a);
  } else if (fill.type === 'IMAGE') {
    const imageUrl = fill.imageUrl || (nodeId && imageMap && imageMap[nodeId]);
    if (imageUrl) {
      styles.backgroundImage = `url('${imageUrl}')`;
      styles.backgroundSize = 'cover';
      styles.backgroundPosition = 'center';
      styles.backgroundRepeat = 'no-repeat';
    }
  } else if (fill.type === 'GRADIENT_LINEAR' && fill.gradientStops) {
    const stops = fill.gradientStops.map((stop: any) => 
      `${rgbaToCss(stop.color.r, stop.color.g, stop.color.b, stop.color.a)} ${stop.position * 100}%`
    ).join(', ');
    styles.background = `linear-gradient(to bottom, ${stops})`;
  } else if (fill.type === 'GRADIENT_RADIAL' && fill.gradientStops) {
    const stops = fill.gradientStops.map((stop: any) => 
      `${rgbaToCss(stop.color.r, stop.color.g, stop.color.b, stop.color.a)} ${stop.position * 100}%`
    ).join(', ');
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
  
  // Handle spacing
  if (node.itemSpacing) {
    styles.gap = `${node.itemSpacing}px`;
  }
  
  // Handle padding
  if (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) {
    styles.padding = `${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px`;
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
  
  // Handle z-index
  if (node.zIndex !== undefined) {
    styles.zIndex = node.zIndex;
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

// Enhanced text styles
const getTextStyles = (node: any): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  if (node.style) {
    // Font family
    if (node.style.fontFamily) {
      styles.fontFamily = getFontFamily(node.style.fontFamily);
    }
    
    // Font size
    if (node.style.fontSize) {
      styles.fontSize = `${node.style.fontSize}px`;
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
    
    // Text decoration
    if (node.style.textDecoration) {
      styles.textDecoration = node.style.textDecoration.toLowerCase();
    }
  }
  
  // Handle text fills
  if (node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID' && fill.color) {
      styles.color = rgbaToCss(fill.color.r, fill.color.g, fill.color.b, fill.color.a);
    }
  }
  
  // Text wrapping properties
  styles.whiteSpace = 'pre-wrap';
  styles.overflowWrap = 'break-word';
  styles.wordBreak = 'break-word';
  
  return styles;
};

// Enhanced shape styles
const getShapeStyles = (node: any): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  // Handle corner radius
  if (node.cornerRadius) {
    styles.borderRadius = getCornerRadius(node.cornerRadius);
  }
  
  // Handle rotation
  if (node.rotation !== undefined && node.rotation !== 0) {
    styles.transform = `rotate(${node.rotation}rad)`;
  }
  
  return styles;
};

// Enhanced component styles
const getComponentStyles = (node: any): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  // Handle component-specific styling
  if (node.componentId || node.componentSetId) {
    // Add component-specific classes or styles
    styles.position = 'relative';
  }
  
  return styles;
};

// Enhanced visibility handling
const isNodeVisible = (node: any): boolean => {
  if (node.visible === false) return false;
  if (node.opacity === 0) return false;
  return true;
};

// Enhanced image rendering with fallbacks
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
  
  // Special handling for footer icons (circular)
  const isFooterIcon = node.name?.toLowerCase().includes('linkedin') || 
                      node.name?.toLowerCase().includes('instagram') || 
                      node.name?.toLowerCase().includes('youtube') ||
                      node.name?.toLowerCase().includes('social');
  
  const imageStyles: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: isFooterIcon ? '50%' : baseStyles.borderRadius,
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
              </div>
            )}
            <span className="block w-full h-full leading-none whitespace-pre-wrap">{characters}</span>
          </div>
        );

      case 'RECTANGLE':
      case 'ELLIPSE':
      case 'VECTOR':
      case 'LINE':
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