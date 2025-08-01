import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Figma API utilities
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
      const url = `https://api.figma.com/v1/images/${fileKey}?ids=${idsParam}&format=png`;
      
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
