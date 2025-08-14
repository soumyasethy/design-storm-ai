// Figma Plugin Integration Module
// Handles plugin export JSON and provides foundation for future plugin control

export interface PluginExportData {
  document: any;
  imageMap: Record<string, string>;
  images: Array<{
    hash: string;
    nodeId: string;
    nodeName: string;
    bytes: Uint8Array;
    width: number;
    height: number;
  }>;
  metadata: {
    exportedBy: string;
    pluginVersion: string;
    lastModified: string;
  };
  assets: any[];
  fonts: any[];
  styles: any[];
  components: any[];
}

export interface PluginControlOptions {
  selectLayers?: boolean;
  selectFrames?: boolean;
  selectComponents?: boolean;
  includeImages?: boolean;
  includeAssets?: boolean;
  includeStyles?: boolean;
}

export class FigmaPluginIntegration {
  private static instance: FigmaPluginIntegration;
  private currentData: PluginExportData | null = null;

  static getInstance(): FigmaPluginIntegration {
    if (!FigmaPluginIntegration.instance) {
      FigmaPluginIntegration.instance = new FigmaPluginIntegration();
    }
    return FigmaPluginIntegration.instance;
  }

  // Validate if JSON data is from our plugin
  isPluginExport(data: any): boolean {
    return data?.metadata?.exportedBy === 'LazyCode.ai Plugin';
  }

  // Parse plugin export JSON
  parsePluginExport(jsonData: any): PluginExportData {
    if (!this.isPluginExport(jsonData)) {
      throw new Error('Invalid plugin export data');
    }

    const pluginData: PluginExportData = {
      document: jsonData.document,
      imageMap: jsonData.imageMap || {},
      images: jsonData.images || [],
      metadata: jsonData.metadata,
      assets: jsonData.assets || [],
      fonts: jsonData.fonts || [],
      styles: jsonData.styles || [],
      components: jsonData.components || [],
    };

    this.currentData = pluginData;
    return pluginData;
  }

  // Get current plugin data
  getCurrentData(): PluginExportData | null {
    return this.currentData;
  }

  // Extract specific node types from plugin data
  extractNodesByType(type: string): any[] {
    if (!this.currentData?.document) return [];

    const extractNodes = (node: any): any[] => {
      const nodes: any[] = [];
      
      if (node.type === type) {
        nodes.push(node);
      }
      
      if (node.children) {
        node.children.forEach((child: any) => {
          nodes.push(...extractNodes(child));
        });
      }
      
      return nodes;
    };

    return extractNodes(this.currentData.document);
  }

  // Get all frames
  getFrames(): any[] {
    return this.extractNodesByType('FRAME');
  }

  // Get all components
  getComponents(): any[] {
    return this.extractNodesByType('COMPONENT');
  }

  // Get all text nodes
  getTextNodes(): any[] {
    return this.extractNodesByType('TEXT');
  }

  // Get images with their data
  getImages(): Array<{ nodeId: string; nodeName: string; imageData: string }> {
    if (!this.currentData?.imageMap) return [];

    return Object.entries(this.currentData.imageMap).map(([nodeId, imageData]) => ({
      nodeId,
      nodeName: this.currentData?.images?.find(img => img.nodeId === nodeId)?.nodeName || 'Unknown',
      imageData,
    }));
  }

  // Get design tokens from plugin data
  getDesignTokens() {
    if (!this.currentData) return null;

    return {
      colors: this.extractColors(),
      typography: this.extractTypography(),
      spacing: this.extractSpacing(),
      effects: this.extractEffects(),
    };
  }

  private extractColors(): any[] {
    const colors: any[] = [];
    
    const styles = this.currentData?.styles;
    if (styles && typeof styles === 'object' && !Array.isArray(styles) && 'paint' in styles) {
      const paintStyles = (styles as any).paint;
      if (Array.isArray(paintStyles)) {
        paintStyles.forEach((style: any) => {
          if (style.paints?.[0]?.type === 'SOLID') {
            colors.push({
              name: style.name,
              color: style.paints[0].color,
            });
          }
        });
      }
    }
    
    return colors;
  }

  private extractTypography(): any[] {
    const typography: any[] = [];
    
    const styles = this.currentData?.styles;
    if (styles && typeof styles === 'object' && !Array.isArray(styles) && 'text' in styles) {
      const textStyles = (styles as any).text;
      if (Array.isArray(textStyles)) {
        textStyles.forEach((style: any) => {
          typography.push({
            name: style.name,
            fontFamily: style.style?.fontFamily,
            fontSize: style.style?.fontSize,
            fontWeight: style.style?.fontWeight,
            lineHeight: style.style?.lineHeightPx,
            letterSpacing: style.style?.letterSpacing,
          });
        });
      }
    }
    
    return typography;
  }

  private extractSpacing(): any[] {
    // Extract spacing from layout properties
    const spacing: any[] = [];
    
    const extractFromNode = (node: any) => {
      if (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) {
        spacing.push({
          nodeName: node.name,
          padding: {
            left: node.paddingLeft,
            right: node.paddingRight,
            top: node.paddingTop,
            bottom: node.paddingBottom,
          },
        });
      }
      
      if (node.itemSpacing) {
        spacing.push({
          nodeName: node.name,
          gap: node.itemSpacing,
        });
      }
      
      if (node.children) {
        node.children.forEach(extractFromNode);
      }
    };
    
    if (this.currentData?.document) {
      extractFromNode(this.currentData.document);
    }
    
    return spacing;
  }

  private extractEffects(): any[] {
    const effects: any[] = [];
    
    const extractFromNode = (node: any) => {
      if (node.effects) {
        effects.push({
          nodeName: node.name,
          effects: node.effects,
        });
      }
      
      if (node.children) {
        node.children.forEach(extractFromNode);
      }
    };
    
    if (this.currentData?.document) {
      extractFromNode(this.currentData.document);
    }
    
    return effects;
  }

  // Clear current data
  clearData(): void {
    this.currentData = null;
  }

  // Export current data as JSON
  exportAsJSON(): string {
    if (!this.currentData) {
      throw new Error('No plugin data to export');
    }
    
    return JSON.stringify(this.currentData, null, 2);
  }
}

// Convenience functions
export const figmaPlugin = FigmaPluginIntegration.getInstance();

export const isPluginExport = (data: any): boolean => {
  return figmaPlugin.isPluginExport(data);
};

export const parsePluginData = (jsonData: any): PluginExportData => {
  return figmaPlugin.parsePluginExport(jsonData);
};

export const getPluginFrames = (): any[] => {
  return figmaPlugin.getFrames();
};

export const getPluginImages = (): Array<{ nodeId: string; nodeName: string; imageData: string }> => {
  return figmaPlugin.getImages();
};

export const getPluginDesignTokens = () => {
  return figmaPlugin.getDesignTokens();
}; 