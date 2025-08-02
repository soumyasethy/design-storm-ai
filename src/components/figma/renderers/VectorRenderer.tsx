'use client';

import React from 'react';
import { FigmaRendererProps, computeStyles, computeFillStyles, computeStrokeStyles, computeEffectStyles, rgbaToCss } from '../ComponentRegistry';

export const VectorRenderer: React.FC<FigmaRendererProps> = ({ node, showDebug }) => {
  // Compute all styles dynamically from JSON properties
  const styles = {
    ...computeStyles(node),
    ...computeFillStyles(node),
    ...computeStrokeStyles(node),
    ...computeEffectStyles(node),
  };

  // Vector-specific styles
  if (node.absoluteBoundingBox) {
    styles.width = `${node.absoluteBoundingBox.width}px`;
    styles.height = `${node.absoluteBoundingBox.height}px`;
  }

  // Handle vector-specific rotation
  let rotation = node.rotation || 0;
  if (node.vectorRotation !== undefined) {
    rotation = node.vectorRotation;
  }

  // Apply rotation mapping for vectors (90°/-90° → 180°)
  if (Math.abs(rotation - 90) < 0.1 || Math.abs(rotation - (-90)) < 0.1) {
    rotation = 180;
  }

  if (rotation !== 0) {
    styles.transform = `rotate(${rotation}deg)`;
  }

  // Handle vector-specific fills
  let fillColor = 'transparent';
  if (node.vectorFill && node.vectorFill.type === 'SOLID' && node.vectorFill.color) {
    fillColor = rgbaToCss(node.vectorFill.color.r, node.vectorFill.color.g, node.vectorFill.color.b, node.vectorFill.color.a);
  } else if (node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID' && fill.color) {
      fillColor = rgbaToCss(fill.color.r, fill.color.g, fill.color.b, fill.color.a);
    }
  }

  // Handle vector-specific strokes
  let strokeColor = 'transparent';
  let strokeWidth = 1;
  if (node.vectorStroke && node.vectorStroke.color) {
    strokeColor = rgbaToCss(node.vectorStroke.color.r, node.vectorStroke.color.g, node.vectorStroke.color.b, node.vectorStroke.color.a);
    strokeWidth = node.vectorStroke.weight || 1;
  } else if (node.strokes && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    if (stroke.type === 'SOLID' && stroke.color) {
      strokeColor = rgbaToCss(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a);
      strokeWidth = stroke.strokeWeight || 1;
    }
  }

  // Create SVG path for vector
  const createVectorPath = () => {
    if (node.vectorPaths && node.vectorPaths.length > 0) {
      return node.vectorPaths[0].path;
    }

    // Fallback to simple rectangle path
    if (node.absoluteBoundingBox) {
      const { width, height } = node.absoluteBoundingBox;
      return `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`;
    }

    return '';
  };

  const pathData = createVectorPath();

  // Handle vector-specific corner radius
  let cornerRadius = 0;
  if (node.vectorCornerRadius !== undefined) {
    cornerRadius = node.vectorCornerRadius;
  } else if (node.cornerRadius !== undefined) {
    cornerRadius = node.cornerRadius;
  }

  // Apply corner radius to SVG if needed
  if (cornerRadius > 0 && node.absoluteBoundingBox) {
    const { width, height } = node.absoluteBoundingBox;
    const radius = Math.min(cornerRadius, Math.min(width, height) / 2);
    const path = `M ${radius} 0 L ${width - radius} 0 Q ${width} 0 ${width} ${radius} L ${width} ${height - radius} Q ${width} ${height} ${width - radius} ${height} L ${radius} ${height} Q 0 ${height} 0 ${height - radius} L 0 ${radius} Q 0 0 ${radius} 0 Z`;
    return (
      <div style={styles}>
        {showDebug && (
          <div style={{ 
            position: 'absolute', 
            top: -20, 
            left: 0, 
            background: 'rgba(255, 0, 255, 0.2)', 
            color: 'magenta', 
            fontSize: '10px',
            padding: '2px',
            zIndex: 1000
          }}>
            VECTOR: {node.name}
            {node.vectorType && ` (${node.vectorType})`}
            {rotation !== 0 && ` (${rotation}°)`}
          </div>
        )}
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${node.absoluteBoundingBox?.width || 100} ${node.absoluteBoundingBox?.height || 100}`}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <path
            d={path}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fillRule={(node.vectorFillRule?.toLowerCase() || 'nonzero') as 'nonzero' | 'evenodd'}
            clipRule={node.vectorWindingRule?.toLowerCase() || 'nonzero'}
          />
        </svg>
        {node.children?.map((child, index) => (
          <div key={child.id || index} style={{ position: 'relative' }}>
            {/* Child rendering will be handled by parent */}
          </div>
        ))}
      </div>
    );
  }

  // Regular vector rendering
  return (
    <div style={styles}>
      {showDebug && (
        <div style={{ 
          position: 'absolute', 
          top: -20, 
          left: 0, 
          background: 'rgba(255, 0, 255, 0.2)', 
          color: 'magenta', 
          fontSize: '10px',
          padding: '2px',
          zIndex: 1000
        }}>
          VECTOR: {node.name}
          {node.vectorType && ` (${node.vectorType})`}
          {rotation !== 0 && ` (${rotation}°)`}
        </div>
      )}
      {pathData && (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${node.absoluteBoundingBox?.width || 100} ${node.absoluteBoundingBox?.height || 100}`}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <path
            d={pathData}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fillRule={(node.vectorFillRule?.toLowerCase() || 'nonzero') as 'nonzero' | 'evenodd'}
            clipRule={node.vectorWindingRule?.toLowerCase() || 'nonzero'}
          />
        </svg>
      )}
      {node.children?.map((child, index) => (
        <div key={child.id || index} style={{ position: 'relative' }}>
          {/* Child rendering will be handled by parent */}
        </div>
      ))}
    </div>
  );
}; 