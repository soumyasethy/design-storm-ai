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
    letterSpacing?: number;
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
  }>;
}

// Helper functions
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

const getFillStyles = (fills: any[], nodeId?: string, imageMap?: Record<string, string>): React.CSSProperties => {
  if (!fills || fills.length === 0) return {};
  
  const fill = fills[0];
  const styles: React.CSSProperties = {};
  
     if (fill.type === 'SOLID' && fill.color) {
     styles.backgroundColor = rgbaToCss(fill.color.r, fill.color.g, fill.color.b, fill.color.a);
   } else if (fill.type === 'IMAGE') {
     const imageUrl = (fill as any).imageUrl || (nodeId && imageMap && imageMap[nodeId]);
     if (imageUrl) {
       styles.backgroundImage = `url('${imageUrl}')`;
       styles.backgroundSize = 'cover';
       styles.backgroundPosition = 'center';
       styles.backgroundRepeat = 'no-repeat';
     }
   }
  
  return styles;
};

const getStrokeStyles = (strokes: any[]): React.CSSProperties => {
  if (!strokes || strokes.length === 0) return {};
  
  const stroke = strokes[0];
  const styles: React.CSSProperties = {};
  
  if (stroke.type === 'SOLID' && stroke.color) {
    styles.border = `${stroke.strokeWeight || 1}px solid ${rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a)}`;
  }
  
  return styles;
};

const getCornerRadius = (radius: number): string => {
  if (radius === 0) return '0';
  if (radius >= 50) return '50%';
  return `${radius}px`;
};

const getFontFamily = (family: string): string => {
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

// Extract all coordinates from the node tree for scaling
const extractAllCoordinates = (node: any): Array<{x: number, y: number, width: number, height: number}> => {
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

// Helper function to normalize coordinates relative to frame origin
const normalizeCoordinates = (
  bbox: { x: number; y: number; width: number; height: number },
  offset: { x: number; y: number },
  scale: number
): { x: number; y: number; width: number; height: number } => {
  const normalizedX = (bbox.x - offset.x) * scale;
  const normalizedY = (bbox.y - offset.y) * scale;
  const width = bbox.width * scale;
  const height = bbox.height * scale;
  
  return { x: normalizedX, y: normalizedY, width, height };
};

// Enhanced helper to extract all styling properties from Figma nodes
const extractNodeStyles = (node: any, parentBoundingBox?: { x: number; y: number; width: number; height: number }): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  // Handle absoluteBoundingBox positioning
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
  
  // Handle fills
  if (node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID' && fill.color) {
      styles.backgroundColor = rgbaToCss(fill.color.r, fill.color.g, fill.color.b, fill.color.a);
    } else if (fill.type === 'IMAGE') {
      // Image fills will be handled separately in the renderer
      // Don't set background properties here to avoid conflicts
    } else if (fill.type === 'GRADIENT_LINEAR') {
      // Handle linear gradients
      if (fill.gradientStops && fill.gradientStops.length > 0) {
        const stops = fill.gradientStops.map((stop: any) => 
          `${rgbaToCss(stop.color.r, stop.color.g, stop.color.b, stop.color.a)} ${stop.position * 100}%`
        ).join(', ');
        styles.background = `linear-gradient(to bottom, ${stops})`;
      }
    }
  }
  
  // Handle strokes
  if (node.strokes && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    if (stroke.type === 'SOLID' && stroke.color) {
      styles.border = `${stroke.strokeWeight || 1}px solid ${rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a)}`;
    }
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

  // Enhanced text styling extraction
  const extractTextStyles = (node: any): React.CSSProperties => {
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
    }
    
    // Handle text fills
    if (node.fills && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        styles.color = rgbaToCss(fill.color.r, fill.color.g, fill.color.b, fill.color.a);
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



// Calculate normalization offset and scaling
const calculateLayout = (node: any): { offset: { x: number; y: number }; scale: number; containerSize: { width: number; height: number } } => {
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
  
  // Calculate responsive scale (you can adjust this based on your container)
  const maxContainerWidth = 1200;
  const scale = Math.min(1, maxContainerWidth / containerWidth);
  
  console.log('🎯 Frame normalization:', {
    originalBounds: { minX, minY, maxX, maxY },
    offset,
    containerSize: { width: containerWidth, height: containerHeight },
    scale
  });
  
  return { offset, scale, containerSize: { width: containerWidth, height: containerHeight } };
};

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
  const [imageLoading, setImageLoading] = useState(false);

  // Calculate layout for root node
  const layout = useMemo(() => {
    if (isRoot) {
      return calculateLayout(node);
    }
    return { 
      offset: normalizationOffset || { x: 0, y: 0 }, 
      scale: 1, 
      containerSize: { width: 0, height: 0 } 
    };
  }, [node, isRoot, normalizationOffset]);

  // Load image if this node has image fills - use imageMap instead of individual API calls
  useEffect(() => {
    if (node.fills && node.fills.some((fill: any) => fill.type === 'IMAGE') && node.id) {
      console.log(`🔍 Checking image for node ${node.id}:`, {
        hasImageMap: !!imageMap,
        imageMapKeys: imageMap ? Object.keys(imageMap) : [],
        imageMapValue: imageMap ? imageMap[node.id] : null,
        fills: node.fills
      });
      
      const url = imageMap?.[node.id];
      if (url && typeof url === 'string' && url.length > 0) {
        console.log(`✅ Found valid image URL in imageMap for ${node.id}:`, url);
        setImageUrl(url);
      } else {
        // If not in imageMap, try to get from fill.imageUrl (injected by loadFigmaImages)
        const imageFill = node.fills.find((fill: any) => fill.type === 'IMAGE');
        if (imageFill && imageFill.imageUrl && typeof imageFill.imageUrl === 'string' && imageFill.imageUrl.length > 0) {
          console.log(`✅ Found valid image URL in fill for ${node.id}:`, imageFill.imageUrl);
          setImageUrl(imageFill.imageUrl);
        } else {
          console.log(`❌ No valid image URL found for node ${node.id}`);
          setImageUrl(null); // Clear any previous invalid URL
        }
      }
    }
  }, [node, imageMap]);

  // Skip invisible nodes
  if (node.visible === false) {
    return null;
  }

  const { type, name, absoluteBoundingBox, children, fills, strokes, cornerRadius, characters, style, opacity, isMask, maskType, effects } = node;

  // Enhanced recursive renderer for all node types
  const renderNode = () => {
    // Extract base styles for all node types
    const baseStyles = extractNodeStyles(node, isRoot ? undefined : parentBoundingBox);
    
    // Add debug comment for development
    const debugComment = showDebug ? `{/* Figma Node: ${name} (${node.id}) */}` : '';
    
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
            {debugComment}
            {showDebug && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded z-50">
                <div>Canvas: {name}</div>
                <div>Type: {type}</div>
                <div>Children: {children?.length || 0}</div>
                <div>Size: {layout.containerSize.width.toFixed(0)}×{layout.containerSize.height.toFixed(0)}</div>
                <div>Scale: {layout.scale.toFixed(2)}</div>
                <div>Offset: ({layout.offset.x.toFixed(0)}, {layout.offset.y.toFixed(0)})</div>
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
            style={{
              ...baseStyles,
              ...(showDebug ? { 
                border: '1px solid #10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)'
              } : {})
            }}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {debugComment}
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
        
        const textStyles = extractTextStyles(node);
        return (
          <div
            style={{
              ...baseStyles,
              ...textStyles,
              display: 'flex',
              alignItems: getVerticalAlign(style?.textAlignVertical || 'TOP'),
              justifyContent: getTextAlign(style?.textAlignHorizontal || 'LEFT') === 'center' ? 'center' : 
                            getTextAlign(style?.textAlignHorizontal || 'LEFT') === 'right' ? 'flex-end' : 'flex-start',
              ...(showDebug ? { 
                border: '1px solid #ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)'
              } : {})
            }}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {debugComment}
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
          console.log(`🖼️ Rendering image for node ${node.id}:`, imageUrl);
          return (
            <div
              style={{
                ...baseStyles,
                ...(showDebug ? { 
                  border: '1px solid #f59e0b',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)'
                } : {})
              }}
              title={`${name} (${type})`}
              data-figma-node-id={node.id}
              data-figma-node-type={type}
              data-figma-node-name={name}
            >
              {debugComment}
              {showDebug && (
                <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                  <div className="font-bold">{name}</div>
                  <div>{type} - {baseStyles.width}×{baseStyles.height}</div>
                  <div className="text-green-300">🖼️ Image loaded</div>
                </div>
              )}
              
              {/* Try Next.js Image first, fallback to regular img */}
              <Image
                src={imageUrl}
                alt={name}
                width={parseInt(baseStyles.width as string)}
                height={parseInt(baseStyles.height as string)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: baseStyles.borderRadius
                }}
                onLoad={() => console.log(`✅ Next.js Image loaded successfully: ${name}`)}
                onError={(e) => {
                  console.error(`❌ Next.js Image failed to load: ${name}`, e);
                  // Fallback to regular img tag
                  const imgElement = e.target as HTMLImageElement;
                  const fallbackImg = document.createElement('img');
                  fallbackImg.src = imageUrl;
                  fallbackImg.alt = name;
                  fallbackImg.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: ${baseStyles.borderRadius || '0'};
                  `;
                  fallbackImg.onload = () => console.log(`✅ Fallback img loaded successfully: ${name}`);
                  fallbackImg.onerror = () => console.error(`❌ Fallback img also failed: ${name}`);
                  imgElement.parentNode?.replaceChild(fallbackImg, imgElement);
                }}
              />
            </div>
          );
        }
        
        // Handle regular shapes
        return (
          <div
            style={{
              ...baseStyles,
              ...(showDebug ? { 
                border: '1px solid #10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)'
              } : {})
            }}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {debugComment}
            {showDebug && (
              <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                <div className="font-bold">{name}</div>
                <div>{type} - {baseStyles.width}×{baseStyles.height}</div>
                {imageLoading && <div className="text-yellow-300">🔄 Loading image...</div>}
              </div>
            )}
            
            {/* Show placeholder for image loading */}
            {imageLoading && (
              <div 
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}
              />
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
        // Handle component instances
        return (
          <div
            style={{
              ...baseStyles,
              ...(showDebug ? { 
                border: '1px solid #8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)'
              } : {})
            }}
            title={`${name} (${type})`}
            data-figma-node-id={node.id}
            data-figma-node-type={type}
            data-figma-node-name={name}
          >
            {debugComment}
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
              style={{
                ...baseStyles,
                ...(showDebug ? { 
                  border: '1px solid #6b7280',
                  backgroundColor: 'rgba(107, 114, 128, 0.1)'
                } : {})
              }}
              title={`${name} (${type})`}
              data-figma-node-id={node.id}
              data-figma-node-type={type}
              data-figma-node-name={name}
            >
              {debugComment}
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
              {debugComment}
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