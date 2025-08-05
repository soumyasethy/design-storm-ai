// Font loading utility for dynamic Google Fonts integration

interface FontConfig {
  family: string;
  weights?: number[];
  styles?: string[];
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
}

class FontLoader {
  private loadedFonts: Set<string> = new Set();
  private loadingPromises: Map<string, Promise<void>> = new Map();

  /**
   * Convert font family name to Google Fonts URL
   */
  private getGoogleFontsUrl(fontFamily: string, weights: number[] = [400, 700], styles: string[] = ['normal'], display: string = 'swap'): string {
    const familyParam = fontFamily.replace(/\s+/g, '+');
    const weightParam = weights.join(';');
    const styleParam = styles.join(';');
    
    return `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weightParam}&display=${display}`;
  }

  /**
   * Load a single font family
   */
  async loadFont(fontFamily: string, weights: number[] = [400, 700], styles: string[] = ['normal'], display: string = 'swap'): Promise<void> {
    const fontKey = `${fontFamily}-${weights.join('-')}-${styles.join('-')}`;
    
    // Return if already loaded
    if (this.loadedFonts.has(fontKey)) {
      return Promise.resolve();
    }

    // Return existing promise if loading
    if (this.loadingPromises.has(fontKey)) {
      return this.loadingPromises.get(fontKey)!;
    }

    // Create new loading promise
    const loadPromise = this.loadFontInternal(fontFamily, weights, styles, display, fontKey);
    this.loadingPromises.set(fontKey, loadPromise);
    
    return loadPromise;
  }

  /**
   * Internal method to load font
   */
  private async loadFontInternal(fontFamily: string, weights: number[], styles: string[], display: string, fontKey: string): Promise<void> {
    try {
      const url = this.getGoogleFontsUrl(fontFamily, weights, styles, display);
      
      // Check if link already exists
      const existingLink = document.querySelector(`link[href="${url}"]`) as HTMLLinkElement;
      if (existingLink) {
        this.loadedFonts.add(fontKey);
        return Promise.resolve();
      }

      // Create new link element
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.crossOrigin = 'anonymous';

      // Wait for font to load
      await new Promise<void>((resolve, reject) => {
        link.onload = () => {
          this.loadedFonts.add(fontKey);
          this.loadingPromises.delete(fontKey);
          resolve();
        };
        link.onerror = () => {
          this.loadingPromises.delete(fontKey);
          reject(new Error(`Failed to load font: ${fontFamily}`));
        };
        document.head.appendChild(link);
      });

    } catch (error) {
      console.warn(`Font loading failed for ${fontFamily}:`, error);
      // Still mark as loaded to prevent infinite retries
      this.loadedFonts.add(fontKey);
      this.loadingPromises.delete(fontKey);
    }
  }

  /**
   * Load multiple fonts at once
   */
  async loadFonts(fonts: FontConfig[]): Promise<void> {
    const promises = fonts.map(font => 
      this.loadFont(
        font.family, 
        font.weights || [400, 700], 
        font.styles || ['normal'], 
        font.display || 'swap'
      )
    );
    
    await Promise.all(promises);
  }

  /**
   * Check if a font is loaded
   */
  isFontLoaded(fontFamily: string): boolean {
    return Array.from(this.loadedFonts).some(key => key.startsWith(fontFamily));
  }

  /**
   * Get CSS font-family value with fallbacks
   */
  getFontFamilyCSS(fontFamily: string): string {
    // Add fallbacks for better compatibility
    const fallbacks = {
      'Space Grotesk': '"Space Grotesk", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'Inter': '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'Roboto': '"Roboto", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'Open Sans': '"Open Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'Lato': '"Lato", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'Poppins': '"Poppins", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'Montserrat': '"Montserrat", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'Source Sans Pro': '"Source Sans Pro", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'Raleway': '"Raleway", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'Ubuntu': '"Ubuntu", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    };

    return fallbacks[fontFamily as keyof typeof fallbacks] || `"${fontFamily}", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  }

  /**
   * Preload critical fonts
   */
  async preloadCriticalFonts(): Promise<void> {
    const criticalFonts: FontConfig[] = [
      { family: 'Space Grotesk', weights: [400, 500, 600, 700] },
      { family: 'Inter', weights: [400, 500, 600, 700] },
      { family: 'Roboto', weights: [400, 500, 700] }
    ];

    await this.loadFonts(criticalFonts);
  }
}

// Create singleton instance
export const fontLoader = new FontLoader();

// Convenience function for loading single font
export const loadFont = (fontFamily: string, weights: number[] = [400, 700]): Promise<void> => {
  return fontLoader.loadFont(fontFamily, weights);
};

// Convenience function for getting font-family CSS
export const getFontFamilyCSS = (fontFamily: string): string => {
  return fontLoader.getFontFamilyCSS(fontFamily);
}; 