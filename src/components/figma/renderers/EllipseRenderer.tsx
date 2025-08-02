'use client';

import React from 'react';
import { FigmaRendererProps, computeStyles, computeFillStyles, computeStrokeStyles, computeEffectStyles } from '../ComponentRegistry';

export const EllipseRenderer: React.FC<FigmaRendererProps> = ({ node, showDebug }) => {
  // Compute all styles dynamically from JSON properties
  const styles = {
    ...computeStyles(node),
    ...computeFillStyles(node),
    ...computeStrokeStyles(node),
    ...computeEffectStyles(node),
  };

  // Ellipse-specific styles - always use border-radius: 50% for perfect circles
  styles.borderRadius = '50%';

  // Handle aspect ratio for ellipses
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
          background: 'rgba(128, 0, 128, 0.2)', 
          color: 'purple', 
          fontSize: '10px',
          padding: '2px',
          zIndex: 1000
        }}>
          ELLIPSE: {node.name}
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