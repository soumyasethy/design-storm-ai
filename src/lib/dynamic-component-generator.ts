// Dynamic Component Generator
// Auto-generates adaptive components from Figma design analysis

export interface DynamicComponentConfig {
  type: 'card' | 'button' | 'navigation' | 'hero' | 'section' | 'grid' | 'overlay';
  variants: {
    [key: string]: {
      styles: Record<string, string>;
      responsive?: Record<string, Record<string, string>>;
      states?: {
        hover?: Record<string, string>;
        focus?: Record<string, string>;
        active?: Record<string, string>;
      };
    };
  };
  defaultVariant: string;
}

export interface FigmaElementAnalysis {
  type: string;
  position: { x: number; y: number; width: number; height: number };
  styles: {
    background?: string;
    color?: string;
    fontSize?: number;
    fontWeight?: number;
    borderRadius?: number;
    padding?: { top: number; right: number; bottom: number; left: number };
    margin?: { top: number; right: number; bottom: number; left: number };
    border?: string;
    shadow?: string;
  };
  children?: FigmaElementAnalysis[];
}

export class DynamicComponentGenerator {
  private componentRegistry: Map<string, DynamicComponentConfig> = new Map();
  
  constructor() {
    this.initializeDefaultComponents();
  }
  
  // Initialize default component configurations
  private initializeDefaultComponents(): void {
    // Card Component
    this.registerComponent('card', {
      type: 'card',
      variants: {
        default: {
          styles: {
            background: 'var(--card-bg)',
            borderRadius: 'var(--card-radius)',
            padding: 'var(--card-padding)',
            boxShadow: 'var(--card-shadow)',
            transition: 'all var(--figma-transition-duration, 0.3s) ease',
          },
          states: {
            hover: {
              transform: 'translateY(calc(var(--figma-hover-lift, -4) * 1px))',
              boxShadow: 'var(--figma-hover-shadow, 0 10px 25px -3px rgb(0 0 0 / 0.1))',
            },
          },
        },
        elevated: {
          styles: {
            background: 'var(--card-bg)',
            borderRadius: 'var(--card-radius)',
            padding: 'var(--card-padding)',
            boxShadow: 'var(--figma-shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1))',
            transition: 'all var(--figma-transition-duration, 0.3s) ease',
          },
          states: {
            hover: {
              transform: 'translateY(calc(var(--figma-hover-lift, -6) * 1px))',
              boxShadow: 'var(--figma-shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1))',
            },
          },
        },
      },
      defaultVariant: 'default',
    });
    
    // Button Component
    this.registerComponent('button', {
      type: 'button',
      variants: {
        primary: {
          styles: {
            background: 'var(--button-bg)',
            color: 'var(--button-color)',
            borderRadius: 'var(--button-radius)',
            padding: 'var(--button-padding)',
            fontWeight: 'var(--figma-button-weight, 600)',
            fontSize: 'var(--figma-button-text-size, var(--font-size-base))',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--spacing-sm)',
            transition: 'all var(--figma-transition-duration, 0.3s) ease',
          },
          states: {
            hover: {
              background: 'var(--figma-button-hover-bg, color-mix(in srgb, var(--button-bg) 90%, black))',
              transform: 'translateY(calc(var(--figma-button-hover-lift, -2) * 1px))',
            },
            active: {
              transform: 'translateY(0)',
            },
          },
        },
        secondary: {
          styles: {
            background: 'transparent',
            color: 'var(--primary)',
            borderRadius: 'var(--button-radius)',
            padding: 'var(--button-padding)',
            fontWeight: 'var(--figma-button-weight, 600)',
            fontSize: 'var(--figma-button-text-size, var(--font-size-base))',
            border: '1px solid var(--primary)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--spacing-sm)',
            transition: 'all var(--figma-transition-duration, 0.3s) ease',
          },
          states: {
            hover: {
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
            },
          },
        },
      },
      defaultVariant: 'primary',
    });
    
    // Navigation Component
    this.registerComponent('navigation', {
      type: 'navigation',
      variants: {
        default: {
          styles: {
            backdropFilter: 'blur(var(--figma-nav-blur, 10px))',
            background: 'var(--figma-nav-background, rgba(0, 0, 0, 0.8))',
            borderBottom: '1px solid var(--figma-nav-border, transparent)',
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            zIndex: '50',
          },
        },
        transparent: {
          styles: {
            background: 'transparent',
            borderBottom: 'none',
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            zIndex: '50',
          },
        },
      },
      defaultVariant: 'default',
    });
    
    // Hero Component
    this.registerComponent('hero', {
      type: 'hero',
      variants: {
        default: {
          styles: {
            minHeight: 'calc(var(--figma-hero-height, 100) * 1vh)',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--hero-background)',
          },
        },
        fullscreen: {
          styles: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--hero-background)',
          },
        },
      },
      defaultVariant: 'default',
    });
    
    // Grid Component
    this.registerComponent('grid', {
      type: 'grid',
      variants: {
        adaptive: {
          styles: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(var(--figma-min-column-width, 300px), 1fr))',
            gap: 'var(--grid-gap)',
          },
          responsive: {
            mobile: {
              gridTemplateColumns: 'var(--figma-mobile-columns, 1fr)',
            },
            tablet: {
              gridTemplateColumns: 'var(--figma-tablet-columns, repeat(2, 1fr))',
            },
            desktop: {
              gridTemplateColumns: 'var(--figma-desktop-columns, repeat(3, 1fr))',
            },
            large: {
              gridTemplateColumns: 'var(--figma-large-columns, repeat(4, 1fr))',
            },
          },
        },
        responsive: {
          styles: {
            display: 'grid',
            gridTemplateColumns: 'var(--figma-mobile-columns, 1fr)',
            gap: 'var(--grid-gap)',
          },
          responsive: {
            tablet: {
              gridTemplateColumns: 'var(--figma-tablet-columns, repeat(2, 1fr))',
            },
            desktop: {
              gridTemplateColumns: 'var(--figma-desktop-columns, repeat(3, 1fr))',
            },
          },
        },
      },
      defaultVariant: 'adaptive',
    });
    
    // Overlay Component
    this.registerComponent('overlay', {
      type: 'overlay',
      variants: {
        geometric: {
          styles: {
            position: 'absolute',
            background: 'var(--figma-overlay-gradient, linear-gradient(135deg, var(--primary), var(--accent)))',
            opacity: 'var(--overlay-opacity)',
            transform: 'rotate(var(--geometric-rotation))',
            pointerEvents: 'none',
          },
        },
        gradient: {
          styles: {
            position: 'absolute',
            background: 'var(--figma-overlay-gradient, linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1)))',
            inset: '0',
            pointerEvents: 'none',
          },
        },
      },
      defaultVariant: 'geometric',
    });
  }
  
  // Register a new component configuration
  public registerComponent(name: string, config: DynamicComponentConfig): void {
    this.componentRegistry.set(name, config);
  }
  
  // Generate CSS classes for a component
  public generateComponentCSS(componentName: string, variant?: string): string {
    const component = this.componentRegistry.get(componentName);
    if (!component) {
      throw new Error(`Component '${componentName}' not found`);
    }
    
    const variantName = variant || component.defaultVariant;
    const variantConfig = component.variants[variantName];
    if (!variantConfig) {
      throw new Error(`Variant '${variantName}' not found for component '${componentName}'`);
    }
    
    let css = `.${componentName}-${variantName} {\n`;
    
    // Base styles
    Object.entries(variantConfig.styles).forEach(([property, value]) => {
      css += `  ${property}: ${value};\n`;
    });
    
    css += '}\n\n';
    
    // Hover states
    if (variantConfig.states?.hover) {
      css += `.${componentName}-${variantName}:hover {\n`;
      Object.entries(variantConfig.states.hover).forEach(([property, value]) => {
        css += `  ${property}: ${value};\n`;
      });
      css += '}\n\n';
    }
    
    // Focus states
    if (variantConfig.states?.focus) {
      css += `.${componentName}-${variantName}:focus {\n`;
      Object.entries(variantConfig.states.focus).forEach(([property, value]) => {
        css += `  ${property}: ${value};\n`;
      });
      css += '}\n\n';
    }
    
    // Active states
    if (variantConfig.states?.active) {
      css += `.${componentName}-${variantName}:active {\n`;
      Object.entries(variantConfig.states.active).forEach(([property, value]) => {
        css += `  ${property}: ${value};\n`;
      });
      css += '}\n\n';
    }
    
    // Responsive styles
    if (variantConfig.responsive) {
      Object.entries(variantConfig.responsive).forEach(([breakpoint, styles]) => {
        css += `@container (min-width: var(--breakpoint-${breakpoint})) {\n`;
        css += `  .${componentName}-${variantName} {\n`;
        Object.entries(styles).forEach(([property, value]) => {
          css += `    ${property}: ${value};\n`;
        });
        css += '  }\n';
        css += '}\n\n';
      });
    }
    
    return css;
  }
  
  // Generate all component CSS
  public generateAllComponentCSS(): string {
    let css = '/* Auto-generated Component CSS */\n\n';
    
    this.componentRegistry.forEach((component, name) => {
      Object.keys(component.variants).forEach(variant => {
        css += this.generateComponentCSS(name, variant);
      });
    });
    
    return css;
  }
  
  // Analyze Figma elements and generate component configurations
  public analyzeFigmaElements(elements: FigmaElementAnalysis[]): void {
    elements.forEach(element => {
      this.analyzeElement(element);
    });
  }
  
  // Analyze individual element and create component if needed
  private analyzeElement(element: FigmaElementAnalysis): void {
    // Detect component type based on element properties
    const componentType = this.detectComponentType(element);
    
    if (componentType) {
      // Create component configuration from element analysis
      const config = this.createComponentConfig(element, componentType);
      this.registerComponent(`${componentType}-${Date.now()}`, config);
    }
    
    // Recursively analyze children
    if (element.children) {
      element.children.forEach(child => this.analyzeElement(child));
    }
  }
  
  // Detect component type from element analysis
  private detectComponentType(element: FigmaElementAnalysis): string | null {
    const { styles, position } = element;
    
    // Detect card component
    if (styles.borderRadius && styles.borderRadius > 0 && styles.shadow) {
      return 'card';
    }
    
    // Detect button component
    if (position.width < 200 && position.height < 60 && styles.background) {
      return 'button';
    }
    
    // Detect navigation component
    if (position.height < 100 && position.y < 100 && styles.background) {
      return 'navigation';
    }
    
    // Detect hero component
    if (position.height > 400 && styles.background) {
      return 'hero';
    }
    
    // Detect grid component
    if (element.children && element.children.length > 2) {
      return 'grid';
    }
    
    return null;
  }
  
  // Create component configuration from element analysis
  private createComponentConfig(element: FigmaElementAnalysis, type: string): DynamicComponentConfig {
    const { styles, position } = element;
    
    const baseStyles: Record<string, string> = {};
    
    // Convert Figma styles to CSS properties
    if (styles.background) {
      baseStyles.background = styles.background;
    }
    
    if (styles.color) {
      baseStyles.color = styles.color;
    }
    
    if (styles.fontSize) {
      baseStyles.fontSize = `calc(${styles.fontSize} * var(--scale-factor, 1))`;
    }
    
    if (styles.fontWeight) {
      baseStyles.fontWeight = styles.fontWeight.toString();
    }
    
    if (styles.borderRadius) {
      baseStyles.borderRadius = `calc(${styles.borderRadius} * var(--scale-factor, 1))`;
    }
    
    if (styles.padding) {
      const { top, right, bottom, left } = styles.padding;
      baseStyles.padding = `calc(${top} * var(--scale-factor, 1)) calc(${right} * var(--scale-factor, 1)) calc(${bottom} * var(--scale-factor, 1)) calc(${left} * var(--scale-factor, 1))`;
    }
    
    if (styles.margin) {
      const { top, right, bottom, left } = styles.margin;
      baseStyles.margin = `calc(${top} * var(--scale-factor, 1)) calc(${right} * var(--scale-factor, 1)) calc(${bottom} * var(--scale-factor, 1)) calc(${left} * var(--scale-factor, 1))`;
    }
    
    if (styles.border) {
      baseStyles.border = styles.border;
    }
    
    if (styles.shadow) {
      baseStyles.boxShadow = styles.shadow;
    }
    
    // Add responsive positioning
    baseStyles.width = `calc(${position.width} * var(--scale-factor, 1))`;
    baseStyles.height = `calc(${position.height} * var(--scale-factor, 1))`;
    baseStyles.position = 'absolute';
    baseStyles.left = `calc(${position.x} * var(--scale-factor, 1))`;
    baseStyles.top = `calc(${position.y} * var(--scale-factor, 1))`;
    
    return {
      type: type as any,
      variants: {
        default: {
          styles: baseStyles,
          states: {
            hover: {
              transform: 'translateY(calc(var(--figma-hover-lift, -2) * 1px))',
            },
          },
        },
      },
      defaultVariant: 'default',
    };
  }
  
  // Generate React component class names
  public generateComponentClassNames(componentName: string, variant?: string): string {
    const component = this.componentRegistry.get(componentName);
    if (!component) {
      throw new Error(`Component '${componentName}' not found`);
    }
    
    const variantName = variant || component.defaultVariant;
    return `${componentName}-${variantName}`;
  }
  
  // Get all registered component names
  public getRegisteredComponents(): string[] {
    return Array.from(this.componentRegistry.keys());
  }
  
  // Get component configuration
  public getComponentConfig(componentName: string): DynamicComponentConfig | undefined {
    return this.componentRegistry.get(componentName);
  }
  
  // Apply component CSS to document
  public applyComponentCSS(): void {
    const css = this.generateAllComponentCSS();
    
    // Create or update style element
    let styleElement = document.getElementById('dynamic-components');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'dynamic-components';
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = css;
  }
}

// Export singleton instance
export const dynamicComponentGenerator = new DynamicComponentGenerator();

// Utility function to generate component from Figma JSON
export function generateComponentsFromFigma(figmaJSON: any): void {
  if (figmaJSON.document) {
    const elements = extractElementsFromFigmaJSON(figmaJSON.document);
    dynamicComponentGenerator.analyzeFigmaElements(elements);
    dynamicComponentGenerator.applyComponentCSS();
  }
}

// Utility function to extract elements from Figma JSON
function extractElementsFromFigmaJSON(node: any): FigmaElementAnalysis[] {
  const elements: FigmaElementAnalysis[] = [];
  
  function traverse(node: any): void {
    if (node.absoluteBoundingBox) {
      const element: FigmaElementAnalysis = {
        type: node.type,
        position: {
          x: node.absoluteBoundingBox.x,
          y: node.absoluteBoundingBox.y,
          width: node.absoluteBoundingBox.width,
          height: node.absoluteBoundingBox.height,
        },
        styles: {
          background: extractBackground(node),
          color: extractColor(node),
          fontSize: extractFontSize(node),
          fontWeight: extractFontWeight(node),
          borderRadius: extractBorderRadius(node),
          padding: extractPadding(node),
          margin: extractMargin(node),
          border: extractBorder(node),
          shadow: extractShadow(node),
        },
        children: node.children ? node.children.map(traverse) : undefined,
      };
      
      elements.push(element);
    }
    
    if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  traverse(node);
  return elements;
}

// Helper functions to extract styles from Figma nodes
function extractBackground(node: any): string | undefined {
  if (node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID') {
      return `rgb(${fill.color.r * 255}, ${fill.color.g * 255}, ${fill.color.b * 255})`;
    }
  }
  return undefined;
}

function extractColor(node: any): string | undefined {
  if (node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID') {
      return `rgb(${fill.color.r * 255}, ${fill.color.g * 255}, ${fill.color.b * 255})`;
    }
  }
  return undefined;
}

function extractFontSize(node: any): number | undefined {
  return node.style?.fontSize;
}

function extractFontWeight(node: any): number | undefined {
  return node.style?.fontWeight;
}

function extractBorderRadius(node: any): number | undefined {
  return node.cornerRadius;
}

function extractPadding(node: any): { top: number; right: number; bottom: number; left: number } | undefined {
  // Figma doesn't have direct padding, but we can calculate from children positioning
  return undefined;
}

function extractMargin(node: any): { top: number; right: number; bottom: number; left: number } | undefined {
  // Figma doesn't have direct margin, but we can calculate from parent positioning
  return undefined;
}

function extractBorder(node: any): string | undefined {
  if (node.strokes && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    if (stroke.type === 'SOLID') {
      return `${node.strokeWeight}px solid rgb(${stroke.color.r * 255}, ${stroke.color.g * 255}, ${stroke.color.b * 255})`;
    }
  }
  return undefined;
}

function extractShadow(node: any): string | undefined {
  if (node.effects && node.effects.length > 0) {
    const effect = node.effects[0];
    if (effect.type === 'DROP_SHADOW') {
      return `${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px rgba(0, 0, 0, ${effect.opacity})`;
    }
  }
  return undefined;
} 