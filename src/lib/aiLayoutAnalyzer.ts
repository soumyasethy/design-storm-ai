export interface LayoutAnalysis {
  layoutType: 'scroll' | 'grid' | 'carousel' | 'flex' | 'absolute' | 'relative';
  direction?: 'horizontal' | 'vertical';
  columns?: number;
  gap?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  scrollBehavior?: 'smooth' | 'auto';
  carouselConfig?: {
    autoPlay?: boolean;
    showDots?: boolean;
    showArrows?: boolean;
    infinite?: boolean;
  };
  gridConfig?: {
    autoFit?: boolean;
    minColumnWidth?: number;
    responsive?: boolean;
  };
  zIndexStrategy?: 'stacking' | 'layered' | 'modal';
  positioning?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
}

export interface NodePattern {
  type: string;
  count: number;
  averageWidth: number;
  averageHeight: number;
  spacing: number;
  alignment: 'start' | 'center' | 'end' | 'space-between';
  repetition: boolean;
  similarSizes: boolean;
  consistentSpacing: boolean;
}

export interface LayoutContext {
  parentType: string;
  parentWidth: number;
  parentHeight: number;
  childCount: number;
  childrenTypes: string[];
  hasScrollableContent: boolean;
  isOverflowing: boolean;
  depth: number;
  isRoot: boolean;
}

/**
 * AI-powered layout analyzer that determines optimal layout strategies
 * based on Figma node patterns and context
 * 
 * This analyzer uses intelligent pattern recognition to automatically determine
 * the best layout approach for each component:
 * 
 * 1. **Carousel Detection**: Identifies horizontal scrolling content with similar items
 * 2. **Grid Detection**: Recognizes grid-like arrangements with consistent spacing
 * 3. **Scroll Detection**: Detects content that overflows and needs scrolling
 * 4. **Absolute Positioning**: Identifies overlapping elements and complex layering
 * 5. **Flex Layout**: Default for auto-layout frames and simple arrangements
 * 
 * Example Use Cases:
 * 
 * ```typescript
 * // Product Gallery - Detected as Carousel
 * const productGallery = {
 *   type: 'FRAME',
 *   children: [
 *     { type: 'RECTANGLE', width: 300, height: 200 }, // Product card
 *     { type: 'RECTANGLE', width: 300, height: 200 }, // Product card
 *     { type: 'RECTANGLE', width: 300, height: 200 }, // Product card
 *   ]
 * };
 * // Result: layoutType: 'carousel', direction: 'horizontal'
 * 
 * // Blog Grid - Detected as Grid
 * const blogGrid = {
 *   type: 'FRAME',
 *   children: [
 *     { type: 'RECTANGLE', width: 250, height: 180 }, // Blog post
 *     { type: 'RECTANGLE', width: 250, height: 180 }, // Blog post
 *     { type: 'RECTANGLE', width: 250, height: 180 }, // Blog post
 *     { type: 'RECTANGLE', width: 250, height: 180 }, // Blog post
 *   ]
 * };
 * // Result: layoutType: 'grid', columns: 2, responsive: true
 * 
 * // Navigation Menu - Detected as Flex
 * const navigation = {
 *   type: 'FRAME',
 *   children: [
 *     { type: 'TEXT', width: 80, height: 40 }, // Menu item
 *     { type: 'TEXT', width: 80, height: 40 }, // Menu item
 *     { type: 'TEXT', width: 80, height: 40 }, // Menu item
 *   ]
 * };
 * // Result: layoutType: 'flex', direction: 'horizontal'
 * 
 * // Modal Overlay - Detected as Absolute
 * const modal = {
 *   type: 'FRAME',
 *   children: [
 *     { type: 'RECTANGLE', width: 800, height: 600 }, // Backdrop
 *     { type: 'RECTANGLE', width: 400, height: 300 }, // Modal content
 *   ]
 * };
 * // Result: layoutType: 'absolute', zIndexStrategy: 'modal'
 * ```
 */
export class AILayoutAnalyzer {
  
  /**
   * Analyze a node and its children to determine the best layout approach
   * 
   * @param node - The Figma node to analyze
   * @param context - Layout context including parent dimensions and child information
   * @returns LayoutAnalysis with optimal layout configuration
   * 
   * @example
   * ```typescript
   * const analysis = AILayoutAnalyzer.analyzeLayout(figmaNode, {
   *   parentType: 'FRAME',
   *   parentWidth: 1200,
   *   parentHeight: 800,
   *   childCount: 6,
   *   childrenTypes: ['RECTANGLE', 'TEXT'],
   *   hasScrollableContent: false,
   *   isOverflowing: false,
   *   depth: 2,
   *   isRoot: false
   * });
   * 
   * console.log(analysis.layoutType); // 'grid'
   * console.log(analysis.columns); // 3
   * ```
   */
  static analyzeLayout(node: any, context: LayoutContext): LayoutAnalysis {
    const patterns = this.extractPatterns(node);
    const layoutType = this.determineLayoutType(patterns, context);
    
    return {
      layoutType,
      ...this.generateLayoutConfig(layoutType, patterns, context)
    };
  }

  /**
   * Extract patterns from node children to understand layout intent
   * 
   * Analyzes child nodes to detect:
   * - Repetitive patterns (same type, similar sizes)
   * - Consistent spacing between elements
   * - Size variations and alignment patterns
   * - Content density and arrangement
   */
  private static extractPatterns(node: any): NodePattern[] {
    const children = node.children || [];
    const patterns: Record<string, NodePattern> = {};

    children.forEach((child: any, index: number) => {
      const type = child.type;
      const bb = child.absoluteBoundingBox;
      
      if (!patterns[type]) {
        patterns[type] = {
          type,
          count: 0,
          averageWidth: 0,
          averageHeight: 0,
          spacing: 0,
          alignment: 'start',
          repetition: false,
          similarSizes: false,
          consistentSpacing: false
        };
      }

      const pattern = patterns[type];
      pattern.count++;
      
      if (bb) {
        pattern.averageWidth += bb.width;
        pattern.averageHeight += bb.height;
      }
    });

    // Calculate averages and detect patterns
    Object.values(patterns).forEach(pattern => {
      pattern.averageWidth /= pattern.count;
      pattern.averageHeight /= pattern.count;
      pattern.repetition = pattern.count > 2;
      pattern.similarSizes = this.checkSimilarSizes(children, pattern.type);
      pattern.consistentSpacing = this.checkConsistentSpacing(children, pattern.type);
    });

    return Object.values(patterns);
  }

  /**
   * Determine the best layout type based on patterns and context
   * 
   * Priority order:
   * 1. Carousel - for horizontal scrolling content
   * 2. Grid - for grid-like arrangements
   * 3. Scroll - for overflowing content
   * 4. Absolute - for overlapping/complex layouts
   * 5. Flex - for auto-layout frames
   * 6. Relative - default fallback
   */
  private static determineLayoutType(patterns: NodePattern[], context: LayoutContext): LayoutAnalysis['layoutType'] {
    const { childCount, parentWidth, parentHeight, hasScrollableContent, isOverflowing } = context;
    
    // Check for carousel patterns
    if (this.isCarouselPattern(patterns, context)) {
      return 'carousel';
    }
    
    // Check for grid patterns
    if (this.isGridPattern(patterns, context)) {
      return 'grid';
    }
    
    // Check for scroll patterns
    if (this.isScrollPattern(patterns, context)) {
      return 'scroll';
    }
    
    // Check for absolute positioning patterns
    if (this.isAbsolutePattern(patterns, context)) {
      return 'absolute';
    }
    
    // Default to flex for auto-layout or relative positioning
    return context.parentType === 'FRAME' && childCount > 1 ? 'flex' : 'relative';
  }

  /**
   * Check if pattern suggests a carousel layout
   * 
   * Carousel indicators:
   * - Multiple similar items (3+ items)
   * - Items wider than container (horizontal overflow)
   * - Consistent item sizes
   * - Items that would benefit from horizontal scrolling
   */
  private static isCarouselPattern(patterns: NodePattern[], context: LayoutContext): boolean {
    const { childCount, parentWidth, parentHeight } = context;
    
    const mainPattern = patterns.find(p => p.count > 1);
    if (!mainPattern) return false;
    
    const isHorizontalOverflow = mainPattern.averageWidth > parentWidth;
    const hasMultipleSimilarItems = mainPattern.count >= 3;
    const consistentSizing = mainPattern.similarSizes;
    
    return isHorizontalOverflow && hasMultipleSimilarItems && consistentSizing;
  }

  /**
   * Check if pattern suggests a grid layout
   * 
   * Grid indicators:
   * - Multiple items in rows/columns (3+ items)
   * - Similar item sizes
   * - Consistent spacing
   * - Items that fit in a grid arrangement
   */
  private static isGridPattern(patterns: NodePattern[], context: LayoutContext): boolean {
    const { childCount, parentWidth, parentHeight } = context;
    
    const mainPattern = patterns.find(p => p.count > 2);
    if (!mainPattern) return false;
    
    const itemsPerRow = Math.floor(parentWidth / mainPattern.averageWidth);
    const itemsPerColumn = Math.ceil(mainPattern.count / itemsPerRow);
    
    const fitsGrid = itemsPerRow > 1 && itemsPerColumn > 1;
    const consistentSizing = mainPattern.similarSizes;
    const consistentSpacing = mainPattern.consistentSpacing;
    
    return fitsGrid && consistentSizing && consistentSpacing;
  }

  /**
   * Check if pattern suggests a scroll layout
   * 
   * Scroll indicators:
   * - Content overflows container
   * - Multiple items that don't fit
   * - Vertical or horizontal overflow
   */
  private static isScrollPattern(patterns: NodePattern[], context: LayoutContext): boolean {
    const { hasScrollableContent, isOverflowing, childCount } = context;
    
    return (hasScrollableContent || isOverflowing) && childCount > 1;
  }

  /**
   * Check if pattern suggests absolute positioning
   * 
   * Absolute positioning indicators:
   * - Overlapping elements
   * - Complex layering
   * - Elements positioned outside normal flow
   * - Modal-like structures
   */
  private static isAbsolutePattern(patterns: NodePattern[], context: LayoutContext): boolean {
    const { depth, childCount } = context;
    
    const hasOverlapping = this.checkOverlappingElements(context);
    const isModalLike = this.isModalPattern(patterns, context);
    
    return hasOverlapping || isModalLike || depth > 3;
  }

  /**
   * Generate specific configuration for the determined layout type
   */
  private static generateLayoutConfig(
    layoutType: LayoutAnalysis['layoutType'], 
    patterns: NodePattern[], 
    context: LayoutContext
  ): Partial<LayoutAnalysis> {
    switch (layoutType) {
      case 'carousel':
        return this.generateCarouselConfig(patterns, context);
      case 'grid':
        return this.generateGridConfig(patterns, context);
      case 'scroll':
        return this.generateScrollConfig(patterns, context);
      case 'flex':
        return this.generateFlexConfig(patterns, context);
      case 'absolute':
        return this.generateAbsoluteConfig(patterns, context);
      default:
        return this.generateRelativeConfig(patterns, context);
    }
  }

  private static generateCarouselConfig(patterns: NodePattern[], context: LayoutContext) {
    const mainPattern = patterns.find(p => p.count > 1);
    return {
      direction: 'horizontal' as const,
      carouselConfig: {
        autoPlay: true,
        showDots: true,
        showArrows: true,
        infinite: true
      },
      scrollBehavior: 'smooth' as const,
      overflow: 'hidden' as const
    };
  }

  private static generateGridConfig(patterns: NodePattern[], context: LayoutContext) {
    const mainPattern = patterns.find(p => p.count > 2);
    const { parentWidth } = context;
    
    if (!mainPattern) return {};
    
    const columns = Math.floor(parentWidth / mainPattern.averageWidth);
    const gap = mainPattern.spacing || 16;
    
    return {
      columns: Math.max(1, columns),
      gap,
      gridConfig: {
        autoFit: true,
        minColumnWidth: mainPattern.averageWidth * 0.8,
        responsive: true
      },
      padding: { top: 16, right: 16, bottom: 16, left: 16 }
    };
  }

  private static generateScrollConfig(patterns: NodePattern[], context: LayoutContext) {
    const { parentHeight, childCount } = context;
    const mainPattern = patterns.find(p => p.count > 1);
    
    return {
      direction: parentHeight < 600 ? 'vertical' as const : 'horizontal' as const,
      scrollBehavior: 'smooth' as const,
      overflow: 'auto' as const,
      padding: { top: 8, right: 8, bottom: 8, left: 8 }
    };
  }

  private static generateFlexConfig(patterns: NodePattern[], context: LayoutContext) {
    const { parentWidth, parentHeight } = context;
    const mainPattern = patterns.find(p => p.count > 1);
    
    return {
      direction: parentWidth > parentHeight ? 'horizontal' as const : 'vertical' as const,
      gap: mainPattern?.spacing || 8,
      padding: { top: 0, right: 0, bottom: 0, left: 0 }
    };
  }

  private static generateAbsoluteConfig(patterns: NodePattern[], context: LayoutContext) {
    return {
      positioning: 'absolute' as const,
      zIndexStrategy: 'layered' as const,
      overflow: 'visible' as const
    };
  }

  private static generateRelativeConfig(patterns: NodePattern[], context: LayoutContext) {
    return {
      positioning: 'relative' as const,
      zIndexStrategy: 'stacking' as const,
      overflow: 'visible' as const
    };
  }

  /**
   * Helper methods for pattern detection
   */
  private static checkSimilarSizes(children: any[], type: string): boolean {
    const typeChildren = children.filter(c => c.type === type);
    if (typeChildren.length < 2) return false;
    
    const sizes = typeChildren.map(c => {
      const bb = c.absoluteBoundingBox;
      return bb ? { width: bb.width, height: bb.height } : null;
    }).filter(Boolean);
    
    if (sizes.length < 2) return false;
    
    const avgWidth = sizes.reduce((sum, s) => sum + s!.width, 0) / sizes.length;
    const avgHeight = sizes.reduce((sum, s) => sum + s!.height, 0) / sizes.length;
    
    const widthVariance = sizes.reduce((sum, s) => sum + Math.abs(s!.width - avgWidth), 0) / sizes.length;
    const heightVariance = sizes.reduce((sum, s) => sum + Math.abs(s!.height - avgHeight), 0) / sizes.length;
    
    return widthVariance < avgWidth * 0.1 && heightVariance < avgHeight * 0.1;
  }

  private static checkConsistentSpacing(children: any[], type: string): boolean {
    const typeChildren = children.filter(c => c.type === type);
    if (typeChildren.length < 3) return false;
    
    const spacings: number[] = [];
    for (let i = 1; i < typeChildren.length; i++) {
      const prev = typeChildren[i - 1].absoluteBoundingBox;
      const curr = typeChildren[i].absoluteBoundingBox;
      
      if (prev && curr) {
        const spacing = curr.x - (prev.x + prev.width);
        spacings.push(spacing);
      }
    }
    
    if (spacings.length < 2) return false;
    
    const avgSpacing = spacings.reduce((sum, s) => sum + s, 0) / spacings.length;
    const variance = spacings.reduce((sum, s) => sum + Math.abs(s - avgSpacing), 0) / spacings.length;
    
    return variance < avgSpacing * 0.2;
  }

  private static checkOverlappingElements(context: LayoutContext): boolean {
    // This would require more complex geometric analysis
    // For now, we'll use a simple heuristic based on depth and child count
    return context.depth > 2 && context.childCount > 3;
  }

  private static isModalPattern(patterns: NodePattern[], context: LayoutContext): boolean {
    // Modal indicators: overlay-like structure, centered content, backdrop
    const hasOverlay = patterns.some(p => p.type === 'RECTANGLE' && p.count === 1);
    const hasCenteredContent = context.childCount === 2; // overlay + content
    
    return hasOverlay && hasCenteredContent;
  }

  /**
   * Generate CSS classes and styles based on layout analysis
   * 
   * @param analysis - The layout analysis result
   * @returns Object with className and styles for the component
   * 
   * @example
   * ```typescript
   * const { className, styles } = AILayoutAnalyzer.generateCSS(analysis);
   * // className: 'ai-carousel'
   * // styles: { display: 'flex', flexDirection: 'row', overflow: 'hidden' }
   * ```
   */
  static generateCSS(analysis: LayoutAnalysis): { className: string; styles: React.CSSProperties } {
    const { layoutType, direction, columns, gap, padding, carouselConfig, gridConfig } = analysis;
    
    let className = '';
    const styles: React.CSSProperties = {};
    
    switch (layoutType) {
      case 'carousel':
        className = 'ai-carousel';
        styles.display = 'flex';
        styles.flexDirection = direction === 'horizontal' ? 'row' : 'column';
        styles.overflow = 'hidden';
        styles.scrollBehavior = 'smooth';
        if (gap) styles.gap = `${gap}px`;
        break;
        
      case 'grid':
        className = 'ai-grid';
        styles.display = 'grid';
        if (columns) {
          styles.gridTemplateColumns = gridConfig?.autoFit 
            ? `repeat(auto-fit, minmax(${gridConfig.minColumnWidth || 200}px, 1fr))`
            : `repeat(${columns}, 1fr)`;
        }
        if (gap) styles.gap = `${gap}px`;
        break;
        
      case 'scroll':
        className = 'ai-scroll';
        styles.overflow = 'auto';
        styles.scrollBehavior = 'smooth';
        if (direction === 'horizontal') {
          styles.display = 'flex';
          styles.flexDirection = 'row';
        }
        break;
        
      case 'flex':
        className = 'ai-flex';
        styles.display = 'flex';
        styles.flexDirection = direction === 'horizontal' ? 'row' : 'column';
        if (gap) styles.gap = `${gap}px`;
        break;
        
      case 'absolute':
        className = 'ai-absolute';
        styles.position = 'absolute';
        break;
        
      default:
        className = 'ai-relative';
        styles.position = 'relative';
    }
    
    if (padding) {
      styles.padding = `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
    }
    
    return { className, styles };
  }

  /**
   * Generate React component structure based on layout analysis
   * 
   * @param analysis - The layout analysis result
   * @param children - React children to render
   * @returns React element with appropriate structure
   * 
   * @example
   * ```typescript
   * const component = AILayoutAnalyzer.generateComponentStructure(analysis, [
   *   <div key="1">Item 1</div>,
   *   <div key="2">Item 2</div>
   * ]);
   * ```
   */
  static generateComponentStructure(analysis: LayoutAnalysis, children: React.ReactNode): React.ReactElement {
    const { layoutType, carouselConfig, gridConfig } = analysis;
    const { className, styles } = this.generateCSS(analysis);
    
    // Import React dynamically to avoid JSX issues in .ts files
    const React = require('react');
    
    switch (layoutType) {
      case 'carousel':
        return React.createElement('div', { className, style: styles },
          React.createElement('div', { className: 'ai-carousel-container' }, children),
          carouselConfig?.showDots && React.createElement('div', { className: 'ai-carousel-dots' }),
          carouselConfig?.showArrows && [
            React.createElement('button', { 
              key: 'prev', 
              className: 'ai-carousel-arrow ai-carousel-prev' 
            }, '‹'),
            React.createElement('button', { 
              key: 'next', 
              className: 'ai-carousel-arrow ai-carousel-next' 
            }, '›')
          ]
        );
        
      case 'grid':
        return React.createElement('div', { className, style: styles }, children);
        
      default:
        return React.createElement('div', { className, style: styles }, children);
    }
  }
}
