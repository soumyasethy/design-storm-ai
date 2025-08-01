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
  // Extract file key from Figma URL patterns
  const patterns = [
    /figma\.com\/file\/([a-zA-Z0-9]+)/,
    /figma\.com\/proto\/([a-zA-Z0-9]+)/,
    /figma\.com\/embed\?embed_host=share&url=.*?file%2F([a-zA-Z0-9]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
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

// Enhanced color utilities
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

// Enhanced typography utilities
export function getFontFamily(family: string): string {
  if (!family) return 'inherit';
  
  const fontMap: Record<string, string> = {
    'Inter': 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'Roboto': 'Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Open Sans': '"Open Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Lato': 'Lato, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Poppins': 'Poppins, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Montserrat': 'Montserrat, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Source Sans Pro': '"Source Sans Pro", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Raleway': 'Raleway, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Ubuntu': 'Ubuntu, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Nunito': 'Nunito, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Arial': 'Arial, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Helvetica': 'Helvetica, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Times New Roman': '"Times New Roman", Times, serif',
    'Georgia': 'Georgia, serif',
    'Verdana': 'Verdana, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  };
  
  return fontMap[family] || `${family}, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
}

// Enhanced corner radius utilities
export function getCornerRadius(radius: number): string {
  if (radius === 0) return '0';
  if (radius >= 50) return '50%';
  return `${radius}px`;
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
  const footerKeywords = ['footer', 'social', 'linkedin', 'instagram', 'youtube', 'twitter'];
  const nodeName = node.name?.toLowerCase() || '';
  
  return footerKeywords.some(keyword => nodeName.includes(keyword));
}

// Enhanced image scale mode utilities
export function getImageScaleMode(node: any): string {
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
