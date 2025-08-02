'use client';

import React, { useMemo } from 'react';
import { DynamicRenderer, FigmaRendererProps } from './renderers';

interface DynamicFigmaRendererProps extends FigmaRendererProps {
  // Additional props specific to the main renderer
  showCoordinateOverlay?: boolean;
  showBoundingBoxes?: boolean;
}

export const DynamicFigmaRenderer: React.FC<DynamicFigmaRendererProps> = ({ 
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
  devMode = false,
  showCoordinateOverlay = false,
  showBoundingBoxes = false
}) => {
  
  // Compute normalization offset for root nodes
  const computedNormalizationOffset = useMemo(() => {
    if (!isRoot || !node.absoluteBoundingBox) {
      return normalizationOffset || { x: 0, y: 0 };
    }
    
    return {
      x: -node.absoluteBoundingBox.x,
      y: -node.absoluteBoundingBox.y
    };
  }, [isRoot, node.absoluteBoundingBox, normalizationOffset]);

  // Apply normalization to node position
  const normalizedNode = useMemo(() => {
    if (!computedNormalizationOffset || !node.absoluteBoundingBox) {
      return node;
    }

    return {
      ...node,
      absoluteBoundingBox: {
        ...node.absoluteBoundingBox,
        x: node.absoluteBoundingBox.x + computedNormalizationOffset.x,
        y: node.absoluteBoundingBox.y + computedNormalizationOffset.y
      }
    };
  }, [node, computedNormalizationOffset]);

  // Root container styles
  const rootStyles: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  };

  // Debug overlay styles
  const debugOverlayStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 9999,
  };

  return (
    <div style={rootStyles}>
      {/* Main rendering */}
      <DynamicRenderer
        node={normalizedNode}
        showDebug={showDebug}
        isRoot={isRoot}
        normalizationOffset={computedNormalizationOffset}
        parentBoundingBox={parentBoundingBox}
        imageMap={imageMap}
        parentMask={parentMask}
        parentMaskType={parentMaskType}
        fileKey={fileKey}
        figmaToken={figmaToken}
        devMode={devMode}
      />

      {/* Debug overlays */}
      {showDebug && (
        <>
          {/* Coordinate overlay */}
          {showCoordinateOverlay && (
            <div style={debugOverlayStyles}>
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                zIndex: 10000,
              }}>
                <div>Node: {node.name}</div>
                <div>Type: {node.type}</div>
                {node.absoluteBoundingBox && (
                  <>
                    <div>Position: ({node.absoluteBoundingBox.x}, {node.absoluteBoundingBox.y})</div>
                    <div>Size: {node.absoluteBoundingBox.width} × {node.absoluteBoundingBox.height}</div>
                  </>
                )}
                {node.rotation !== undefined && (
                  <div>Rotation: {node.rotation}°</div>
                )}
                {node.opacity !== undefined && (
                  <div>Opacity: {Math.round(node.opacity * 100)}%</div>
                )}
                {node.children && (
                  <div>Children: {node.children.length}</div>
                )}
              </div>
            </div>
          )}

          {/* Bounding box overlay */}
          {showBoundingBoxes && node.absoluteBoundingBox && (
            <div style={debugOverlayStyles}>
              <div style={{
                position: 'absolute',
                left: `${node.absoluteBoundingBox.x + computedNormalizationOffset.x}px`,
                top: `${node.absoluteBoundingBox.y + computedNormalizationOffset.y}px`,
                width: `${node.absoluteBoundingBox.width}px`,
                height: `${node.absoluteBoundingBox.height}px`,
                border: '2px solid red',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                pointerEvents: 'none',
                zIndex: 10000,
              }} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DynamicFigmaRenderer; 