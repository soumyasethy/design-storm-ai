'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  rgbaToCss, 
  getFontFamily, 
  getCornerRadius, 
  getTextAlign, 
  getVerticalAlign,
  isFooterComponent,
  getImageScaleMode,
  isNodeVisible
} from '@/lib/utils';

interface SimpleFigmaRendererProps {
  node: any;
  showDebug?: boolean;
  isRoot?: boolean;
  parentBoundingBox?: { x: number; y: number; width: number; height: number };
  imageMap?: Record<string, string>;
  fileKey?: string;
  figmaToken?: string;
}

// Enhanced image rendering with footer icon support
const FigmaImage: React.FC<{ 
  node: any; 
  imageUrl: string; 
  baseStyles: React.CSSProperties; 
  showDebug: boolean 
}> = ({ node, imageUrl, baseStyles, showDebug }) => {
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
    objectFit: scaleMode,
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

// Enhanced text rendering with pixel-perfect typography
const FigmaText: React.FC<{ 
  node: any; 
  baseStyles: React.CSSProperties; 
  showDebug: boolean 
}> = ({ node, baseStyles, showDebug }) => {
  // Add null check to prevent runtime errors
  if (!node || typeof node !== 'object') {
    console.warn('FigmaText: Invalid node provided', node);
    return <div>Invalid text node</div>;
  }
  
  const { characters, style } = node;
  
  if (!characters) return null;
  
  const textStyles: React.CSSProperties = {
    // Font family
    fontFamily: style?.fontFamily ? getFontFamily(style.fontFamily) : 'inherit',
    
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
      {showDebug && (
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

// Enhanced shape rendering with better styling
const FigmaShape: React.FC<{ 
  node: any; 
  baseStyles: React.CSSProperties; 
  showDebug: boolean 
}> = ({ node, baseStyles, showDebug }) => {
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
      {showDebug && (
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
  fileKey,
  figmaToken
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
          {showDebug && (
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
          {showDebug && (
            <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
              <div className="font-bold">{name}</div>
              <div>{type} - {positionStyles.width}×{positionStyles.height}</div>
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
            />
          ))}
        </div>
      );

    case 'TEXT':
      return <FigmaText node={node} baseStyles={positionStyles} showDebug={showDebug} />;

    case 'RECTANGLE':
    case 'ELLIPSE':
    case 'VECTOR':
    case 'LINE':
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
            {showDebug && (
              <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
                <div className="font-bold">{name}</div>
                <div>{type} - {positionStyles.width}×{positionStyles.height}</div>
                <div className="text-green-300">🖼️ Image loaded</div>
              </div>
            )}
            
            <FigmaImage node={node} imageUrl={imageUrl} baseStyles={positionStyles} showDebug={showDebug} />
          </div>
        );
      }
      
      // Handle regular shapes
      return <FigmaShape node={node} baseStyles={positionStyles} showDebug={showDebug} />;

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
          {showDebug && (
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
            {showDebug && (
              <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
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