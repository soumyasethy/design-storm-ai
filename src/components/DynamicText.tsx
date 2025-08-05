'use client';

import React, { useEffect, useState } from 'react';
import { useFontLoader } from '@/lib/useFontLoader';
import { getFontFamilyCSS } from '@/lib/fontLoader';

interface FigmaTextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeightPx?: number;
  lineHeightPercent?: number;
  letterSpacing?: number;
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  textDecoration?: string;
  textCase?: 'UPPER' | 'LOWER' | 'TITLE' | 'ORIGINAL';
}

interface DynamicTextProps {
  text: string;
  style: FigmaTextStyle;
  className?: string;
  showLoadingState?: boolean;
  fallbackFont?: string;
  onFontLoad?: (fontFamily: string) => void;
  onFontError?: (fontFamily: string, error: string) => void;
}

/**
 * Convert Figma text alignment to CSS text-align
 */
const getTextAlign = (align?: string): string => {
  switch (align) {
    case 'CENTER': return 'center';
    case 'RIGHT': return 'right';
    case 'JUSTIFIED': return 'justify';
    case 'LEFT':
    default: return 'left';
  }
};

/**
 * Convert Figma vertical alignment to CSS
 */
const getVerticalAlign = (align?: string): string => {
  switch (align) {
    case 'CENTER': return 'center';
    case 'BOTTOM': return 'bottom';
    case 'TOP':
    default: return 'top';
  }
};

/**
 * Convert Figma text case to CSS text-transform
 */
const getTextTransform = (textCase?: string): string => {
  switch (textCase) {
    case 'UPPER': return 'uppercase';
    case 'LOWER': return 'lowercase';
    case 'TITLE': return 'capitalize';
    case 'ORIGINAL':
    default: return 'none';
  }
};

/**
 * Dynamic text component that loads fonts and renders with Figma styling
 */
export const DynamicText: React.FC<DynamicTextProps> = ({
  text,
  style,
  className = '',
  showLoadingState = true,
  fallbackFont = 'system-ui',
  onFontLoad,
  onFontError
}) => {
  const [isFontReady, setIsFontReady] = useState(false);
  const [fontLoadError, setFontLoadError] = useState<string | null>(null);

  // Load font using the hook
  const { isLoaded, isLoading, error, loadFont } = useFontLoader(
    style.fontFamily,
    {
      weights: style.fontWeight ? [style.fontWeight] : [400, 700],
      preload: false
    }
  );

  // Handle font loading state
  useEffect(() => {
    if (isLoaded && style.fontFamily) {
      setIsFontReady(true);
      onFontLoad?.(style.fontFamily);
    }
  }, [isLoaded, style.fontFamily, onFontLoad]);

  // Handle font loading errors
  useEffect(() => {
    if (error && style.fontFamily) {
      setFontLoadError(error);
      onFontError?.(style.fontFamily, error);
    }
  }, [error, style.fontFamily, onFontError]);

  // Build inline styles
  const inlineStyles: React.CSSProperties = {
    // Font properties
    fontFamily: style.fontFamily 
      ? getFontFamilyCSS(style.fontFamily)
      : fallbackFont,
    fontSize: style.fontSize ? `${style.fontSize}px` : 'inherit',
    fontWeight: style.fontWeight || 'normal',
    
    // Line height
    lineHeight: style.lineHeightPx 
      ? `${style.lineHeightPx}px`
      : style.lineHeightPercent 
      ? `${style.lineHeightPercent}%`
      : 'normal',
    
    // Letter spacing
    letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : 'normal',
    
    // Text alignment
    textAlign: getTextAlign(style.textAlignHorizontal) as any,
    verticalAlign: getVerticalAlign(style.textAlignVertical) as any,
    
    // Text transform
    textTransform: getTextTransform(style.textCase) as any,
    
    // Text decoration
    textDecoration: style.textDecoration ? style.textDecoration.toLowerCase() : 'none',
    
    // Font loading optimization
    fontDisplay: 'swap',
    
    // Prevent layout shift during font loading
    ...(isLoading && {
      opacity: 0.8,
      fontFamily: fallbackFont
    })
  };

  // Show loading state if requested
  if (showLoadingState && isLoading) {
    return (
      <span 
        className={`${className} font-loading`}
        style={{
          ...inlineStyles,
          opacity: 0.6,
          fontFamily: fallbackFont
        }}
      >
        {text}
      </span>
    );
  }

  // Show error state if font failed to load
  if (fontLoadError) {
    return (
      <span 
        className={`${className} font-error`}
        style={{
          ...inlineStyles,
          fontFamily: fallbackFont,
          color: '#ff6b6b'
        }}
        title={`Font loading failed: ${fontLoadError}`}
      >
        {text}
      </span>
    );
  }

  return (
    <span 
      className={`${className} dynamic-text`}
      style={inlineStyles}
      data-font-family={style.fontFamily}
      data-font-loaded={isFontReady}
    >
      {text}
    </span>
  );
};

/**
 * Batch text component for rendering multiple text elements with shared font loading
 */
interface BatchTextProps {
  texts: Array<{
    id: string;
    text: string;
    style: FigmaTextStyle;
  }>;
  className?: string;
  showLoadingState?: boolean;
}

export const BatchText: React.FC<BatchTextProps> = ({
  texts,
  className = '',
  showLoadingState = true
}) => {
  // Extract unique font families
  const fontFamilies = Array.from(
    new Set(
      texts
        .map(t => t.style.fontFamily)
        .filter(Boolean) as string[]
    )
  );

  // Load all fonts
  const { isLoaded, isLoading, error } = useFontLoader(fontFamilies);

  if (isLoading && showLoadingState) {
    return (
      <div className={`${className} batch-text-loading`}>
        {texts.map(({ id, text, style }) => (
          <span key={id} style={{ opacity: 0.6 }}>
            {text}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={`${className} batch-text`}>
      {texts.map(({ id, text, style }) => (
        <DynamicText
          key={id}
          text={text}
          style={style}
          showLoadingState={false}
        />
      ))}
    </div>
  );
}; 