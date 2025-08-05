'use client';

import React from 'react';
import { DynamicText } from './DynamicText';

interface FontDemoProps {
  className?: string;
}

/**
 * Demo component showcasing dynamic font loading
 */
export const FontDemo: React.FC<FontDemoProps> = ({ className = '' }) => {
  const demoTexts = [
    {
      id: '1',
      text: 'Backed by Belief',
      style: {
        fontFamily: 'Space Grotesk',
        fontSize: 36,
        fontWeight: 700,
        lineHeightPx: 40,
        textAlignHorizontal: 'CENTER' as const
      }
    },
    {
      id: '2',
      text: 'This is a sample text with Inter font',
      style: {
        fontFamily: 'Inter',
        fontSize: 18,
        fontWeight: 400,
        lineHeightPx: 24,
        textAlignHorizontal: 'LEFT' as const
      }
    },
    {
      id: '3',
      text: 'ROBOTO BOLD TEXT',
      style: {
        fontFamily: 'Roboto',
        fontSize: 24,
        fontWeight: 700,
        lineHeightPx: 28,
        textAlignHorizontal: 'LEFT' as const,
        textCase: 'UPPER' as const
      }
    }
  ];

  return (
    <div className={`font-demo ${className}`} style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>Dynamic Font Loading Demo</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {demoTexts.map(({ id, text, style }) => (
          <div key={id} style={{ 
            padding: '15px', 
            border: '1px solid #e0e0e0', 
            borderRadius: '8px',
            backgroundColor: '#fafafa'
          }}>
            <DynamicText
              text={text}
              style={style}
              showLoadingState={true}
              onFontLoad={(fontFamily) => {
                console.log(`✅ Font loaded: ${fontFamily}`);
              }}
              onFontError={(fontFamily, error) => {
                console.error(`❌ Font loading failed: ${fontFamily} - ${error}`);
              }}
            />
            <div style={{ 
              marginTop: '8px', 
              fontSize: '12px', 
              color: '#666',
              fontFamily: 'monospace'
            }}>
              Font: {style.fontFamily} | Size: {style.fontSize}px | Weight: {style.fontWeight}
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        backgroundColor: '#f0f8ff', 
        borderRadius: '8px',
        border: '1px solid #b3d9ff'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>How it works:</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#333' }}>
          <li>Fonts are dynamically loaded from Google Fonts</li>
          <li>Loading states are shown while fonts are being fetched</li>
          <li>Fallback fonts are used until custom fonts load</li>
          <li>All Figma text properties are preserved</li>
        </ul>
      </div>
    </div>
  );
}; 