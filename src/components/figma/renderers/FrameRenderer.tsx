'use client';

import React from 'react';
import { FigmaRendererProps, computeStyles, computeFillStyles, computeStrokeStyles, computeEffectStyles } from '../ComponentRegistry';

export const FrameRenderer: React.FC<FigmaRendererProps> = ({ node, showDebug }) => {
  // Compute all styles dynamically from JSON properties
  const styles = {
    ...computeStyles(node),
    ...computeFillStyles(node),
    ...computeStrokeStyles(node),
    ...computeEffectStyles(node),
  };

  // Frame-specific layout styles
  if (node.layoutMode) {
    styles.display = 'flex';
    
    switch (node.layoutMode) {
      case 'HORIZONTAL':
        styles.flexDirection = 'row';
        break;
      case 'VERTICAL':
        styles.flexDirection = 'column';
        break;
      case 'NONE':
        styles.display = 'block';
        break;
    }
  }

  // Primary axis alignment
  if (node.primaryAxisAlignItems) {
    switch (node.primaryAxisAlignItems) {
      case 'MIN':
        styles.justifyContent = 'flex-start';
        break;
      case 'CENTER':
        styles.justifyContent = 'center';
        break;
      case 'MAX':
        styles.justifyContent = 'flex-end';
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
    }
  }

  // Counter axis alignment
  if (node.counterAxisAlignItems) {
    switch (node.counterAxisAlignItems) {
      case 'MIN':
        styles.alignItems = 'flex-start';
        break;
      case 'CENTER':
        styles.alignItems = 'center';
        break;
      case 'MAX':
        styles.alignItems = 'flex-end';
        break;
      case 'BASELINE':
        styles.alignItems = 'baseline';
        break;
    }
  }

  // Item spacing
  if (node.itemSpacing) {
    styles.gap = `${node.itemSpacing}px`;
  }

  // Padding
  if (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) {
    styles.padding = `${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px`;
  }

  // Sizing modes
  if (node.primaryAxisSizingMode === 'AUTO') {
    if (node.layoutMode === 'HORIZONTAL') {
      styles.width = 'auto';
    } else {
      styles.height = 'auto';
    }
  }

  if (node.counterAxisSizingMode === 'AUTO') {
    if (node.layoutMode === 'HORIZONTAL') {
      styles.height = 'auto';
    } else {
      styles.width = 'auto';
    }
  }

  // Layout grow
  if (node.layoutGrow) {
    styles.flexGrow = node.layoutGrow;
  }

  // Layout align
  if (node.layoutAlign) {
    switch (node.layoutAlign) {
      case 'STRETCH':
        styles.alignSelf = 'stretch';
        break;
      case 'CENTER':
        styles.alignSelf = 'center';
        break;
      case 'MIN':
        styles.alignSelf = 'flex-start';
        break;
      case 'MAX':
        styles.alignSelf = 'flex-end';
        break;
    }
  }

  // Handle corner radius for frames
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

  return (
    <div style={styles}>
      {showDebug && (
        <div style={{ 
          position: 'absolute', 
          top: -20, 
          left: 0, 
          background: 'rgba(0, 0, 255, 0.2)', 
          color: 'blue', 
          fontSize: '10px',
          padding: '2px',
          zIndex: 1000
        }}>
          FRAME: {node.name}
          {node.layoutMode && ` (${node.layoutMode})`}
          {node.children && ` (${node.children.length} children)`}
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