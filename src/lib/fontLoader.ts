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
   * Add preconnects to Google Fonts hosts once per page
   */
  private ensurePreconnects(): void {
    const add = (href: string, crossOrigin?: string) => {
      if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return;
      const l = document.createElement('link');
      l.rel = 'preconnect';
      l.href = href;
      if (crossOrigin) (l as HTMLLinkElement).crossOrigin = crossOrigin;
      document.head.appendChild(l);
    };
    try {
      add('https://fonts.googleapis.com');
      add('https://fonts.gstatic.com', 'anonymous');
    } catch {
      // no-op
    }
  }

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
      this.ensurePreconnects();
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
      // Remove crossOrigin to avoid CORS issues with Google Fonts

      // Wait for font to load
      await new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return; settled = true;
          this.loadedFonts.add(fontKey);
          this.loadingPromises.delete(fontKey);
          resolve();
        };

        link.onload = done;
        link.onerror = () => {
          // Do not reject: some browsers/extensions block onerror for CSS fonts.
          console.info(`Font CSS request reported error for ${fontFamily}, continuing with fallback load check.`);
          done();
        };
        document.head.appendChild(link);

        // Fallback: resolve after 1500ms if no load/error events fire
        setTimeout(done, 1500);
      });

      // Try to explicitly load the font via Font Loading API; ignore failures
      if (document?.fonts && weights?.length) {
        try {
          await Promise.race([
            Promise.all(weights.map(w => (document as any).fonts.load(`${w} 1em ${fontFamily}`))),
            new Promise((r) => setTimeout(r, 1500)),
          ]);
        } catch {/* ignore */}
      }
    } catch (error) {
      console.info(`Font loading fallback for ${fontFamily}:`, error);
      // Still mark as loaded to prevent infinite retries
      this.loadedFonts.add(fontKey);
      this.loadingPromises.delete(fontKey);
      
      // Don't throw error to prevent app crashes
      return Promise.resolve();
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