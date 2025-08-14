/* ──────────────────────────────────────────────────────────
   Auth + URL helpers (exported)
─────────────────────────────────────────────────────────── */

/** Header builder that supports PAT (X-Figma-Token) or OAuth (Bearer) */
export function figmaAuthHeaders(token?: string) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!token) return h;
  // heuristic: PATs often look like long opaque strings or start with FG/figd_
  if (/^(FG|figd_)/i.test(token) || /^[A-Za-z0-9-_]{20,}$/.test(token)) {
    h['X-Figma-Token'] = token;
  } else {
    h['Authorization'] = `Bearer ${token}`;
  }
  return h;
}

/** Try the primary auth header; on 401/403, auto-retry with the alternate header. */
export async function fetchFigmaJSON(url: string, token: string, signal?: AbortSignal) {
  const primary = figmaAuthHeaders(token);
  let res = await fetch(url, { headers: primary, signal });
  if ((res.status === 401 || res.status === 403) && token) {
    const useAlt =
        primary['X-Figma-Token'] !== undefined
            ? { Authorization: `Bearer ${token}` }
            : { 'X-Figma-Token': token };
    const alt: Record<string, string> = { 'Content-Type': 'application/json', ...(useAlt as unknown as Record<string, string>) };
    res = await fetch(url, { headers: alt as HeadersInit, signal });
  }
  return res;
}

/** Accepts web link (/file|/design|/proto), REST file url, or nodes url and returns canonical /file web link */
export function normalizeFigmaUrl(raw: string): string {
  try {
    const u = new URL(raw);

    // API -> web
    const apiMatch =
        u.hostname.includes('api.figma.com') && u.pathname.match(/\/v1\/files\/([a-zA-Z0-9]+)/);
    if (apiMatch) return `https://www.figma.com/file/${apiMatch[1]}`;

    // nodes endpoint -> web
    const nodesMatch =
        u.hostname.includes('api.figma.com') &&
        u.pathname.match(/\/v1\/files\/([a-zA-Z0-9]+)\/nodes/);
    if (nodesMatch) return `https://www.figma.com/file/${nodesMatch[1]}`;

    // web /file|/design|/proto -> canonical /file
    const webMatch =
        u.hostname.includes('figma.com') &&
        u.pathname.match(/\/(file|design|proto)\/([a-zA-Z0-9]+)/);
    if (webMatch) return `https://www.figma.com/file/${webMatch[2]}`;

    return raw;
  } catch {
    return raw;
  }
}

/** If someone saved an API or /design link previously, convert to canonical web /file link */
export function normalizeToWebLink(raw: string) {
  return normalizeFigmaUrl(raw);
}

/** Extract file key from /file|/design|/proto links, API urls, nodes urls, or a raw key string */
export function extractFileKeyFromUrl(raw: string): string | '' {
  const s = (raw || '').trim();

  // raw key (no slashes, looks like a figma key)
  if (/^[A-Za-z0-9]{10,}$/i.test(s) && !s.includes('/')) return s;

  try {
    const u = new URL(s);

    // web links
    const web = u.pathname.match(/\/(file|design|proto)\/([a-zA-Z0-9]+)/);
    if (web) return web[2];

    // API links
    const api = u.hostname.includes('api.figma.com') && u.pathname.match(/\/v1\/files\/([a-zA-Z0-9]+)/);
    if (api) return api[1];

    // nodes endpoint
    const nodes = u.hostname.includes('api.figma.com') && u.pathname.match(/\/v1\/files\/([a-zA-Z0-9]+)\/nodes/);
    if (nodes) return nodes[1];

    return '';
  } catch {
    return '';
  }
}

/* ──────────────────────────────────────────────────────────
   Asset helpers
─────────────────────────────────────────────────────────── */

/** Exported in case other renderers need it. */
export function collectImageishNodeIds(root: any): string[] {
  const ids = new Set<string>();
  const visit = (n?: any) => {
    if (!n) return;
    if (Array.isArray(n.fills)) {
      for (const f of n.fills) if (f?.type === 'IMAGE' && n.id) ids.add(n.id);
    }
    if (Array.isArray((n as any).background)) {
      for (const b of (n as any).background) if (b?.type === 'IMAGE' && n.id) ids.add(n.id);
    }
    if (['VECTOR', 'LINE', 'ELLIPSE', 'RECTANGLE'].includes(n.type) && n.id) ids.add(n.id);
    (n.children || []).forEach(visit);
  };
  visit(root);
  return Array.from(ids);
}

/* ──────────────────────────────────────────────────────────
   Enhanced asset loader (single authoritative export)
─────────────────────────────────────────────────────────── */

export async function loadFigmaAssetsFromNodes({
                                                 figmaFileKey,
                                                 figmaToken,
                                                 rootNode,
                                                 onProgress,
                                                 signal,
                                               }: {
  figmaFileKey: string;
  figmaToken: string;
  rootNode: any;
  onProgress?: (total: number, loaded: number) => void;
  signal?: AbortSignal;
}): Promise<Record<string, string>> {
  if (!figmaFileKey || !figmaToken || !rootNode) return {};

  const imageNodeIds: string[] = [];
  const imageRefIds: string[] = [];
  const svgNodeIds: string[] = [];
  const maskGroupIds: string[] = [];

  const isMaskGroup = (n: any): boolean => {
    if (n?.type !== 'GROUP') return false;
    const isMaskByName = n.name?.toLowerCase().includes('mask');
    const hasMaskChildren = n.children?.some((c: any) => c?.isMask === true);
    const hasExportSettings = Array.isArray(n.exportSettings) && n.exportSettings.length > 0;
    return isMaskByName || hasMaskChildren || hasExportSettings;
  };

  const walk = (n: any) => {
    if (!n) return;

    if (isMaskGroup(n) && n.id) maskGroupIds.push(n.id);

    if (Array.isArray(n.fills)) {
      for (const f of n.fills) {
        if (f?.type === 'IMAGE') {
          if (n.id) imageNodeIds.push(n.id);
          if (f.imageRef) imageRefIds.push(f.imageRef);
        }
      }
    }
    if (Array.isArray((n as any).background)) {
      for (const b of (n as any).background) if (b?.type === 'IMAGE' && b.imageRef) imageRefIds.push(b.imageRef);
    }

    if (
        n.type === 'VECTOR' ||
        n.type === 'LINE' ||
        (n.type === 'RECTANGLE' &&
            ((n.strokes && n.strokes.length > 0) || (n.fills && n.fills.some((f: any) => f?.type === 'SOLID'))))
    ) {
      if (n.id) svgNodeIds.push(n.id);
    }

    if (Array.isArray(n.children)) n.children.forEach(walk);
  };

  walk(rootNode);

  const uniqueImageRefs = Array.from(new Set(imageRefIds));
  const total = imageNodeIds.length + svgNodeIds.length + maskGroupIds.length + uniqueImageRefs.length;
  onProgress?.(total, 0);

  const assetMap: Record<string, string> = {};
  let loaded = 0;

  const fetchImagesBatched = async (ids: string[], format: 'png' | 'svg', batchSize: number) => {
    const out: Record<string, string> = {};
    for (let i = 0; i < ids.length; i += batchSize) {
      if (signal?.aborted) return out;
      const chunk = ids.slice(i, i + batchSize);
      if (!chunk.length) continue;
      const figmaUrl = `https://api.figma.com/v1/images/${figmaFileKey}?ids=${encodeURIComponent(
          chunk.join(',')
      )}&format=${format}${format === 'png' ? '&scale=2' : ''}`;
      const url = `/api/assets?url=${encodeURIComponent(figmaUrl)}`;

      try {
        let res = await fetch(url, { 
          headers: { 'X-Figma-Token': figmaToken },
          signal 
        });
        if (!res.ok) throw res;
        const data = await res.json();
        const img: Record<string, string | null> = data.images || {};
        for (const [k, v] of Object.entries(img)) if (v) out[k] = v;
      } catch (err: any) {
        if (signal?.aborted) return out;
        const text = typeof err?.text === 'function' ? await err.text() : '';
        console.warn('Figma /images error:', err?.status, text);
      }
    }
    return out;
  };

  // PNGs for nodes with image fills
  if (imageNodeIds.length) {
    const map = await fetchImagesBatched(imageNodeIds, 'png', 20);
    Object.assign(assetMap, map);
    loaded += Object.keys(map).length;
    onProgress?.(total, loaded);
  }

  // PNGs via imageRef (covers frame backgrounds etc.)
  if (uniqueImageRefs.length) {
    const map = await fetchImagesBatched(uniqueImageRefs, 'png', 20);
    Object.assign(assetMap, map);
    loaded += Object.keys(map).length;
    onProgress?.(total, loaded);
  }

  // SVGs for vectors/lines/rectangles
  if (svgNodeIds.length) {
    const map = await fetchImagesBatched(svgNodeIds, 'svg', 15);
    Object.assign(assetMap, map);
    loaded += Object.keys(map).length;
    onProgress?.(total, loaded);
  }

  // PNGs for mask groups
  if (maskGroupIds.length) {
    const map = await fetchImagesBatched(maskGroupIds, 'png', 20);
    Object.assign(assetMap, map);
    loaded += Object.keys(map).length;
    onProgress?.(total, loaded);
  }

  return assetMap;
}

/* ──────────────────────────────────────────────────────────
   Misc
─────────────────────────────────────────────────────────── */

export function rgbaToCss(r: number, g: number, b: number, a = 1): string {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
}

// Track loaded fonts to prevent duplicate loading
// NOTE: This function is currently disabled in getFontFamilyWithFallback to prevent duplicate loading
// Fonts are now loaded centrally via loadFontsFromFigmaData using the fontLoader
const loadedFonts = new Set<string>();

export const loadGoogleFont = (fontFamily: string): void => {
  if (typeof window === 'undefined' || !fontFamily) return;
  const googleFonts = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat', 'Source Sans Pro', 'Raleway',
    'Ubuntu', 'Nunito', 'Work Sans', 'DM Sans', 'Noto Sans', 'Fira Sans', 'PT Sans', 'Oswald',
    'Bebas Neue', 'Playfair Display', 'Merriweather', 'Lora', 'Space Grotesk', 'IBM Plex Sans',
  ];
  const fontName = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
  if (!googleFonts.includes(fontName)) return;
  
  // Check if font is already loaded or being loaded
  if (loadedFonts.has(fontName) || document.querySelector(`link[href*="${fontName}"]`)) {
    return;
  }
  
  // Mark as loading to prevent duplicates
  loadedFonts.add(fontName);
  console.log('Loading font:', fontName);
  
  const link = document.createElement('link');
  link.href = `/api/fonts/css2?family=${fontName.replace(' ', '+')}:wght@300;400;500;600;700;800;900&display=swap`;
  link.rel = 'stylesheet';
  link.type = 'text/css';
  
  link.onload = () => console.log('Font loaded successfully:', fontName);
  link.onerror = () => {
    console.error('Font failed to load:', fontName);
    loadedFonts.delete(fontName); // Remove from set on error to allow retry
  };
  
  document.head.appendChild(link);
};

export const getFontFamilyWithFallback = (family: string): string => {
  if (!family) return 'inherit';
  // Fonts are loaded centrally via loadFontsFromFigmaData, so we don't need to load here
  const { createReactFontFamily } = require('./fontUtils');
  return createReactFontFamily(family);
};

export function getCornerRadius(radius: number, width?: number, height?: number): string {
  if (radius === 0) return '0';
  // Use exact px radius, clamped to half the smallest dimension to avoid overshoot.
  // This preserves Figma's pill radii and avoids weird full-oval 50% rendering.
  const round2 = (v: number) => Math.round(v * 100) / 100;
  if (width !== undefined && height !== undefined) {
    const half = Math.min(width, height) / 2;
    const clamped = Math.min(radius, half);
    return `${round2(clamped)}px`;
  }
  return `${round2(radius)}px`;
}

export function getTextAlign(align: string): string {
  switch (align) {
    case 'CENTER': return 'center';
    case 'RIGHT': return 'right';
    case 'JUSTIFIED': return 'justify';
    default: return 'left';
  }
}

export function getVerticalAlign(align: string): string {
  switch (align) {
    case 'CENTER': return 'center';
    case 'BOTTOM': return 'flex-end';
    default: return 'flex-start';
  }
}

export function isNodeVisible(node: any): boolean {
  if (node?.visible === false) return false;
  if (node?.opacity === 0) return false;
  return true;
}

export function isFooterComponent(node: any): boolean {
  if (!node || typeof node !== 'object') return false;
  const footerKeywords = ['footer', 'social', 'linkedin', 'instagram', 'youtube', 'twitter'];
  const name = String(node.name || '').toLowerCase();
  return footerKeywords.some((k) => name.includes(k));
}

export function getImageScaleMode(node: any): string {
  if (!node || typeof node !== 'object') return 'cover';
  if (isFooterComponent(node)) return 'cover';
  if (node.scaleMode) {
    switch (node.scaleMode) {
      case 'FILL': return 'cover';
      case 'FIT': return 'contain';
      case 'CROP': return 'cover';
      default: return 'cover';
    }
  }
  return 'cover';
}