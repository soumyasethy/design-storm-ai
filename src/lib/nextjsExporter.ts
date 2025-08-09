/**
 * Next.js Project Structure Exporter
 * Generates React components and pages from Figma tree
 */

import { FigmaTree, FigmaTreeNode } from './figmaTree';

export interface ExportOptions {
  imageMap?: Record<string, string>;
  scale?: number;
  projectName?: string;
  outputDir?: string;
}

export interface ComponentInfo {
  id: string;
  name: string;
  type: string;
  isPage: boolean;
  isComponent: boolean;
  children: string[];
  path: string[];
}

export interface ExportResult {
  components: Map<string, string>; // componentId -> componentCode
  pages: Map<string, string>; // pageId -> pageCode
  structure: ComponentInfo[];
  assets: string[];
}

export class NextJSExporter {
  private tree: FigmaTree;
  private options: ExportOptions;
  private result: ExportResult;

  constructor(tree: FigmaTree, options: ExportOptions = {}) {
    this.tree = tree;
    this.options = {
      projectName: 'figma-export',
      outputDir: 'export',
      ...options
    };
    this.result = {
      components: new Map(),
      pages: new Map(),
      structure: [],
      assets: []
    };
  }

  /**
   * Export the tree to Next.js project structure
   */
  export(): ExportResult {
    if (!this.tree.rootId) {
      throw new Error('No root node found in tree');
    }

    // Analyze tree structure
    this.analyzeStructure();

    // Generate components
    this.generateComponents();

    // Generate pages
    this.generatePages();

    return this.result;
  }

  /**
   * Analyze the tree structure to identify components and pages
   */
  private analyzeStructure(): void {
    const visited = new Set<string>();
    
    const analyzeNode = (nodeId: string, path: string[] = []): ComponentInfo | null => {
      if (visited.has(nodeId)) return null;
      visited.add(nodeId);

      const node = this.tree.componentTree[nodeId];
      if (!node) return null;

      const currentPath = [...path, node.name];
      const isPage = node.type === 'FRAME' && this.isTopLevelFrame(nodeId);
      const isComponent = this.shouldBeComponent(node);

      const info: ComponentInfo = {
        id: nodeId,
        name: node.name,
        type: node.type,
        isPage,
        isComponent,
        children: node.children,
        path: currentPath
      };

      this.result.structure.push(info);

      // Analyze children
      node.children.forEach(childId => {
        analyzeNode(childId, currentPath);
      });

      return info;
    };

    analyzeNode(this.tree.rootId);
  }

  /**
   * Check if a node should be a component
   */
  private shouldBeComponent(node: FigmaTreeNode): boolean {
    // FRAME, GROUP, INSTANCE, COMPONENT_SET should be components
    const componentTypes = ['FRAME', 'GROUP', 'INSTANCE', 'COMPONENT_SET'];
    return componentTypes.includes(node.type) && node.children.length > 0;
  }

  /**
   * Check if a frame is top-level (should be a page)
   */
  private isTopLevelFrame(nodeId: string): boolean {
    const node = this.tree.componentTree[nodeId];
    if (!node || node.type !== 'FRAME') return false;

    // Check if parent is PAGE, CANVAS, or DOCUMENT
    const parentId = this.findParent(nodeId);
    if (!parentId) return true; // Root frame

    const parent = this.tree.componentTree[parentId];
    return parent && ['PAGE', 'CANVAS', 'DOCUMENT'].includes(parent.type);
  }

  /**
   * Find parent of a node
   */
  private findParent(nodeId: string): string | null {
    for (const [id, node] of Object.entries(this.tree.componentTree)) {
      if (node.children.includes(nodeId)) {
        return id;
      }
    }
    return null;
  }

  /**
   * Generate React components
   */
  private generateComponents(): void {
    for (const info of this.result.structure) {
      if (info.isComponent && !info.isPage) {
        const componentCode = this.generateComponentCode(info);
        this.result.components.set(info.id, componentCode);
      }
    }
  }

  /**
   * Generate React pages
   */
  private generatePages(): void {
    for (const info of this.result.structure) {
      if (info.isPage) {
        const pageCode = this.generatePageCode(info);
        this.result.pages.set(info.id, pageCode);
      }
    }
  }

  /**
   * Generate component code
   */
  private generateComponentCode(info: ComponentInfo): string {
    const node = this.tree.componentTree[info.id];
    if (!node) return '';

    const componentName = this.sanitizeComponentName(info.name);
    const imports = this.generateImports(info);
    const componentCode = this.generateNodeCode(info.id, 2);

    return `import React from 'react';

${imports}

export default function ${componentName}() {
  return (
    <>
${componentCode}
    </>
  );
}
`;
  }

  /**
   * Generate page code
   */
  private generatePageCode(info: ComponentInfo): string {
    const node = this.tree.componentTree[info.id];
    if (!node) return '';

    const pageName = this.sanitizeComponentName(info.name);
    const imports = this.generateImports(info);
    const pageCode = this.generateNodeCode(info.id, 2);

    return `import React from 'react';

${imports}

export default function ${pageName}Page() {
  return (
    <div className="page-container">
${pageCode}
    </div>
  );
}
`;
  }

  /**
   * Generate imports for a component/page
   */
  private generateImports(info: ComponentInfo): string {
    const imports = new Set<string>();
    
    // Add React import
    imports.add("import React from 'react';");

    // Add component imports
    for (const childId of info.children) {
      const childInfo = this.result.structure.find(s => s.id === childId);
      if (childInfo && childInfo.isComponent) {
        const componentName = this.sanitizeComponentName(childInfo.name);
        imports.add(`import ${componentName} from '../components/${componentName}';`);
      }
    }

    return Array.from(imports).join('\n');
  }

  /**
   * Generate code for a specific node
   */
  private generateNodeCode(nodeId: string, indent: number = 0): string {
    const node = this.tree.componentTree[nodeId];
    if (!node) return '';

    const styles = this.tree.styleMap[nodeId] || {};
    const props = this.tree.propsMap[nodeId] || {};
    const type = this.tree.componentTypeMap[nodeId] || node.type;

    // Skip invisible nodes
    if (styles.display === 'none' || styles.visibility === 'hidden') {
      return '';
    }

    const indentStr = ' '.repeat(indent);
    const styleStr = this.generateStyleString(styles);
    const propsStr = this.generatePropsString(props);

    // Check if this should be a component
    const childInfo = this.result.structure.find(s => s.id === nodeId);
    if (childInfo && childInfo.isComponent && !childInfo.isPage) {
      const componentName = this.sanitizeComponentName(childInfo.name);
      return `${indentStr}<${componentName} />`;
    }

    // Handle different node types
    switch (type) {
      case 'TEXT': {
        const textContent = props.textContent || props.characters || '';
        return `${indentStr}<div\n${indentStr}  style={${styleStr}}\n${indentStr}  ${propsStr}\n${indentStr}>\n${indentStr}  <span style={{ whiteSpace: 'pre-wrap' }}>${textContent}</span>\n${indentStr}</div>`;
      }

      case 'IMAGE': {
        const src = props.src || (this.options.imageMap && this.options.imageMap[nodeId]) || '';
        if (src) {
          return `${indentStr}<img\n${indentStr}  src="${src}"\n${indentStr}  alt="${props.alt || node.name || 'Image'}"\n${indentStr}  style={${styleStr}}\n${indentStr}  ${propsStr}\n${indentStr}/>`;
        } else {
          return `${indentStr}<div\n${indentStr}  style={${styleStr}}\n${indentStr}  ${propsStr}\n${indentStr}>\n${indentStr}  {/* Image placeholder */}\n${indentStr}</div>`;
        }
      }

      case 'SVG':
      case 'VECTOR': {
        const svgContent = props.svgContent || props.svg;
        if (svgContent) {
          const escapedSvg = svgContent.replace(/`/g, '\\`').replace(/\$/g, '\\$');
          return `${indentStr}<div\n${indentStr}  style={${styleStr}}\n${indentStr}  ${propsStr}\n${indentStr}  dangerouslySetInnerHTML={{ __html: \`${escapedSvg}\` }}\n${indentStr}/>`;
        }
        // Fall through to default for vector groups
      }

      default: {
        // Container elements
        const childrenCode = node.children
          .map(childId => this.generateNodeCode(childId, indent + 2))
          .filter(code => code !== '')
          .join('\n');

        if (childrenCode) {
          return `${indentStr}<div\n${indentStr}  style={${styleStr}}\n${indentStr}  ${propsStr}\n${indentStr}>\n${childrenCode}\n${indentStr}</div>`;
        } else {
          return `${indentStr}<div\n${indentStr}  style={${styleStr}}\n${indentStr}  ${propsStr}\n${indentStr}/>`;
        }
      }
    }
  }

  /**
   * Generate style string
   */
  private generateStyleString(styles: React.CSSProperties): string {
    const styleEntries = Object.entries(styles)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `    ${key}: ${typeof value === 'string' ? `'${value}'` : value}`);

    if (styleEntries.length === 0) {
      return '{}';
    }

    return `{\n${styleEntries.join(',\n')}\n  }`;
  }

  /**
   * Generate props string
   */
  private generatePropsString(props: Record<string, any>): string {
    const propEntries = Object.entries(props)
      .filter(([key]) => !['style', 'children', 'data-figma-node-id', 'data-figma-node-type', 'data-figma-node-name'].includes(key))
      .map(([key, value]) => `${key}="${value}"`);

    return propEntries.join(' ');
  }

  /**
   * Sanitize component name
   */
  private sanitizeComponentName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^[0-9]/, '_$&')
      .replace(/^[a-z]/, (match) => match.toUpperCase());
  }

  /**
   * Generate project structure files
   */
  generateProjectFiles(): Map<string, string> {
    const files = new Map<string, string>();

    // Package.json
    files.set('package.json', this.generatePackageJson());

    // Next.js config
    files.set('next.config.js', this.generateNextConfig());

    // Components
    for (const [id, code] of this.result.components) {
      const info = this.result.structure.find(s => s.id === id);
      if (info) {
        const fileName = `${this.sanitizeComponentName(info.name)}.tsx`;
        files.set(`components/${fileName}`, code);
      }
    }

    // Pages
    for (const [id, code] of this.result.pages) {
      const info = this.result.structure.find(s => s.id === id);
      if (info) {
        const fileName = `${this.sanitizeComponentName(info.name)}.tsx`;
        files.set(`pages/${fileName}`, code);
      }
    }

    // Index page
    files.set('pages/index.tsx', this.generateIndexPage());

    return files;
  }

  /**
   * Generate package.json
   */
  private generatePackageJson(): string {
    return `{
  "name": "${this.options.projectName}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.0.1",
    "postcss": "^8"
  }
}`;
  }

  /**
   * Generate Next.js config
   */
  private generateNextConfig(): string {
    return `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig`;
  }

  /**
   * Generate index page
   */
  private generateIndexPage(): string {
    const pages = Array.from(this.result.pages.keys());
    const pageLinks = pages.map(pageId => {
      const info = this.result.structure.find(s => s.id === pageId);
      if (!info) return '';
      const pageName = this.sanitizeComponentName(info.name);
      return `        <li><a href="/${pageName.toLowerCase()}">${info.name}</a></li>`;
    }).join('\n');

    return `import React from 'react';

export default function HomePage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Figma Export</h1>
      <ul className="space-y-2">
${pageLinks}
      </ul>
    </div>
  );
}`;
  }
}

/**
 * Export tree to Next.js project structure
 */
export function exportToNextJS(tree: FigmaTree, options: ExportOptions = {}): ExportResult {
  const exporter = new NextJSExporter(tree, options);
  return exporter.export();
}

/**
 * Generate project files
 */
export function generateProjectFiles(tree: FigmaTree, options: ExportOptions = {}): Map<string, string> {
  const exporter = new NextJSExporter(tree, options);
  exporter.export();
  return exporter.generateProjectFiles();
}
