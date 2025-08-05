# Font Utilities for Figma-to-Code Platform

## 🎯 Overview

This comprehensive font utility system provides robust emoji support and font fallbacks for Figma-to-code applications. It ensures that emojis (🏀❤️🔥) render correctly across all platforms while maintaining proper font hierarchy.

## 🚀 Key Features

- **🎨 Emoji Support**: Automatic system emoji font fallbacks
- **🔄 Smart Detection**: Automatic font category detection (sans, serif, mono)
- **📱 Cross-Platform**: Works on macOS, Windows, Android, Linux
- **🎯 Google Fonts**: Built-in Google Fonts integration
- **🛠️ Multiple Formats**: React inline styles, Tailwind config, CSS declarations

## 📦 Installation

The utilities are already integrated into your project. Import them as needed:

```typescript
import { 
  createReactFontFamily, 
  createTailwindFontFamily, 
  createCSSFontDeclaration,
  extractFontNamesFromFigma,
  generateTailwindFontConfig 
} from '@/lib/fontUtils';
```

## 🎨 Core Functions

### `createFontFamily(fontName, options)`

Creates a complete font-family CSS string with emoji support.

```typescript
import { createFontFamily } from '@/lib/fontUtils';

// Basic usage
const fontStack = createFontFamily('Space Grotesk');
// Returns: "Space Grotesk", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", ...

// With options
const fontStack = createFontFamily('Space Grotesk', {
  includeEmoji: true,        // Include emoji fonts (default: true)
  customFallbacks: [],       // Custom fallback fonts
  forceQuotes: false         // Force quotes around font name (default: false)
});
```

### `createReactFontFamily(fontName)`

Optimized for React inline styles.

```typescript
import { createReactFontFamily } from '@/lib/fontUtils';

const fontFamily = createReactFontFamily('Space Grotesk');
// Returns: Space Grotesk, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", ...

// Usage in React
<div style={{ fontFamily: createReactFontFamily('Space Grotesk') }}>
  🏀❤️🔥 Let's build India's largest sports company! 🚀
</div>
```

### `createTailwindFontFamily(fontName)`

Optimized for Tailwind CSS configuration.

```typescript
import { createTailwindFontFamily } from '@/lib/fontUtils';

const fontFamily = createTailwindFontFamily('Space Grotesk');
// Returns: "Space Grotesk", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", ...

// Usage in tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        'space-grotesk': createTailwindFontFamily('Space Grotesk'),
        'inter': createTailwindFontFamily('Inter'),
      }
    }
  }
}
```

### `createCSSFontDeclaration(fontName)`

Creates a complete CSS declaration.

```typescript
import { createCSSFontDeclaration } from '@/lib/fontUtils';

const cssDeclaration = createCSSFontDeclaration('Space Grotesk');
// Returns: font-family: "Space Grotesk", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", ...;
```

## 🔧 Advanced Functions

### `extractFontNamesFromFigma(figmaData)`

Extracts all unique font names from Figma JSON data.

```typescript
import { extractFontNamesFromFigma } from '@/lib/fontUtils';

const fontNames = extractFontNamesFromFigma(figmaData);
// Returns: ['Space Grotesk', 'Inter', 'Roboto', ...]

// Use with font loading
fontNames.forEach(fontName => {
  loadFont(fontName); // Your font loading function
});
```

### `generateTailwindFontConfig(fontNames)`

Generates Tailwind CSS configuration for multiple fonts.

```typescript
import { generateTailwindFontConfig } from '@/lib/fontUtils';

const fontNames = ['Space Grotesk', 'Inter', 'Poppins'];
const tailwindConfig = generateTailwindFontConfig(fontNames);

// Returns:
// {
//   'space-grotesk': ['Space Grotesk', 'system-ui', '-apple-system', ...],
//   'inter': ['Inter', 'system-ui', '-apple-system', ...],
//   'poppins': ['Poppins', 'system-ui', '-apple-system', ...]
// }
```

## 🎨 Emoji Font Support

The system includes comprehensive emoji font fallbacks:

```typescript
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
```

## 🔄 Font Category Detection

The system automatically detects font categories:

### Sans-Serif Fonts
- Inter, Roboto, Open Sans, Lato, Poppins, Montserrat, etc.
- Fallback: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Serif Fonts
- Playfair Display, Merriweather, Georgia, Times, etc.
- Fallback: `Georgia, Times, "Times New Roman", serif`

### Monospace Fonts
- Source Code Pro, Fira Code, JetBrains Mono, etc.
- Fallback: `SF Mono, Monaco, Inconsolata, "Roboto Mono", "Menlo", "Consolas", monospace`

## 🎯 Google Fonts Integration

Built-in support for popular Google Fonts with optimized fallbacks:

```typescript
const GOOGLE_FONTS_FALLBACKS = {
  'Space Grotesk': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  'Inter': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  'Poppins': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  'Playfair Display': ['Georgia', 'Times', 'Times New Roman', 'serif'],
  'Source Code Pro': ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Menlo', 'Consolas', 'monospace'],
  // ... and many more
};
```

## 🚀 Usage Examples

### React Component with Emoji Support

```typescript
import React from 'react';
import { createReactFontFamily } from '@/lib/fontUtils';

const EmojiText: React.FC<{ text: string; font: string }> = ({ text, font }) => {
  return (
    <div style={{ 
      fontFamily: createReactFontFamily(font),
      fontSize: '18px',
      lineHeight: '1.6'
    }}>
      {text}
    </div>
  );
};

// Usage
<EmojiText 
  text="🏀❤️🔥 Let's build India's largest sports company! 🚀" 
  font="Space Grotesk" 
/>
```

### Tailwind Configuration

```javascript
// tailwind.config.js
const { createTailwindFontFamily } = require('./src/lib/fontUtils');

module.exports = {
  theme: {
    extend: {
      fontFamily: {
        'space-grotesk': createTailwindFontFamily('Space Grotesk'),
        'inter': createTailwindFontFamily('Inter'),
        'poppins': createTailwindFontFamily('Poppins'),
      }
    }
  }
};
```

### CSS-in-JS Usage

```typescript
import { createCSSFontDeclaration } from '@/lib/fontUtils';

const styles = {
  heading: {
    ...createCSSFontDeclaration('Space Grotesk'),
    fontSize: '24px',
    fontWeight: 'bold'
  }
};
```

### Dynamic Font Loading from Figma

```typescript
import { extractFontNamesFromFigma, createReactFontFamily } from '@/lib/fontUtils';

// Extract fonts from Figma data
const fontNames = extractFontNamesFromFigma(figmaData);

// Load fonts dynamically
fontNames.forEach(fontName => {
  // Load Google Font
  loadGoogleFont(fontName);
  
  // Use in components
  const fontFamily = createReactFontFamily(fontName);
  console.log(`${fontName}: ${fontFamily}`);
});
```

## 🎨 Demo Component

Use the included `EmojiTextDemo` component to test emoji support:

```typescript
import { EmojiTextDemo } from '@/components/EmojiTextDemo';

// In your page/component
<EmojiTextDemo />
```

## 🔧 Integration with Existing Code

The utilities are already integrated into your Figma renderer:

1. **Updated `getFontFamilyWithFallback`** in `utils.ts` to use the new system
2. **Enhanced `FigmaText` component** to use `createReactFontFamily`
3. **Character-level font support** in `processRichText` function

## 🎯 Best Practices

1. **Always use the utility functions** instead of hardcoding font stacks
2. **Test with emojis** to ensure proper rendering
3. **Use appropriate function** for your use case (React, Tailwind, CSS)
4. **Extract fonts from Figma data** for dynamic loading
5. **Include emoji fonts** for better cross-platform support

## 🚀 Performance

- **Lightweight**: Minimal bundle size impact
- **Cached**: Font stacks are computed once and reused
- **Optimized**: Smart detection reduces unnecessary fallbacks
- **Tree-shakeable**: Only import what you need

## 🎨 Browser Support

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ System emoji fonts on all platforms

---

**🎯 Ready to use!** Your Figma-to-code platform now has comprehensive emoji support with proper font fallbacks across all platforms. 