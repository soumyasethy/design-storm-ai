'use client';

import React from 'react';
import { FigmaRendererProps, renderStyledText, computeStyles, computeFillStyles, computeStrokeStyles, computeEffectStyles } from '../ComponentRegistry';

export const TextRenderer: React.FC<FigmaRendererProps> = ({ node, showDebug, devMode }) => {
  const { characters, style, characterStyleOverrides, styleOverrideTable } = node;
  
  if (!characters) {
    return null;
  }

  // Compute all styles dynamically from JSON properties
  const styles = {
    ...computeStyles(node),
    ...computeFillStyles(node),
    ...computeStrokeStyles(node),
    ...computeEffectStyles(node),
  };

  // Add text-specific styles
  if (style) {
    // Font family
    if (style.fontFamily) {
      styles.fontFamily = style.fontFamily;
    }
    
    // Font size
    if (style.fontSize) {
      styles.fontSize = `${style.fontSize}px`;
    }
    
    // Font weight
    if (style.fontWeight) {
      styles.fontWeight = style.fontWeight;
    }
    
    // Text alignment
    if (style.textAlignHorizontal) {
      switch (style.textAlignHorizontal) {
        case 'CENTER':
          styles.textAlign = 'center';
          break;
        case 'RIGHT':
          styles.textAlign = 'right';
          break;
        case 'JUSTIFIED':
          styles.textAlign = 'justify';
          break;
        default:
          styles.textAlign = 'left';
      }
    }
    
    // Vertical alignment
    if (style.textAlignVertical) {
      switch (style.textAlignVertical) {
        case 'CENTER':
          styles.display = 'flex';
          styles.alignItems = 'center';
          break;
        case 'BOTTOM':
          styles.display = 'flex';
          styles.alignItems = 'flex-end';
          break;
        case 'TOP':
          styles.display = 'flex';
          styles.alignItems = 'flex-start';
          break;
      }
    }
    
    // Line height
    if (style.lineHeight) {
      styles.lineHeight = `${style.lineHeight}px`;
    } else if (style.lineHeightPercent) {
      styles.lineHeight = `${style.lineHeightPercent}%`;
    }
    
    // Letter spacing
    if (style.letterSpacing) {
      styles.letterSpacing = `${style.letterSpacing}px`;
    }
    
    // Text decoration
    if (style.textDecoration) {
      styles.textDecoration = style.textDecoration;
      if (style.textDecoration === 'underline') {
        styles.textDecorationColor = 'currentColor';
        styles.textDecorationThickness = '1px';
        styles.textUnderlineOffset = '2px';
      }
    }
    
    // Text case
    if (style.textCase) {
      switch (style.textCase) {
        case 'UPPER':
          styles.textTransform = 'uppercase';
          break;
        case 'LOWER':
          styles.textTransform = 'lowercase';
          break;
        case 'TITLE':
          styles.textTransform = 'capitalize';
          break;
      }
    }
    
    // Paragraph spacing
    if (style.paragraphSpacing) {
      styles.marginBottom = `${style.paragraphSpacing}px`;
    }
    
    // Paragraph indent
    if (style.paragraphIndent) {
      styles.textIndent = `${style.paragraphIndent}px`;
    }
  }

  // Process text content - use rich text rendering if character overrides exist
  let processedText = characters;
  if (characterStyleOverrides && styleOverrideTable) {
    processedText = renderStyledText(characters, characterStyleOverrides, styleOverrideTable, node.fills);
  }

  return (
    <div style={styles}>
      {showDebug && (
        <div style={{ 
          position: 'absolute', 
          top: -20, 
          left: 0, 
          background: 'rgba(0, 255, 0, 0.2)', 
          color: 'green', 
          fontSize: '10px',
          padding: '2px',
          zIndex: 1000
        }}>
          TEXT: {node.name} ({characters.length} chars)
          {characterStyleOverrides && ` - Rich Text (${characterStyleOverrides.length} overrides)`}
        </div>
      )}
      <span
        className="block w-full h-full leading-none whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: processedText }}
      />
    </div>
  );
}; 