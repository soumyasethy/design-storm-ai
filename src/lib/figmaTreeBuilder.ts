/**
 * Figma Tree Builder - Constructs full render tree during render phase
 * Tracks every node via component registry and builds complete hashmaps
 */

import React from 'react';
import { FigmaTree, FigmaTreeNode } from './figmaTree';


export interface TreeBuilderOptions {
  scale?: number;
  imageMap?: Record<string, string>;
  devMode?: boolean;
  showDebug?: boolean;
}

export interface NodeRenderContext {
  node: any;
  parentId?: string;
  depth: number;
  path: string[];
}

export class FigmaTreeBuilder {
  private tree: FigmaTree;
  private nodeStack: string[] = [];
  private processedNodes: Set<string> = new Set();
  private options: TreeBuilderOptions;

  constructor(options: TreeBuilderOptions = {}) {
    this.options = options;
    this.tree = {
      rootId: '',
      componentTree: {},
      styleMap: {},
      propsMap: {},
      componentTypeMap: {},
      metadata: {
        totalNodes: 0,
        missingAssets: [],
        unsupportedTypes: [],
        timestamp: Date.now()
      }
    };
  }

  /**
   * Start building a new tree with the given root
   */
  startTree(rootId: string): void {
    this.tree.rootId = rootId;
    this.nodeStack = [rootId];
    this.processedNodes.clear();
    console.log('🌳 Starting tree build with root:', rootId);
  }

  /**
   * Add a node to the tree with all its data
   */
  addNode(
    id: string,
    type: string,
    name: string,
    styles: React.CSSProperties,
    props: Record<string, any> = {},
    parentId?: string
  ): void {
    // Skip if already processed
    if (this.processedNodes.has(id)) {
      return;
    }

    // Add to component tree
    this.tree.componentTree[id] = {
      id,
      type,
      name,
      children: []
    };

    // Add to maps
    this.tree.styleMap[id] = styles;
    this.tree.propsMap[id] = {
      ...props,
      'data-figma-node-id': id,
      'data-figma-node-type': type,
      'data-figma-node-name': name
    };
    this.tree.componentTypeMap[id] = type;

    // Link to parent if provided
    if (parentId && this.tree.componentTree[parentId]) {
      this.tree.componentTree[parentId].children.push(id);
    }

    // Mark as processed
    this.processedNodes.add(id);

    // Update metadata
    if (this.tree.metadata) {
      this.tree.metadata.totalNodes++;
      
      // Track unsupported types if needed
      const supportedTypes = ['FRAME', 'GROUP', 'RECTANGLE', 'TEXT', 'IMAGE', 'SVG', 'VECTOR', 'INSTANCE', 'COMPONENT', 'BOOLEAN_OPERATION', 'COMPONENT_SET', 'PAGE', 'CANVAS', 'DOCUMENT'];
      if (!supportedTypes.includes(type) && !this.tree.metadata.unsupportedTypes.includes(type)) {
        this.tree.metadata.unsupportedTypes.push(type);
      }
    }

    console.log(`📝 Added node: ${type} (${name}) with ID: ${id}`);
  }

  /**
   * Enter a node (for building hierarchy)
   */
  enterNode(id: string): void {
    this.nodeStack.push(id);
  }

  /**
   * Exit current node
   */
  exitNode(): void {
    this.nodeStack.pop();
  }

  /**
   * Get current parent node ID
   */
  getCurrentParent(): string | undefined {
    return this.nodeStack.length > 0 ? this.nodeStack[this.nodeStack.length - 1] : undefined;
  }

  /**
   * Build tree recursively from Figma node data
   */
  buildTreeFromNode(
    node: any,
    parentId?: string,
    depth: number = 0,
    path: string[] = []
  ): void {
    if (!node || !node.id) {
      return;
    }

    const currentPath = [...path, node.name || node.id];
    const context: NodeRenderContext = {
      node,
      parentId,
      depth,
      path: currentPath
    };

    // Extract styles and props
    const styles = this.extractNodeStyles(node, context);
    const props = this.extractNodeProps(node, context);

    // Add node to tree
    this.addNode(
      node.id,
      node.type,
      node.name || 'Unnamed',
      styles,
      props,
      parentId
    );

    // Process children recursively
    if (node.children && Array.isArray(node.children)) {
      this.enterNode(node.id);
      node.children.forEach((child: any) => {
        this.buildTreeFromNode(child, node.id, depth + 1, currentPath);
      });
      this.exitNode();
    }
  }

  /**
   * Extract styles from Figma node
   */
  private extractNodeStyles(node: any, context: NodeRenderContext): React.CSSProperties {
    const styles: React.CSSProperties = {};

    // Position and size
    if (node.absoluteBoundingBox) {
      styles.position = 'absolute';
      styles.left = `${node.absoluteBoundingBox.x}px`;
      styles.top = `${node.absoluteBoundingBox.y}px`;
      styles.width = `${node.absoluteBoundingBox.width}px`;
      styles.height = `${node.absoluteBoundingBox.height}px`;
    }

    // Opacity
    if (node.opacity !== undefined) {
      styles.opacity = node.opacity;
    }

    // Visibility
    if (node.visible === false) {
      styles.display = 'none';
    }

    // Corner radius
    if (node.cornerRadius) {
      styles.borderRadius = `${node.cornerRadius}px`;
    }

    // Text styles
    if (node.style) {
      if (node.style.fontFamily) {
        styles.fontFamily = node.style.fontFamily;
      }
      if (node.style.fontSize) {
        styles.fontSize = `${node.style.fontSize}px`;
      }
      if (node.style.fontWeight) {
        styles.fontWeight = node.style.fontWeight;
      }
      if (node.style.textAlignHorizontal) {
        styles.textAlign = node.style.textAlignHorizontal.toLowerCase();
      }
      if (node.style.lineHeight) {
        styles.lineHeight = node.style.lineHeight;
      }
    }

    // Fills
    if (node.fills && Array.isArray(node.fills)) {
      const fill = node.fills[0];
      if (fill && fill.type === 'SOLID' && fill.color) {
        const { r, g, b, a = 1 } = fill.color;
        styles.backgroundColor = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
      }
    }

    // Strokes
    if (node.strokes && Array.isArray(node.strokes)) {
      const stroke = node.strokes[0];
      if (stroke && stroke.type === 'SOLID' && stroke.color) {
        const { r, g, b, a = 1 } = stroke.color;
        styles.border = `${node.strokeWeight || 1}px solid rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
      }
    }

    return styles;
  }

  /**
   * Extract props from Figma node
   */
  private extractNodeProps(node: any, context: NodeRenderContext): Record<string, any> {
    const props: Record<string, any> = {};

    // Text content
    if (node.type === 'TEXT' && node.characters) {
      props.textContent = node.characters;
      props.characters = node.characters;
    }

    // Image props
    if (node.type === 'IMAGE') {
      props.alt = node.name || 'Image';
      if (this.options.imageMap && this.options.imageMap[node.id]) {
        props.src = this.options.imageMap[node.id];
      }
    }

    // SVG content
    if ((node.type === 'VECTOR' || node.type === 'SVG') && node.svgContent) {
      props.svgContent = node.svgContent;
    }

    // Additional node-specific props
    if (node.cornerRadius) {
      props.cornerRadius = node.cornerRadius;
    }

    if (node.strokeWeight) {
      props.strokeWeight = node.strokeWeight;
    }

    return props;
  }

  /**
   * Get the built tree
   */
  getTree(): FigmaTree {
    return this.tree;
  }

  /**
   * Clear the tree
   */
  clear(): void {
    this.tree = {
      rootId: '',
      componentTree: {},
      styleMap: {},
      propsMap: {},
      componentTypeMap: {},
      metadata: {
        totalNodes: 0,
        missingAssets: [],
        unsupportedTypes: [],
        timestamp: Date.now()
      }
    };
    this.nodeStack = [];
    this.processedNodes.clear();
  }

  /**
   * Serialize tree to localStorage
   */
  serializeToLocalStorage(key: string = 'figmaTree'): void {
    try {
      const serialized = JSON.stringify(this.tree, null, 2);
      localStorage.setItem(key, serialized);
      console.log('💾 Tree serialized to localStorage:', key);
    } catch (error) {
      console.error('Failed to serialize tree to localStorage:', error);
    }
  }

  /**
   * Load tree from localStorage
   */
  static loadFromLocalStorage(key: string = 'figmaTree'): FigmaTree | null {
    try {
      const serialized = localStorage.getItem(key);
      if (!serialized) return null;
      
      const tree = JSON.parse(serialized) as FigmaTree;
      console.log('📂 Tree loaded from localStorage:', key);
      return tree;
    } catch (error) {
      console.error('Failed to load tree from localStorage:', error);
      return null;
    }
  }

  /**
   * Debug: Log tree structure
   */
  logTreeStructure(maxDepth: number = 3): void {
    console.log('🌳 Tree Structure:');
    
    const logNode = (nodeId: string, depth: number = 0) => {
      if (depth > maxDepth) return;
      
      const node = this.tree.componentTree[nodeId];
      if (!node) return;
      
      const indent = '  '.repeat(depth);
      const styles = this.tree.styleMap[nodeId];
      const props = this.tree.propsMap[nodeId];
      
      console.log(`${indent}${node.type}: ${node.name} (${nodeId})`);
      console.log(`${indent}  Styles:`, styles);
      console.log(`${indent}  Props:`, props);
      console.log(`${indent}  Children: ${node.children.length}`);
      
      node.children.forEach(childId => {
        logNode(childId, depth + 1);
      });
    };
    
    if (this.tree.rootId) {
      logNode(this.tree.rootId);
    }
  }
}

// Global tree builder instance
let globalTreeBuilder: FigmaTreeBuilder | null = null;

export function getGlobalTreeBuilder(options?: TreeBuilderOptions): FigmaTreeBuilder {
  if (!globalTreeBuilder) {
    globalTreeBuilder = new FigmaTreeBuilder(options);
  }
  return globalTreeBuilder;
}

export function resetGlobalTreeBuilder(options?: TreeBuilderOptions): void {
  globalTreeBuilder = new FigmaTreeBuilder(options);
  console.log('🔄 Global tree builder reset');
}
