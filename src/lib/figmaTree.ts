/**
 * Figma Tree System - Single source of truth for rendering and export
 * Stores componentTree, styleMap, propsMap, and componentTypeMap by node ID
 */

import React from 'react';

export interface FigmaTreeNode {
  id: string;
  type: string;
  name: string;
  children: string[]; // Array of child node IDs
}

export interface FigmaTree {
  rootId: string;
  componentTree: Record<string, FigmaTreeNode>; // Map of all nodes by ID
  styleMap: Record<string, React.CSSProperties>; // Styles by node ID
  propsMap: Record<string, Record<string, any>>; // Props by node ID
  componentTypeMap: Record<string, string>; // Type mapping by node ID
  metadata?: {
    totalNodes: number;
    missingAssets: string[];
    unsupportedTypes: string[];
    timestamp: number;
  };
}

export class FigmaTreeBuilder {
  private tree: FigmaTree;
  private nodeStack: string[] = [];

  constructor() {
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

  startTree(rootId: string): void {
    this.tree.rootId = rootId;
    this.nodeStack = [rootId];
    console.log('🌳 Starting tree build with root:', rootId);
  }

  addNode(
    id: string,
    type: string,
    name: string,
    styles: React.CSSProperties,
    props: Record<string, any> = {},
    parentId?: string
  ): void {
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

    // Update metadata
    if (this.tree.metadata) {
      this.tree.metadata.totalNodes++;
      
      // Track unsupported types if needed
      const supportedTypes = ['FRAME', 'GROUP', 'RECTANGLE', 'TEXT', 'IMAGE', 'SVG', 'VECTOR', 'INSTANCE', 'COMPONENT', 'BOOLEAN_OPERATION', 'COMPONENT_SET'];
      if (!supportedTypes.includes(type) && !this.tree.metadata.unsupportedTypes.includes(type)) {
        this.tree.metadata.unsupportedTypes.push(type);
      }
    }

    console.log(`📝 Added node: ${type} (${name}) with ID: ${id}`);
  }

  enterNode(id: string): void {
    this.nodeStack.push(id);
  }

  exitNode(): void {
    this.nodeStack.pop();
  }

  getCurrentParent(): string | undefined {
    return this.nodeStack.length > 0 ? this.nodeStack[this.nodeStack.length - 1] : undefined;
  }

  addMissingAsset(assetId: string): void {
    if (this.tree.metadata && !this.tree.metadata.missingAssets.includes(assetId)) {
      this.tree.metadata.missingAssets.push(assetId);
    }
  }

  getTree(): FigmaTree {
    return this.tree;
  }

  setTree(tree: FigmaTree): void {
    this.tree = tree;
  }

  serializeToLocalStorage(key: string = 'figmaTree'): void {
    try {
      const serialized = JSON.stringify(this.tree, null, 2);
      localStorage.setItem(key, serialized);
      console.log('💾 Tree serialized to localStorage:', key);
    } catch (error) {
      console.error('Failed to serialize tree to localStorage:', error);
    }
  }

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
    console.log('🧹 Tree cleared');
  }

  // Utility methods
  getNode(id: string): FigmaTreeNode | null {
    return this.tree.componentTree[id] || null;
  }

  getStyles(id: string): React.CSSProperties {
    return this.tree.styleMap[id] || {};
  }

  getProps(id: string): Record<string, any> {
    return this.tree.propsMap[id] || {};
  }

  getType(id: string): string {
    return this.tree.componentTypeMap[id] || 'UNKNOWN';
  }

  getChildren(id: string): string[] {
    return this.tree.componentTree[id]?.children || [];
  }

  // Debug utilities
  logTreeStructure(maxDepth: number = 3): void {
    console.log('🌳 Tree Structure:');
    
    const logNode = (nodeId: string, depth: number = 0): void => {
      if (depth > maxDepth) return;
      
      const node = (this as any).tree.componentTree[nodeId];
      if (!node) return;
      
      const indent = '  '.repeat(depth);
      const styles = (this as any).tree.styleMap[nodeId];
      const props = (this as any).tree.propsMap[nodeId];
      
      console.log(`${indent}${node.type}: ${node.name} (${nodeId})`);
      console.log(`${indent}  Styles:`, styles);
      console.log(`${indent}  Props:`, props);
      console.log(`${indent}  Children: ${node.children.length}`);
      
      node.children.forEach((childId: string) => {
        (logNode as any).call(this, childId, depth + 1);
      });
    };
    
    if (this.tree.rootId) {
      (logNode as any).call(this, this.tree.rootId);
    }
  }
}

// Global tree builder instance
let globalTreeBuilder: FigmaTreeBuilder | null = null;

export function getGlobalTreeBuilder(): FigmaTreeBuilder {
  if (!globalTreeBuilder) {
    globalTreeBuilder = new FigmaTreeBuilder();
  }
  return globalTreeBuilder;
}

export function resetGlobalTreeBuilder(): void {
  globalTreeBuilder = new FigmaTreeBuilder();
  console.log('🔄 Global tree builder reset');
}
