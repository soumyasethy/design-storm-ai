'use client';

import React from 'react';
import { FigmaRendererProps, computeStyles, computeFillStyles, computeStrokeStyles, computeEffectStyles } from '../ComponentRegistry';

export const RectangleRenderer: React.FC<FigmaRendererProps> = ({ node, showDebug }) => {
  // Compute all styles dynamically from JSON properties
  const styles = {
    ...computeStyles(node),
    ...computeFillStyles(node),
    ...computeStrokeStyles(node),
    ...computeEffectStyles(node),
  };

  // Add rectangle-specific styles
  if (node.cornerRadius !== undefined) {
    if (node.cornerRadius === 0) {
      styles.borderRadius = '0';
    } else if (node.cornerRadius > 0) {
      // Check if it's a circle (50% radius)
      if (node.absoluteBoundingBox) {
        const { width, height } = node.absoluteBoundingBox;
        const maxRadius = Math.min(width, height) / 2;
        if (node.cornerRadius >= maxRadius) {
          styles.borderRadius = '50%';
        } else {
          styles.borderRadius = `${node.cornerRadius}px`;
        }
      } else {
        styles.borderRadius = `${node.cornerRadius}px`;
      }
    }
  }

  // Handle individual corner radius
  if (node.cornerRadiusTopLeft || node.cornerRadiusTopRight || node.cornerRadiusBottomLeft || node.cornerRadiusBottomRight) {
    const topLeft = node.cornerRadiusTopLeft || 0;
    const topRight = node.cornerRadiusTopRight || 0;
    const bottomLeft = node.cornerRadiusBottomLeft || 0;
    const bottomRight = node.cornerRadiusBottomRight || 0;
    styles.borderRadius = `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`;
  }

  // Handle aspect ratio
  if (node.aspectRatio && node.maintainAspectRatio) {
    styles.aspectRatio = node.aspectRatio.toString();
  }

  // Handle dimensions
  if (node.width) {
    styles.width = `${node.width}px`;
  }
  if (node.height) {
    styles.height = `${node.height}px`;
  }

  // Handle min/max dimensions
  if (node.minWidth) {
    styles.minWidth = `${node.minWidth}px`;
  }
  if (node.maxWidth) {
    styles.maxWidth = `${node.maxWidth}px`;
  }
  if (node.minHeight) {
    styles.minHeight = `${node.minHeight}px`;
  }
  if (node.maxHeight) {
    styles.maxHeight = `${node.maxHeight}px`;
  }

  return (
    <div style={styles}>
      {showDebug && (
        <div style={{ 
          position: 'absolute', 
          top: -20, 
          left: 0, 
          background: 'rgba(255, 165, 0, 0.2)', 
          color: 'orange', 
          fontSize: '10px',
          padding: '2px',
          zIndex: 1000
        }}>
          RECTANGLE: {node.name}
          {node.cornerRadius !== undefined && ` (radius: ${node.cornerRadius}px)`}
          {node.fills && node.fills.length > 0 && ` (${node.fills[0].type} fill)`}
        </div>
      )}
      {node.children?.map((child, index) => (
        <div key={child.id || index} style={{ position: 'relative' }}>
          {/* Child rendering will be handled by parent */}
        </div>
      ))}
    </div>
  );
}; 