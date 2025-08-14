/**
 * Visual AI Analyzer - Analyzes actual visual appearance of designs
 * to intelligently detect layout patterns that may not be obvious from structure alone
 */

export interface VisualPattern {
  type: 'carousel' | 'grid' | 'scroll' | 'tabs' | 'accordion' | 'modal';
  confidence: number;
  visualCues: string[];
  suggestedEnhancements: string[];
}

export interface VisualAnalysisResult {
  detectedPatterns: VisualPattern[];
  primaryPattern: VisualPattern | null;
  visualHints: {
    hasArrows: boolean;
    hasDots: boolean;
    hasScrollbar: boolean;
    hasTabs: boolean;
    hasOverflow: boolean;
    hasCards: boolean;
    hasUniformItems: boolean;
  };
  recommendations: string[];
}

export class VisualAnalyzer {
  /**
   * Analyze visual design patterns from Figma node properties and image assets
   * This goes beyond structure to understand visual intent
   */
  static analyzeVisualDesign(
    node: any,
    imageMap: Record<string, string>,
    thumbnailUrl?: string
  ): VisualAnalysisResult {
    const patterns: VisualPattern[] = [];
    
    // Detect carousel visual patterns
    const carouselPattern = this.detectCarouselVisuals(node);
    if (carouselPattern.confidence > 0) patterns.push(carouselPattern);
    
    // Detect grid visual patterns
    const gridPattern = this.detectGridVisuals(node);
    if (gridPattern.confidence > 0) patterns.push(gridPattern);
    
    // Detect scroll visual patterns
    const scrollPattern = this.detectScrollVisuals(node);
    if (scrollPattern.confidence > 0) patterns.push(scrollPattern);
    
    // Detect tab visual patterns
    const tabPattern = this.detectTabVisuals(node);
    if (tabPattern.confidence > 0) patterns.push(tabPattern);
    
    // Sort by confidence
    patterns.sort((a, b) => b.confidence - a.confidence);
    
    return {
      detectedPatterns: patterns,
      primaryPattern: patterns[0] || null,
      visualHints: this.extractVisualHints(node),
      recommendations: this.generateRecommendations(patterns)
    };
  }

  /**
   * Detect carousel patterns from visual cues
   */
  private static detectCarouselVisuals(node: any): VisualPattern {
    let confidence = 0;
    const visualCues: string[] = [];
    const suggestedEnhancements: string[] = [];
    
    // Check for arrow-like elements (navigation)
    const hasArrows = this.findArrowElements(node);
    if (hasArrows) {
      confidence += 30;
      visualCues.push('Navigation arrows detected');
    } else {
      suggestedEnhancements.push('Add navigation arrows for better UX');
    }
    
    // Check for dot/pagination indicators
    const hasDots = this.findDotElements(node);
    if (hasDots) {
      confidence += 30;
      visualCues.push('Pagination dots detected');
    } else {
      suggestedEnhancements.push('Add pagination dots for progress indication');
    }
    
    // Check for horizontal overflow pattern
    const hasHorizontalOverflow = this.detectHorizontalOverflow(node);
    if (hasHorizontalOverflow) {
      confidence += 20;
      visualCues.push('Horizontal overflow pattern detected');
    }
    
    // Check for card-like repeating elements
    const hasCards = this.detectCardPattern(node);
    if (hasCards) {
      confidence += 20;
      visualCues.push('Card-based layout detected');
    }
    
    // Check naming conventions
    if (this.hasCarouselNaming(node)) {
      confidence += 10;
      visualCues.push('Carousel naming convention detected');
    }
    
    return {
      type: 'carousel',
      confidence,
      visualCues,
      suggestedEnhancements
    };
  }

  /**
   * Detect grid patterns from visual cues
   */
  private static detectGridVisuals(node: any): VisualPattern {
    let confidence = 0;
    const visualCues: string[] = [];
    const suggestedEnhancements: string[] = [];
    
    // Check for uniform spacing
    const hasUniformSpacing = this.detectUniformSpacing(node);
    if (hasUniformSpacing) {
      confidence += 40;
      visualCues.push('Uniform spacing detected');
    }
    
    // Check for row/column alignment
    const hasGridAlignment = this.detectGridAlignment(node);
    if (hasGridAlignment) {
      confidence += 30;
      visualCues.push('Grid alignment detected');
    }
    
    // Check for card patterns
    const hasCards = this.detectCardPattern(node);
    if (hasCards) {
      confidence += 20;
      visualCues.push('Card-based items detected');
    }
    
    // Check naming conventions
    if (this.hasGridNaming(node)) {
      confidence += 10;
      visualCues.push('Grid naming convention detected');
    }
    
    if (confidence > 50) {
      suggestedEnhancements.push('Consider responsive breakpoints');
      suggestedEnhancements.push('Add hover states for interactive items');
    }
    
    return {
      type: 'grid',
      confidence,
      visualCues,
      suggestedEnhancements
    };
  }

  /**
   * Detect scroll patterns from visual cues
   */
  private static detectScrollVisuals(node: any): VisualPattern {
    let confidence = 0;
    const visualCues: string[] = [];
    const suggestedEnhancements: string[] = [];
    
    // Check for scrollbar visual elements
    const hasScrollbar = this.findScrollbarElements(node);
    if (hasScrollbar) {
      confidence += 40;
      visualCues.push('Scrollbar element detected');
    }
    
    // Check for content overflow
    const hasOverflow = this.detectContentOverflow(node);
    if (hasOverflow) {
      confidence += 30;
      visualCues.push('Content overflow detected');
    }
    
    // Check for fade/gradient at edges (scroll hint)
    const hasScrollHint = this.detectScrollHint(node);
    if (hasScrollHint) {
      confidence += 20;
      visualCues.push('Scroll hint gradient detected');
    } else if (hasOverflow) {
      suggestedEnhancements.push('Add fade gradient to indicate scrollable content');
    }
    
    // Check naming conventions
    if (this.hasScrollNaming(node)) {
      confidence += 10;
      visualCues.push('Scroll naming convention detected');
    }
    
    return {
      type: 'scroll',
      confidence,
      visualCues,
      suggestedEnhancements
    };
  }

  /**
   * Detect tab patterns from visual cues
   */
  private static detectTabVisuals(node: any): VisualPattern {
    let confidence = 0;
    const visualCues: string[] = [];
    const suggestedEnhancements: string[] = [];
    
    // Check for tab-like header elements
    const hasTabHeaders = this.findTabHeaders(node);
    if (hasTabHeaders) {
      confidence += 40;
      visualCues.push('Tab headers detected');
    }
    
    // Check for active/inactive states
    const hasStates = this.detectTabStates(node);
    if (hasStates) {
      confidence += 30;
      visualCues.push('Tab state variations detected');
    }
    
    // Check for content panels
    const hasPanels = this.detectTabPanels(node);
    if (hasPanels) {
      confidence += 20;
      visualCues.push('Tab content panels detected');
    }
    
    if (confidence > 50) {
      suggestedEnhancements.push('Add keyboard navigation support');
      suggestedEnhancements.push('Include ARIA labels for accessibility');
    }
    
    return {
      type: 'tabs',
      confidence,
      visualCues,
      suggestedEnhancements
    };
  }

  /**
   * Helper methods for visual pattern detection
   */
  
  private static findArrowElements(node: any): boolean {
    if (!node.children) return false;
    
    return node.children.some((child: any) => {
      // Check for arrow-like names
      const name = (child.name || '').toLowerCase();
      if (name.includes('arrow') || name.includes('prev') || name.includes('next') || 
          name.includes('chevron') || name.includes('navigate')) {
        return true;
      }
      
      // Check for arrow-like vectors
      if (child.type === 'VECTOR' || child.type === 'LINE') {
        // Could be an arrow shape
        return true;
      }
      
      // Recursively check children
      return this.findArrowElements(child);
    });
  }
  
  private static findDotElements(node: any): boolean {
    if (!node.children) return false;
    
    return node.children.some((child: any) => {
      const name = (child.name || '').toLowerCase();
      if (name.includes('dot') || name.includes('indicator') || 
          name.includes('pagination') || name.includes('bullet')) {
        return true;
      }
      
      // Check for small circular elements
      if (child.type === 'ELLIPSE' && child.absoluteBoundingBox) {
        const { width, height } = child.absoluteBoundingBox;
        if (width < 20 && height < 20 && Math.abs(width - height) < 2) {
          return true; // Small circle, likely a dot
        }
      }
      
      return this.findDotElements(child);
    });
  }
  
  private static findScrollbarElements(node: any): boolean {
    if (!node.children) return false;
    
    return node.children.some((child: any) => {
      const name = (child.name || '').toLowerCase();
      if (name.includes('scroll') || name.includes('track') || name.includes('thumb')) {
        return true;
      }
      
      // Check for scrollbar-like rectangles (thin and tall/wide)
      if (child.type === 'RECTANGLE' && child.absoluteBoundingBox) {
        const { width, height } = child.absoluteBoundingBox;
        const aspectRatio = width / height;
        if (aspectRatio < 0.1 || aspectRatio > 10) {
          return true; // Very thin rectangle, could be scrollbar
        }
      }
      
      return this.findScrollbarElements(child);
    });
  }
  
  private static detectHorizontalOverflow(node: any): boolean {
    if (!node.children || !node.absoluteBoundingBox) return false;
    
    const parentWidth = node.absoluteBoundingBox.width;
    let totalChildWidth = 0;
    
    node.children.forEach((child: any) => {
      if (child.absoluteBoundingBox) {
        totalChildWidth += child.absoluteBoundingBox.width;
      }
    });
    
    return totalChildWidth > parentWidth * 1.5;
  }
  
  private static detectContentOverflow(node: any): boolean {
    if (!node.children || !node.absoluteBoundingBox) return false;
    
    const parentBounds = node.absoluteBoundingBox;
    
    return node.children.some((child: any) => {
      if (!child.absoluteBoundingBox) return false;
      const childBounds = child.absoluteBoundingBox;
      
      // Check if child extends beyond parent
      return (
        childBounds.x + childBounds.width > parentBounds.x + parentBounds.width ||
        childBounds.y + childBounds.height > parentBounds.y + parentBounds.height
      );
    });
  }
  
  private static detectCardPattern(node: any): boolean {
    if (!node.children || node.children.length < 2) return false;
    
    // Check if children have similar dimensions (card-like)
    const sizes = node.children
      .filter((c: any) => c.absoluteBoundingBox)
      .map((c: any) => ({
        width: c.absoluteBoundingBox.width,
        height: c.absoluteBoundingBox.height
      }));
    
    if (sizes.length < 2) return false;
    
    const avgWidth = sizes.reduce((sum, s) => sum + s.width, 0) / sizes.length;
    const avgHeight = sizes.reduce((sum, s) => sum + s.height, 0) / sizes.length;
    
    // Check if all items are within 10% of average size
    return sizes.every(s => 
      Math.abs(s.width - avgWidth) < avgWidth * 0.1 &&
      Math.abs(s.height - avgHeight) < avgHeight * 0.1
    );
  }
  
  private static detectUniformSpacing(node: any): boolean {
    if (!node.children || node.children.length < 3) return false;
    
    const positions = node.children
      .filter((c: any) => c.absoluteBoundingBox)
      .map((c: any) => ({
        x: c.absoluteBoundingBox.x,
        y: c.absoluteBoundingBox.y
      }));
    
    if (positions.length < 3) return false;
    
    // Calculate spacing between consecutive items
    const spacings: number[] = [];
    for (let i = 1; i < positions.length; i++) {
      const spacing = Math.sqrt(
        Math.pow(positions[i].x - positions[i-1].x, 2) +
        Math.pow(positions[i].y - positions[i-1].y, 2)
      );
      spacings.push(spacing);
    }
    
    // Check if spacings are uniform (within 10% variance)
    const avgSpacing = spacings.reduce((sum, s) => sum + s, 0) / spacings.length;
    return spacings.every(s => Math.abs(s - avgSpacing) < avgSpacing * 0.1);
  }
  
  private static detectGridAlignment(node: any): boolean {
    if (!node.children || node.children.length < 4) return false;
    
    const positions = node.children
      .filter((c: any) => c.absoluteBoundingBox)
      .map((c: any) => ({
        x: c.absoluteBoundingBox.x,
        y: c.absoluteBoundingBox.y
      }));
    
    if (positions.length < 4) return false;
    
    // Check if items align in rows and columns
    const xPositions = [...new Set(positions.map(p => p.x))];
    const yPositions = [...new Set(positions.map(p => p.y))];
    
    // Grid should have at least 2 columns and 2 rows
    return xPositions.length >= 2 && yPositions.length >= 2 &&
           xPositions.length * yPositions.length >= positions.length * 0.8;
  }
  
  private static detectScrollHint(node: any): boolean {
    // Check for gradient fills that might indicate scroll fade
    if (node.fills && Array.isArray(node.fills)) {
      return node.fills.some((fill: any) => 
        fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL'
      );
    }
    
    // Check children for fade elements
    if (node.children) {
      return node.children.some((child: any) => {
        const name = (child.name || '').toLowerCase();
        return name.includes('fade') || name.includes('gradient') || name.includes('overlay');
      });
    }
    
    return false;
  }
  
  private static findTabHeaders(node: any): boolean {
    if (!node.children) return false;
    
    // Look for horizontal arrangement of clickable-looking elements
    const potentialTabs = node.children.filter((child: any) => {
      const name = (child.name || '').toLowerCase();
      return name.includes('tab') || name.includes('header') || name.includes('nav');
    });
    
    return potentialTabs.length >= 2;
  }
  
  private static detectTabStates(node: any): boolean {
    if (!node.children) return false;
    
    // Look for active/inactive state variations
    return node.children.some((child: any) => {
      const name = (child.name || '').toLowerCase();
      return name.includes('active') || name.includes('selected') || 
             name.includes('current') || name.includes('inactive');
    });
  }
  
  private static detectTabPanels(node: any): boolean {
    if (!node.children) return false;
    
    // Look for content panel elements
    return node.children.some((child: any) => {
      const name = (child.name || '').toLowerCase();
      return name.includes('panel') || name.includes('content') || 
             name.includes('body') || name.includes('pane');
    });
  }
  
  private static hasCarouselNaming(node: any): boolean {
    const name = (node.name || '').toLowerCase();
    return name.includes('carousel') || name.includes('slider') || 
           name.includes('gallery') || name.includes('slideshow');
  }
  
  private static hasGridNaming(node: any): boolean {
    const name = (node.name || '').toLowerCase();
    return name.includes('grid') || name.includes('gallery') || 
           name.includes('collection') || name.includes('list');
  }
  
  private static hasScrollNaming(node: any): boolean {
    const name = (node.name || '').toLowerCase();
    return name.includes('scroll') || name.includes('overflow') || 
           name.includes('feed') || name.includes('timeline');
  }
  
  /**
   * Extract visual hints from the design
   */
  private static extractVisualHints(node: any): any {
    return {
      hasArrows: this.findArrowElements(node),
      hasDots: this.findDotElements(node),
      hasScrollbar: this.findScrollbarElements(node),
      hasTabs: this.findTabHeaders(node),
      hasOverflow: this.detectContentOverflow(node),
      hasCards: this.detectCardPattern(node),
      hasUniformItems: this.detectUniformSpacing(node)
    };
  }
  
  /**
   * Generate recommendations based on detected patterns
   */
  private static generateRecommendations(patterns: VisualPattern[]): string[] {
    const recommendations: string[] = [];
    
    if (patterns.length === 0) {
      recommendations.push('Consider adding visual indicators for better UX');
      recommendations.push('Use consistent spacing and alignment');
      return recommendations;
    }
    
    const primary = patterns[0];
    
    switch (primary.type) {
      case 'carousel':
        if (primary.confidence < 70) {
          recommendations.push('Add clear navigation controls for carousel');
          recommendations.push('Include pagination indicators');
        }
        recommendations.push('Implement touch/swipe gestures for mobile');
        recommendations.push('Add keyboard navigation support');
        break;
        
      case 'grid':
        recommendations.push('Ensure responsive breakpoints for different screens');
        recommendations.push('Add hover states for interactive items');
        recommendations.push('Consider lazy loading for large grids');
        break;
        
      case 'scroll':
        recommendations.push('Add scroll position indicators');
        recommendations.push('Implement smooth scrolling behavior');
        recommendations.push('Consider infinite scroll for long lists');
        break;
        
      case 'tabs':
        recommendations.push('Add ARIA labels for accessibility');
        recommendations.push('Implement keyboard navigation');
        recommendations.push('Add transition animations between tabs');
        break;
    }
    
    // Add pattern-specific enhancements
    patterns.forEach(pattern => {
      recommendations.push(...pattern.suggestedEnhancements);
    });
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Analyze screenshot/image for visual patterns using computer vision
   * (This would integrate with image analysis APIs if needed)
   */
  static async analyzeScreenshot(imageUrl: string): Promise<VisualAnalysisResult> {
    // This is where you could integrate with:
    // - Computer vision APIs (Google Vision, AWS Rekognition)
    // - Custom ML models for UI pattern detection
    // - Or local image analysis libraries
    
    console.log('Analyzing screenshot:', imageUrl);
    
    // For now, return a placeholder
    // In production, this would actually analyze the image
    return {
      detectedPatterns: [],
      primaryPattern: null,
      visualHints: {
        hasArrows: false,
        hasDots: false,
        hasScrollbar: false,
        hasTabs: false,
        hasOverflow: false,
        hasCards: false,
        hasUniformItems: false
      },
      recommendations: [
        'Screenshot analysis would detect visual patterns here',
        'Could integrate with computer vision APIs for deeper analysis'
      ]
    };
  }
}
