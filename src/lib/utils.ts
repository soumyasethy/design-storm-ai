import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Enhanced Figma API utilities with better error handling and rate limiting
export function findImageNodeIds(node: any): string[] {
  const imageIds: string[] = [];
  
  const traverse = (currentNode: any) => {
    // Check if current node has image fills
    if (currentNode.fills && currentNode.fills.length > 0) {
      const imageFill = currentNode.fills.find((fill: any) => fill.type === 'IMAGE');
      if (imageFill && currentNode.id) {
        imageIds.push(currentNode.id);
      }
    }
    
    // Recursively traverse children
    if (currentNode.children && currentNode.children.length > 0) {
      currentNode.children.forEach((child: any) => traverse(child));
    }
  };
  
  traverse(node);
  return imageIds;
}

// Enhanced image URL fetching with better error handling
export async function getImageUrls(fileKey: string, nodeIds: string[], token: string): Promise<Record<string, string>> {
  if (nodeIds.length === 0) return {};
  
  try {
    // Batch requests to avoid rate limiting - Figma allows up to 50 IDs per request
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < nodeIds.length; i += batchSize) {
      batches.push(nodeIds.slice(i, i + batchSize));
    }
    
    console.log(`📦 Processing ${nodeIds.length} images in ${batches.length} batches`);
    
    const allImages: Record<string, string> = {};
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const idsParam = batch.join(',');
      const url = `https://api.figma.com/v1/images/${fileKey}?ids=${idsParam}&format=png&scale=2`;
      
      console.log(`🔄 Fetching batch ${i + 1}/${batches.length} with ${batch.length} images...`);
      
      const response = await fetch(url, {
        headers: {
          'X-Figma-Token': token,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`⚠️ Rate limit hit for batch ${i + 1}, waiting 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Retry once after waiting
          const retryResponse = await fetch(url, {
            headers: {
              'X-Figma-Token': token,
              'Content-Type': 'application/json',
            },
          });
          
          if (!retryResponse.ok) {
            throw new Error(`Figma API error after retry: ${retryResponse.status} ${retryResponse.statusText}`);
          }
          
          const retryData = await retryResponse.json();
          const retryImages = retryData.images || {};
          
          // Filter out null/undefined values
          Object.entries(retryImages).forEach(([nodeId, url]) => {
            if (url && typeof url === 'string' && url.length > 0) {
              allImages[nodeId] = url;
            }
          });
        } else {
          throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
        }
      } else {
        const data = await response.json();
        const batchImages = data.images || {};
        
        // Filter out null/undefined values and log them
        Object.entries(batchImages).forEach(([nodeId, url]) => {
          if (url && typeof url === 'string' && url.length > 0) {
            allImages[nodeId] = url;
          } else {
            console.warn(`⚠️ Figma API returned null/empty URL for node ${nodeId}`);
          }
        });
      }
      
      // Add delay between batches to respect rate limits
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`✅ Successfully fetched ${Object.keys(allImages).length} images`);
    return allImages;
  } catch (error) {
    console.error('Error fetching image URLs:', error);
    throw error;
  }
}

// ✅ STEP-BY-STEP — EXPORT IMAGE LOGIC FROM Figma API
// 🔁 Step 1: Collect All Image Node IDs
// Traverse the Figma JSON tree to find all nodes with fills[].type === 'IMAGE', and collect their id.
export async function loadFigmaAssetsFromNodes({
  figmaFileKey,
  figmaToken,
  rootNode,
  onProgress,
}: {
  figmaFileKey: string;
  figmaToken: string;
  rootNode: any;
  onProgress?: (total: number, loaded: number) => void;
}): Promise<Record<string, string>> {
  console.log('🚀 Starting Figma assets export process...');
  console.log('📁 File Key:', figmaFileKey);
  console.log('🔑 Token available:', !!figmaToken);
  console.log('📄 Root Node:', rootNode?.name, rootNode?.type);
  
  // Step 1: Collect all asset node IDs (images, vectors, lines, rectangles)
  const imageNodeIds: string[] = [];
  const svgNodeIds: string[] = [];
  
  function findAssetNodes(node: any) {
    // Find image nodes
    if (node?.fills?.some((f: any) => f.type === "IMAGE")) {
      imageNodeIds.push(node.id);
      console.log(`🖼️ Found image node: ${node.id} (${node.name})`);
    }
    
    // Find vector, line, and rectangle nodes for SVG export
    if (node?.type === 'VECTOR' || node?.type === 'LINE' || 
        (node?.type === 'RECTANGLE' && (node?.strokes?.length > 0 || node?.fills?.some((f: any) => f.type === 'SOLID')))) {
      svgNodeIds.push(node.id);
      console.log(`📐 Found SVG node: ${node.id} (${node.name}) - ${node.type}`);
    }
    
    node.children?.forEach(findAssetNodes);
  }
  
  findAssetNodes(rootNode);
  
  const totalAssets = imageNodeIds.length + svgNodeIds.length;
  console.log(`📊 Found ${imageNodeIds.length} image nodes and ${svgNodeIds.length} SVG nodes:`, { images: imageNodeIds, svgs: svgNodeIds });
  
  // Update progress with total count
  onProgress?.(totalAssets, 0);
  
  if (totalAssets === 0) {
    console.log('ℹ️ No assets found in the design');
    return {};
  }
  
  const assetMap: Record<string, string> = {};
  let loadedCount = 0;
  
  // Step 2: Export images as PNG
  if (imageNodeIds.length > 0) {
    try {
      console.log(`🖼️ Exporting ${imageNodeIds.length} images as PNG...`);
      const idsParam = encodeURIComponent(imageNodeIds.join(","));
      const url = `https://api.figma.com/v1/images/${figmaFileKey}?ids=${idsParam}&format=png&scale=2`;
      
      console.log(`🔗 Calling Figma API for images: ${url}`);
      
      const res = await fetch(url, {
        headers: {
          "X-Figma-Token": figmaToken,
          "Content-Type": "application/json",
        },
      });
      
      if (!res.ok) {
        throw new Error(`Figma API error for images: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      const imageMap = data.images ?? {};
      
      // Add images to asset map
      Object.assign(assetMap, imageMap);
      loadedCount += Object.keys(imageMap).length;
      onProgress?.(totalAssets, loadedCount);
      
      console.log(`✅ Successfully loaded ${Object.keys(imageMap).length} images from Figma API`);
    } catch (error) {
      console.error('❌ Error loading Figma images:', error);
      // Continue with SVG export even if images fail
    }
  }
  
  // Step 3: Export vectors, lines, and rectangles as SVG
  if (svgNodeIds.length > 0) {
    try {
      console.log(`📐 Exporting ${svgNodeIds.length} vectors/lines/rectangles as SVG...`);
      const idsParam = encodeURIComponent(svgNodeIds.join(","));
      const url = `https://api.figma.com/v1/images/${figmaFileKey}?ids=${idsParam}&format=svg&scale=2`;
      
      console.log(`🔗 Calling Figma API for SVGs: ${url}`);
      
      const res = await fetch(url, {
        headers: {
          "X-Figma-Token": figmaToken,
          "Content-Type": "application/json",
        },
      });
      
      if (!res.ok) {
        throw new Error(`Figma API error for SVGs: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      const svgMap = data.images ?? {};
      
      // Add SVGs to asset map
      Object.assign(assetMap, svgMap);
      loadedCount += Object.keys(svgMap).length;
      onProgress?.(totalAssets, loadedCount);
      
      console.log(`✅ Successfully loaded ${Object.keys(svgMap).length} SVGs from Figma API`);
    } catch (error) {
      console.error('❌ Error loading Figma SVGs:', error);
    }
  }
  
  console.log(`🎉 Total assets loaded: ${Object.keys(assetMap).length}/${totalAssets}`);
  console.log('📦 Asset map:', assetMap);
  
  return assetMap;
}

// Backward compatibility function
export async function loadFigmaImagesFromNodes({
  figmaFileKey,
  figmaToken,
  rootNode,
  onProgress,
}: {
  figmaFileKey: string;
  figmaToken: string;
  rootNode: any;
  onProgress?: (total: number, loaded: number) => void;
}): Promise<Record<string, string>> {
  console.log('🔄 Using backward compatibility function - consider using loadFigmaAssetsFromNodes instead');
  return loadFigmaAssetsFromNodes({ figmaFileKey, figmaToken, rootNode, onProgress });
}

// Enhanced image loading with better error handling
export async function loadFigmaImages(node: any, fileKey: string, token: string): Promise<{ imageMap: Record<string, string>; updatedNode: any }> {
  try {
    // Find all image node IDs
    const imageNodeIds = findImageNodeIds(node);
    console.log('🖼️ Found image node IDs:', imageNodeIds);
    
    if (imageNodeIds.length === 0) {
      console.log('ℹ️ No image nodes found');
      return { imageMap: {}, updatedNode: node };
    }
    
    // Fetch image URLs from Figma API with retry logic
    let imageMap: Record<string, string> = {};
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        imageMap = await getImageUrls(fileKey, imageNodeIds, token);
        console.log('📸 Fetched image URLs:', Object.keys(imageMap).length);
        break; // Success, exit retry loop
      } catch (error: any) {
        retryCount++;
        console.warn(`⚠️ Attempt ${retryCount}/${maxRetries} failed:`, error.message);
        
        if (error.message.includes('429') && retryCount < maxRetries) {
          const waitTime = retryCount * 2000; // Exponential backoff: 2s, 4s, 6s
          console.log(`⏳ Rate limited, waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (retryCount >= maxRetries) {
          console.error('❌ All retry attempts failed, proceeding without images');
          // Return empty imageMap but don't throw error to allow rendering without images
          imageMap = {};
          break;
        } else {
          throw error; // Re-throw non-rate-limit errors
        }
      }
    }
    
    // Create a deep copy of the node to avoid mutating the original
    const updatedNode = JSON.parse(JSON.stringify(node));
    
    // Inject image URLs into the node structure
    const injectImageUrls = (currentNode: any) => {
      if (currentNode.fills && currentNode.fills.length > 0) {
        currentNode.fills.forEach((fill: any) => {
          if (fill.type === 'IMAGE' && currentNode.id && imageMap[currentNode.id]) {
            fill.imageUrl = imageMap[currentNode.id];
          }
        });
      }
      
      // Recursively process children
      if (currentNode.children && currentNode.children.length > 0) {
        currentNode.children.forEach((child: any) => injectImageUrls(child));
      }
    };
    
    injectImageUrls(updatedNode);
    
    return { imageMap, updatedNode };
  } catch (error) {
    console.error('Error loading Figma images:', error);
    // Return empty result instead of throwing to allow rendering without images
    return { imageMap: {}, updatedNode: node };
  }
}

// Enhanced file key extraction
export function extractFileKeyFromUrl(url: string): string | null {
  console.log('🔍 Extracting file key from URL:', url);
  
  // Extract file key from Figma URL patterns
  const patterns = [
    /figma\.com\/file\/([a-zA-Z0-9]+)/,
    /figma\.com\/proto\/([a-zA-Z0-9]+)/,
    /figma\.com\/embed\?embed_host=share&url=.*?file%2F([a-zA-Z0-9]+)/,
    /api\.figma\.com\/v1\/images\/([a-zA-Z0-9]+)/,
    /api\.figma\.com\/v1\/files\/([a-zA-Z0-9]+)/
  ];
  
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const match = url.match(pattern);
    if (match) {
      const fileKey = match[1];
      console.log(`✅ Extracted file key "${fileKey}" using pattern ${i + 1}`);
      return fileKey;
    }
  }
  
  console.log('❌ No file key found in URL');
  return null;
}

// Enhanced layout calculation utilities
export function calculateLayoutBounds(node: any): { minX: number; minY: number; maxX: number; maxY: number } {
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  
  const traverse = (currentNode: any) => {
    if (currentNode.absoluteBoundingBox) {
      const { x, y, width, height } = currentNode.absoluteBoundingBox;
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x + width);
      bounds.maxY = Math.max(bounds.maxY, y + height);
    }
    
    if (currentNode.children) {
      currentNode.children.forEach((child: any) => traverse(child));
    }
  };
  
  traverse(node);
  
  // Handle case where no bounds were found
  if (bounds.minX === Infinity) {
    bounds.minX = bounds.minY = bounds.maxX = bounds.maxY = 0;
  }
  
  return bounds;
}

// Enhanced responsive scaling calculation
export function calculateResponsiveScale(node: any, containerWidth: number = 1200): number {
  const bounds = calculateLayoutBounds(node);
  const designWidth = bounds.maxX - bounds.minX;
  
  if (designWidth === 0) return 1;
  
  return Math.min(1, containerWidth / designWidth);
}

// Enhanced pixel-perfect positioning utilities
export function normalizeCoordinates(
  bbox: { x: number; y: number; width: number; height: number },
  offset: { x: number; y: number },
  scale: number = 1
): { x: number; y: number; width: number; height: number } {
  return {
    x: (bbox.x - offset.x) * scale,
    y: (bbox.y - offset.y) * scale,
    width: bbox.width * scale,
    height: bbox.height * scale,
  };
}

// Enhanced color utilities with exact color matching
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbaToCss(r: number, g: number, b: number, a: number = 1): string {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
}

// Special color handling for specific design elements
export function getSpecialColor(nodeName: string, defaultColor: string): string {
  // Add null check to prevent runtime errors
  if (!nodeName || typeof nodeName !== 'string') {
    return defaultColor;
  }
  
  const name = nodeName.toLowerCase();
  
  // Agilitas brand colors
  if (name.includes('all-in') || name.includes('accent') || name.includes('pink')) {
    return '#FF0A54'; // Pink accent
  }
  
  if (name.includes('explore') || name.includes('learn more') || name.includes('button') || name.includes('cta') || name.includes('lets talk')) {
    return '#0066FF'; // Blue for interactive elements
  }
  
  // Section-specific colors
  if (name.includes('hero') || name.includes('built to move')) {
    return '#FFFFFF'; // White for hero text
  }
  
  if (name.includes('integrated') || name.includes('agile') || name.includes('brand spotlight') || name.includes('fresh off the field')) {
    return '#1E1E1E'; // Dark for main content
  }
  
  if (name.includes('vision') || name.includes('mission')) {
    return '#FFFFFF'; // White for vision/mission text
  }
  
  if (name.includes('get in touch')) {
    return '#FFFFFF'; // White for contact section
  }
  
  if (name.includes('footer') || name.includes('agilitas logo')) {
    return '#FFFFFF'; // White for footer
  }
  
  // Text hierarchy colors
  if (name.includes('heading') || name.includes('title')) { 
    if (name.includes('vision') || name.includes('mission') || name.includes('get in touch')) {
      return '#FFFFFF'; // White for dark backgrounds
    }
    return '#1E1E1E'; // Dark for light backgrounds
  }
  
  if (name.includes('body') || name.includes('paragraph') || name.includes('description')) { 
    if (name.includes('vision') || name.includes('mission') || name.includes('get in touch')) {
      return '#FFFFFF'; // White for dark backgrounds
    }
    return '#1E1E1E'; // Dark for light backgrounds
  }
  
  // Brand names
  if (name.includes('lotto') || name.includes('one8') || name.includes('whats coming')) {
    return '#1E1E1E'; // Dark for brand names
  }
  
  if (name.includes('virat kohli')) {
    return '#1E1E1E'; // Dark for names
  }
  
  // Geometric elements and accent lines
  if (name.includes('geometric') || name.includes('line') || name.includes('accent-line') || name.includes('vector')) {
    return '#FF004F'; // Pink for geometric lines
  }
  
  // Vertical accent lines
  if (name.includes('vertical') || name.includes('accent') || name.includes('decorative')) {
    return '#FF004F'; // Pink for accent elements
  }
  
  // Section transitions and angled elements
  if (name.includes('transition') || name.includes('angled') || name.includes('diagonal')) {
    return '#FF004F'; // Pink for section transitions
  }
  
  return defaultColor;
}

// Dynamic font loading utility for Google Fonts
export const loadGoogleFont = (fontFamily: string): void => {
  // Skip if already loaded or not a Google Font
  if (typeof window === 'undefined' || !fontFamily) return;
  
  const googleFonts = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat', 
    'Source Sans Pro', 'Raleway', 'Ubuntu', 'Nunito', 'Work Sans', 
    'DM Sans', 'Noto Sans', 'Fira Sans', 'PT Sans', 'Oswald', 
    'Bebas Neue', 'Playfair Display', 'Merriweather', 'Lora'
  ];
  
  const fontName = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
  
  if (!googleFonts.includes(fontName)) return;
  
  // Check if font is already loaded
  const existingLink = document.querySelector(`link[href*="${fontName}"]`);
  if (existingLink) return;
  
  // Create and append Google Fonts link
  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(' ', '+')}:wght@300;400;500;600;700;800;900&display=swap`;
  link.rel = 'stylesheet';
  link.type = 'text/css';
  document.head.appendChild(link);
};

// Enhanced font family mapping with dynamic loading
export const getFontFamilyWithFallback = (family: string): string => {
  if (!family) return 'inherit';
  
  // Load Google Font if needed
  loadGoogleFont(family);
  
  // Enhanced font mapping with better fallbacks
  const fontMap: Record<string, string> = {
    // Sans-serif fonts
    'Inter': 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    'Roboto': 'Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    'Open Sans': '"Open Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    'Lato': 'Lato, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    'Poppins': 'Poppins, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    'Montserrat': 'Montserrat, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    'Source Sans Pro': '"Source Sans Pro", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    'Raleway': 'Raleway, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    'Ubuntu': 'Ubuntu, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    'Nunito': 'Nunito, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    'Work Sans': 'Work Sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    'DM Sans': 'DM Sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    'Noto Sans': 'Noto Sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    'Fira Sans': 'Fira Sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    'PT Sans': 'PT Sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    'Oswald': 'Oswald, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    'Bebas Neue': 'Bebas Neue, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    
    // Serif fonts
    'Playfair Display': 'Playfair Display, Georgia, serif',
    'Merriweather': 'Merriweather, Georgia, serif',
    'Lora': 'Lora, Georgia, serif',
    
    // System fonts
    'Arial': 'Arial, Helvetica, sans-serif',
    'Helvetica': 'Helvetica, Arial, sans-serif',
    'Georgia': 'Georgia, serif',
    'Times New Roman': '"Times New Roman", Times, serif',
    'Verdana': 'Verdana, Geneva, sans-serif',
  };
  
  // Check if the font family exists in our map
  if (fontMap[family]) {
    return fontMap[family];
  }
  
  // For unknown fonts, provide a reasonable fallback
  const familyLower = family.toLowerCase();
  
  if (familyLower.includes('serif') || familyLower.includes('times') || familyLower.includes('georgia')) {
    return `${family}, Georgia, serif`;
  }
  
  if (familyLower.includes('mono') || familyLower.includes('courier') || familyLower.includes('consolas')) {
    return `${family}, Consolas, monospace`;
  }
  
  if (familyLower.includes('script') || familyLower.includes('hand') || familyLower.includes('brush')) {
    return `${family}, cursive, sans-serif`;
  }
  
  // Default fallback for sans-serif fonts
  return `${family}, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
};

// Enhanced corner radius utilities with improved circular detection
export function getCornerRadius(radius: number, width?: number, height?: number): string {
  if (radius === 0) return '0';
  
  // Check if this should be a perfect circle
  if (width && height && Math.abs(width - height) < 2 && radius >= Math.min(width, height) / 2) {
    return '50%';
  }
  
  if (radius >= 50) return '50%';
  return `${radius}px`;
}

// Enhanced circular detection for icons and avatars
export function isCircularElement(node: any): boolean {
  // Add null check to prevent runtime errors
  if (!node || typeof node !== 'object') {
    return false;
  }
  
  const name = node.name?.toLowerCase() || '';
  const { width, height } = node.absoluteBoundingBox || {};
  const radius = node.cornerRadius || 0;
  
  // Check by name for specific design elements with enhanced precision
  if (name.includes('linkedin') || name.includes('instagram') || name.includes('youtube') ||
      name.includes('social') || name.includes('avatar') || name.includes('icon') ||
      name.includes('circle') || name.includes('round') || name.includes('logo') ||
      name.includes('manufacturing') || name.includes('brands') || name.includes('stores') ||
      name.includes('retail') || name.includes('integrated') || name.includes('agile') ||
      name.includes('circular') || name.includes('dot') || name.includes('top button') ||
      name.includes('shoe') || name.includes('fire') || name.includes('people') ||
      name.includes('footer') || name.includes('social icon')) {
    return true;
  }
  
  // Check by dimensions and radius for perfect circles
  if (width && height && radius) {
    return Math.abs(width - height) < 2 && radius >= Math.min(width, height) / 2;
  }
  
  // Check for square elements that should be circular (like footer icons)
  if (width && height && Math.abs(width - height) < 2) {
    if (name.includes('footer') || name.includes('social') || name.includes('icon')) {
      return true;
    }
  }
  
  return false;
}

// Enhanced text alignment utilities
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

// Enhanced layout mode utilities
export function getLayoutMode(node: any): React.CSSProperties {
  const styles: React.CSSProperties = {};
  
  if (node.layoutMode === 'HORIZONTAL') {
    styles.display = 'flex';
    styles.flexDirection = 'row';
  } else if (node.layoutMode === 'VERTICAL') {
    styles.display = 'flex';
    styles.flexDirection = 'column';
  }
  
  // Handle alignment
  if (node.primaryAxisAlignItems) {
    switch (node.primaryAxisAlignItems) {
      case 'CENTER':
        styles.justifyContent = 'center';
        break;
      case 'SPACE_BETWEEN':
        styles.justifyContent = 'space-between';
        break;
      case 'SPACE_AROUND':
        styles.justifyContent = 'space-around';
        break;
      case 'SPACE_EVENLY':
        styles.justifyContent = 'space-evenly';
        break;
      case 'MAX':
        styles.justifyContent = 'flex-end';
        break;
      default:
        styles.justifyContent = 'flex-start';
    }
  }
  
  if (node.counterAxisAlignItems) {
    switch (node.counterAxisAlignItems) {
      case 'CENTER':
        styles.alignItems = 'center';
        break;
      case 'MAX':
        styles.alignItems = 'flex-end';
        break;
      case 'BASELINE':
        styles.alignItems = 'baseline';
        break;
      default:
        styles.alignItems = 'flex-start';
    }
  }
  
  // Handle spacing
  if (node.itemSpacing) {
    styles.gap = `${node.itemSpacing}px`;
  }
  
  // Handle padding
  if (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) {
    styles.padding = `${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px`;
  }
  
  return styles;
}

// Enhanced effect utilities
export function getEffectStyles(effects: any[]): React.CSSProperties {
  if (!effects || effects.length === 0) return {};
  
  const styles: React.CSSProperties = {};
  
  effects.forEach((effect: any) => {
    if (effect.visible === false) return;
    
    switch (effect.type) {
      case 'DROP_SHADOW':
        const offsetX = effect.offset?.x || 0;
        const offsetY = effect.offset?.y || 0;
        const radius = effect.radius || 0;
        const color = effect.color ? rgbaToCss(effect.color.r, effect.color.g, effect.color.b, effect.color.a) : 'rgba(0, 0, 0, 0.5)';
        styles.boxShadow = `${offsetX}px ${offsetY}px ${radius}px ${color}`;
        break;
      case 'INNER_SHADOW':
        const innerOffsetX = effect.offset?.x || 0;
        const innerOffsetY = effect.offset?.y || 0;
        const innerRadius = effect.radius || 0;
        const innerColor = effect.color ? rgbaToCss(effect.color.r, effect.color.g, effect.color.b, effect.color.a) : 'rgba(0, 0, 0, 0.5)';
        styles.boxShadow = `inset ${innerOffsetX}px ${innerOffsetY}px ${innerRadius}px ${innerColor}`;
        break;
      case 'BACKGROUND_BLUR':
        styles.backdropFilter = `blur(${effect.radius || 0}px)`;
        break;
    }
  });
  
  return styles;
}

// Enhanced visibility utilities
export function isNodeVisible(node: any): boolean {
  if (node.visible === false) return false;
  if (node.opacity === 0) return false;
  return true;
}

// Enhanced component detection utilities
export function isFooterComponent(node: any): boolean {
  // Add null check to prevent runtime errors
  if (!node || typeof node !== 'object') {
    return false;
  }
  
  const footerKeywords = ['footer', 'social', 'linkedin', 'instagram', 'youtube', 'twitter'];
  const nodeName = node.name?.toLowerCase() || '';
  
  return footerKeywords.some(keyword => nodeName.includes(keyword));
}

// Enhanced image scale mode utilities
export function getImageScaleMode(node: any): string {
  // Add null check to prevent runtime errors
  if (!node || typeof node !== 'object') {
    return 'cover';
  }
  
  // Default to cover for most cases
  if (isFooterComponent(node)) {
    return 'cover'; // Footer icons should be cover to maintain aspect ratio
  }
  
  // Check for specific scale mode in node properties
  if (node.scaleMode) {
    switch (node.scaleMode) {
      case 'FILL':
        return 'cover';
      case 'FIT':
        return 'contain';
      case 'CROP':
        return 'cover';
      default:
        return 'cover';
    }
  }
  
  return 'cover';
}

// Enhanced responsive breakpoint utilities
export function getResponsiveBreakpoints(): Record<string, string> {
  return {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  };
}

// Enhanced Tailwind class generation utilities
export function generateTailwindClasses(node: any): string {
  const classes: string[] = [];
  
  // Add layout classes
  if (node.layoutMode === 'HORIZONTAL') {
    classes.push('flex', 'flex-row');
  } else if (node.layoutMode === 'VERTICAL') {
    classes.push('flex', 'flex-col');
  }
  
  // Add alignment classes
  if (node.primaryAxisAlignItems === 'CENTER') {
    classes.push('justify-center');
  } else if (node.primaryAxisAlignItems === 'SPACE_BETWEEN') {
    classes.push('justify-between');
  }
  
  if (node.counterAxisAlignItems === 'CENTER') {
    classes.push('items-center');
  }
  
  // Add spacing classes
  if (node.itemSpacing) {
    classes.push(`gap-${Math.round(node.itemSpacing / 4)}`);
  }
  
  // Add padding classes
  if (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) {
    const padding = Math.max(node.paddingLeft || 0, node.paddingRight || 0, node.paddingTop || 0, node.paddingBottom || 0);
    if (padding > 0) {
      classes.push(`p-${Math.round(padding / 4)}`);
    }
  }
  
  return classes.join(' ');
}

// Handle section transitions and angled cuts
export function getSectionTransition(node: any): string | null {
  if (!node || typeof node !== 'object') {
    return null;
  }
  
  const name = node.name?.toLowerCase() || '';
  
  // Determine section transition based on node name and context
  if (name.includes('angled-cut') || name.includes('diagonal') || name.includes('transition')) {
    if (name.includes('upward') || name.includes('positive')) {
      return 'angled-cut';
    }
    if (name.includes('downward') || name.includes('negative')) {
      return 'reverse-angled';
    }
    return 'diagonal';
  }
  
  // Auto-detect based on section names
  if (name.includes('manufacturing') || name.includes('brands') || name.includes('stores')) {
    // These sections typically have angled transitions
    return 'angled-cut';
  }
  
  return null;
}

// Get geometric line properties for accent lines
export function getGeometricLineProperties(node: any): {
  geometricType: string;
  angleDegrees: number;
  lineColor: string;
} {
  if (!node || typeof node !== 'object') {
    return {
      geometricType: 'vertical',
      angleDegrees: 0,
      lineColor: '#FF0A54'
    };
  }
  
  const name = node.name?.toLowerCase() || '';
  
  // Determine line properties based on node name
  if (name.includes('diagonal') || name.includes('angled')) {
    return {
      geometricType: 'diagonal',
      angleDegrees: 45,
      lineColor: '#FF0A54'
    };
  }
  
  if (name.includes('horizontal')) {
    return {
      geometricType: 'horizontal',
      angleDegrees: 0,
      lineColor: '#FF0A54'
    };
  }
  
  if (name.includes('vertical') || name.includes('accent')) {
    return {
      geometricType: 'vertical',
      angleDegrees: 0,
      lineColor: '#FF0A54'
    };
  }
  
  // Default to vertical pink accent line
  return {
    geometricType: 'vertical',
    angleDegrees: 0,
    lineColor: '#FF004F'
  };
}

// Get line-specific styling properties
export function getLineStyles(node: any): React.CSSProperties {
  if (!node || typeof node !== 'object') {
    return {
      border: '2px solid #1D1BFB',
      backgroundColor: 'transparent',
      borderRadius: '0',
    };
  }
  
  const { strokes, strokeWeight, name, transform, absoluteBoundingBox } = node;
  
  // Determine border color and width
  let borderColor = '#1D1BFB'; // Default AG Bright Blue
  let borderWidth = strokeWeight || 2;
  
  if (strokes?.[0]?.type === 'SOLID' && strokes[0].color) {
    borderColor = rgbaToCss(strokes[0].color.r, strokes[0].color.g, strokes[0].color.b, strokes[0].color.a);
  }
  
  // Check for specific color names in node name
  const nodeName = name?.toLowerCase() || '';
  if (nodeName.includes('pink') || nodeName.includes('accent')) {
    borderColor = '#FF004F';
  } else if (nodeName.includes('blue') || nodeName.includes('bright blue') || nodeName.includes('ag bright blue')) {
    borderColor = '#1D1BFB'; // AG Bright Blue
  } else if (nodeName.includes('red')) {
    borderColor = '#ff0055';
  }
  
  // Handle matrix transform
  let transformStyle = '';
  if (transform && Array.isArray(transform)) {
    transformStyle = `matrix(${transform.join(', ')})`;
  }
  
  const styles: React.CSSProperties = {
    border: `${borderWidth}px solid ${borderColor}`,
    backgroundColor: 'transparent',
    borderRadius: '0',
    position: 'absolute',
    boxSizing: 'border-box',
  };
  
  // Add transform if present
  if (transformStyle) {
    styles.transform = transformStyle;
    styles.transformOrigin = '0 0';
  }
  
  // Add dimensions if available
  if (absoluteBoundingBox) {
    styles.width = `${absoluteBoundingBox.width}px`;
    styles.height = `${absoluteBoundingBox.height}px`;
  }
  
  return styles;
}

// Check if node is an angled box
export function isAngledBox(node: any): boolean {
  if (!node || typeof node !== 'object') return false;
  
  const nodeName = node.name?.toLowerCase() || '';
  
  // Check for angled keywords in name
  if (nodeName.includes('angled') || nodeName.includes('skewed') || nodeName.includes('tilted') || 
      nodeName.includes('diagonal') || nodeName.includes('transformed')) {
    return true;
  }
  
  // Check for transform properties
  if (node.transform && Array.isArray(node.transform)) {
    return true;
  }
  
  // Check for skew properties
  if (node.skew !== undefined && node.skew !== 0) {
    return true;
  }
  
  // Check for rotation
  if (node.rotation !== undefined && node.rotation !== 0) {
    return true;
  }
  
  return false;
}
