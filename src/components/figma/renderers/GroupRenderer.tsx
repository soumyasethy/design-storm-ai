'use client';

import React from 'react';
import { FigmaRendererProps, computeStyles, computeFillStyles, computeStrokeStyles, computeEffectStyles } from '../ComponentRegistry';

export const GroupRenderer: React.FC<FigmaRendererProps> = ({ node, showDebug }) => {
  // Compute all styles dynamically from JSON properties
  const styles = {
    ...computeStyles(node),
    ...computeFillStyles(node),
    ...computeStrokeStyles(node),
    ...computeEffectStyles(node),
  };

  // Group-specific styles - groups are typically transparent containers
  styles.position = 'relative';

  // Handle corner radius for groups
  if (node.cornerRadius !== undefined) {
    if (node.cornerRadius === 0) {
      styles.borderRadius = '0';
    } else if (node.cornerRadius > 0) {
      styles.borderRadius = `${node.cornerRadius}px`;
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

  // Handle aspect ratio for groups
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
          background: 'rgba(128, 128, 128, 0.2)', 
          color: 'gray', 
          fontSize: '10px',
          padding: '2px',
          zIndex: 1000
        }}>
          GROUP: {node.name}
          {node.children && ` (${node.children.length} children)`}
        </div>
      )}
      {node.children?.map((child, index) => (
        <DynamicRenderer key={child.id || index} node={child} showDebug={showDebug} />
      ))}
    </div>
  );
};

// Import DynamicRenderer for child rendering
import { DynamicRenderer } from '../ComponentRegistry'; 