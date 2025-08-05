import { useEffect, useState } from 'react';
import { fontLoader, loadFont } from './fontLoader';

interface UseFontLoaderOptions {
  weights?: number[];
  styles?: string[];
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  preload?: boolean;
}

interface UseFontLoaderReturn {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  loadFont: (fontFamily: string) => Promise<void>;
}

/**
 * React hook for loading Google Fonts dynamically
 */
export function useFontLoader(
  fontFamily?: string,
  options: UseFontLoaderOptions = {}
): UseFontLoaderReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { weights = [400, 700], styles = ['normal'], display = 'swap', preload = false } = options;

  // Load font when fontFamily changes
  useEffect(() => {
    if (!fontFamily) return;

    const loadFontFamily = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        await loadFont(fontFamily, weights);
        setIsLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load font');
        console.warn(`Font loading failed for ${fontFamily}:`, err);
      } finally {
        setIsLoading(false);
      }
    };

    loadFontFamily();
  }, [fontFamily, weights.join(','), styles.join(','), display]);

  // Preload critical fonts on mount
  useEffect(() => {
    if (preload) {
      fontLoader.preloadCriticalFonts().catch(console.warn);
    }
  }, [preload]);

  const loadFontManually = async (fontFamily: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await loadFont(fontFamily, weights);
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load font');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoaded,
    isLoading,
    error,
    loadFont: loadFontManually
  };
}

/**
 * Hook for loading multiple fonts
 */
export function useMultipleFonts(
  fontFamilies: string[],
  options: UseFontLoaderOptions = {}
): UseFontLoaderReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { weights = [400, 700], styles = ['normal'], display = 'swap' } = options;

  useEffect(() => {
    if (fontFamilies.length === 0) return;

    const loadFonts = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        await fontLoader.loadFonts(
          fontFamilies.map(family => ({
            family,
            weights,
            styles,
            display
          }))
        );
        setIsLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load fonts');
        console.warn('Font loading failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadFonts();
  }, [fontFamilies.join(','), weights.join(','), styles.join(','), display]);

  const loadFontManually = async (fontFamily: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await loadFont(fontFamily, weights);
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load font');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoaded,
    isLoading,
    error,
    loadFont: loadFontManually
  };
} 