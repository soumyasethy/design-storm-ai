'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { FigmaRendererProps, computeStyles, computeStrokeStyles, computeEffectStyles } from '../ComponentRegistry';

export const ImageRenderer: React.FC<FigmaRendererProps> = ({ node, showDebug, imageMap = {} }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Get image URL from various sources
  let imageUrl = '';
  
  // Check fills for image reference
  if (node.fills && node.fills.length > 0) {
    const imageFill = node.fills.find(fill => fill.type === 'IMAGE');
    if (imageFill) {
      imageUrl = imageFill.imageRef || imageFill.imageUrl || '';
    }
  }
  
  // Check imageMap for the node ID
  if (!imageUrl && imageMap[node.id]) {
    imageUrl = imageMap[node.id];
  }

  // Compute all styles dynamically from JSON properties
  const styles = {
    ...computeStyles(node),
    ...computeStrokeStyles(node),
    ...computeEffectStyles(node),
  };

  // Image-specific styles
  if (node.absoluteBoundingBox) {
    styles.width = `${node.absoluteBoundingBox.width}px`;
    styles.height = `${node.absoluteBoundingBox.height}px`;
  }

  // Handle corner radius for images
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

  // Handle aspect ratio
  if (node.aspectRatio && node.maintainAspectRatio) {
    styles.aspectRatio = node.aspectRatio.toString();
  }

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // Placeholder component
  const PlaceholderImage = ({ 
    message = 'No Image', 
    icon = '🖼️', 
    type = 'error' 
  }: { 
    message?: string; 
    icon?: string; 
    type?: 'error' | 'loading' | 'missing' 
  }) => {
    const getPlaceholderStyles = () => {
      const baseStyles: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        border: '2px dashed rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        color: 'rgba(0, 0, 0, 0.5)',
        fontSize: '12px',
        textAlign: 'center',
        padding: '8px',
        boxSizing: 'border-box',
      };

      switch (type) {
        case 'loading':
          return {
            ...baseStyles,
            backgroundColor: 'rgba(0, 123, 255, 0.05)',
            borderColor: 'rgba(0, 123, 255, 0.2)',
            color: 'rgba(0, 123, 255, 0.7)',
          };
        case 'error':
          return {
            ...baseStyles,
            backgroundColor: 'rgba(220, 53, 69, 0.05)',
            borderColor: 'rgba(220, 53, 69, 0.2)',
            color: 'rgba(220, 53, 69, 0.7)',
          };
        case 'missing':
          return {
            ...baseStyles,
            backgroundColor: 'rgba(255, 193, 7, 0.05)',
            borderColor: 'rgba(255, 193, 7, 0.2)',
            color: 'rgba(255, 193, 7, 0.7)',
          };
        default:
          return baseStyles;
      }
    };

    return (
      <div style={getPlaceholderStyles()}>
        <div style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</div>
        <div style={{ fontSize: '10px', lineHeight: '1.2' }}>{message}</div>
        <div style={{ fontSize: '8px', opacity: 0.7, marginTop: '2px' }}>
          {node.name}
        </div>
      </div>
    );
  };

  return (
    <div style={styles}>
      {showDebug && (
        <div style={{ 
          position: 'absolute', 
          top: -20, 
          left: 0, 
          background: 'rgba(0, 255, 255, 0.2)', 
          color: 'cyan', 
          fontSize: '10px',
          padding: '2px',
          zIndex: 1000
        }}>
          IMAGE: {node.name}
          {imageUrl && ` (${imageUrl.substring(0, 20)}...)`}
          {imageError && ' (ERROR)'}
          {imageLoading && !imageError && ' (LOADING)'}
        </div>
      )}
      
      {imageUrl && !imageError ? (
        <Image
          src={imageUrl}
          alt={node.name || 'Figma image'}
          width={node.absoluteBoundingBox?.width || 100}
          height={node.absoluteBoundingBox?.height || 100}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 'inherit',
          }}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      ) : (
        <PlaceholderImage 
          message={imageError ? 'Failed to load' : 'No image data'} 
          icon={imageError ? '❌' : '🖼️'}
          type={imageError ? 'error' : 'missing'}
        />
      )}
      
      {node.children?.map((child, index) => (
        <div key={child.id || index} style={{ position: 'relative' }}>
          {/* Child rendering will be handled by parent */}
        </div>
      ))}
    </div>
  );
}; 