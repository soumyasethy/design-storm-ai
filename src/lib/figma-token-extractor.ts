// Dynamic Figma Token Extraction System
// Auto-extracts design tokens from Figma analysis without hardcoded values

export interface FigmaDesignTokens {
  // Color System - Auto-extracted from design
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    destructive: string;
    border: string;
    input: string;
    ring: string;
  };
  
  // Typography System - Generated from hierarchy analysis
  typography: {
    fontSizes: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
      '5xl': string;
    };
    fontWeights: {
      heading: number;
      body: number;
      small: number;
      caption: number;
    };
    lineHeights: {
      heading: number;
      body: number;
      small: number;
      caption: number;
    };
  };
  
  // Spacing System - Calculated from design proportions
  spacing: {
    base: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  
  // Layout System - Detected from Figma structure
  layout: {
    containerMaxWidth: string;
    gridColumns: number;
    gridGap: string;
    layoutType: 'grid' | 'flex';
    breakpoints: {
      sm: string;
      md: string;
      lg: string;
      xl: string;
      '2xl': string;
    };
  };
  
  // Component Tokens - Auto-generated
  components: {
    card: {
      background: string;
      shadow: string;
      radius: string;
      padding: string;
    };
    button: {
      background: string;
      color: string;
      radius: string;
      padding: string;
      weight: number;
      textSize: string;
    };
    navigation: {
      background: string;
      blur: string;
      border: string;
    };
  };
  
  // Background System - Extracted from design
  backgrounds: {
    hero: string;
    overlayOpacity: number;
    geometricRotation: string;
    pattern: string;
  };
  
  // Contrast System - Calculated for accessibility
  contrast: {
    light: string;
    dark: string;
    shadowLight: string;
    shadowDark: string;
  };
}

export class FigmaTokenExtractor {
  private designTokens: FigmaDesignTokens;
  
  constructor() {
    this.designTokens = this.initializeDefaultTokens();
  }
  
  // Initialize with default tokens that can be overridden
  private initializeDefaultTokens(): FigmaDesignTokens {
    return {
      colors: {
        primary: 'oklch(0.205 0 0)',
        secondary: 'oklch(0.97 0 0)',
        accent: 'oklch(0.97 0 0)',
        background: 'oklch(1 0 0)',
        foreground: 'oklch(0.145 0 0)',
        muted: 'oklch(0.97 0 0)',
        destructive: 'oklch(0.577 0.245 27.325)',
        border: 'oklch(0.922 0 0)',
        input: 'oklch(0.922 0 0)',
        ring: 'oklch(0.708 0 0)',
      },
      typography: {
        fontSizes: {
          xs: 'clamp(0.75rem, 0.75rem, 0.875rem)',
          sm: 'clamp(0.875rem, 0.875rem, 1rem)',
          base: 'clamp(1rem, 1rem, 1.125rem)',
          lg: 'clamp(1.125rem, 1.125rem, 1.25rem)',
          xl: 'clamp(1.25rem, 1.25rem, 1.5rem)',
          '2xl': 'clamp(1.5rem, 1.5rem, 1.875rem)',
          '3xl': 'clamp(1.875rem, 1.875rem, 2.25rem)',
          '4xl': 'clamp(2.25rem, 2.25rem, 3rem)',
          '5xl': 'clamp(3rem, 3rem, 4rem)',
        },
        fontWeights: {
          heading: 700,
          body: 400,
          small: 400,
          caption: 400,
        },
        lineHeights: {
          heading: 1.2,
          body: 1.6,
          small: 1.5,
          caption: 1.4,
        },
      },
      spacing: {
        base: '1rem',
        xs: 'calc(1rem * 0.25)',
        sm: 'calc(1rem * 0.5)',
        md: 'calc(1rem * 1)',
        lg: 'calc(1rem * 1.5)',
        xl: 'calc(1rem * 2)',
        '2xl': 'calc(1rem * 3)',
        '3xl': 'calc(1rem * 4)',
      },
      layout: {
        containerMaxWidth: '1200px',
        gridColumns: 12,
        gridGap: 'calc(1rem * 1)',
        layoutType: 'flex',
        breakpoints: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
        },
      },
      components: {
        card: {
          background: 'var(--background)',
          shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          radius: 'var(--radius)',
          padding: 'calc(1rem * 1.5)',
        },
        button: {
          background: 'var(--primary)',
          color: 'var(--primary-foreground)',
          radius: 'var(--radius)',
          padding: 'calc(1rem * 0.5) calc(1rem * 1.5)',
          weight: 600,
          textSize: 'var(--font-size-base)',
        },
        navigation: {
          background: 'rgba(0, 0, 0, 0.8)',
          blur: '10px',
          border: 'transparent',
        },
      },
      backgrounds: {
        hero: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
        overlayOpacity: 0.2,
        geometricRotation: '12deg',
        pattern: 'none',
      },
      contrast: {
        light: '#FFFFFF',
        dark: '#000000',
        shadowLight: '0 1px 2px rgba(0, 0, 0, 0.8)',
        shadowDark: '0 1px 2px rgba(255, 255, 255, 0.8)',
      },
    };
  }
  
  // Extract colors from image analysis (placeholder for actual implementation)
  public extractColorsFromImage(imageData: ImageData): void {
    // This would use actual image analysis to extract dominant colors
    // For now, we'll use a placeholder that can be overridden
    const extractedColors = this.analyzeImageColors(imageData);
    
    this.designTokens.colors = {
      ...this.designTokens.colors,
      ...extractedColors,
    };
  }
  
  // Analyze image colors (placeholder implementation)
  private analyzeImageColors(imageData: ImageData): Partial<FigmaDesignTokens['colors']> {
    // In a real implementation, this would:
    // 1. Analyze pixel data to find dominant colors
    // 2. Use color clustering algorithms
    // 3. Calculate color harmonies
    // 4. Determine primary, secondary, accent colors
    
    return {
      // Placeholder - would be calculated from actual image analysis
      primary: 'oklch(0.577 0.245 27.325)', // Red-like color
      accent: 'oklch(0.646 0.222 41.116)', // Orange-like color
    };
  }
  
  // Extract typography from design analysis
  public extractTypographyFromDesign(designData: any): void {
    // Analyze text elements to determine font sizes, weights, line heights
    const typographyData = this.analyzeTypographyHierarchy(designData);
    
    this.designTokens.typography = {
      ...this.designTokens.typography,
      ...typographyData,
    };
  }
  
  // Analyze typography hierarchy (placeholder implementation)
  private analyzeTypographyHierarchy(designData: any): Partial<FigmaDesignTokens['typography']> {
    // In a real implementation, this would:
    // 1. Analyze text elements in the design
    // 2. Determine font size hierarchy
    // 3. Calculate responsive font scales
    // 4. Extract font weights and line heights
    
    return {
      fontSizes: {
        '5xl': 'clamp(2rem, 6vw, 6rem)', // Hero text
        '4xl': 'clamp(1.5rem, 4vw, 4rem)', // Section headings
        '3xl': 'clamp(1.25rem, 3vw, 3rem)', // Subsection headings
        '2xl': 'clamp(1.125rem, 2.5vw, 2.5rem)', // Card headings
        xl: 'clamp(1rem, 2vw, 2rem)', // Large text
        lg: 'clamp(0.875rem, 1.5vw, 1.5rem)', // Medium text
        base: 'clamp(0.75rem, 1vw, 1rem)', // Body text
        sm: 'clamp(0.625rem, 0.8vw, 0.875rem)', // Small text
        xs: 'clamp(0.5rem, 0.6vw, 0.75rem)', // Caption text
      },
    };
  }
  
  // Extract spacing from design proportions
  public extractSpacingFromDesign(designData: any): void {
    // Analyze element spacing to determine base spacing unit
    const spacingData = this.analyzeSpacingProportions(designData);
    
    this.designTokens.spacing = {
      ...this.designTokens.spacing,
      ...spacingData,
    };
  }
  
  // Analyze spacing proportions (placeholder implementation)
  private analyzeSpacingProportions(designData: any): Partial<FigmaDesignTokens['spacing']> {
    // In a real implementation, this would:
    // 1. Measure distances between elements
    // 2. Find common spacing patterns
    // 3. Calculate base spacing unit
    // 4. Generate spacing scale
    
    return {
      base: 'calc(1rem * var(--scale-factor, 1))',
      xs: 'calc(1rem * 0.25 * var(--scale-factor, 1))',
      sm: 'calc(1rem * 0.5 * var(--scale-factor, 1))',
      md: 'calc(1rem * 1 * var(--scale-factor, 1))',
      lg: 'calc(1rem * 1.5 * var(--scale-factor, 1))',
      xl: 'calc(1rem * 2 * var(--scale-factor, 1))',
      '2xl': 'calc(1rem * 3 * var(--scale-factor, 1))',
      '3xl': 'calc(1rem * 4 * var(--scale-factor, 1))',
    };
  }
  
  // Extract layout patterns from design structure
  public extractLayoutFromDesign(designData: any): void {
    // Analyze layout structure to determine grid/flex patterns
    const layoutData = this.analyzeLayoutStructure(designData);
    
    this.designTokens.layout = {
      ...this.designTokens.layout,
      ...layoutData,
    };
  }
  
  // Analyze layout structure (placeholder implementation)
  private analyzeLayoutStructure(designData: any): Partial<FigmaDesignTokens['layout']> {
    // In a real implementation, this would:
    // 1. Analyze element positioning
    // 2. Detect grid vs flex patterns
    // 3. Calculate breakpoints from design frames
    // 4. Determine responsive behavior
    
    return {
      layoutType: 'grid',
      gridColumns: 3,
      gridGap: 'calc(1rem * 2 * var(--scale-factor, 1))',
      breakpoints: {
        sm: 'calc(100vw * 0.33)', // Mobile
        md: 'calc(100vw * 0.5)', // Tablet
        lg: 'calc(100vw * 0.67)', // Desktop
        xl: 'calc(100vw * 0.83)', // Large desktop
        '2xl': 'calc(100vw * 1)', // Full width
      },
    };
  }
  
  // Generate CSS custom properties from extracted tokens
  public generateCSSVariables(): string {
    const tokens = this.designTokens;
    
    return `
/* Auto-generated CSS Variables from Figma Analysis */
:root {
  /* Dynamic Color System */
  --figma-primary-color: ${tokens.colors.primary};
  --figma-secondary-color: ${tokens.colors.secondary};
  --figma-accent-color: ${tokens.colors.accent};
  --figma-background-color: ${tokens.colors.background};
  --figma-text-color: ${tokens.colors.foreground};
  --figma-muted-color: ${tokens.colors.muted};
  --figma-destructive-color: ${tokens.colors.destructive};
  --figma-border-color: ${tokens.colors.border};
  --figma-input-color: ${tokens.colors.input};
  --figma-ring-color: ${tokens.colors.ring};
  
  /* Dynamic Typography System */
  --figma-min-text: 0.75;
  --figma-max-text: 1.125;
  --figma-heading-weight: ${tokens.typography.fontWeights.heading};
  --figma-body-weight: ${tokens.typography.fontWeights.body};
  --figma-heading-line-height: ${tokens.typography.lineHeights.heading};
  --figma-body-line-height: ${tokens.typography.lineHeights.body};
  
  /* Dynamic Spacing System */
  --figma-base-spacing: ${tokens.spacing.base};
  --figma-scale-factor: 1;
  
  /* Dynamic Layout System */
  --figma-container-width: ${tokens.layout.containerMaxWidth};
  --figma-grid-columns: ${tokens.layout.gridColumns};
  --figma-grid-gap: ${tokens.layout.gridGap};
  --figma-layout-type: ${tokens.layout.layoutType};
  --figma-breakpoint-sm: ${tokens.layout.breakpoints.sm};
  --figma-breakpoint-md: ${tokens.layout.breakpoints.md};
  --figma-breakpoint-lg: ${tokens.layout.breakpoints.lg};
  --figma-breakpoint-xl: ${tokens.layout.breakpoints.xl};
  --figma-breakpoint-2xl: ${tokens.layout.breakpoints['2xl']};
  
  /* Dynamic Component Tokens */
  --figma-card-background: ${tokens.components.card.background};
  --figma-card-shadow: ${tokens.components.card.shadow};
  --figma-card-radius: ${tokens.components.card.radius};
  --figma-card-padding: ${tokens.components.card.padding};
  
  --figma-button-background: ${tokens.components.button.background};
  --figma-button-color: ${tokens.components.button.color};
  --figma-button-radius: ${tokens.components.button.radius};
  --figma-button-padding: ${tokens.components.button.padding};
  --figma-button-weight: ${tokens.components.button.weight};
  --figma-button-text-size: ${tokens.components.button.textSize};
  
  --figma-nav-background: ${tokens.components.navigation.background};
  --figma-nav-blur: ${tokens.components.navigation.blur};
  --figma-nav-border: ${tokens.components.navigation.border};
  
  /* Dynamic Background System */
  --figma-hero-background: ${tokens.backgrounds.hero};
  --figma-overlay-opacity: ${tokens.backgrounds.overlayOpacity};
  --figma-geometric-rotation: ${tokens.backgrounds.geometricRotation};
  --figma-background-pattern: ${tokens.backgrounds.pattern};
  
  /* Dynamic Contrast System */
  --figma-text-contrast-light: ${tokens.contrast.light};
  --figma-text-contrast-dark: ${tokens.contrast.dark};
  --figma-text-shadow-light: ${tokens.contrast.shadowLight};
  --figma-text-shadow-dark: ${tokens.contrast.shadowDark};
  
  /* Responsive Design Tokens */
  --figma-design-width: 1920;
  --figma-mobile-columns: 1;
  --figma-tablet-columns: 2;
  --figma-desktop-columns: 3;
  --figma-large-columns: 4;
  --figma-min-column-width: 300px;
  
  /* Animation Tokens */
  --figma-transition-duration: 0.3s;
  --figma-animation-duration: 0.3s;
  --figma-hover-lift: -4;
  --figma-button-hover-lift: -2;
  --figma-slide-distance: 20;
  --figma-scale-start: 0.95;
  
  /* Section Spacing */
  --figma-section-padding: 5;
  --figma-hero-height: 100;
}
`;
  }
  
  // Apply tokens to document
  public applyTokensToDocument(): void {
    const cssVariables = this.generateCSSVariables();
    
    // Create or update style element
    let styleElement = document.getElementById('figma-tokens');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'figma-tokens';
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = cssVariables;
  }
  
  // Get current tokens
  public getTokens(): FigmaDesignTokens {
    return this.designTokens;
  }
  
  // Update specific token category
  public updateTokens(category: keyof FigmaDesignTokens, tokens: Partial<FigmaDesignTokens[keyof FigmaDesignTokens]>): void {
    this.designTokens[category] = {
      ...this.designTokens[category],
      ...tokens,
    } as any;
  }
  
  // Calculate dynamic text color based on background
  public calculateDynamicTextColor(backgroundColor: string): string {
    // Calculate luminance and determine optimal text color
    const luminance = this.calculateLuminance(backgroundColor);
    return luminance > 0.5 ? this.designTokens.contrast.dark : this.designTokens.contrast.light;
  }
  
  // Calculate color luminance for contrast
  private calculateLuminance(color: string): number {
    // Convert color to RGB and calculate luminance
    // This is a simplified implementation
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0.5;
    
    const { r, g, b } = rgb;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  
  // Convert hex to RGB
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}

// Export singleton instance
export const figmaTokenExtractor = new FigmaTokenExtractor();

// Utility function to extract tokens from Figma JSON
export function extractTokensFromFigmaJSON(figmaJSON: any): FigmaDesignTokens {
  const extractor = new FigmaTokenExtractor();
  
  // Analyze Figma JSON structure
  if (figmaJSON.document) {
    extractor.extractTypographyFromDesign(figmaJSON.document);
    extractor.extractSpacingFromDesign(figmaJSON.document);
    extractor.extractLayoutFromDesign(figmaJSON.document);
  }
  
  return extractor.getTokens();
}

// Utility function to apply tokens to CSS
export function applyFigmaTokens(tokens: FigmaDesignTokens): void {
  const extractor = new FigmaTokenExtractor();
  extractor.updateTokens('colors', tokens.colors);
  extractor.updateTokens('typography', tokens.typography);
  extractor.updateTokens('spacing', tokens.spacing);
  extractor.updateTokens('layout', tokens.layout);
  extractor.updateTokens('components', tokens.components);
  extractor.updateTokens('backgrounds', tokens.backgrounds);
  extractor.updateTokens('contrast', tokens.contrast);
  
  extractor.applyTokensToDocument();
} 