'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SimpleFigmaRenderer from '@/components/SimpleFigmaRenderer';

import { extractFileKeyFromUrl, loadFigmaAssetsFromNodes } from '@/lib/utils';
import { isPluginExport, parsePluginData } from '@/lib/figma-plugin';
import { fontLoader } from '@/lib/fontLoader';
import { FigmaTreeBuilder, getGlobalTreeBuilder, resetGlobalTreeBuilder } from '@/lib/figmaTree';
import { generateProjectFiles } from '@/lib/nextjsExporter';

interface FigmaData {
  name?: string;
  lastModified?: string;
  thumbnailUrl?: string;
  version?: string;
  role?: string;
  editorType?: string;
  linkAccess?: string;
  nodes?: {
    [key: string]: {
      document: FigmaNode;
    };
  };
  document?: FigmaNode;
  components?: Record<string, unknown> | any[];
  styles?: Record<string, unknown> | any[];
  originalData?: unknown;
  metadata?: {
    exportedBy?: string;
    pluginVersion?: string;
    lastModified?: string;
  };
  imageMap?: Record<string, string>;
  images?: Array<{
    hash: string;
    nodeId: string;
    nodeName: string;
    bytes: Uint8Array;
    width: number;
    height: number;
  }>;
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fills?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a?: number };
    imageRef?: string;
  }>;
  strokes?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a?: number };
    strokeWeight?: number;
  }>;
  strokeWeight?: number;
  cornerRadius?: number;
  characters?: string;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    textAlignHorizontal?: string;
    lineHeight?: number;
    letterSpacing?: number;
  };
  opacity?: number;
  visible?: boolean;
}

interface PageInfo {
  id: string;
  name: string;
  node: FigmaNode;
}

function OutputPageContent() {
  const searchParams = useSearchParams();
  const [figmaData, setFigmaData] = useState<FigmaData | null>(null);
  const [frameNode, setFrameNode] = useState<FigmaNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [fileKey, setFileKey] = useState<string>('');
  const [figmaToken, setFigmaToken] = useState<string>('');
  const [figmaUrl, setFigmaUrl] = useState<string>('');
  const [assetMap, setAssetMap] = useState<Record<string, string>>({});
  const [assetLoadingStatus, setAssetLoadingStatus] = useState<string>('Not started');
  const [assetLoadingProgress, setAssetLoadingProgress] = useState<{
    total: number;
    loaded: number;
    isLoading: boolean;
  }>({ total: 0, loaded: 0, isLoading: false });
  // Removed render mode dropdown/state
  const [dataSource, setDataSource] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState<number>(0);
  const [devMode, setDevMode] = useState<boolean>(false);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [enableScaling, setEnableScaling] = useState<boolean>(true);
  const [fontLoadingStatus, setFontLoadingStatus] = useState<string>('Not started');
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const [maxScale, setMaxScale] = useState<number>(1.2);
  const [transformOrigin, setTransformOrigin] = useState<string>('center top');
  
  // Multi-page support state
  const [availablePages, setAvailablePages] = useState<PageInfo[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isMultiPageDesign, setIsMultiPageDesign] = useState<boolean>(false);

  // Simple downloader helper for Export
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export function that generates a minimal Next.js project with static TSX files
  const handleExport = async () => {
    try {
      if (!frameNode) {
        console.error('❌ No frame selected for export');
        return;
      }

      // -------- helpers --------
      const pascal = (s: string) =>
        (s || 'ExportedComponent')
          .replace(/[^a-zA-Z0-9]+/g, ' ')
          .trim()
          .split(/\s+/)
          .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
          .join('')
          .replace(/^\d/, '_$&');

      const slug = (s: string) =>
        (s || 'exported-design')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

      const componentName = pascal(frameNode.name || 'ExportedDesign');
      const projectSlug = slug(frameNode.name || 'figma-export');

      // Local map for assets copied into /public/assets
      const localAssetMap: Record<string, string> = {};

      // Build asset candidates: prefer fill.imageRef hashes, fall back to node ids
      type AssetCandidate = { key: string; aliasKeys: string[] };
      const assetCandidates: AssetCandidate[] = [];
      const seenKeys = new Set<string>();
      const addCandidate = (key: string, aliasKeys: string[] = []) => {
        if (!key || seenKeys.has(key)) return;
        seenKeys.add(key);
        assetCandidates.push({ key, aliasKeys });
      };
      const walkForAssets = (n: any) => {
        if (!n) return;
        if (Array.isArray(n.fills)) {
          for (const f of n.fills) {
            if (f?.type === 'IMAGE') {
              if (f.imageRef) addCandidate(f.imageRef, [n.id]);
              else addCandidate(n.id);
            }
          }
        }
        if (n.type === 'GROUP') {
          const hasMaskChild = Array.isArray(n.children) && n.children.some((c: any) => c?.isMask && (c.maskType || c.mask));
          const hasTextChild = Array.isArray(n.children) && n.children.some((c: any) => c?.type === 'TEXT');
          const hasExport = Array.isArray(n.exportSettings) && n.exportSettings.length > 0;
          // If group has a mask child and contains no text, export the GROUP bitmap (captures mask + effects)
          if ((hasMaskChild && !hasTextChild) || hasExport) {
            addCandidate(n.id);
          }
        }
        (n.children || []).forEach(walkForAssets);
      };
      walkForAssets(frameNode);

      // Sanitize filenames for cross-platform safety
      const sanitizeFilename = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '-');

      // Prepare project files container
      const files = new Map<string, string>();

      // ---------- fonts: collect families from the frame ----------
      const fontFamilies: string[] = Array.from(extractFontFamilies(frameNode));
      const googleFontHrefs = fontFamilies.map((f) =>
        `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`
      );
      const headLinks = [
        `<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />`,
        `<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossOrigin=\"anonymous\" />`,
        ...googleFontHrefs.map((h) => `<link href=\"${h}\" rel=\"stylesheet\" />`)
      ].join('\n    ');
      const defaultFont = fontFamilies[0] || 'Inter';
      const defaultFontCSS = `'${defaultFont}', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

      // ---------- minimal project files ----------
      files.set(
        'package.json',
        JSON.stringify(
          {
            name: projectSlug,
            version: '0.1.0',
            private: true,
            scripts: {
              dev: 'next dev',
              build: 'next build',
              start: 'next start'
            },
            dependencies: {
              next: '15.4.4',
              react: '19.1.0',
              'react-dom': '19.1.0',
              typescript: '^5.6.0'
            }
          },
          null,
          2
        )
      );

      files.set('next.config.js', `/** @type {import('next').NextConfig} */\nconst nextConfig = {};\nmodule.exports = nextConfig;\n`);

      files.set(
        'src/app/layout.tsx',
        `import './globals.css';\n\nexport const metadata = { title: '${componentName}', description: 'Exported from DesignStorm' };\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang=\"en\">\n      <head>\n        ${headLinks}\n      </head>\n      <body style={{ margin: 0 }}>${'${children}'}</body>\n    </html>\n  );\n}\n`
      );

      // global CSS with default font
      files.set(
        'src/app/globals.css',
        `:root{}\n*{box-sizing:border-box}\nhtml,body{margin:0;padding:0;overflow-x:hidden;max-width:100vw}\nbody{font-family:${defaultFontCSS};}\nimg{display:block;max-width:100%}\n`
      );

      files.set(
        'src/app/page.tsx',
        `'use client';\n\nimport React from 'react';\nimport ${componentName} from '../components/${componentName}';\n\nexport default function Page() {\n  return <${componentName} />;\n}\n`
      );

      // Minimal scaling hook
      files.set(
        'src/lib/useFigmaScale.ts',
        `import { useEffect, useState } from 'react';\n\nexport function useFigmaScale(designWidth: number, maxScale = 1.2) {\n  const [scale, setScale] = useState(() => {\n    if (typeof window === 'undefined') return 1;\n    const vw = window.innerWidth;\n    const s = vw / Math.max(1, designWidth);\n    return Math.min(Math.max(s, 0.1), maxScale);\n  });\n\n  useEffect(() => {\n    const onResize = () => {\n      const vw = window.innerWidth;\n      const s = vw / Math.max(1, designWidth);\n      setScale(Math.min(Math.max(s, 0.1), maxScale));\n    };\n    window.addEventListener('resize', onResize);\n    return () => window.removeEventListener('resize', onResize);\n  }, [designWidth, maxScale]);\n\n  return scale;\n}\n`
      );

      // ---------- component code generation ----------
      const esc = (txt: string) =>
        (txt || '')
          .replace(/`/g, '\\`')
          .replace(/\$/g, '\\$')
          .replace(/\{/g, '{"{"}')
          .replace(/\}/g, '{"}"}');

      const toStyleJSX = (obj: Record<string, any>) => {
        // returns a string like {{ key: value, key2: 'value2' }} with double braces
        const parts: string[] = [];
        for (const [k, v] of Object.entries(obj)) {
          if (v === undefined || v === null || v === '') continue;
          const key = k;
          const value = typeof v === 'number' ? String(v) : JSON.stringify(v);
          parts.push(`${key}: ${value}`);
        }
        return `{{ ${parts.join(', ')} }}`;
      };

      const rgba = (c: any) =>
        `rgba(${Math.round((c?.r || 0) * 255)}, ${Math.round((c?.g || 0) * 255)}, ${Math.round(
          (c?.b || 0) * 255
        )}, ${c?.a ?? 1})`;

      const getLocalImagePath = (nodeId: string) => localAssetMap[nodeId] || '';
      const getLocalImagePathByRef = (ref?: string) => (ref ? localAssetMap[ref] : '') || '';

      const styleFor = (node: any, parentBB?: any) => {
        const s: any = {};
        const bb = node.absoluteBoundingBox;
        if (bb) {
          if (parentBB) {
            s.position = 'absolute';
            s.left = `${bb.x - parentBB.x}px`;
            s.top = `${bb.y - parentBB.y}px`;
            s.width = `${bb.width}px`;
            s.height = `${bb.height}px`;
          } else {
            s.position = 'relative';
            s.width = `${bb.width}px`;
            s.height = `${bb.height}px`;
          }
        }
        // Background color from node.backgroundColor
        if (node.backgroundColor) s.backgroundColor = rgba(node.backgroundColor);
        // Fills
        if (node.fills?.[0]) {
          const f = node.fills[0];
          if (f.type === 'SOLID' && f.color) s.backgroundColor = rgba(f.color);
          if (f.type === 'IMAGE') {
            const p = (f.imageRef && getLocalImagePathByRef(f.imageRef)) || getLocalImagePath(node.id);
            if (p) {
              s.backgroundImage = `url('${p}')`;
              s.backgroundSize = 'cover';
              s.backgroundPosition = 'center';
              s.backgroundRepeat = 'no-repeat';
            }
          }
          if (f.type?.startsWith('GRADIENT') && Array.isArray(f.gradientStops) && f.gradientStops.length) {
            const stops = f.gradientStops
              .map((st: any) => `${rgba(st.color)} ${st.position * 100}%`)
              .join(', ');
            let dir = '';
            if (Array.isArray(f.gradientTransform)) {
              const t = f.gradientTransform.flat();
              const ang = (Math.atan2(t[1], t[0]) * 180) / Math.PI;
              dir = `${Math.round(ang * 100) / 100}deg`;
            }
            if (f.type === 'GRADIENT_LINEAR') s.background = `linear-gradient(${dir || 'to bottom'}, ${stops})`;
            else if (f.type === 'GRADIENT_RADIAL') s.background = `radial-gradient(circle at center, ${stops})`;
            else if (f.type === 'GRADIENT_ANGULAR') s.background = `conic-gradient(from ${dir || '0deg'}, ${stops})`;
            else if (f.type === 'GRADIENT_DIAMOND') {
              s.background = `radial-gradient(ellipse at center, ${stops})`;
            }
          }
        }
        // Corner radii (individual if present)
        const tl = node.cornerRadiusTopLeft, tr = node.cornerRadiusTopRight, bl = node.cornerRadiusBottomLeft, br = node.cornerRadiusBottomRight;
        if ([tl, tr, bl, br].some((v: any) => v !== undefined)) {
          const cr = node.cornerRadius ?? 0;
          const TL = tl ?? cr ?? 0, TR = tr ?? cr ?? 0, BL = bl ?? cr ?? 0, BR = br ?? cr ?? 0;
          s.borderRadius = `${TL}px ${TR}px ${BR}px ${BL}px`;
        } else if (node.cornerRadius) {
          s.borderRadius = `${node.cornerRadius}px`;
        }
        // Strokes
        if (node.strokes?.[0]) {
          const st = node.strokes[0];
          const color = st.color ? rgba(st.color) : undefined;
          const w = st.strokeWeight || node.strokeWeight || 0;
          const align = st.strokeAlign || 'CENTER';
          if (w > 0 && color) {
            if (align === 'OUTSIDE') {
              s.outline = `${w}px solid ${color}`;
              s.outlineOffset = '0px';
            } else {
              s.border = `${w}px ${Array.isArray(st.dashPattern) && st.dashPattern.length ? 'dashed' : 'solid'} ${color}`;
            }
          }
        }
        // Effects (shadows)
        if (Array.isArray(node.effects) && node.effects.length) {
          const drops: string[] = [];
          const inners: string[] = [];
          for (const e of node.effects) {
            if (!e?.visible) continue;
            if (e.type === 'DROP_SHADOW') {
              drops.push(`${e.offset?.x || 0}px ${e.offset?.y || 0}px ${e.radius || 0}px ${rgba(e.color || {})}`);
            } else if (e.type === 'INNER_SHADOW') {
              inners.push(`inset ${e.offset?.x || 0}px ${e.offset?.y || 0}px ${e.radius || 0}px ${rgba(e.color || {})}`);
            }
          }
          if (drops.length) s.boxShadow = drops.join(', ');
          if (inners.length) s.boxShadow = s.boxShadow ? `${s.boxShadow}, ${inners.join(', ')}` : inners.join(', ');
        }
        if (node.opacity !== undefined && node.opacity !== 1) s.opacity = node.opacity;
        if (node.clipContent) s.overflow = 'hidden';
        // Transforms
        const t: string[] = [];
        if (node.vectorRotation) t.push(`rotate(${node.vectorRotation}deg)`);
        else if (node.rotation && Math.abs(node.rotation) > 0) {
          let deg = node.rotation;
          if (Math.abs(deg) <= Math.PI) deg = (deg * 180) / Math.PI;
          t.push(`rotate(${Math.round(deg * 100) / 100}deg)`);
        }
        if (node.scale && (node.scale.x !== 1 || node.scale.y !== 1)) t.push(`scale(${node.scale.x}, ${node.scale.y})`);
        if (node.skew) t.push(`skew(${node.skew}deg)`);
        if (Array.isArray(node.relativeTransform)) t.push(`matrix(${node.relativeTransform.flat().join(', ')})`);
        if (Array.isArray(node.transform)) t.push(`matrix(${node.transform.join(', ')})`);
        if (node.isMirrored) {
          if (node.mirrorAxis === 'HORIZONTAL') t.push('scaleX(-1)');
          else if (node.mirrorAxis === 'VERTICAL') t.push('scaleY(-1)');
          else if (node.mirrorAxis === 'BOTH') t.push('scale(-1,-1)');
        }
        if (t.length) {
          s.transform = t.join(' ');
          s.transformOrigin = 'center center';
        }
        return s;
      };

      const groupHasMaskChild = (n: any) => n?.type === 'GROUP' && n?.children?.some((c: any) => c?.isMask);
      const genNode = (node: any, parentBB?: any, indent = 2): string => {
        if (!node) return '';
        const pad = ' '.repeat(indent);
        const s = toStyleJSX(styleFor(node, parentBB));
        const type = node.type;

        switch (type) {
          case 'TEXT': {
            const text = esc(String(node.characters || ''));
            const st = (node.style || {}) as any; // font properties
            const align = st.textAlignHorizontal === 'CENTER' ? 'center' : st.textAlignHorizontal === 'RIGHT' ? 'right' : st.textAlignHorizontal === 'JUSTIFIED' ? 'justify' : 'left';
            const mappedGoogle = (name?: string) => {
              const wl = new Set(['Inter','Roboto','Open Sans','Lato','Poppins','Montserrat','Source Sans Pro','Raleway','Ubuntu','Nunito','Work Sans','DM Sans','Noto Sans','Fira Sans','PT Sans','Oswald','Bebas Neue','Playfair Display','Merriweather','Lora','Space Grotesk','Rubik','Roboto Slab','Nunito Sans','Karla','Manrope']);
              const alias: Record<string,string> = { 'SF Pro Text':'Inter','SF Pro Display':'Inter','Helvetica Neue':'Inter','Helvetica':'Inter','Arial':'Inter','System':'Inter' };
              const n = (alias[name || ''] || name || '').trim();
              return wl.has(n) ? n : 'Inter';
            };
            const mapped = mappedGoogle(st.fontFamily);
            const t: Record<string, any> = {
              whiteSpace: 'pre-wrap',
              fontFamily: `'${mapped}', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
              fontSize: st.fontSize ? `${st.fontSize}px` : undefined,
              fontWeight: st.fontWeight || undefined,
              lineHeight: st.lineHeightPx ? `${st.lineHeightPx}px` : st.lineHeightPercent ? `${st.lineHeightPercent}%` : undefined,
              letterSpacing: st.letterSpacing ? `${st.letterSpacing}px` : undefined,
              textAlign: align,
            };
            // text color from fills
            const fill = node.fills?.[0];
            if (fill?.type === 'SOLID' && fill.color) t.color = rgba(fill.color);
            const tStyle = toStyleJSX(t);
            return `${pad}<div style=${s} data-figma-node-id=\"${node.id}\">\n${pad}  <span style=${tStyle}>${text}</span>\n${pad}</div>`;
          }
          case 'RECTANGLE':
          case 'ELLIPSE':
          case 'VECTOR':
          case 'LINE': {
            // Prefer img if we have a local asset; else a styled div
            const p = getLocalImagePath(node.id);
            if (p) {
              return `${pad}<div style=${s}>\n${pad}  <img src=\"${p}\" alt=\"${(node.name || 'image').replace(/"/g, '&quot;')}\" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />\n${pad}</div>`;
            }
            return `${pad}<div style=${s} data-figma-node-id=\"${node.id}\" />`;
          }
          case 'GROUP': {
            const hasMaskChild = Array.isArray(node.children) && node.children.some((c: any) => c?.isMask && (c.maskType || c.mask));
            const hasTextChild = Array.isArray(node.children) && node.children.some((c: any) => c?.type === 'TEXT');
            // If group has mask and no text, render as a single flattened image background
            if (hasMaskChild && !hasTextChild) {
              let p = getLocalImagePath(node.id);
              if (!p && Array.isArray(node.children)) {
                for (const c of node.children) {
                  if (Array.isArray(c?.fills)) {
                    const imgFill = c.fills.find((f: any) => f?.type === 'IMAGE');
                    if (imgFill) {
                      p = (imgFill.imageRef && getLocalImagePathByRef(imgFill.imageRef)) || getLocalImagePath(c.id) || '';
                      if (p) break;
                    }
                  }
                }
              }
              if (p) {
                const mergedStyle = styleFor(node, parentBB);
                mergedStyle.backgroundImage = `url('${p}')`;
                mergedStyle.backgroundSize = 'cover';
                mergedStyle.backgroundPosition = 'center';
                mergedStyle.backgroundRepeat = 'no-repeat';
                const s2 = toStyleJSX(mergedStyle);
                return `${pad}<div style=${s2} data-figma-node-id=\"${node.id}\" />`;
              }
            }
            // fallthrough to default container rendering
          }
          default: {
            const children = (node.children || [])
              .map((c: any) => genNode(c, node.absoluteBoundingBox, indent + 2))
              .filter(Boolean)
              .join('\n');
            if (children)
              return `${pad}<div style=${s} data-figma-node-id=\"${node.id}\">\n${children}\n${pad}</div>`;
            return `${pad}<div style=${s} data-figma-node-id=\"${node.id}\" />`;
          }
        }
      };

      const rootBB = frameNode.absoluteBoundingBox || { width: 1200, height: 800 };
      // ---------- copy assets into zip and rewrite references ----------
      // Download asset URLs and place into public/assets
      const JSZip = await import('jszip');
      const zip = new JSZip.default();

      // Add text files first
      for (const [p, c] of files) zip.file(p, c);

      // Save all discovered asset candidates (by imageRef hash or node id)
      for (const { key, aliasKeys } of assetCandidates) {
        const url = assetMap[key];
        if (!url) continue;
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = await res.arrayBuffer();
          const ct = res.headers.get('content-type') || '';
          const isSvg = ct.includes('svg') || url.endsWith('.svg');
          const ext = isSvg ? 'svg' : ct.includes('png') || url.includes('.png') ? 'png' : ct.includes('jpeg') || url.includes('.jpg') || url.includes('.jpeg') ? 'jpg' : 'png';
          const safeKey = sanitizeFilename(key);
          const path = `public/assets/${safeKey}.${ext}`;
          const publicPath = `/assets/${safeKey}.${ext}`;
          localAssetMap[key] = publicPath;
          for (const a of aliasKeys) localAssetMap[a] = publicPath;
          zip.file(path, buf);
        } catch (e) {
          console.warn('⚠️ Failed to fetch asset', key, e);
        }
      }

      // Finally, generate the component file WITH local asset paths resolved
      const componentTsx = `'use client';\n\nimport React from 'react';\nimport { useFigmaScale } from '../lib/useFigmaScale';\n\nexport default function ${componentName}() {\n  const designWidth = ${Math.round(rootBB.width || 1200)};\n  const scale = useFigmaScale(designWidth, ${enableScaling ? Math.max(1, maxScale).toFixed(1) : 1});\n  return (\n    <div style={{ width: '100vw', minHeight: '100vh', overflowX: 'hidden', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>\n      <div style={{ width: designWidth + 'px', height: '${Math.round(rootBB.height || 800)}px', transform: 'scale(' + scale + ')', transformOrigin: 'top center', position: 'relative', flexShrink: 0 }}>\n${genNode(frameNode, undefined, 8)}\n      </div>\n      <div style={{ height: (${Math.round(rootBB.height || 800)} * scale) + 'px' }} />\n    </div>\n  );\n}\n`;
      zip.file(`src/components/${componentName}.tsx`, componentTsx);

      // Produce archive
      const blob = await zip.generateAsync({ type: 'blob' });
      const outName = `${projectSlug}-nextjs-project.zip`;
      downloadBlob(blob, outName);
      console.log('✅ Exported static Next.js project');
    } catch (error) {
      console.error('❌ Export failed:', error);
    }
  };

  // Function to load assets (images and SVGs) from Figma API
  // Extract unique font families from Figma data
  const extractFontFamilies = (node: any): Set<string> => {
    const fonts = new Set<string>();
    
    const traverse = (currentNode: any) => {
      if (currentNode.style?.fontFamily) {
        fonts.add(currentNode.style.fontFamily);
      }
      
      if (currentNode.children) {
        currentNode.children.forEach(traverse);
      }
    };
    
    traverse(node);
    return fonts;
  };

  // Load fonts from Figma data
  const loadFontsFromFigmaData = async (rootNode: any) => {
    if (!rootNode) return;
    
    setFontLoadingStatus('Extracting fonts...');
    const fontFamilies = Array.from(extractFontFamilies(rootNode));
    
    if (fontFamilies.length === 0) {
      setFontLoadingStatus('No fonts found');
      return;
    }
    
    setFontLoadingStatus(`Loading ${fontFamilies.length} fonts...`);
    
    try {
      await fontLoader.loadFonts(
        fontFamilies.map(family => ({
          family,
          weights: [400, 500, 600, 700], // Common weights
          display: 'swap'
        }))
      );
      
      setLoadedFonts(new Set(fontFamilies));
      setFontLoadingStatus(`Loaded ${fontFamilies.length} fonts successfully`);
      
      if (devMode) {
        console.log('🎨 Fonts loaded:', fontFamilies);
      }
    } catch (error) {
      setFontLoadingStatus(`Font loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Font loading error:', error);
    }
  };

  const loadAssetsFromFigmaAPI = async (rootNode: any) => {
    console.log('🚀 loadAssetsFromFigmaAPI called with:');
    console.log('  - fileKey:', fileKey);
    console.log('  - figmaToken:', figmaToken ? '***' : 'missing');
    console.log('  - rootNode:', rootNode?.name, rootNode?.id);
    
    if (!fileKey || !figmaToken) {
      console.log('⚠️ Missing file key or token, skipping API asset loading');
      console.log('  - fileKey missing:', !fileKey);
      console.log('  - figmaToken missing:', !figmaToken);
      return;
    }

    try {
      console.log('🚀 Loading assets from Figma API...');
      setAssetLoadingStatus('Loading assets from Figma API...');
      setAssetLoadingProgress({ total: 0, loaded: 0, isLoading: true });
      
      const apiAssetMap = await loadFigmaAssetsFromNodes({
        figmaFileKey: fileKey,
        figmaToken: figmaToken,
        rootNode: rootNode,
        onProgress: (total, loaded) => {
          setAssetLoadingProgress({ total, loaded, isLoading: true });
        },
      });
      
      if (Object.keys(apiAssetMap).length > 0) {
        setAssetMap(apiAssetMap);
        setAssetLoadingStatus(`✅ Loaded ${Object.keys(apiAssetMap).length} assets from Figma API`);
        setAssetLoadingProgress({ total: Object.keys(apiAssetMap).length, loaded: Object.keys(apiAssetMap).length, isLoading: false });
        console.log('✅ Assets loaded from Figma API:', apiAssetMap);
      } else {
        setAssetLoadingStatus('ℹ️ No assets found in design - continuing without images');
        setAssetLoadingProgress({ total: 0, loaded: 0, isLoading: false });
        console.log('ℹ️ No assets found in design - continuing without images');
      }
    } catch (error) {
      console.error('❌ Error loading assets from Figma API:', error);
      setAssetLoadingStatus('⚠️ Could not load images - continuing without assets');
      setAssetLoadingProgress({ total: 0, loaded: 0, isLoading: false });
      
      // Don't let API errors prevent the app from working
      console.log('🔄 Continuing with design rendering without assets');
    }
  };

  // Effect to trigger image loading when fileKey and figmaToken are available
  useEffect(() => {
    console.log('🔄 useEffect triggered - checking conditions:');
    console.log('📁 File Key:', fileKey);
    console.log('🔑 Token available:', !!figmaToken);
    console.log('📄 Frame Node available:', !!frameNode);
    console.log('📄 Frame Node name:', frameNode?.name);
    console.log('📄 Frame Node ID:', frameNode?.id);
    
    if (fileKey && figmaToken && frameNode) {
      console.log('✅ All conditions met, triggering asset loading...');
      console.log('📁 File Key:', fileKey);
      console.log('🔑 Token available:', !!figmaToken);
      console.log('📄 Frame Node:', frameNode.name);
      console.log('📄 Frame Node ID:', frameNode.id);
      
      loadAssetsFromFigmaAPI(frameNode);
    } else {
      console.log('❌ Missing conditions:');
      if (!fileKey) console.log('  - Missing fileKey');
      if (!figmaToken) console.log('  - Missing figmaToken');
      if (!frameNode) console.log('  - Missing frameNode');
    }
  }, [fileKey, figmaToken, frameNode]);

  // Function to clear all data and reset state
  const clearAllData = async () => {
    setFigmaData(null);
    setFrameNode(null);
    setAssetMap({});
    setAssetLoadingStatus('Not started');
    setFileKey('');
    setFigmaToken('');
    setFigmaUrl('');
    setDataSource('');
    setError(null);
    setUploadError(null);
    setDataVersion(prev => prev + 1);
    
    // Clear IndexedDB data
    try {
      const { clearAllFigmaData } = await import('@/lib/figmaStorage');
      await clearAllFigmaData();
      console.log('🧹 Cleared IndexedDB data');
    } catch (error) {
      console.error('❌ Failed to clear IndexedDB:', error);
    }
    
    // Clear ALL localStorage data completely
    localStorage.clear();
    
    console.log('🧹 All data cleared including localStorage and IndexedDB');
    
    // Force page refresh to ensure completely clean state
    window.location.reload();
  };

  const clearDataWithoutReload = () => {
    setFigmaData(null);
    setFrameNode(null);
    setAssetMap({});
    setAssetLoadingStatus('Not started');
    setFileKey('');
    setFigmaToken('');
    setFigmaUrl('');
    setDataSource('');
    setError(null);
    setUploadError(null);
    setDataVersion(prev => prev + 1);
    
    console.log('🧹 Data cleared without page reload');
  };

  // Dynamic JSON upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setUploadError('Please select a valid JSON file');
      return;
    }

    setUploadError(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        
        console.log('📁 File uploaded, processing data...', jsonData);
        
        // Clear existing data first (without page reload)
        clearDataWithoutReload();
        
        // Check if this is plugin data
        if (isPluginExport(jsonData)) {
          try {
            console.log('🚀 Detected plugin export data');
            const pluginData = parsePluginData(jsonData);
            
            // Set data in correct order
            setFigmaData(pluginData);
            setDataSource('Plugin Export');
            
            // Use plugin image data
            if (pluginData.imageMap && Object.keys(pluginData.imageMap).length > 0) {
              setAssetMap(pluginData.imageMap);
              setAssetLoadingStatus(`✅ Loaded ${Object.keys(pluginData.imageMap).length} assets from plugin`);
            }
            
            // Parse the data last to trigger re-render
            setTimeout(async () => {
              await parseFigmaData(pluginData);
            }, 100);
            
            console.log('🚀 Plugin data uploaded and parsed successfully');
          } catch (pluginError) {
            console.error('❌ Error parsing plugin data:', pluginError);
            setUploadError('Invalid plugin export data. Please check the file format.');
          }
        } else {
          // Regular Figma JSON
          console.log('📄 Processing regular Figma JSON');
          setFigmaData(jsonData);
          setDataSource('File Upload');
          
          // Use plugin image data if available
          if (jsonData.imageMap && Object.keys(jsonData.imageMap).length > 0) {
                          setAssetMap(jsonData.imageMap);
              setAssetLoadingStatus(`✅ Loaded ${Object.keys(jsonData.imageMap).length} assets from plugin`);
          }
          
          // Parse the data last to trigger re-render
          setTimeout(async () => {
            await parseFigmaData(jsonData);
          }, 100);
          
          console.log('✅ File uploaded and parsed successfully');
        }
      } catch (error) {
        console.error('❌ Error parsing JSON file:', error);
        setUploadError('Invalid JSON file. Please check the file format.');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setUploadError('Error reading file. Please try again.');
      setLoading(false);
    };

    reader.readAsText(file);
  };

  // Test function to manually call Figma API
  const testFigmaAPI = async () => {
    if (!fileKey || !figmaToken) {
      setAssetLoadingStatus('❌ Cannot test API: Missing file key or token');
      return;
    }
    
    try {
      setAssetLoadingStatus('Testing API...');
      const url = `https://api.figma.com/v1/images/${fileKey}?ids=55446:11667&format=png&scale=2`;
      console.log('🧪 Testing API call to:', url);
      
      const response = await fetch(url, {
        headers: {
          'X-Figma-Token': figmaToken,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Test response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Test API Error:', errorText);
        setAssetLoadingStatus(`API Error: ${response.status} ${response.statusText}`);
        return;
      }
      
      const data = await response.json();
      console.log('✅ Test API Response:', data);
              setAssetLoadingStatus(`API Test Success: ${JSON.stringify(data)}`);
      
      // If API test succeeds, update the image map
      if (data.images && data.images['55446:11667']) {
        setAssetMap(data.images);
      }
      
    } catch (error) {
      console.error('❌ Test API Error:', error);
              setAssetLoadingStatus(`Test Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Add sample banner design with footer
  const addSampleBanner = () => {
    const bannerNode = {
      id: "banner-root",
      name: "Banner Design",
      type: "FRAME",
      absoluteBoundingBox: {
        x: 0,
        y: 0,
        width: 1200,
        height: 800
      },
      children: [
        // Main headline
        {
          id: "headline",
          name: "Integrated. Agile. All-In.",
          type: "TEXT",
          absoluteBoundingBox: {
            x: 50,
            y: 50,
            width: 800,
            height: 80
          },
          characters: "Integrated. Agile. All-In.",
          fills: [
            {
              type: "SOLID",
              color: { r: 0, g: 0, b: 0 }
            }
          ],
          style: {
            fontSize: 48,
            fontWeight: 700,
            textAlignHorizontal: "LEFT"
          }
        },
        // Circular image 1
        {
          id: "circle-1",
          name: "Manufacturing Image",
          type: "RECTANGLE",
          absoluteBoundingBox: {
            x: 50,
            y: 200,
            width: 150,
            height: 150
          },
          cornerRadius: 75,
          fills: [
            {
              type: "IMAGE",
              imageRef: "manufacturing-image"
            }
          ]
        },
        // Text under circle 1
        {
          id: "text-1",
          name: "Manufacturing that moves",
          type: "TEXT",
          absoluteBoundingBox: {
            x: 50,
            y: 370,
            width: 150,
            height: 40
          },
          characters: "Manufacturing that moves",
          fills: [
            {
              type: "SOLID",
              color: { r: 0, g: 0, b: 0 }
            }
          ],
          style: {
            fontSize: 14,
            fontWeight: 500,
            textAlignHorizontal: "CENTER"
          }
        },
        // Circular image 2
        {
          id: "circle-2",
          name: "Brands Image",
          type: "RECTANGLE",
          absoluteBoundingBox: {
            x: 250,
            y: 200,
            width: 150,
            height: 150
          },
          cornerRadius: 75,
          fills: [
            {
              type: "IMAGE",
              imageRef: "brands-image"
            }
          ]
        },
        // Text under circle 2
        {
          id: "text-2",
          name: "Brands that Define Movement",
          type: "TEXT",
          absoluteBoundingBox: {
            x: 250,
            y: 370,
            width: 150,
            height: 40
          },
          characters: "Brands that Define Movement",
          fills: [
            {
              type: "SOLID",
              color: { r: 0, g: 0, b: 0 }
            }
          ],
          style: {
            fontSize: 14,
            fontWeight: 500,
            textAlignHorizontal: "CENTER"
          }
        },
        // Circular image 3
        {
          id: "circle-3",
          name: "Retail Image",
          type: "RECTANGLE",
          absoluteBoundingBox: {
            x: 450,
            y: 200,
            width: 150,
            height: 150
          },
          cornerRadius: 75,
          fills: [
            {
              type: "IMAGE",
              imageRef: "retail-image"
            }
          ]
        },
        // Text under circle 3
        {
          id: "text-3",
          name: "Retail that Energizes",
          type: "TEXT",
          absoluteBoundingBox: {
            x: 450,
            y: 370,
            width: 150,
            height: 40
          },
          characters: "Retail that Energizes",
          fills: [
            {
              type: "SOLID",
              color: { r: 0, g: 0, b: 0 }
            }
          ],
          style: {
            fontSize: 14,
            fontWeight: 500,
            textAlignHorizontal: "CENTER"
          }
        },
        // Footer section
        {
          id: "footer",
          name: "Footer",
          type: "FRAME",
          absoluteBoundingBox: {
            x: 0,
            y: 600,
            width: 1200,
            height: 200
          },
          layoutMode: "HORIZONTAL",
          primaryAxisAlignItems: "SPACE_BETWEEN",
          counterAxisAlignItems: "CENTER",
          paddingLeft: 50,
          paddingRight: 50,
          children: [
            // Logo
            {
              id: "footer-logo",
              name: "Logo",
              type: "TEXT",
              absoluteBoundingBox: {
                x: 50,
                y: 650,
                width: 200,
                height: 40
              },
              characters: "DesignStorm",
              fills: [
                {
                  type: "SOLID",
                  color: { r: 0, g: 0, b: 0 }
                }
              ],
              style: {
                fontSize: 24,
                fontWeight: 700,
                textAlignHorizontal: "LEFT"
              }
            },
            // Navigation links
            {
              id: "footer-nav",
              name: "Navigation Links",
              type: "FRAME",
              absoluteBoundingBox: {
                x: 400,
                y: 650,
                width: 400,
                height: 40
              },
              layoutMode: "HORIZONTAL",
              primaryAxisAlignItems: "CENTER",
              itemSpacing: 40,
              children: [
                {
                  id: "nav-link-1",
                  name: "About",
                  type: "TEXT",
                  absoluteBoundingBox: {
                    x: 400,
                    y: 650,
                    width: 50,
                    height: 20
                  },
                  characters: "About",
                  fills: [
                    {
                      type: "SOLID",
                      color: { r: 0.4, g: 0.4, b: 0.4 }
                    }
                  ],
                  style: {
                    fontSize: 16,
                    fontWeight: 400,
                    textAlignHorizontal: "CENTER"
                  }
                },
                {
                  id: "nav-link-2",
                  name: "Services",
                  type: "TEXT",
                  absoluteBoundingBox: {
                    x: 490,
                    y: 650,
                    width: 70,
                    height: 20
                  },
                  characters: "Services",
                  fills: [
                    {
                      type: "SOLID",
                      color: { r: 0.4, g: 0.4, b: 0.4 }
                    }
                  ],
                  style: {
                    fontSize: 16,
                    fontWeight: 400,
                    textAlignHorizontal: "CENTER"
                  }
                },
                {
                  id: "nav-link-3",
                  name: "Contact",
                  type: "TEXT",
                  absoluteBoundingBox: {
                    x: 600,
                    y: 650,
                    width: 70,
                    height: 20
                  },
                  characters: "Contact",
                  fills: [
                    {
                      type: "SOLID",
                      color: { r: 0.4, g: 0.4, b: 0.4 }
                    }
                  ],
                  style: {
                    fontSize: 16,
                    fontWeight: 400,
                    textAlignHorizontal: "CENTER"
                  }
                }
              ]
            },
            // Social icons
            {
              id: "social-icons",
              name: "Social Icons",
              type: "FRAME",
              absoluteBoundingBox: {
                x: 900,
                y: 650,
                width: 200,
                height: 40
              },
              layoutMode: "HORIZONTAL",
              primaryAxisAlignItems: "CENTER",
              itemSpacing: 20,
              children: [
                {
                  id: "linkedin-icon",
                  name: "LinkedIn",
                  type: "RECTANGLE",
                  absoluteBoundingBox: {
                    x: 900,
                    y: 650,
                    width: 40,
                    height: 40
                  },
                  cornerRadius: 20,
                  fills: [
                    {
                      type: "IMAGE",
                      imageRef: "linkedin-image"
                    }
                  ]
                },
                {
                  id: "instagram-icon",
                  name: "Instagram",
                  type: "RECTANGLE",
                  absoluteBoundingBox: {
                    x: 960,
                    y: 650,
                    width: 40,
                    height: 40
                  },
                  cornerRadius: 20,
                  fills: [
                    {
                      type: "IMAGE",
                      imageRef: "instagram-image"
                    }
                  ]
                },
                {
                  id: "youtube-icon",
                  name: "YouTube",
                  type: "RECTANGLE",
                  absoluteBoundingBox: {
                    x: 1020,
                    y: 650,
                    width: 40,
                    height: 40
                  },
                  cornerRadius: 20,
                  fills: [
                    {
                      type: "IMAGE",
                      imageRef: "youtube-image"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    
    setFrameNode(bannerNode);
          setAssetLoadingStatus('Added sample banner design with footer');
  };

  // Parse Figma JSON and extract frame node
  const parseFigmaData = async (data: FigmaData) => {
    try {
      console.log('🔍 Parsing Figma data:', data);
      
      let documentNode: FigmaNode | null = null;
      
      // Handle different data structures
      if (data.nodes && Object.keys(data.nodes).length > 0) {
        // Standard Figma export structure
        const nodeKeys = Object.keys(data.nodes);
        console.log('📁 Available node keys:', nodeKeys);
        
        // Try to find the main frame or page
        let foundNode = null;
        for (const key of nodeKeys) {
          const node = data.nodes[key];
          if (node.document) {
            console.log('🔍 Checking node:', key, node.document.name, node.document.type);
            
            // Look for PAGE, FRAME, or CANVAS type nodes
            if (node.document.type === 'PAGE' || node.document.type === 'CANVAS') {
              foundNode = node.document;
              console.log('✅ Found main page/canvas:', node.document.name);
              break;
            }
            
            // If no page/canvas found, use the first document
            if (!foundNode) {
              foundNode = node.document;
            }
          }
        }
        
        documentNode = foundNode;
        console.log('📄 Selected document node:', documentNode);
      } else if (data.document) {
        // Direct document structure (from upload page or plugin)
        documentNode = data.document;
        console.log('📄 Direct document node:', documentNode);
      }
      
      if (!documentNode) {
        throw new Error('No document node found in the uploaded data');
      }

      // Extract available pages/frames
      const extractAvailablePages = (root: FigmaNode): PageInfo[] => {
        const pages: PageInfo[] = [];
        
        const findFrames = (node: FigmaNode, isTopLevel: boolean = true): void => {
          if (node.type === 'FRAME' && isTopLevel) {
            pages.push({ 
              id: node.id || `frame-${pages.length}`, 
              name: node.name || `Frame ${pages.length + 1}`, 
              node 
            });
          } else if (node.type === 'CANVAS' || node.type === 'PAGE' || node.type === 'DOCUMENT') {
            node.children?.forEach(child => {
              if (child.type === 'FRAME') {
                pages.push({ 
                  id: child.id || `frame-${pages.length}`, 
                  name: child.name || `Frame ${pages.length + 1}`, 
                  node: child 
                });
              } else {
                findFrames(child, false);
              }
            });
          }
        };
        
        findFrames(root);
        return pages;
      };

      const pages = extractAvailablePages(documentNode);
      let targetNode: FigmaNode = documentNode;

      if (pages.length > 1) {
        console.log('🔄 Multi-page design detected with', pages.length, 'pages');
        setIsMultiPageDesign(true);
        setAvailablePages(pages);
        const initialPageId = selectedPageId && pages.some(p => p.id === selectedPageId) ? selectedPageId : pages[0].id;
        setSelectedPageId(initialPageId);
        const initialPage = pages.find(p => p.id === initialPageId)!;
        targetNode = initialPage.node;
      } else if (pages.length === 1) {
        console.log('📄 Single frame found within document/canvas');
        setIsMultiPageDesign(false);
        setAvailablePages(pages);
        setSelectedPageId(pages[0].id);
        targetNode = pages[0].node;
      } else {
        console.log('📄 Using document node as the render target');
        setIsMultiPageDesign(false);
        setAvailablePages([]);
        setSelectedPageId(null);
      }

      // Initialize tree builder for the selected frame
      if (devMode) {
        resetGlobalTreeBuilder();
        const treeBuilder = getGlobalTreeBuilder();
        treeBuilder.startTree(targetNode.id);
        
        // Build tree recursively
        const buildTreeRecursively = (node: FigmaNode, parentId?: string) => {
          // Extract styles and props
          const styles = extractNodeStyles(node);
          const props = extractNodeProps(node);
          
          // Add node to tree
          treeBuilder.addNode(
            node.id,
            node.type,
            node.name,
            styles,
            props,
            parentId
          );
          
          // Process children
          if (node.children) {
            treeBuilder.enterNode(node.id);
            node.children.forEach(child => {
              buildTreeRecursively(child, node.id);
            });
            treeBuilder.exitNode();
          }
        };
        
        buildTreeRecursively(targetNode);
        treeBuilder.serializeToLocalStorage('figmaTree');
        console.log('🌳 Tree built and serialized for frame:', targetNode.name);
      }

      // Log the structure for debugging
      console.log('🎨 Document structure:', {
        name: targetNode.name,
        type: targetNode.type,
        childrenCount: targetNode.children?.length || 0,
        children: targetNode.children?.map(child => ({
          name: child.name,
          type: child.type,
          id: child.id,
          hasBoundingBox: !!child.absoluteBoundingBox,
          childrenCount: child.children?.length || 0
        }))
      });

      // Load fonts from the target node
      await loadFontsFromFigmaData(targetNode);
      
      // Force re-render by setting frame node and incrementing version
      setFrameNode(null); // Clear first
      setDataVersion(prev => prev + 1); // Increment version to force re-render
      setTimeout(() => {
        setFrameNode(targetNode);
        console.log('✅ Frame node updated, triggering re-render');
      }, 0);
      
    } catch (err) {
      console.error('❌ Error parsing Figma data:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse Figma data');
    }
  };

  // Helper function to extract node styles
  const extractNodeStyles = (node: FigmaNode): React.CSSProperties => {
    const styles: React.CSSProperties = {};
    
    if (node.absoluteBoundingBox) {
      styles.position = 'absolute';
      styles.left = `${node.absoluteBoundingBox.x}px`;
      styles.top = `${node.absoluteBoundingBox.y}px`;
      styles.width = `${node.absoluteBoundingBox.width}px`;
      styles.height = `${node.absoluteBoundingBox.height}px`;
    }
    
    if (node.opacity !== undefined) {
      styles.opacity = node.opacity;
    }
    
    if (node.visible === false) {
      styles.display = 'none';
    }
    
    // Add more style extraction as needed
    return styles;
  };

  // Helper function to extract node props
  const extractNodeProps = (node: FigmaNode): Record<string, any> => {
    const props: Record<string, any> = {};
    
    if (node.type === 'TEXT' && node.characters) {
      props.textContent = node.characters;
      props.characters = node.characters;
    }
    
    if (node.type === 'IMAGE') {
      props.alt = node.name || 'Image';
    }
    
    // Add more prop extraction as needed
    return props;
  };

  // Load Figma data from URL parameters or localStorage
  useEffect(() => {
    const loadFigmaData = async () => {
      try {
        setLoading(true);
        
        // First try to load from URL parameters
        const dataParam = searchParams.get('data');
        
        if (dataParam) {
          // Load data from URL parameters
          const decodedData = decodeURIComponent(dataParam);
          const figmaData = JSON.parse(decodedData);
          
          // Clear any existing data to ensure fresh start
                setAssetMap({});
      setAssetLoadingStatus('Processing new data...');
          
          let dataSource = '';
          
          // Check if this is plugin data
          if (figmaData.metadata?.exportedBy === 'DesignStorm Plugin') {
            dataSource = 'Plugin Export';
            console.log('🚀 Plugin data detected with images and assets');
          } else {
            dataSource = 'URL parameters';
            console.log('📄 Regular JSON data detected');
          }
          
          // Update both IndexedDB and localStorage with new data
          try {
            const { saveFigmaData } = await import('@/lib/figmaStorage');
            await saveFigmaData(figmaData);
            console.log('✅ Updated IndexedDB with new data from URL');
          } catch (error) {
            console.error('❌ Failed to save to IndexedDB:', error);
          }
          localStorage.setItem('figmaData', JSON.stringify(figmaData));
          console.log('✅ Updated localStorage with new data from URL');
          
          console.log(`✅ Figma data loaded successfully from ${dataSource}`);
          setDataSource(dataSource);
          setFigmaData(figmaData);
          await parseFigmaData(figmaData);
          
          // Extract file key from URL if available
          const urlParam = searchParams.get('url');
          if (urlParam) {
            setFigmaUrl(urlParam);
            const extractedFileKey = extractFileKeyFromUrl(urlParam);
            if (extractedFileKey) {
              setFileKey(extractedFileKey);
            }
          }
          
          // Load token from localStorage if available
          const storedToken = localStorage.getItem('figmaToken');
          if (storedToken) {
            setFigmaToken(storedToken);
            console.log('✅ Loaded Figma token from localStorage');
          }
          
          // Check if we need to extract file key from stored URL
          const storedUrl = localStorage.getItem('figmaUrl');
          if (storedUrl) {
            setFigmaUrl(storedUrl);
            const extractedFileKey = extractFileKeyFromUrl(storedUrl);
            if (extractedFileKey) {
              setFileKey(extractedFileKey);
              console.log('✅ Extracted file key from stored URL:', extractedFileKey);
            } else {
              console.log('❌ Could not extract file key from stored URL:', storedUrl);
            }
          } else {
            console.log('❌ No stored Figma URL found');
          }
      
          // Use plugin asset data if available
          if (figmaData.imageMap && Object.keys(figmaData.imageMap).length > 0) {
            setAssetMap(figmaData.imageMap);
            setAssetLoadingStatus(`✅ Loaded ${Object.keys(figmaData.imageMap).length} assets from plugin`);
            console.log('🚀 Using plugin asset data:', Object.keys(figmaData.imageMap).length, 'assets');
          }
        } else {
          // No URL data, try to load from IndexedDB first, then localStorage (from upload page)
          console.log('🔄 Loading data from storage (upload page)...');
          let storedData = null;
          
          // Try IndexedDB first
          try {
            const { loadFigmaData } = await import('@/lib/figmaStorage');
            storedData = await loadFigmaData();
            if (storedData) {
              console.log('📁 Successfully loaded data from IndexedDB');
            }
          } catch (error) {
            console.error('❌ Failed to load from IndexedDB:', error);
          }
          
          // Fallback to localStorage if IndexedDB failed
          if (!storedData) {
            const localData = localStorage.getItem('figmaData');
            if (localData) {
              storedData = JSON.parse(localData);
              console.log('📁 Loaded data from localStorage (fallback)');
            }
          }
          
          if (storedData) {
            try {
              const figmaData = storedData; // Data from IndexedDB is already parsed
              console.log('📁 Processing loaded data from storage');
              
              setAssetMap({});
              setAssetLoadingStatus('Processing uploaded data...');
              
              let dataSource = 'File Upload';
              
              // Check if this is plugin data
              if (figmaData.metadata?.exportedBy === 'DesignStorm Plugin') {
                dataSource = 'Plugin Export';
                console.log('🚀 Plugin data detected with images and assets');
              }
              
              console.log(`✅ Figma data loaded successfully from ${dataSource}`);
              setDataSource(dataSource);
              setFigmaData(figmaData);
              await parseFigmaData(figmaData);
              
              // Load token from IndexedDB first, then localStorage
              try {
                const { loadFigmaToken } = await import('@/lib/figmaStorage');
                const storedToken = await loadFigmaToken();
                if (storedToken) {
                  setFigmaToken(storedToken);
                  console.log('✅ Loaded Figma token from IndexedDB');
                } else {
                  // Fallback to localStorage
                  const localToken = localStorage.getItem('figmaToken');
                  if (localToken) {
                    setFigmaToken(localToken);
                    console.log('✅ Loaded Figma token from localStorage (fallback)');
                  }
                }
              } catch (error) {
                console.error('❌ Failed to load token from IndexedDB, trying localStorage:', error);
                const localToken = localStorage.getItem('figmaToken');
                if (localToken) {
                  setFigmaToken(localToken);
                  console.log('✅ Loaded Figma token from localStorage (fallback)');
                }
              }
              
              // Load URL from IndexedDB first, then localStorage
              try {
                const { loadFigmaUrl } = await import('@/lib/figmaStorage');
                const storedUrl = await loadFigmaUrl();
                if (storedUrl) {
                  setFigmaUrl(storedUrl);
                  const extractedFileKey = extractFileKeyFromUrl(storedUrl);
                  if (extractedFileKey) {
                    setFileKey(extractedFileKey);
                    console.log('✅ Extracted file key from stored URL (IndexedDB):', extractedFileKey);
                  } else {
                    console.log('❌ Could not extract file key from stored URL:', storedUrl);
                  }
                } else {
                  // Fallback to localStorage
                  const localUrl = localStorage.getItem('figmaUrl');
                  if (localUrl) {
                    setFigmaUrl(localUrl);
                    const extractedFileKey = extractFileKeyFromUrl(localUrl);
                    if (extractedFileKey) {
                      setFileKey(extractedFileKey);
                      console.log('✅ Extracted file key from stored URL (localStorage fallback):', extractedFileKey);
                    }
                  } else {
                    console.log('❌ No stored Figma URL found');
                  }
                }
              } catch (error) {
                console.error('❌ Failed to load URL from IndexedDB, trying localStorage:', error);
                const localUrl = localStorage.getItem('figmaUrl');
                if (localUrl) {
                  setFigmaUrl(localUrl);
                  const extractedFileKey = extractFileKeyFromUrl(localUrl);
                  if (extractedFileKey) {
                    setFileKey(extractedFileKey);
                    console.log('✅ Extracted file key from stored URL (localStorage fallback):', extractedFileKey);
                  }
                }
              }
              
              // Use plugin asset data if available
              if (figmaData.imageMap && Object.keys(figmaData.imageMap).length > 0) {
                setAssetMap(figmaData.imageMap);
                setAssetLoadingStatus(`✅ Loaded ${Object.keys(figmaData.imageMap).length} assets from plugin`);
                console.log('🚀 Using plugin asset data:', Object.keys(figmaData.imageMap).length, 'assets');
              }
            } catch (err) {
              console.error('❌ Error loading from localStorage:', err);
              // Clear invalid localStorage data
              localStorage.removeItem('figmaData');
              console.log('📤 No valid data found, ready for file upload');
              setLoading(false);
              return;
            }
          } else {
            // No data anywhere, show upload interface
            console.log('📤 No data found, ready for file upload');
            setLoading(false);
            return;
          }
        }
        
      } catch (err) {
        console.error('❌ Error loading Figma data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load Figma data');
      } finally {
        setLoading(false);
      }
    };

    loadFigmaData();
  }, [searchParams]);

  // Loading state
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Figma design...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Design</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.history.back()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // No data state - show upload interface
  if (!figmaData || !frameNode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Figma to Code</h1>
            <p className="text-gray-600">Upload your Figma JSON to see the rendered design</p>
          </div>
          
          {/* File Upload Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Figma JSON File</h3>
            <div className="space-y-4">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploadError && (
                <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">
                  {uploadError}
                </div>
              )}
              <p className="text-xs text-gray-500">
                Supports Figma JSON exports and plugin data. The design will render immediately after upload.
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3">Test the scaling functionality:</p>
            <button 
              onClick={addSampleBanner}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
            >
              🎯 Load Sample Banner (Test Scaling)
            </button>
            <p className="text-xs text-gray-500 mt-2">
              This will load a sample 1200px wide banner to test the universal scaling system.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ margin: 0, padding: 0 }}>
      {/* Sticky Header with Page Selector and Export */}
      <div className="bg-white border-b border-gray-200 py-2 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between space-x-4 px-4">
          {/* Left Section - Brand & Page Selector */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {/* Brand */}
            <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900">
              <span className="px-2 py-1 rounded bg-gray-100">Figma</span>
              <span className="text-gray-400">→</span>
              <span className="px-2 py-1 rounded bg-gray-100">React</span>
            </div>
            
            {/* Page Selector */}
            {isMultiPageDesign && availablePages.length > 0 && (
              <select
                value={selectedPageId ?? ''}
                onChange={(e) => {
                  const pageId = e.target.value;
                  setSelectedPageId(pageId);
                  const selected = availablePages.find(p => p.id === pageId);
                  if (selected) {
                    // Reset assets so we only load for the selected page
                    setAssetMap({});
                    setAssetLoadingStatus('Not started');
                    setFrameNode(null);
                    setTimeout(() => setFrameNode(selected.node), 0);
                    // Optionally reload fonts for the selected frame
                    loadFontsFromFigmaData(selected.node);
                  }
                }}
                className="h-8 px-2 text-sm bg-white border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                {availablePages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            
            {/* Current frame info */}
            <span className="text-sm text-gray-600 truncate">
              {frameNode?.name} ({frameNode?.children?.length || 0} elements)
            </span>
          </div>
          
          {/* Center Section - File Upload */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="text-xs border border-gray-300 rounded file:mr-1 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {uploadError && (
              <span className="text-red-600 text-xs bg-red-50 px-1.5 py-0.5 rounded">
                {uploadError}
              </span>
            )}
          </div>
          
          {/* Right Section - Controls */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Render Mode removed */}
            
            {/* Dev Mode */}
            <button
              onClick={() => setDevMode(!devMode)}
              className={`px-2 py-1 text-xs rounded transition-colors font-medium ${
                devMode 
                  ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {devMode ? '🔧' : '⚙️'} Dev
            </button>
            
            {/* Debug Toggle */}
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors font-medium"
            >
              {showDebug ? 'Hide' : 'Show'} Debug
            </button>
            
            {/* Debug Panel */}
            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className={`px-2 py-1 text-xs rounded transition-colors font-medium ${
                showDebugPanel 
                  ? 'bg-purple-100 hover:bg-purple-200 text-purple-800' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {showDebugPanel ? '📊' : '📈'} Panel
            </button>
            
            {/* Scaling Toggle */}
            <button
              onClick={() => setEnableScaling(!enableScaling)}
              className={`px-2 py-1 text-xs rounded transition-colors font-medium ${
                enableScaling 
                  ? 'bg-blue-100 hover:bg-blue-200 text-blue-800' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {enableScaling ? '📏' : '📐'} Scale
            </button>
            
            {/* Export Button */}
            <button
              onClick={handleExport}
              className="px-3 py-1 text-xs font-medium text-white rounded bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 active:scale-[0.98] transition-transform shadow-sm flex items-center gap-1"
              title="Export React component"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                <path d="M12 3a1 1 0 011 1v8.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L11 12.586V4a1 1 0 011-1z"/>
                <path d="M5 19a2 2 0 002 2h10a2 2 0 002-2v-3a1 1 0 112 0v3a4 4 0 01-4 4H7a4 4 0 01-4-4v-3a1 1 0 112 0v3z"/>
              </svg>
              Export
            </button>
            
            {/* Clear Data */}
            <button
              onClick={clearAllData}
              className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors font-medium"
            >
              🗑️ Clear
            </button>
            
            {/* Back Button */}
            <button
              onClick={() => window.history.back()}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
      
      {/* Minimal Asset Loading Progress Bar - Below Header */}
      {assetLoadingProgress.isLoading && (
        <div className="bg-blue-50/80 border-b border-blue-200/50 shadow-sm sticky top-12 z-40">
          <div className="h-8 flex items-center justify-between px-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span className="text-blue-800 text-xs font-medium">
                {assetLoadingProgress.total > 0 
                  ? `${assetLoadingProgress.loaded}/${assetLoadingProgress.total} assets`
                  : 'Searching...'
                }
              </span>
            </div>
            {assetLoadingProgress.total > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-blue-200/50 rounded-full h-1.5">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                    style={{ 
                      width: `${Math.round((assetLoadingProgress.loaded / assetLoadingProgress.total) * 100)}%` 
                    }}
                  ></div>
                </div>
                <span className="text-blue-600 text-xs font-medium">
                  {Math.round((assetLoadingProgress.loaded / assetLoadingProgress.total) * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main render area */}
      <div className="bg-white w-screen figma-renderer-container" style={{ margin: 0, padding: 0 }}>
        <div className="relative w-screen figma-renderer-container overflow-hidden" style={{ margin: 0, padding: 0 }}>
          
          {/* Smart Debug Panel Overlay */}
          {showDebugPanel && (
            <div className="absolute inset-0 bg-white bg-opacity-95 backdrop-blur-sm z-50 rounded-lg border-2 border-purple-300 shadow-2xl">
              <div className="p-6 h-full overflow-y-auto">
                {/* Debug Panel Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">📊</span>
                    <h3 className="text-lg font-bold text-gray-900">Debug Information Panel</h3>
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                      Smart Overlay
                    </span>
                  </div>
                  <button
                    onClick={() => setShowDebugPanel(false)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Debug Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Basic Info */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <span className="mr-2">📋</span>Basic Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Frame:</span>
                          <span className="font-medium">{frameNode?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span className="font-medium">{frameNode?.type || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Children:</span>
                          <span className="font-medium">{frameNode?.children?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Data Source:</span>
                          <span className="font-medium">{dataSource}</span>
                        </div>
                        {/* Render Mode removed from debug info */}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <span className="mr-2">🔧</span>Configuration
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dev Mode:</span>
                          <span className={`font-medium ${devMode ? 'text-green-600' : 'text-gray-600'}`}>
                            {devMode ? 'On' : 'Off'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Layout Debug:</span>
                          <span className={`font-medium ${false ? 'text-green-600' : 'text-gray-600'}`}>
                            Off
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Scaling:</span>
                          <span className={`font-medium ${enableScaling ? 'text-blue-600' : 'text-gray-600'}`}>
                            {enableScaling ? 'On' : 'Off'}
                          </span>
                        </div>
                        {enableScaling && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Max Scale:</span>
                              <span className="font-medium">{maxScale}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Transform Origin:</span>
                              <span className="font-medium">{transformOrigin}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Overflow:</span>
                          <span className={`font-medium ${false ? 'text-orange-600' : 'text-purple-600'}`}>
                            Visible
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column - Advanced Info */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <span className="mr-2">🖼️</span>Image Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Assets Found:</span>
                          <span className="font-medium">{Object.keys(assetMap).length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Asset Status:</span>
                                                      <span className={`font-medium ${assetLoadingStatus === 'Not started' ? 'text-yellow-600' : 'text-green-600'}`}>
                              {assetLoadingStatus}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">File Key:</span>
                          <span className="font-medium">{fileKey || 'Not provided'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Token Status:</span>
                          <span className={`font-medium ${figmaToken ? 'text-green-600' : 'text-yellow-600'}`}>
                            {figmaToken ? 'Loaded' : 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Plugin Data:</span>
                          <span className={`font-medium ${figmaData?.metadata?.exportedBy === 'DesignStorm Plugin' ? 'text-purple-600' : 'text-gray-600'}`}>
                            {figmaData?.metadata?.exportedBy === 'DesignStorm Plugin' ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <span className="mr-2">⚡</span>Quick Actions
                      </h4>
                      <div className="space-y-2">
                        <button
                          onClick={testFigmaAPI}
                          className="w-full px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                        >
                          Test API Connection
                        </button>
                        <button
                          onClick={() => {
                            console.log('🔍 Manual Load Assets button clicked');
                            console.log('Current state:');
                            console.log('  - fileKey:', fileKey);
                            console.log('  - figmaToken:', figmaToken ? '***' : 'missing');
                            console.log('  - frameNode:', frameNode?.name, frameNode?.id);
                            console.log('  - assetMap:', assetMap);
                            if (frameNode && fileKey && figmaToken) {
                              loadAssetsFromFigmaAPI(frameNode);
                            } else {
                              console.log('❌ Cannot load assets - missing required data');
                            }
                          }}
                          disabled={!fileKey || !figmaToken}
                          className={`w-full px-3 py-2 text-xs rounded-md transition-colors font-medium ${
                            fileKey && figmaToken
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          }`}
                        >
                          Load Assets from API
                        </button>
                        <button
                          onClick={() => setEnableScaling(!enableScaling)}
                          className={`w-full px-3 py-2 text-xs rounded-md transition-colors font-medium ${
                            enableScaling 
                              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                              : 'bg-gray-600 hover:bg-gray-700 text-white'
                          }`}
                        >
                          {enableScaling ? 'Disable' : 'Enable'} Scaling
                        </button>
                        {enableScaling && (
                          <>
                            <button
                              onClick={() => setMaxScale(Math.max(0.5, maxScale - 0.1))}
                              className="w-full px-3 py-2 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors font-medium"
                            >
                              Scale -
                            </button>
                            <button
                              onClick={() => setMaxScale(Math.min(3.0, maxScale + 0.1))}
                              className="w-full px-3 py-2 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors font-medium"
                            >
                              Scale +
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            console.log('Current frame node:', frameNode);
                            console.log('Current figma data:', figmaData);
                          }}
                          className="w-full px-3 py-2 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors font-medium"
                        >
                          Log Debug Data
                        </button>
                        <button
                          onClick={clearAllData}
                          className="w-full px-3 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors font-medium"
                        >
                          Clear All Data
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Asset URLs Section (if assets exist) */}
                {Object.keys(assetMap).length > 0 && (
                  <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="mr-2">🔗</span>Asset URLs ({Object.keys(assetMap).length})
                    </h4>
                    <div className="max-h-32 overflow-y-auto text-xs font-mono bg-white p-3 rounded border">
                      {Object.entries(assetMap).map(([nodeId, url]) => (
                        <div key={nodeId} className="mb-1">
                          <span className="text-blue-600">{nodeId}:</span> {url}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Debug container outline */}
          {showDebug && (
            <div 
              className="absolute inset-0 border-4 border-red-500 border-dashed pointer-events-none z-10"
              style={{
                background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(239, 68, 68, 0.1) 10px, rgba(239, 68, 68, 0.1) 20px)'
              }}
            >
              <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                Container Boundary
              </div>
            </div>
          )}
          
          {/* Render the Figma content */}
          {frameNode && (
            <SimpleFigmaRenderer
              key={`renderer-${frameNode.id}-${dataSource}-${dataVersion}`}
              node={frameNode}
              showDebug={showDebug}
              isRoot={true}
              imageMap={assetMap}
              devMode={devMode}
              enableScaling={enableScaling}
              maxScale={maxScale}
            />
          )}
          
          {/* Coordinate overlay for debugging removed */}
              </div>
      </div>
    </div>
  );
}

export default function OutputPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <OutputPageContent />
    </Suspense>
  );
} 