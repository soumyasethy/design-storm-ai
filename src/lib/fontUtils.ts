// Font utilities for Figma-to-code platform with emoji support

/**
 * System emoji fonts in order of preference
 */
const EMOJI_FONTS = [
  'Apple Color Emoji',      // macOS, iOS
  'Segoe UI Emoji',         // Windows
  'Noto Color Emoji',       // Android, Linux
  'Android Emoji',          // Android
  'EmojiSymbols',           // Legacy
  'Symbola',                // Linux
  'Twemoji Mozilla',        // Firefox
  'EmojiOne Mozilla',       // Firefox
  'Noto Emoji',             // Google
  'JoyPixels',              // Legacy
  'OpenSans Emoji',         // Legacy
  'Emoji'                   // Generic fallback
];

/**
 * System font fallbacks for different font categories
 */
const SYSTEM_FONTS = {
  sans: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif'
  ],
  serif: [
    'Georgia',
    'Times',
    'Times New Roman',
    'serif'
  ],
  mono: [
    'SF Mono',
    'Monaco',
    'Inconsolata',
    'Roboto Mono',
    'Source Code Pro',
    'Menlo',
    'Consolas',
    'DejaVu Sans Mono',
    'monospace'
  ]
};

/**
 * Common Google Fonts mapping for better fallbacks
 */
const GOOGLE_FONTS_FALLBACKS: Record<string, string[]> = {
  'Space Grotesk': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  'Inter': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  'Roboto': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  'Open Sans': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  'Lato': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  'Poppins': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  'Montserrat': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  'Source Sans Pro': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  'Raleway': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  'Ubuntu': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  'Playfair Display': ['Georgia', 'Times', 'Times New Roman', 'serif'],
  'Merriweather': ['Georgia', 'Times', 'Times New Roman', 'serif'],
  'Source Code Pro': ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Menlo', 'Consolas', 'monospace'],
  'Fira Code': ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Menlo', 'Consolas', 'monospace'],
  'JetBrains Mono': ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Menlo', 'Consolas', 'monospace']
};

/**
 * Detect if a font name is likely a monospace font
 */
function isMonospaceFont(fontName: string): boolean {
  const monoKeywords = ['mono', 'code', 'console', 'terminal', 'fira', 'jetbrains', 'source code'];
  return monoKeywords.some(keyword => 
    fontName.toLowerCase().includes(keyword)
  );
}

/**
 * Detect if a font name is likely a serif font
 */
function isSerifFont(fontName: string): boolean {
  const serifKeywords = ['serif', 'times', 'georgia', 'playfair', 'merriweather', 'garamond', 'baskerville'];
  return serifKeywords.some(keyword => 
    fontName.toLowerCase().includes(keyword)
  );
}

/**
 * Get the appropriate system font fallback based on font type
 */
function getSystemFallback(fontName: string): string[] {
  if (isMonospaceFont(fontName)) {
    return SYSTEM_FONTS.mono;
  }
  if (isSerifFont(fontName)) {
    return SYSTEM_FONTS.serif;
  }
  return SYSTEM_FONTS.sans;
}

/**
 * Create a complete font-family CSS string with emoji support
 * @param fontName - The Figma font name (e.g., "Space Grotesk")
 * @param options - Configuration options
 * @returns Complete font-family CSS string
 */
export function createFontFamily(
  fontName: string,
  options: {
    includeEmoji?: boolean;
    customFallbacks?: string[];
    forceQuotes?: boolean;
  } = {}
): string {
  const {
    includeEmoji = true,
    customFallbacks = [],
    forceQuotes = false
  } = options;

  // Clean the font name
  const cleanFontName = fontName.trim();
  
  // Determine if we need quotes around the font name
  const needsQuotes = forceQuotes || 
    cleanFontName.includes(' ') || 
    cleanFontName.includes(',') ||
    cleanFontName.includes('"') ||
    cleanFontName.includes("'");

  // Build the font stack
  const fontStack: string[] = [];

  // 1. Primary font (with quotes if needed)
  if (needsQuotes) {
    fontStack.push(`"${cleanFontName}"`);
  } else {
    fontStack.push(cleanFontName);
  }

  // 2. Custom fallbacks (if provided)
  if (customFallbacks.length > 0) {
    fontStack.push(...customFallbacks);
  }

  // 3. Google Fonts specific fallbacks
  const googleFallback = GOOGLE_FONTS_FALLBACKS[cleanFontName];
  if (googleFallback) {
    fontStack.push(...googleFallback);
  } else {
    // 4. Generic system fallbacks based on font type
    fontStack.push(...getSystemFallback(cleanFontName));
  }

  // 5. Emoji fonts (if enabled)
  if (includeEmoji) {
    fontStack.push(...EMOJI_FONTS);
  }

  return fontStack.join(', ');
}

/**
 * Create a Tailwind-compatible font family value
 * @param fontName - The Figma font name
 * @returns Font family string suitable for Tailwind config
 */
export function createTailwindFontFamily(fontName: string): string {
  return createFontFamily(fontName, {
    includeEmoji: true,
    forceQuotes: true
  });
}

/**
 * Create a React inline style font-family value
 * @param fontName - The Figma font name
 * @returns Font family string for React style prop
 */
export function createReactFontFamily(fontName: string): string {
  return createFontFamily(fontName, {
    includeEmoji: true,
    forceQuotes: false
  });
}

/**
 * Generate Tailwind CSS config for font families
 * @param fontNames - Array of Figma font names
 * @returns Tailwind fontFamily configuration object
 */
export function generateTailwindFontConfig(fontNames: string[]): Record<string, string[]> {
  const fontFamily: Record<string, string[]> = {};
  
  fontNames.forEach(fontName => {
    const cleanName = fontName.trim();
    const key = cleanName.toLowerCase().replace(/\s+/g, '-');
    
    // Create font stack without quotes for Tailwind config
    const fontStack = createFontFamily(cleanName, {
      includeEmoji: true,
      forceQuotes: false
    }).split(', ');
    
    fontFamily[key] = fontStack;
  });
  
  return fontFamily;
}

/**
 * Extract font names from Figma JSON data
 * @param figmaData - Figma JSON data
 * @returns Array of unique font names
 */
export function extractFontNamesFromFigma(figmaData: any): string[] {
  const fontNames = new Set<string>();
  
  function traverse(node: any) {
    if (node.style?.fontFamily) {
      fontNames.add(node.style.fontFamily);
    }
    
    if (node.styleOverrideTable) {
      Object.values(node.styleOverrideTable).forEach((style: any) => {
        if (style.fontFamily) {
          fontNames.add(style.fontFamily);
        }
      });
    }
    
    if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  // Handle different Figma data structures
  if (figmaData.document) {
    traverse(figmaData.document);
  } else if (figmaData.nodes) {
    Object.values(figmaData.nodes).forEach((nodeData: any) => {
      if (nodeData.document) {
        traverse(nodeData.document);
      }
    });
  }
  
  return Array.from(fontNames);
}

/**
 * Create a complete CSS font-family declaration
 * @param fontName - The Figma font name
 * @returns CSS declaration string
 */
export function createCSSFontDeclaration(fontName: string): string {
  const fontFamily = createFontFamily(fontName, {
    includeEmoji: true,
    forceQuotes: true
  });
  
  return `font-family: ${fontFamily};`;
}

// Export individual emoji fonts for custom use
export { EMOJI_FONTS, SYSTEM_FONTS, GOOGLE_FONTS_FALLBACKS }; 