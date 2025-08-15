// src/app/output/page.tsx
'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import SimpleFigmaRenderer from '@/components/SimpleFigmaRenderer';
import NodeBrowser from '@/components/NodeBrowser';
import SettingsPanel from '@/components/SettingsPanel';

import { figmaAuth } from '@/lib/figmaAuth';
import type { FigmaData, FigmaNode } from '@/lib/figmaTypes';
import { synthesizeAbsoluteBB } from '@/lib/figmaNavigation';
import {
  normalizeFigmaUrl,
  normalizeToWebLink,
  extractFileKeyFromUrl,
  loadFigmaAssetsFromNodes,
  collectImageishNodeIds,
} from '@/lib/utils';
import { fontLoader } from '@/lib/fontLoader';
import { createReactFontFamily } from '@/lib/fontUtils';

/* ---------------- helpers ---------------- */

const extractFontFamilies = (node: any): Set<string> => {
  const fonts = new Set<string>();
  const add = (f?: string) => {
    if (!f) return;
    const name = String(f).trim();
    if (name) fonts.add(name);
  };
  const walk = (n: any) => {
    if (!n || typeof n !== 'object') return;
    add(n.style?.fontFamily);
    if (n.styleOverrideTable && typeof n.styleOverrideTable === 'object') {
      Object.values(n.styleOverrideTable).forEach((ov: any) => add(ov?.fontFamily));
    }
    if (Array.isArray(n.styles)) n.styles.forEach((s: any) => add((s as any)?.fontFamily));
    (n.children || []).forEach(walk);
  };
  walk(node);
  return fonts;
};

const loadFontsFromFigmaData = async (rootNode: any) => {
  if (!rootNode) return;
  const families = Array.from(extractFontFamilies(rootNode));
  if (!families.length) return;
  try {
    await fontLoader.loadFonts(
        families.map((family) => ({ family, weights: [400, 500, 600, 700], display: 'swap' })),
    );
  } catch (e) {
    console.warn('Font load failed', e);
  }
};

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

/* ---------------- page ---------------- */

function OutputPageContent() {
  const searchParams = useSearchParams();

  // core data
  const [figmaData, setFigmaData] = useState<FigmaData | null>(null);
  const [frameNode, setFrameNode] = useState<FigmaNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('');
  const [dataVersion] = useState<number>(0);

  // auth + api
  const [authUser, setAuthUser] = useState<any>(null);
  const [fileKey, setFileKey] = useState<string>('');
  const [figmaToken, setFigmaToken] = useState<string>(''); // PAT or OAuth goes here
  const [tokenMode, setTokenMode] = useState<'auto' | 'oauth' | 'pat'>(() => {
    try { return (localStorage.getItem('tokenMode') as any) || 'auto'; } catch { return 'auto'; }
  });

  // assets
  const [assetMap, setAssetMap] = useState<Record<string, string>>({});
  const [assetLoadingStatus, setAssetLoadingStatus] = useState<string>('Not started');
  const [assetLoadingProgress, setAssetLoadingProgress] = useState<{ total: number; loaded: number; isLoading: boolean }>(
      { total: 0, loaded: 0, isLoading: false },
  );

  // export (progress bar)
  const [exportProgress, setExportProgress] = useState<{ isExporting: boolean; total: number; loaded: number; label: string }>(
      { isExporting: false, total: 0, loaded: 0, label: '' },
  );

  // ui
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [devMode, setDevMode] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [enableScaling, setEnableScaling] = useState<boolean>(true);
  const [maxScale, setMaxScale] = useState<number>(1.2);

  // overlays
  const [showBrowser, setShowBrowser] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  // only download assets after an explicit target pick
  const [hasUserPickedTarget, setHasUserPickedTarget] = useState<boolean>(false);

  // cancellable jobs
  const assetJobRef = useRef<{ id: number; abort: AbortController } | null>(null);
  const exportJobRef = useRef<{ id: number; abort: AbortController } | null>(null);

  /* ---------------- auth hydrate ---------------- */

  useEffect(() => {
    const refresh = async () => {
      try {
        setAuthUser(figmaAuth.getUser());
        const res = await fetch('/api/auth/figma/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.authenticated) setAuthUser(data.user);
        }
      } catch {/* ignore */}
    };
    refresh();
    const onEvt = () => refresh();
    window.addEventListener('figma-auth-updated', onEvt as any);
    window.addEventListener('focus', onEvt);
    return () => {
      window.removeEventListener('figma-auth-updated', onEvt as any);
      window.removeEventListener('focus', onEvt);
    };
  }, []);

  // Find the best available token from: state -> localStorage -> IndexedDB -> OAuth
  const hydrateBestToken = useCallback(async () => {
    // Respect explicit mode first
    if (tokenMode === 'oauth') {
      const t = await figmaAuth.getAccessToken?.();
      if (t) { setFigmaToken(t); return t; }
      return '';
    }
    if (tokenMode === 'pat') {
      try {
        const local = localStorage.getItem('figmaToken');
        if (local) { setFigmaToken(local); return local; }
      } catch {}
      try {
        const { loadFigmaToken } = await import('@/lib/figmaStorage');
        const t = await loadFigmaToken();
        if (t) { setFigmaToken(t); try { localStorage.setItem('figmaToken', t); } catch {}; return t; }
      } catch {}
      return '';
    }
    // Auto: prefer OAuth, fallback PAT
    try {
      const t = await figmaAuth.getAccessToken?.();
      if (t) { setFigmaToken(t); return t; }
    } catch {}
    try {
      const local = localStorage.getItem('figmaToken');
      if (local) { setFigmaToken(local); return local; }
    } catch {}
    try {
      const { loadFigmaToken } = await import('@/lib/figmaStorage');
      const t = await loadFigmaToken();
      if (t) { setFigmaToken(t); try { localStorage.setItem('figmaToken', t); } catch {}; return t; }
    } catch {}
    return '';
  }, [tokenMode]);

  // initial token hydrate
  useEffect(() => { void hydrateBestToken(); }, [hydrateBestToken]);

  const handleLogout = async () => {
    try {
      await figmaAuth.logout();
      setAuthUser(null);
    } catch {}
  };

  /* ---------------- upload handler (first screen) ---------------- */

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
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string) as FigmaData;
        setAssetMap({});
        setAssetLoadingStatus('Not started');

        const isPluginExport = (data: any) =>
            !!(data?.metadata?.exportedBy === 'LazyCode.ai Plugin' || data?.imageMap || data?.nodes);

        if (isPluginExport(json)) {
          const { parsePluginData } = await import('@/lib/figma-plugin');
          const pluginData = parsePluginData(json);
          setDataSource('Plugin Export');
          
          // Convert PluginExportData to FigmaData format
          const figmaData: FigmaData = {
            document: pluginData.document,
            components: pluginData.components || {},
            componentSets: {}, // Plugin data doesn't have componentSets, use empty object
            styles: pluginData.styles || {},
            imageMap: pluginData.imageMap,
            metadata: pluginData.metadata,
            images: pluginData.images
          };
          
          setFigmaData(figmaData);
          if (figmaData.imageMap && Object.keys(figmaData.imageMap).length) {
            setAssetMap(figmaData.imageMap);
            setAssetLoadingStatus(`✅ Loaded ${Object.keys(figmaData.imageMap).length} assets from plugin`);
          }
          const doc =
              figmaData.document ||
              (figmaData?.nodes && figmaData?.nodes[Object.keys(figmaData?.nodes)[0]]?.document);
          if (doc) {
            const pick = synthesizeAbsoluteBB(doc as any);
            setFrameNode(pick);
            void loadFontsFromFigmaData(pick);
          }
        } else {
          setDataSource('File Upload');
          setFigmaData(json);
          if ((json as any).imageMap && Object.keys((json as any).imageMap).length) {
            setAssetMap((json as any).imageMap);
            setAssetLoadingStatus(`✅ Loaded ${Object.keys((json as any).imageMap).length} assets from plugin`);
          }
          const doc = json.document || (json.nodes && (json.nodes as any)[Object.keys(json.nodes as any)[0]]?.document);
          if (doc) {
            const pick = synthesizeAbsoluteBB(doc as any);
            setFrameNode(pick);
            void loadFontsFromFigmaData(pick);
          }
        }
      } catch (err) {
        console.error('Upload parse error:', err);
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

  /* ---------------- initial load (via ?url= or storage) ---------------- */

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const urlParam = searchParams.get('url');

        if (urlParam) {
          try {
            const normalized = normalizeFigmaUrl(urlParam);
            await figmaAuth.hydrateFromServerCookie().catch(() => {});
            const fileData = await figmaAuth.getFileByLink(normalized);

            const fData: FigmaData = {
              document: fileData.document,
              components: fileData.components,
              componentSets: (fileData as any).componentSets,
              styles: fileData.styles,
              name: fileData.name,
              lastModified: fileData.lastModified,
              version: fileData.version,
              thumbnailUrl: fileData.thumbnailUrl,
            };

            try {
              const { saveFigmaData, saveFigmaUrl } = await import('@/lib/figmaStorage');
              await saveFigmaData(fData);
              await saveFigmaUrl(normalized);
            } catch {}

            setDataSource('URL fetch');
            setFigmaData(fData);

            const chosen = synthesizeAbsoluteBB(fData.document as any);
            setFrameNode(chosen);
            void loadFontsFromFigmaData(chosen);

            // setFigmaUrl(normalized);
            const key = extractFileKeyFromUrl(normalized);
            setFileKey(key || '');

            await hydrateBestToken();

            setLoading(false);
            return;
          } catch (e) {
            console.warn('URL fetch failed, falling back:', e);
          }
        }

        // storage fallback: IndexedDB only
        let stored: any = null;
        try {
          const { loadFigmaData } = await import('@/lib/figmaStorage');
          stored = await loadFigmaData();
        } catch {}

        if (stored) {
          setDataSource(stored.metadata?.exportedBy === 'LazyCode.ai Plugin' ? 'Plugin Export' : 'File Upload');
          setFigmaData(stored);

          const chosen = synthesizeAbsoluteBB(
              stored.document || stored.nodes?.[Object.keys(stored.nodes)[0]]?.document,
          );
          if (chosen) {
            setFrameNode(chosen);
            void loadFontsFromFigmaData(chosen);
          }

          let storedUrl: string | null = null;
          try {
            const { loadFigmaUrl } = await import('@/lib/figmaStorage');
            storedUrl = await loadFigmaUrl();
          } catch {}
          if (!storedUrl) storedUrl = localStorage.getItem('figmaUrl') || null;

          if (storedUrl) {
            const norm = normalizeToWebLink(storedUrl);
            // setFigmaUrl(norm);
            const key = extractFileKeyFromUrl(norm);
            setFileKey(key || '');
          }

          await hydrateBestToken();

          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : 'Failed to load Figma data';
        
        // Provide more helpful error messages for common issues
        if (errorMessage.includes('authentication') || errorMessage.includes('403')) {
          setError('This Figma file requires authentication. Please log in with your Figma account or add a Personal Access Token in Settings.');
        } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
          setError('Figma file not found. Please check the URL and ensure the file is accessible.');
        } else {
          setError(errorMessage);
        }
        setLoading(false);
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /* ---------------- asset loading (cancellable + race-proof) ---------------- */

  const startAssetJob = async (root: FigmaNode, token: string) => {
    // cancel previous
    if (assetJobRef.current) {
      assetJobRef.current.abort.abort();
      assetJobRef.current = null;
    }
    // also cancel any export in flight if the target changes
    if (exportJobRef.current) {
      exportJobRef.current.abort.abort();
      exportJobRef.current = null;
      setExportProgress({ isExporting: false, total: 0, loaded: 0, label: '' });
    }

    const abort = new AbortController();
    const jobId = Date.now();
    assetJobRef.current = { id: jobId, abort };

    if (!fileKey || !token || !root) {
      setAssetLoadingStatus('ℹ️ Add a Figma token in Settings or login with OAuth');
      setAssetLoadingProgress({ total: 0, loaded: 0, isLoading: false });
      return;
    }

    setAssetLoadingStatus('Loading assets from Figma API…');
    setAssetLoadingProgress({ total: 0, loaded: 0, isLoading: true });

    try {
      const imageish = collectImageishNodeIds(root);
      console.log('📦 Asset scan', { nodeId: root.id, imageishCount: imageish.length, fileKey });

      const apiMap = await loadFigmaAssetsFromNodes({
        figmaFileKey: fileKey,
        figmaToken: token,
        rootNode: root,
        signal: abort.signal,
        onProgress: (total, loaded) => {
          if (assetJobRef.current?.id !== jobId || abort.signal.aborted) return;
          setAssetLoadingProgress({ total, loaded, isLoading: true });
        },
      });

      if (assetJobRef.current?.id !== jobId || abort.signal.aborted) return;

      if (Object.keys(apiMap).length) {
        setAssetMap(apiMap);
        setAssetLoadingStatus(`✅ Loaded ${Object.keys(apiMap).length} assets from Figma API`);
        setAssetLoadingProgress({
          total: Object.keys(apiMap).length,
          loaded: Object.keys(apiMap).length,
          isLoading: false,
        });
      } else {
        setAssetLoadingStatus('ℹ️ No assets found in design - continuing without images');
        setAssetLoadingProgress({ total: 0, loaded: 0, isLoading: false });
      }
    } catch (e: any) {
      if (abort.signal.aborted) return;
      console.error('Asset load error:', e);
      setAssetLoadingStatus(
          e?.status === 401 || e?.status === 403
              ? '🔐 Invalid/expired token. Open Settings and paste a valid PAT, or re-login.'
              : '⚠️ Could not load images - continuing without assets',
      );
      setAssetLoadingProgress({ total: 0, loaded: 0, isLoading: false });
    } finally {
      if (assetJobRef.current?.id === jobId) assetJobRef.current = null;
    }
  };

  // auto-load when frame + creds exist
  useEffect(() => {
    const run = async () => {
      if (!hasUserPickedTarget) return; // do not auto-download before user picks a target
      const best = await hydrateBestToken();
      if (frameNode && fileKey && best) await startAssetJob(frameNode, best);
      else if (frameNode && fileKey && !best) {
        setAssetLoadingStatus('ℹ️ Add a Figma token in Settings or login with OAuth');
        setAssetLoadingProgress({ total: 0, loaded: 0, isLoading: false });
      }
    };
    void run();
    return () => assetJobRef.current?.abort.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameNode?.id, fileKey, hasUserPickedTarget]);

  /* ---------------- export (cancellable + font + border fixes) ---------------- */

  const handleExport = async () => {
    try {
      if (!frameNode) {
        console.error('❌ No frame selected for export');
        return;
      }

      // cancel a previous export if running
      if (exportJobRef.current) {
        exportJobRef.current.abort.abort();
        exportJobRef.current = null;
      }
      const abort = new AbortController();
      const jobId = Date.now();
      exportJobRef.current = { id: jobId, abort };

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

      const TEXT_W_BUFFER = 8;
      const TEXT_H_BUFFER = 4;

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
        if (Array.isArray((n as any).background)) {
          for (const b of (n as any).background) {
            if (b?.type === 'IMAGE') {
              if (b.imageRef) addCandidate(b.imageRef, [n.id]);
              else addCandidate(n.id);
            }
          }
        }
        if (
            n.type === 'VECTOR' ||
            n.type === 'LINE' ||
            n.type === 'ELLIPSE' ||
            n.type === 'RECTANGLE' ||
            n.type === 'POLYGON' ||
            n.type === 'STAR' ||
            n.type === 'BOOLEAN_OPERATION'
        ) {
          addCandidate(n.id);
        }
        if (n.type === 'GROUP') {
          const hasMaskChild = Array.isArray(n.children) && n.children.some((c: any) => c?.isMask && (c.maskType || c.mask));
          const hasTextChild = Array.isArray(n.children) && n.children.some((c: any) => c?.type === 'TEXT');
          const hasExport = Array.isArray(n.exportSettings) && n.exportSettings.length > 0;
          if ((hasMaskChild && !hasTextChild) || hasExport) addCandidate(n.id);
        }
        (n.children || []).forEach(walkForAssets);
      };
      walkForAssets(frameNode);

      setExportProgress({
        isExporting: true,
        total: assetCandidates.length + 100,
        loaded: 0,
        label: 'Preparing files…',
      });

      // Merge more complete asset URLs (Figma API) to ensure SVGs/masks are present
      let sourceAssetMap: Record<string, string> = { ...assetMap };
      try {
        if (fileKey && figmaToken) {
          const apiAssetMap = await loadFigmaAssetsFromNodes({
            figmaFileKey: fileKey,
            figmaToken,
            rootNode: frameNode,
            signal: abort.signal,
            onProgress: (total: number, loaded: number) => {
              if (devMode) console.log(`Export asset progress: ${loaded}/${total}`);
            },
          });
          sourceAssetMap = { ...sourceAssetMap, ...apiAssetMap };
        }
      } catch (e) {
        if (!abort.signal.aborted) {
          console.warn('⚠️ Could not load additional assets during export. Proceeding.', e);
        } else {
          // aborted by user / target change
          setExportProgress({ isExporting: false, total: 0, loaded: 0, label: '' });
          return;
        }
      }
      if (abort.signal.aborted) { setExportProgress({ isExporting: false, total: 0, loaded: 0, label: '' }); return; }

      const sanitizeFilename = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '-');
      const files = new Map<string, string>();

      /* ---------- Fonts: include all mapped families (with aliases) for export ---------- */
      const ALIAS: Record<string, string> = {
        'SF Pro Text': 'Inter',
        'SF Pro Display': 'Inter',
        'Helvetica Neue': 'Inter',
        'Helvetica': 'Inter',
        'Arial': 'Inter',
        'System': 'Inter',
      };

      const originalFamilies: string[] = Array.from(extractFontFamilies(frameNode));
      const familiesToLoad = new Set<string>();
      for (const fam of originalFamilies) {
        const mapped = (ALIAS[fam] ?? fam).replace(/\bVariable\b/gi, '').trim();
        if (mapped) familiesToLoad.add(mapped);
      }
      familiesToLoad.add('Inter'); // ensure alias target always present

      const googleFontHrefs = Array.from(familiesToLoad).map((f) => {
        const fam = f.replace(/\s+/g, '+');
        return `/api/fonts/css2?family=${fam}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap`;
      });

      const headLinks = [
        `<link rel="preconnect" href="/api/fonts" />`,
        ...googleFontHrefs.map((h) => `<link href="${h}" rel="stylesheet" />`),
      ].join('\n    ');

      const defaultFont = (Array.from(familiesToLoad)[0]) || 'Inter';
      const defaultFontCSS = `'${defaultFont}', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

      /* ---------- minimal project files ---------- */
      files.set(
          'package.json',
          JSON.stringify(
              {
                name: projectSlug,
                version: '0.1.0',
                private: true,
                scripts: { dev: 'next dev', build: 'next build', start: 'next start', lint: 'next lint' },
                dependencies: { 
                  next: '15.4.4', 
                  react: '19.1.0', 
                  'react-dom': '19.1.0'
                },
                devDependencies: {
                  typescript: '^5.6.0',
                  '@types/node': '^20',
                  '@types/react': '^19',
                  '@types/react-dom': '^19',
                  'eslint': '^9',
                  'eslint-config-next': '15.4.4'
                }
              },
              null,
              2,
          ),
      );

      files.set('next.config.js', `/** @type {import('next').NextConfig} */\nconst nextConfig = {};\nmodule.exports = nextConfig;\n`);

      files.set(
          'src/app/layout.tsx',
          `import './globals.css';\n\nexport const metadata = { title: '${componentName}', description: 'Exported from LazyCode.ai' };\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <head>\n        ${headLinks}\n      </head>\n      <body style={{ margin: 0 }}>{children}</body>\n    </html>\n  );\n}\n`,
      );

      files.set(
          'src/app/globals.css',
          `:root{}\n*{box-sizing:border-box}\nhtml,body{margin:0;padding:0;overflow-x:hidden;max-width:100vw}\nbody{font-family:${defaultFontCSS};}\nimg{display:block;max-width:100%}\n`,
      );

      files.set(
          'src/app/page.tsx',
          `'use client';\n\nimport React from 'react';\nimport ${componentName} from '../components/${componentName}';\n\nexport default function Page() { return <${componentName} />; }\n`,
      );

      files.set(
          'src/lib/useFigmaScale.ts',
          `import { useEffect, useState } from 'react';\n\nexport function useFigmaScale(designWidth: number) {\n  const [scale, setScale] = useState(1);\n  useEffect(() => {\n    const compute = () => {\n      if (typeof window === 'undefined') return;\n      const vw = window.innerWidth;\n      const s = vw / Math.max(1, designWidth);\n      setScale(Math.max(0.1, s));\n    };\n    compute();\n    window.addEventListener('resize', compute);\n    return () => window.removeEventListener('resize', compute);\n  }, [designWidth]);\n  return scale;\n}\n`,
      );

      // Add font proxy API route for Google Fonts
      files.set(
          'src/app/api/fonts/[...path]/route.ts',
          `import { NextRequest, NextResponse } from 'next/server';

// Single font proxy that handles both CSS and font files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join('/');
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    
    // Determine if this is a CSS request or font file request
    const isCssRequest = path === 'css2' || path.startsWith('css/');
    const isFontFile = path.includes('.woff2') || path.includes('.ttf') || path.includes('.woff');
    
    let targetUrl: string;
    
    if (isCssRequest) {
      // CSS request - fetch from Google Fonts
      targetUrl = \`https://fonts.googleapis.com/css2\${searchParams ? \`?\${searchParams}\` : ''}\`;
    } else if (isFontFile) {
      // Font file request - fetch from Google Fonts static
      targetUrl = \`https://fonts.gstatic.com/\${path}\`;
    } else {
      // Fallback - try Google Fonts
      targetUrl = \`https://fonts.googleapis.com/\${path}\${searchParams ? \`?\${searchParams}\` : ''}\`;
    }
    
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LazyCode.ai/1.0)',
        },
      });
      
      if (!response.ok) {
        return NextResponse.json(
          { error: \`Font loading failed: \${response.status} \${response.statusText}\` },
          { status: response.status }
        );
      }
    
      if (isCssRequest) {
        // For CSS, we need to replace gstatic URLs with our proxy
        let css = await response.text();
        const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
        css = css.replace(
          /https:\\/\\/fonts\\.gstatic\\.com\\//g,
          \`\${baseUrl}/api/fonts/\`
        );
        
        return new NextResponse(css, {
          headers: {
            'Content-Type': 'text/css',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      } else {
        // For font files, return binary data
        const buffer = await response.arrayBuffer();
        
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': response.headers.get('Content-Type') || 'font/woff2',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=31536000', // 1 year cache
          },
        });
      }
    } catch (fetchError) {
      return NextResponse.json(
        { error: 'Font loading failed due to network error' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Font loading failed' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
`,
      );

      // ---------- style helpers ----------
      // Round numeric values to 2 decimal places for cleaner CSS
      const roundToTwo = (value: number): number => {
        return Math.round(value * 100) / 100;
      };

      // Format CSS values with proper rounding
      const formatCSSValue = (value: any): string => {
        if (typeof value === 'number') {
          return String(roundToTwo(value));
        }
        if (typeof value === 'string' && value.includes('px')) {
          // Handle values like "28.599609375px" -> "28.60px"
          const match = value.match(/^([\d.]+)px$/);
          if (match) {
            const num = parseFloat(match[1]);
            return `${roundToTwo(num)}px`;
          }
        }
        return String(value);
      };

      // Escape content for JSX while preserving Unicode glyphs (icons/emojis)
      const esc = (txt: string) => {
        const s = txt || '';
        // Replace special JSX tokens only; leave unicode intact
        return s
          .replace(/`/g, '\\`')
          .replace(/\$/g, '\\$')
          .replace(/\{/g, '{"{"}')
          .replace(/\}/g, '{"}"}')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      };

      const toStyleJSX = (obj: Record<string, any>) => {
        const parts: string[] = [];
        for (const [k, v] of Object.entries(obj)) {
          if (v === undefined || v === null || v === '') continue;
          if (typeof v === 'number') {
            parts.push(`${k}: ${String(roundToTwo(v))}`);
          } else {
            const formatted = formatCSSValue(v);
            parts.push(`${k}: ${JSON.stringify(formatted)}`);
          }
        }
        return `{{ ${parts.join(', ')} }}`;
      };

      const rgba = (c: any) =>
          `rgba(${Math.round((c?.r || 0) * 255)}, ${Math.round((c?.g || 0) * 255)}, ${Math.round((c?.b || 0) * 255)}, ${c?.a ?? 1})`;

      const getLocalImagePath = (nodeId: string) => localAssetMap[nodeId] || '';
      const getLocalImagePathByRef = (ref?: string) => (ref ? localAssetMap[ref] : '') || '';

      // the big style factory, with the BORDER FIX
      const styleFor = (node: any, parentBB?: any) => {
        const s: any = {};
        
        // GENERIC FIX: Always prefer absoluteRenderBounds over absoluteBoundingBox when bounding box is problematic
        // This handles all cases of microscopic/zero dimensions, rotation, strokes, etc.
        const renderBounds = node.absoluteRenderBounds;
        const boundingBox = node.absoluteBoundingBox;
        
        // Check if bounding box has problematic dimensions
        const hasProblematicBounds = boundingBox && (
          // Zero or microscopic width/height
          boundingBox.width <= 0.01 || 
          boundingBox.height <= 0.01 || 
          boundingBox.width < 1e-5 || 
          boundingBox.height < 1e-5 ||
          // Very large discrepancy between bounding box and render bounds (indicates transform issues)
          (renderBounds && (
            Math.abs(boundingBox.width - renderBounds.width) > Math.max(boundingBox.width, renderBounds.width) * 0.5 ||
            Math.abs(boundingBox.height - renderBounds.height) > Math.max(boundingBox.height, renderBounds.height) * 0.5
          ))
        );
        
        // Use render bounds if available and bounding box is problematic, otherwise use bounding box
        const bb = (hasProblematicBounds && renderBounds) ? renderBounds : boundingBox;
        
        if (bb) {
          let { x, y, width, height } = bb;
          
          // Enforce minimum dimensions for very thin lines/strokes to ensure visibility
          if (width < 1 && width > 0) width = Math.max(width, 1);
          if (height < 1 && height > 0) height = Math.max(height, 1);
          
          if (parentBB) {
            s.position = 'absolute';
            s.left = `${roundToTwo(x - parentBB.x)}px`;
            s.top = `${roundToTwo(y - parentBB.y)}px`;
            s.width = `${roundToTwo(width)}px`;
            s.height = `${roundToTwo(height)}px`;
          } else {
            s.position = 'relative';
            s.width = `${roundToTwo(width)}px`;
            s.height = `${roundToTwo(height)}px`;
          }
        }
         // background (skip pure white placeholders)
         if (node.type !== 'TEXT' && node.backgroundColor) {
           const c = node.backgroundColor as any;
           const R = Math.round((c?.r || 0) * 255);
           const G = Math.round((c?.g || 0) * 255);
           const B = Math.round((c?.b || 0) * 255);
           const A = c?.a ?? 1;
           const isPureWhite = R === 255 && G === 255 && B === 255 && A >= 1;
           if (!isPureWhite) s.backgroundColor = rgba(node.backgroundColor);
         }

         // fills
         if (node.fills?.[0]) {
           const f = node.fills[0];
           if (node.type !== 'TEXT' && f.type === 'SOLID' && f.color) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const hasVisualChildren =
                Array.isArray(node.children) &&
                node.children.some((c: any) => ['VECTOR', 'RECTANGLE', 'ELLIPSE', 'LINE'].includes(c?.type) ||
                    (Array.isArray(c?.fills) && c.fills.some((cf: any) => cf?.type === 'IMAGE')));
            const isPureWhite =
                Math.round((f.color?.r || 0) * 255) === 255 &&
                Math.round((f.color?.g || 0) * 255) === 255 &&
                Math.round((f.color?.b || 0) * 255) === 255 &&
                (f.color?.a ?? 1) >= 1;
            const isNearBlack = Math.round((f.color?.r || 0) * 255) <= 3 && Math.round((f.color?.g || 0) * 255) <= 3 && Math.round((f.color?.b || 0) * 255) <= 3;
            const lowAlpha = (f.color?.a ?? 1) <= 0.12;
            const isContainer = ['FRAME','GROUP','INSTANCE','COMPONENT','PAGE','CANVAS'].includes(node.type);
            if (!(isContainer && (isPureWhite || lowAlpha || (isNearBlack && (f.color?.a ?? 1) <= 0.2)))) s.backgroundColor = rgba(f.color);
          }
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
            const stops = f.gradientStops.map((st: any) => `${rgba(st.color)} ${st.position * 100}%`).join(', ');
            let dir = '';
            if (Array.isArray(f.gradientTransform)) {
              const t = f.gradientTransform.flat();
              const ang = (Math.atan2(t[1], t[0]) * 180) / Math.PI;
              dir = `${Math.round(ang * 100) / 100}deg`;
            }
            if (f.type === 'GRADIENT_LINEAR') s.background = `linear-gradient(${dir || 'to bottom'}, ${stops})`;
            else if (f.type === 'GRADIENT_RADIAL') s.background = `radial-gradient(circle at center, ${stops})`;
            else if (f.type === 'GRADIENT_ANGULAR') s.background = `conic-gradient(from ${dir || '0deg'}, ${stops})`;
            else if (f.type === 'GRADIENT_DIAMOND') s.background = `radial-gradient(ellipse at center, ${stops})`;
          }
        }

         // corner radii (apply to frames/containers as well)
        const tl = node.cornerRadiusTopLeft, tr = node.cornerRadiusTopRight, bl = node.cornerRadiusBottomLeft, br = node.cornerRadiusBottomRight;
        if ([tl, tr, bl, br].some((v: any) => v !== undefined)) {
          const cr = node.cornerRadius ?? 0;
          const TL = tl ?? cr ?? 0, TR = tr ?? cr ?? 0, BL = bl ?? cr ?? 0, BR = br ?? cr ?? 0;
          s.borderRadius = `${roundToTwo(TL)}px ${roundToTwo(TR)}px ${roundToTwo(BR)}px ${roundToTwo(BL)}px`;
        } else if (node.cornerRadius) {
          s.borderRadius = `${roundToTwo(node.cornerRadius)}px`;
        } else if (node.type === 'ELLIPSE') {
          s.borderRadius = '50%';
        }

         // STROKES (apply only to shape nodes; fix the unwanted box borders)
        const SHAPE_TYPES = new Set(['VECTOR','LINE','ELLIPSE','RECTANGLE','POLYGON','STAR','BOOLEAN_OPERATION']);
        if (SHAPE_TYPES.has(node.type) && node.strokes?.[0]) {
          const st = node.strokes[0];
          const color = st.color ? rgba(st.color) : undefined;
          const w = st.strokeWeight || node.strokeWeight || 0;
          if (w > 0 && color) {
            if (node.type === 'LINE') {
              const bb2 = node.absoluteBoundingBox || { width: 0, height: 0 };
              if ((bb2.width || 0) >= (bb2.height || 0)) s.borderTop = `${roundToTwo(w)}px solid ${color}`;
              else s.borderLeft = `${roundToTwo(w)}px solid ${color}`;
            } else {
              const isDashed = Array.isArray((st as any).dashPattern) && (st as any).dashPattern.length;
              s.border = `${roundToTwo(w)}px ${isDashed ? 'dashed' : 'solid'} ${color}`;
            }
          }
        }

        // effects (match renderer: use CSS filter for drop-shadows to avoid opaque box on transparent backgrounds)
        if (Array.isArray(node.effects) && node.effects.length) {
          const drops: string[] = [];
          const inners: string[] = [];
          for (const e of node.effects) {
            if (!e?.visible) continue;
            if (e.type === 'DROP_SHADOW') drops.push(`drop-shadow(${roundToTwo(e.offset?.x || 0)}px ${roundToTwo(e.offset?.y || 0)}px ${roundToTwo(e.radius || 0)}px ${rgba(e.color || {})})`);
            else if (e.type === 'INNER_SHADOW') inners.push(`inset ${roundToTwo(e.offset?.x || 0)}px ${roundToTwo(e.offset?.y || 0)}px ${roundToTwo(e.radius || 0)}px ${rgba(e.color || {})}`);
            else if (e.type === 'BACKGROUND_BLUR') {
              (s as any).backdropFilter = `blur(${roundToTwo(e.radius || 0)}px)`;
            }
          }
          if (node.type === 'TEXT') {
            if (drops.length) (s as any).textShadow = drops.map(d => d.replace(/^drop-shadow\(|\)$/g, '')).join(', ');
          } else {
            if (drops.length) (s as any).filter = drops.join(' ');
            if (inners.length) s.boxShadow = inners.join(', ');
          }
        }

        if (node.opacity !== undefined && node.opacity !== 1) s.opacity = node.opacity;
        if (node.clipContent) s.overflow = 'hidden';

        // transforms
        const t: string[] = [];
        // Ignore rotation transforms - Figma exports already rotated elements in correct position
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

      const genNode = (node: any, parentBB?: any, indent = 2): string => {
        if (!node) return '';
        const pad = ' '.repeat(indent);
        const s = toStyleJSX(styleFor(node, parentBB));
        const type = node.type;

        switch (type) {
          case 'TEXT': {
            const st = (node.style || {}) as any;
            const align = st.textAlignHorizontal === 'CENTER' ? 'center' :
                st.textAlignHorizontal === 'RIGHT' ? 'right' :
                    st.textAlignHorizontal === 'JUSTIFIED' ? 'justify' : 'left';
            const vAlign = st.textAlignVertical === 'CENTER' ? 'center' :
                st.textAlignVertical === 'BOTTOM' ? 'flex-end' : 'flex-start';
            const normalizeFamily = (name?: string) => String(name || '').replace(/Variable/gi, '').trim();
            const mapped = normalizeFamily(st.fontFamily) || defaultFont;
            const baseTextStyle: Record<string, any> = {
              whiteSpace: 'pre-wrap',
              fontFamily: createReactFontFamily(mapped || st.fontFamily || ''),
              fontSize: st.fontSize ? `${roundToTwo(st.fontSize)}px` : undefined,
              fontWeight: st.fontWeight ?? 'normal',
              lineHeight: st.lineHeightPx ? `${roundToTwo(st.lineHeightPx)}px` : st.lineHeightPercent ? `${roundToTwo(st.lineHeightPercent)}%` : undefined,
              letterSpacing: st.letterSpacing ? `${roundToTwo(st.letterSpacing)}px` : undefined,
              textAlign: align,
              backgroundColor: 'transparent',
              color: (() => {
                const fill = node.fills?.[0];
                return fill?.type === 'SOLID' && fill.color ? rgba(fill.color) : undefined;
              })(),
              fontStyle: (() => {
                const val = String(st.fontStyle || '').toLowerCase();
                return val === 'italic' || val === 'oblique' ? val : undefined;
              })(),
              // these buffers match the "old code" look and avoid crowding
              // paddingLeft: `${TEXT_W_BUFFER}px`,
              // paddingRight: `${TEXT_W_BUFFER}px`,
              // paddingTop: `${TEXT_H_BUFFER}px`,
              // paddingBottom: `${TEXT_H_BUFFER}px`,
            };
            const tStyle = toStyleJSX(baseTextStyle);

            // outer text box (account for buffer) — match renderer: flex container aligns vertically
            const textBox = { ...styleFor(node, parentBB) } as Record<string, any>;
            (textBox as any).display = 'flex';
            (textBox as any).alignItems = vAlign;
            (textBox as any).justifyContent = align === 'center' ? 'center' : 'flex-start';
            (textBox as any).textAlign = align;
            if (node.absoluteBoundingBox) {
              const bw = roundToTwo(node.absoluteBoundingBox.width || 0) + TEXT_W_BUFFER*2 ;
              const bh = roundToTwo(node.absoluteBoundingBox.height || 0) + TEXT_H_BUFFER*2;
              textBox.width = `calc(${bw}px)`;
              textBox.height = `calc(${bh}px)`;
              textBox.maxWidth = '100%';
            }
            const sText = toStyleJSX(textBox);

            // rich text spans (normalize Figma line separators to newline/paragraph)
            const chars = String(node.characters || '')
              .replace(/\u2028/g, '\n')   // LINE SEPARATOR
              .replace(/\u2029/g, '\n\n'); // PARAGRAPH SEPARATOR
            const overrides: number[] = (node as any).characterStyleOverrides || [];
            const table: Record<string, any> = (node as any).styleOverrideTable || {};
            const runForIndex = (i: number) => table[String(overrides[i] || 0)] || {};
            const toSpanStyle = (cs: any, inheritBaseColor = false) => {
              const style: Record<string, any> = {};
              if (cs.fontFamily) style.fontFamily = createReactFontFamily(normalizeFamily(cs.fontFamily));
              if (cs.fontSize) style.fontSize = `${roundToTwo(cs.fontSize)}px`;
              if (cs.fontWeight) style.fontWeight = cs.fontWeight;
              if (cs.fontStyle) {
                const v = String(cs.fontStyle).toLowerCase();
                if (v === 'italic' || v === 'oblique') style.fontStyle = v;
              }
              if (cs.letterSpacing) style.letterSpacing = `${roundToTwo(cs.letterSpacing)}px`;
              if (cs.lineHeightPx) style.lineHeight = `${roundToTwo(cs.lineHeightPx)}px`;
              else if (cs.lineHeightPercent) style.lineHeight = `${roundToTwo(cs.lineHeightPercent)}%`;
              const f = cs.fills?.[0];
              if (f?.type === 'SOLID' && f.color) {
                style.color = rgba(f.color);
              } else if (inheritBaseColor && baseTextStyle.color) {
                // Inherit base text color for hyperlinks that don't have their own color
                style.color = baseTextStyle.color;
              }
              const deco = (cs.textDecoration || cs.textDecorationLine || '').toString().toLowerCase();
              if (deco.includes('underline')) style.textDecoration = 'underline';
              if (deco.includes('underline')) {
                (style as any).textUnderlineOffset = '2px';
                (style as any).textDecorationThickness = '1px';
              }
              if (cs.textCase === 'UPPER') style.textTransform = 'uppercase';
              if (cs.textCase === 'LOWER') style.textTransform = 'lowercase';
              if (cs.textCase === 'TITLE') style.textTransform = 'capitalize';
              return toStyleJSX(style);
            };
            // Group characters by their style override for cleaner HTML
            const groups: Array<{ style: string; text: string; href?: string }> = [];
            let currentGroup: { style: string; text: string; href?: string } | null = null;
            
            for (let i = 0; i < chars.length; i++) {
              const ch = chars[i];
              if (ch === '\n') {
                // End current group and add line break
                if (currentGroup) {
                  groups.push(currentGroup);
                  currentGroup = null;
                }
                let count = 1;
                while (i + 1 < chars.length && chars[i + 1] === '\n') { count++; i++; }
                for (let k = 0; k < count; k++) groups.push({ style: '', text: '<br/>' });
                continue;
              }
              
              const cs = runForIndex(i);
              const href = cs?.hyperlink?.url;
              const styleAttr = toSpanStyle(cs, !!href); // Inherit base color for hyperlinks
              const inner = esc(ch);
              
              // Check if we can continue with current group
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const groupKey = `${styleAttr}|${href || ''}`;
              if (currentGroup && currentGroup.style === styleAttr && currentGroup.href === href) {
                currentGroup.text += inner;
              } else {
                // End current group and start new one
                if (currentGroup) {
                  groups.push(currentGroup);
                }
                currentGroup = { style: styleAttr, text: inner, href };
              }
            }
            
            // Add final group
            if (currentGroup) {
              groups.push(currentGroup);
            }
            
            // Build content from groups - optimize to avoid empty style spans
            let content = '';
            for (const group of groups) {
              if (group.text === '<br/>') {
                content += group.text;
              } else if (group.href) {
                content += `<a href="${group.href}" style=${group.style}>${group.text}</a>`;
              } else if (group.style && group.style !== '{{}}' && group.style.trim() !== '') {
                content += `<span style=${group.style}>${group.text}</span>`;
              } else {
                // No style or empty style - output plain text without span wrapper
                content += group.text;
              }
            }
            return `${pad}<div style=${sText} data-figma-node-id="${node.id}">\n${pad}  <span style=${tStyle}>${content}</span>\n${pad}</div>`;
          }

          case 'LINE': {
            // Handle lines as CSS borders/backgrounds instead of images
            if (Array.isArray(node.strokes) && node.strokes.length > 0) {
              const stroke = node.strokes[0];
              if (stroke?.type === 'SOLID' && stroke.color) {
                const strokeColor = rgba(stroke.color);
                const strokeWeight = node.strokeWeight || 1;
                const bb = node.absoluteBoundingBox;
                
                if (bb) {
                  const { width, height } = bb;
                  const isVertical = height > width;
                  
                  const lineStyle = {
                    ...styleFor(node, parentBB),
                    backgroundColor: strokeColor,
                    // Ensure minimum visibility for thin lines
                    width: isVertical ? `${Math.max(strokeWeight, 1)}px` : `${formatCSSValue(width)}px`,
                    height: isVertical ? `${formatCSSValue(height)}px` : `${Math.max(strokeWeight, 1)}px`,
                  };
                  
                  const sLine = toStyleJSX(lineStyle);
                  return `${pad}<div style=${sLine} data-figma-node-id="${node.id}" />`;
                }
              }
            }
            
            // Fallback to image if stroke rendering fails
            const p = getLocalImagePath(node.id);
            if (p) {
              const layoutOnly: any = { ...styleFor(node, parentBB) };
              delete layoutOnly.background;
              delete layoutOnly.backgroundColor;
              delete layoutOnly.backgroundImage;
              delete layoutOnly.backgroundRepeat;
              delete layoutOnly.backgroundSize;
              delete layoutOnly.backgroundPosition;
              delete layoutOnly.border;
              delete (layoutOnly as any).borderTop;
              delete (layoutOnly as any).borderRight;
              delete (layoutOnly as any).borderBottom;
              delete (layoutOnly as any).borderLeft;
              delete (layoutOnly as any).outline;
              delete (layoutOnly as any).boxShadow;
              delete (layoutOnly as any).transform;
              delete (layoutOnly as any).transformOrigin;
              const sOnly = toStyleJSX(layoutOnly);
              return `${pad}<div style=${sOnly}>\n${pad}  <img src="${p}" alt="${(node.name || 'line').replace(/"/g, '&quot;')}" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />\n${pad}</div>`;
            }
            return `${pad}<div style=${s} data-figma-node-id="${node.id}" />`;
          }

          case 'RECTANGLE':
          case 'ELLIPSE':
          case 'VECTOR': {
            const p = getLocalImagePath(node.id);
            if (p) {
              const layoutOnly: any = { ...styleFor(node, parentBB) };
              delete layoutOnly.background;
              delete layoutOnly.backgroundColor;
              delete layoutOnly.backgroundImage;
              delete layoutOnly.backgroundRepeat;
              delete layoutOnly.backgroundSize;
              delete layoutOnly.backgroundPosition;
              delete layoutOnly.border;
              delete (layoutOnly as any).borderTop;
              delete (layoutOnly as any).borderRight;
              delete (layoutOnly as any).borderBottom;
              delete (layoutOnly as any).borderLeft;
              delete (layoutOnly as any).outline;
              delete (layoutOnly as any).boxShadow;
              // avoid applying figma transforms (rotation) on bitmap exports
              delete (layoutOnly as any).transform;
              delete (layoutOnly as any).transformOrigin;
              const sOnly = toStyleJSX(layoutOnly);
              return `${pad}<div style=${sOnly}>\n${pad}  <img src="${p}" alt="${(node.name || 'image').replace(/"/g, '&quot;')}" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />\n${pad}</div>`;
            }
            return `${pad}<div style=${s} data-figma-node-id="${node.id}" />`;
          }

          case 'GROUP': {
            const hasMaskChild = Array.isArray(node.children) && node.children.some((c: any) => c?.isMask && (c.maskType || c.mask));
            const hasTextChild = Array.isArray(node.children) && node.children.some((c: any) => c?.type === 'TEXT');
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
                delete (mergedStyle as any).border;
                delete (mergedStyle as any).outline;
                delete (mergedStyle as any).boxShadow;
                delete (mergedStyle as any).backgroundColor;
                // avoid applying figma transforms (rotation) on flattened bitmaps
                delete (mergedStyle as any).transform;
                delete (mergedStyle as any).transformOrigin;
                mergedStyle.backgroundImage = `url('${p}')`;
                mergedStyle.backgroundSize = 'cover';
                mergedStyle.backgroundPosition = 'center';
                mergedStyle.backgroundRepeat = 'no-repeat';
                const s2 = toStyleJSX(mergedStyle);
                return `${pad}<div style=${s2} data-figma-node-id="${node.id}" />`;
              }
            }
            
            // Disable container flattening to avoid positioning issues with nested groups
            const canFlatten = false;
            
            // If we can flatten and have exactly one child, render child with parent's positioning
            if (canFlatten && Array.isArray(node.children) && node.children.length === 1) {
              const child = node.children[0];
              if (child?.type === 'TEXT') {
                // Generate the flattened container with child content
                const childContent = genNode(child, node.absoluteBoundingBox, indent + 2);
                if (childContent) {
                  return `${pad}<div style=${s} data-figma-node-id="${node.id}">\n${childContent}\n${pad}</div>`;
                }
              }
            }
            
            // default container - fall through to default case
          }

          default: {
            const children = (node.children || [])
                .map((c: any) => genNode(c, node.absoluteBoundingBox, indent + 2))
                .filter(Boolean)
                .join('\n');
            if (children)
              return `${pad}<div style=${s} data-figma-node-id="${node.id}">\n${children}\n${pad}</div>`;
            return `${pad}<div style=${s} data-figma-node-id="${node.id}" />`;
          }
        }
      };

      const rootBB = frameNode.absoluteBoundingBox || { width: 1200, height: 800 };

      // ---------- copy assets into zip and rewrite references ----------
       const JSZip = await import('jszip');
       const zip = new JSZip.default();

       for (const [p, c] of files) zip.file(p, c);
       // ensure /public/assets/ is created in zip before placing files
       zip.folder('public');
       zip.folder('public')?.folder('assets');

      let downloaded = 0;
      let failed = 0;
      for (const { key, aliasKeys } of assetCandidates) {
        if (abort.signal.aborted) break;
        const url = sourceAssetMap[key];
        if (!url) {
          downloaded++;
          setExportProgress((ep) => ({ ...ep, loaded: downloaded, label: `Downloading assets (${downloaded}/${assetCandidates.length})…` }));
          continue;
        }
        // Fetch via server proxy to bypass browser CORS
        try {
          const proxied = `/api/assets?url=${encodeURIComponent(url)}`;
          const res = await fetch(proxied, { signal: abort.signal, cache: 'no-store' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = await res.arrayBuffer();
          const ct = res.headers.get('content-type') || '';
          const isSvg = ct.includes('svg') || url.endsWith('.svg');
          const ext = isSvg ? 'svg' :
              ct.includes('png') || url.includes('.png') ? 'png' :
                  (ct.includes('jpeg') || url.includes('.jpg') || url.includes('.jpeg')) ? 'jpg' : 'png';
          const safeKey = sanitizeFilename(key);
          const path = `public/assets/${safeKey}.${ext}`;
          const publicPath = `/assets/${safeKey}.${ext}`;
          localAssetMap[key] = publicPath;
          for (const a of aliasKeys) localAssetMap[a] = publicPath;
          zip.file(path, buf);
        } catch {
          if (abort.signal.aborted) break;
          failed++;
          // Fallback: map to remote URL so exported code can still display via <img>/CSS background
          localAssetMap[key] = url;
          for (const a of aliasKeys) localAssetMap[a] = url;
        } finally {
          downloaded++;
          setExportProgress((ep) => ({
            ...ep,
            loaded: Math.min(downloaded, ep.total),
            label: `Downloading assets (${downloaded}/${assetCandidates.length})…`,
          }));
        }
      }

      if (failed > 0 && !devMode) {
        // Single summary to avoid noisy console spam
        console.warn(`Proceeding with ${failed} remote asset reference${failed === 1 ? '' : 's'} due to CORS.`);
      }

      if (abort.signal.aborted) {
        setExportProgress({ isExporting: false, total: 0, loaded: 0, label: '' });
        return;
      }

      const componentTsx =
          `'use client';\n\nimport React, { useEffect } from 'react';\nimport { useFigmaScale } from '../lib/useFigmaScale';\n\n` +
          `export default function ${componentName}() {\n` +
          `  const designWidth = ${Math.round(rootBB.width || 1200)};\n` +
          `  const scale = ${enableScaling ? 'useFigmaScale(designWidth)' : '1'};\n` +
          `  const FONT_FAMILIES: string[] = ${JSON.stringify(Array.from(familiesToLoad))};\n` +
          `  useEffect(() => {\n` +
          `    try {\n` +
          `      const d: any = (typeof document !== 'undefined') ? (document as any) : null;\n` +
          `      if (d && d.fonts && FONT_FAMILIES.length) {\n` +
          `        const weights = [300,400,500,600,700];\n` +
          `        FONT_FAMILIES.forEach(f => {\n` +
          `          weights.forEach(w => { try { d.fonts.load(\`${'${w}'} 1em \"${'${f}'}\"\`); } catch {} });\n` +
          `        });\n` +
          `      }\n` +
          `    } catch {}\n` +
          `  }, []);\n` +
          `  return (\n` +
          `    <div style={{ width: '100vw', minHeight: '100vh', overflowX: 'hidden', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>\n` +
          `      <div style={{ width: designWidth + 'px', height: '${Math.round(rootBB.height || 800)}px', transform: 'scale(' + scale + ')', transformOrigin: 'top center', position: 'relative', flexShrink: 0 }}>\n` +
          `${genNode(frameNode, undefined, 8)}\n` +
          `      </div>\n` +
          `      <div style={{ height: (${Math.round(rootBB.height || 800)} * scale) + 'px' }} />\n` +
          `    </div>\n` +
          `  );\n` +
          `}\n`;
      zip.file(`src/components/${componentName}.tsx`, componentTsx);

      const blob = await zip.generateAsync({ type: 'blob' }, (meta) => {
        setExportProgress((ep) => ({
          ...ep,
          loaded: assetCandidates.length + Math.min(100, Math.floor(meta.percent || 0)),
          label: `Packaging project (${Math.floor(meta.percent || 0)}%)…`,
        }));
      });

      if (abort.signal.aborted) {
        setExportProgress({ isExporting: false, total: 0, loaded: 0, label: '' });
        return;
      }

      const outName = `${projectSlug}-nextjs-project.zip`;
      downloadBlob(blob, outName);
      console.log('✅ Exported static Next.js project');
      setExportProgress({ isExporting: false, total: 0, loaded: 0, label: '' });
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        console.log('Export aborted');
      } else {
        console.error('❌ Export failed:', error);
      }
      setExportProgress((ep) => ({ ...ep, isExporting: false, label: 'Export cancelled' }));
    }
  };

  /* ---------------- UI states ---------------- */

  if (loading) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading Figma design...</p>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="text-center max-w-lg mx-4">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Error Loading{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Design
              </span>
            </h1>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
              <p className="text-gray-700 mb-4">{error}</p>
              
              {error.includes('authentication') && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">How to fix this:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Log in with your Figma account using OAuth</li>
                    <li>• Or add a Personal Access Token in the settings below</li>
                    <li>• Make sure the file is accessible to your account</li>
                  </ul>
                </div>
              )}
              
              {error.includes('not found') && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">How to fix this:</h3>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Check that the Figma URL is correct</li>
                    <li>• Ensure the file is public or you have access to it</li>
                    <li>• Try uploading the JSON file directly instead</li>
                  </ul>
                </div>
              )}
            </div>
            
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Try Again
            </button>
          </div>
        </div>
    );
  }

  if (!figmaData || !frameNode) {
    // first screen (upload)
    return (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Figma to Code</h1>
              <p className="text-gray-600">
                Upload your Figma JSON (or open via <code>?url=</code>) to see the rendered design
              </p>
            </div>

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
                    <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{uploadError}</div>
                )}
                <p className="text-xs text-gray-500">
                  Supports Figma JSON exports and plugin data. The design will render immediately after upload.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Authentication</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-medium">Signed in as:</span>
                  <span className="font-mono text-gray-600">{authUser?.email || 'Not signed in'}</span>
                </div>

                <div className="space-y-2">
                  <div className="font-medium">Token mode</div>
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="tokenMode"
                        value="auto"
                        checked={tokenMode === 'auto'}
                        onChange={() => { setTokenMode('auto'); try { localStorage.setItem('tokenMode', 'auto'); } catch {} }}
                      />
                      Auto (prefer OAuth, fallback PAT)
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="tokenMode"
                        value="oauth"
                        checked={tokenMode === 'oauth'}
                        onChange={() => { setTokenMode('oauth'); try { localStorage.setItem('tokenMode', 'oauth'); } catch {} }}
                      />
                      OAuth only
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="tokenMode"
                        value="pat"
                        checked={tokenMode === 'pat'}
                        onChange={() => { setTokenMode('pat'); try { localStorage.setItem('tokenMode', 'pat'); } catch {} }}
                      />
                      PAT only
                    </label>
                  </div>
                </div>

                <label className="block">
                  <div className="font-medium mb-1">Personal Access Token (optional)</div>
                  <input
                    type="password"
                    value={figmaToken}
                    onChange={(e) => { const v = e.target.value.trim(); setFigmaToken(v); try { localStorage.setItem('figmaToken', v); } catch {} }}
                    placeholder="Paste PAT (used if OAuth not available)"
                    className="mt-1 w-full border rounded px-2 py-1 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We&apos;ll send <code>X-Figma-Token</code> for PATs or <code>Authorization: Bearer</code> for OAuth via the server proxy.
                  </p>
                </label>
              </div>
            </div>
          </div>
        </div>
    );
  }

  /* ---------------- render ---------------- */

  return (
      <div className="bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 py-2 sticky top-0 z-50 shadow-sm">
          <div className="flex items-center justify-between space-x-4 px-4">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900">
                <span className="px-2 py-1 rounded bg-gray-100">Figma</span>
                <span className="text-gray-400">→</span>
                <span className="px-2 py-1 rounded bg-gray-100">React</span>
              </div>

              <button
                  onClick={() => setShowBrowser(true)}
                  className="h-8 px-2 text-sm bg-white border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                Pick target…
              </button>

              <span className="text-sm text-gray-600 truncate">
              {frameNode?.name} ({frameNode?.children?.length || 0} elements)
            </span>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              {authUser && (
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-2 py-0.5 shadow-sm">
                    {authUser.img_url ? (
                        <img src={authUser.img_url} alt="avatar" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                          {(authUser.handle || authUser.email || '?').slice(0, 1).toUpperCase()}
                        </div>
                    )}
                    <span className="text-xs text-gray-700 max-w-[10rem] truncate" title={authUser.handle || authUser.email}>
                  {authUser.handle || authUser.email}
                </span>
                    <button onClick={handleLogout} className="text-[10px] text-gray-500 hover:text-gray-700 ml-1" title="Logout">
                      Logout
                    </button>
                  </div>
              )}

              <button onClick={() => setShowSettings(true)} className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">
                Settings
              </button>

              <button
                  onClick={handleExport}
                  className="px-3 py-1 text-xs font-medium text-white rounded bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 active:scale-[0.98] transition-transform shadow-sm flex items-center gap-1"
                  title="Export React component"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                  <path d="M12 3a1 1 0 011 1v8.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L11 12.586V4a1 1 0 011-1z"/>
                  <path d="M5 19a2 2 0 002 2h10a2 2 0 002-2v-3a1 1 0 112 0v3a4 4 0 01-4 4H7a4 4 0 01-4-4v-3a1 1 0 112 0v-3z"/>
                </svg>
                Export
              </button>

              {/* Cancel export button appears only while exporting */}
              {exportProgress.isExporting && (
                  <button
                      onClick={() => {
                        exportJobRef.current?.abort.abort();
                        exportJobRef.current = null;
                        setExportProgress({ isExporting: false, total: 0, loaded: 0, label: '' });
                      }}
                      className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors font-medium"
                      title="Cancel export"
                  >
                    Cancel
                  </button>
              )}

              <button
                  onClick={() => {
                    try { localStorage.clear(); } catch {}
                    location.reload();
                  }}
                  className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors font-medium"
              >
                🗑️ Clear
              </button>
            </div>
          </div>
        </div>

        {/* Asset progress / info */}
        {assetLoadingStatus && !assetLoadingProgress.isLoading && (
            <div className="bg-blue-50/60 border-b border-blue-200/40 sticky top-12 z-40">
              <div className="h-8 flex items-center px-4 text-xs text-blue-900">{assetLoadingStatus}</div>
            </div>
        )}
        {assetLoadingProgress.isLoading && (
            <div className="bg-blue-50/80 border-b border-blue-200/50 shadow-sm sticky top-12 z-40">
              <div className="h-8 flex items-center justify-between px-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                  <span className="text-blue-800 text-xs font-medium">
                {assetLoadingProgress.total > 0 ? `${assetLoadingProgress.loaded}/${assetLoadingProgress.total} assets` : 'Searching...'}
              </span>
                </div>
                {assetLoadingProgress.total > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-blue-200/50 rounded-full h-1.5">
                        <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${Math.round((assetLoadingProgress.loaded / assetLoadingProgress.total) * 100)}%` }}
                        />
                      </div>
                      <span className="text-blue-600 text-xs font-medium">
                  {Math.round((assetLoadingProgress.loaded / assetLoadingProgress.total) * 100)}%
                </span>
                    </div>
                )}
              </div>
            </div>
        )}

        {/* Export progress */}
        {exportProgress.isExporting && (
            <div className="bg-emerald-50/80 border-b border-emerald-200/50 shadow-sm sticky top-12 z-40">
              <div className="h-8 flex items-center justify-between px-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-600" />
                  <span className="text-emerald-800 text-xs font-medium">
                {exportProgress.label || 'Exporting…'}
              </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-emerald-200/50 rounded-full h-1.5">
                    <div
                        className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                        style={{
                          width: `${Math.min(100, Math.round((exportProgress.loaded / Math.max(1, exportProgress.total)) * 100))}%`,
                        }}
                    />
                  </div>
                  <span className="text-emerald-600 text-xs font-medium">
                {Math.min(100, Math.round((exportProgress.loaded / Math.max(1, exportProgress.total)) * 100))}%
              </span>
                </div>
              </div>
            </div>
        )}

        {/* Renderer */}
        <div className="bg-white w-screen figma-renderer-container">
          <div className="relative w-screen figma-renderer-container overflow-hidden h-auto">
            {showDebug && <div className="absolute inset-0 border-4 border-red-500 border-dashed pointer-events-none z-10" />}
            {frameNode && (
                <SimpleFigmaRenderer
                    key={`renderer-${frameNode.id}-${dataSource}-${dataVersion}`}
                    node={frameNode}
                    showDebug={showDebug}
                    isRoot
                    imageMap={assetMap}
                    devMode={devMode}
                    enableScaling={enableScaling}
                    maxScale={maxScale}
                />
            )}
          </div>
        </div>

        {/* Overlays */}
        {showBrowser && figmaData?.document && (
            <NodeBrowser
                root={figmaData.document as any}
                fileKey={fileKey}
                figmaToken={figmaToken}
                fileThumbnailUrl={figmaData.thumbnailUrl ?? null}
                onClose={() => setShowBrowser(false)}
                onPick={async (picked) => {
                  setShowBrowser(false);
                  const node = synthesizeAbsoluteBB(picked);
                  setAssetMap({});
                  setAssetLoadingStatus('');
                  setFrameNode(null);
                  setTimeout(async () => {
                    setFrameNode(node);
                    setHasUserPickedTarget(true);
                    const best = await hydrateBestToken();
                    if (fileKey && best) await startAssetJob(node, best);
                    else setAssetLoadingStatus('ℹ️ Add a Figma token in Settings or login with OAuth');
                    void loadFontsFromFigmaData(node);
                  }, 0);
                }}
            />
        )}

        <SettingsPanel
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            devMode={devMode}
            setDevMode={setDevMode}
            showDebug={showDebug}
            setShowDebug={setShowDebug}
            enableScaling={enableScaling}
            setEnableScaling={setEnableScaling}
            maxScale={maxScale}
            setMaxScale={setMaxScale}
            figmaToken={figmaToken}
            setFigmaToken={(v) => {
              setFigmaToken(v);
              try { localStorage.setItem('figmaToken', v); } catch {}
            }}
            fileKey={fileKey}
            tokenMode={tokenMode}
            setTokenMode={(v) => { setTokenMode(v); try { localStorage.setItem('tokenMode', v); } catch {} }}
        />
      </div>
  );
}

export default function OutputPage() {
  return (
      <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading…</div>}>
        <OutputPageContent />
      </Suspense>
  );
}