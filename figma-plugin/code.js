// DesignStorm Exporter - Figma Plugin
// This plugin extracts all assets, images, and design data for better code generation

figma.showUI(__html__, { width: 400, height: 600 });

// Custom base64 encoder for Figma plugin environment
function bytesToBase64(bytes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i;
  const len = bytes.length;
  for (i = 0; i < len; i += 3) {
    result += chars[bytes[i] >> 2];
    result += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    result += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    result += chars[bytes[i + 2] & 63];
  }
  if ((len % 3) === 2) {
    result = result.substring(0, result.length - 1) + '=';
  } else if (len % 3 === 1) {
    result = result.substring(0, result.length - 2) + '==';
  }
  return result;
}

// Main plugin functionality
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'export-design') {
    try {
      const exportData = await exportCompleteDesign();
      figma.ui.postMessage({
        type: 'export-complete',
        data: exportData
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'export-error',
        error: error.message
      });
    }
  }
  
  if (msg.type === 'export-selection') {
    try {
      const exportData = await exportSelectedNodes();
      figma.ui.postMessage({
        type: 'export-complete',
        data: exportData
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'export-error',
        error: error.message
      });
    }
  }
};

// Export complete design with all assets and images
async function exportCompleteDesign() {
  try {
    // Send initial progress
    figma.ui.postMessage({
      type: 'export-progress',
      progress: 5,
      message: 'Starting export...'
    });

    // Load all pages first to prevent the error
    figma.ui.postMessage({
      type: 'export-progress',
      progress: 10,
      message: 'Loading pages...'
    });
    await figma.loadAllPagesAsync();

    const designData = {
      document: figma.root,
      assets: [],
      images: [],
      fonts: [],
      styles: [],
      components: [],
      imageMap: {},
      metadata: {
        name: figma.root.name,
        version: figma.root.version,
        lastModified: new Date().toISOString(),
        pluginVersion: '1.0.0',
        exportedBy: 'DesignStorm Plugin'
      }
    };

    // Extract all pages and their content (lightweight)
    figma.ui.postMessage({
      type: 'export-progress',
      progress: 20,
      message: 'Extracting pages...'
    });
    designData.pages = await extractPages(figma.root.children);
    
    // Extract all assets (lightweight)
    figma.ui.postMessage({
      type: 'export-progress',
      progress: 30,
      message: 'Extracting assets...'
    });
    designData.assets = await extractAllAssets();
    
    // Extract all images with actual image data (heavy operation)
    figma.ui.postMessage({
      type: 'export-progress',
      progress: 50,
      message: 'Extracting images...'
    });
    designData.images = await extractAllImages();
    
    // Build image map for easy access (heavy operation)
    figma.ui.postMessage({
      type: 'export-progress',
      progress: 70,
      message: 'Building image map...'
    });
    designData.imageMap = await buildImageMap(designData.images);
    
    // Extract all fonts (lightweight)
    figma.ui.postMessage({
      type: 'export-progress',
      progress: 80,
      message: 'Extracting fonts...'
    });
    designData.fonts = await extractAllFonts();
    
    // Extract all styles (lightweight)
    figma.ui.postMessage({
      type: 'export-progress',
      progress: 85,
      message: 'Extracting styles...'
    });
    designData.styles = await extractAllStyles();
    
    // Extract all components (lightweight)
    figma.ui.postMessage({
      type: 'export-progress',
      progress: 90,
      message: 'Extracting components...'
    });
    designData.components = await extractAllComponents();
    
    figma.ui.postMessage({
      type: 'export-progress',
      progress: 95,
      message: 'Finalizing export...'
    });
    
    return designData;
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error(`Export failed: ${error.message}`);
  }
}

// Export selected nodes
async function exportSelectedNodes() {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    throw new Error('No nodes selected. Please select one or more elements.');
  }
  
  console.log(`🎯 Exporting ${selection.length} selected nodes:`, selection.map(n => n.name));
  
  // Send initial progress
  figma.ui.postMessage({
    type: 'export-progress',
    progress: 10,
    message: 'Starting selection export...'
  });
  
  // Load current page to prevent errors
  figma.ui.postMessage({
    type: 'export-progress',
    progress: 15,
    message: 'Loading page data...'
  });
  await figma.currentPage.loadAsync();
  
  const exportData = {
    selection: [],
    assets: [],
    images: [],
    fonts: [],
    imageMap: {},
    metadata: {
      selectionCount: selection.length,
      exportedAt: new Date().toISOString(),
      pluginVersion: '1.0.0',
      exportedBy: 'DesignStorm Plugin'
    }
  };
  
  // Extract selected nodes with full hierarchy
  figma.ui.postMessage({
    type: 'export-progress',
    progress: 30,
    message: 'Extracting selected nodes...'
  });
  for (const node of selection) {
    const nodeData = await extractNodeData(node);
    exportData.selection.push(nodeData);
  }
  
  // Extract assets from selection
  figma.ui.postMessage({
    type: 'export-progress',
    progress: 50,
    message: 'Extracting assets...'
  });
  exportData.assets = await extractAssetsFromNodes(selection);
  
  // Extract images from selection
  figma.ui.postMessage({
    type: 'export-progress',
    progress: 70,
    message: 'Extracting images...'
  });
  exportData.images = await extractImagesFromNodes(selection);
  
  // Extract fonts from selection
  figma.ui.postMessage({
    type: 'export-progress',
    progress: 80,
    message: 'Extracting fonts...'
  });
  exportData.fonts = await extractFontsFromNodes(selection);
  
  // Build image map for selected nodes
  figma.ui.postMessage({
    type: 'export-progress',
    progress: 90,
    message: 'Building image map...'
  });
  exportData.imageMap = await buildImageMap(exportData.images);
  
  console.log(`✅ Exported ${exportData.images.length} images from selection`);
  
  return exportData;
}

// Extract pages and their content (simplified)
async function extractPages(pages) {
  const extractedPages = [];
  
  for (const page of pages) {
    const pageData = {
      id: page.id,
      name: page.name,
      type: page.type,
      children: []
    };
    
    // Only extract basic page info to prevent freezing
    // Skip deep children extraction for now
    if (page.children && page.children.length > 0) {
      pageData.children = page.children.map(child => ({
        id: child.id,
        name: child.name,
        type: child.type,
        // Don't extract deep children to prevent freezing
        hasChildren: child.children && child.children.length > 0
      }));
    }
    
    extractedPages.push(pageData);
  }
  
  return extractedPages;
}

// Extract node children recursively
async function extractNodeChildren(children) {
  const extractedChildren = [];
  
  for (const child of children) {
    const childData = await extractNodeData(child);
    extractedChildren.push(childData);
  }
  
  return extractedChildren;
}

// Extract complete node data (simplified to prevent freezing)
async function extractNodeData(node) {
  const nodeData = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
    locked: node.locked,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    rotation: node.rotation,
    opacity: node.opacity,
    blendMode: node.blendMode,
    effects: [],
    fills: [],
    strokes: [],
    strokeWeight: node.strokeWeight,
    strokeAlign: node.strokeAlign,
    cornerRadius: node.cornerRadius,
    characters: node.characters,
    fontSize: node.fontSize,
    fontName: node.fontName,
    textAlignHorizontal: node.textAlignHorizontal,
    textAlignVertical: node.textAlignVertical,
    letterSpacing: node.letterSpacing,
    lineHeight: node.lineHeight,
    textCase: node.textCase,
    textDecoration: node.textDecoration,
    layoutMode: node.layoutMode,
    primaryAxisSizingMode: node.primaryAxisSizingMode,
    counterAxisSizingMode: node.counterAxisSizingMode,
    primaryAxisAlignItems: node.primaryAxisAlignItems,
    counterAxisAlignItems: node.counterAxisAlignItems,
    paddingLeft: node.paddingLeft,
    paddingRight: node.paddingRight,
    paddingTop: node.paddingTop,
    paddingBottom: node.paddingBottom,
    itemSpacing: node.itemSpacing,
    children: []
  };
  
  // Extract effects (shadows, blurs, etc.) - lightweight
  if (node.effects) {
    nodeData.effects = node.effects.map(effect => ({
      type: effect.type,
      visible: effect.visible,
      radius: effect.radius,
      color: effect.color,
      offset: effect.offset,
      spread: effect.spread,
      blendMode: effect.blendMode
    }));
  }
  
  // Extract fills (colors, gradients, images) - lightweight
  if (node.fills) {
    nodeData.fills = await extractFills(node.fills);
  }
  
  // Extract strokes - lightweight
  if (node.strokes) {
    nodeData.strokes = node.strokes.map(stroke => ({
      type: stroke.type,
      visible: stroke.visible,
      color: stroke.color,
      opacity: stroke.opacity
    }));
  }
  
  // Extract children if node has them (limited depth to prevent freezing)
  if ('children' in node && node.children && node.children.length > 0) {
    // Only extract first level children to prevent deep recursion
    nodeData.children = node.children.slice(0, 10).map(child => ({
      id: child.id,
      name: child.name,
      type: child.type,
      hasChildren: child.children && child.children.length > 0
    }));
  }
  
  return nodeData;
}

// Extract fills including images
async function extractFills(fills) {
  const extractedFills = [];
  
  for (const fill of fills) {
    const extractedFill = {
      type: fill.type,
      visible: fill.visible,
      opacity: fill.opacity,
      blendMode: fill.blendMode
    };
    
    if (fill.type === 'SOLID') {
      extractedFill.color = fill.color;
    } else if (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL' || fill.type === 'GRADIENT_ANGULAR' || fill.type === 'GRADIENT_DIAMOND') {
      extractedFill.gradientTransform = fill.gradientTransform;
      extractedFill.gradientStops = fill.gradientStops;
    } else if (fill.type === 'IMAGE') {
      // Extract image data
      const imageData = await extractImageData(fill);
      extractedFill.image = imageData;
      
      // Also add imageRef for compatibility with existing renderer
      if (imageData.hash && imageData.imageBytes) {
        extractedFill.imageRef = imageData.hash;
        extractedFill.imageUrl = `data:image/png;base64,${bytesToBase64(new Uint8Array(imageData.imageBytes))}`;
      }
    }
    
    extractedFills.push(extractedFill);
  }
  
  return extractedFills;
}

// Extract image data
async function extractImageData(fill) {
  const imageData = {
    hash: fill.imageHash,
    transform: fill.imageTransform,
    scaleMode: fill.scaleMode,
    scalingFactor: fill.scalingFactor,
    imageBytes: null
  };
  
  try {
    // Get the actual image bytes
    const image = figma.getImageByHash(fill.imageHash);
    if (image) {
      imageData.imageBytes = await image.getBytesAsync();
      imageData.width = image.width;
      imageData.height = image.height;
    }
  } catch (error) {
    console.warn('Could not extract image bytes:', error);
  }
  
  return imageData;
}

// Extract all assets from the document
async function extractAllAssets() {
  const assets = [];
  
  try {
    // Get all image assets
    const imageAssets = figma.getLocalImageAssets();
    
    // Check if imageAssets is iterable
    if (imageAssets && Array.isArray(imageAssets)) {
      for (const asset of imageAssets) {
        try {
          // Skip heavy byte extraction to prevent freezing
          assets.push({
            id: asset.id,
            name: asset.name,
            type: 'IMAGE',
            width: asset.width,
            height: asset.height,
            hasBytes: false // Don't extract bytes to prevent freezing
          });
        } catch (error) {
          console.warn('Could not extract asset:', asset.name, error);
        }
      }
    } else {
      console.log('No image assets found or assets not iterable');
    }
  } catch (error) {
    console.warn('Error extracting assets:', error);
  }
  
  return assets;
}

// Extract all images from the document (simplified version)
async function extractAllImages() {
  const images = [];
  
  // Traverse all nodes to find images
  const allNodes = getAllNodes(figma.root);
  
  console.log(`🔍 Scanning ${allNodes.length} nodes for images...`);
  
  // Limit the number of images to prevent freezing
  let imageCount = 0;
  const maxImages = 50; // Limit to prevent UI freezing
  
  for (const node of allNodes) {
    if (imageCount >= maxImages) {
      console.log(`⚠️ Reached maximum image limit (${maxImages}), stopping extraction`);
      break;
    }
    
    // Check fills for images
    if (node.fills) {
      for (const fill of node.fills) {
        if (fill.type === 'IMAGE' && fill.imageHash && imageCount < maxImages) {
          try {
            const image = figma.getImageByHash(fill.imageHash);
            if (image) {
              // For now, just store metadata without bytes to prevent freezing
              images.push({
                hash: fill.imageHash,
                nodeId: node.id,
                nodeName: node.name,
                width: image.width,
                height: image.height,
                type: 'fill',
                hasBytes: false // Flag to indicate we don't have bytes
              });
              imageCount++;
              console.log(`📸 Found image in fills: ${node.name} (${image.width}x${image.height})`);
            }
          } catch (error) {
            console.warn('Could not extract image from fills:', fill.imageHash, error);
          }
        }
      }
    }
    
    // Check if node itself is an image (like imported images)
    if (node.type === 'RECTANGLE' && node.name.toLowerCase().includes('image') && imageCount < maxImages) {
      try {
        const image = figma.getImageByHash(node.id);
        if (image) {
          images.push({
            hash: node.id,
            nodeId: node.id,
            nodeName: node.name,
            width: image.width,
            height: image.height,
            type: 'rectangle',
            hasBytes: false // Flag to indicate we don't have bytes
          });
          imageCount++;
          console.log(`📸 Found image rectangle: ${node.name} (${image.width}x${image.height})`);
        }
      } catch (error) {
        // Not all rectangles are images, so this is expected
      }
    }
  }
  
  console.log(`✅ Extracted ${images.length} images total (metadata only)`);
  return images;
}

// Build image map for easy access
async function buildImageMap(images) {
  const imageMap = {};
  
  for (const image of images) {
    if (image.nodeId) {
      // Store image metadata for debugging (without bytes to prevent freezing)
      imageMap[`${image.nodeId}_meta`] = {
        hash: image.hash,
        nodeName: image.nodeName,
        width: image.width,
        height: image.height,
        hasBytes: image.hasBytes || false
      };
      
      // For now, just store a placeholder for the image URL
      // This will be filled in later when needed
      imageMap[image.nodeId] = `placeholder:${image.hash}`;
    }
  }
  
  return imageMap;
}

// Extract all fonts used in the document
async function extractAllFonts() {
  const fonts = new Set();
  
  try {
    // Traverse all nodes to find text nodes
    const allNodes = getAllNodes(figma.root);
    
    if (allNodes && Array.isArray(allNodes)) {
      for (const node of allNodes) {
        try {
          if (node && node.type === 'TEXT' && node.fontName) {
            fonts.add(JSON.stringify(node.fontName));
          }
        } catch (error) {
          console.warn('Error processing node for fonts:', error);
        }
      }
    }
  } catch (error) {
    console.warn('Error extracting fonts:', error);
  }
  
  return Array.from(fonts).map(font => {
    try {
      return JSON.parse(font);
    } catch (error) {
      console.warn('Error parsing font:', error);
      return null;
    }
  }).filter(font => font !== null);
}

// Extract all styles from the document
async function extractAllStyles() {
  const styles = {
    paint: [],
    text: [],
    effect: [],
    grid: []
  };
  
  try {
    // Get all style types with proper error handling
    const paintStyles = figma.getLocalPaintStyles();
    if (paintStyles && Array.isArray(paintStyles)) {
      styles.paint = paintStyles.map(style => ({
        id: style.id,
        name: style.name,
        description: style.description
      }));
    }
    
    const textStyles = figma.getLocalTextStyles();
    if (textStyles && Array.isArray(textStyles)) {
      styles.text = textStyles.map(style => ({
        id: style.id,
        name: style.name,
        description: style.description
      }));
    }
    
    const effectStyles = figma.getLocalEffectStyles();
    if (effectStyles && Array.isArray(effectStyles)) {
      styles.effect = effectStyles.map(style => ({
        id: style.id,
        name: style.name,
        description: style.description
      }));
    }
    
    const gridStyles = figma.getLocalGridStyles();
    if (gridStyles && Array.isArray(gridStyles)) {
      styles.grid = gridStyles.map(style => ({
        id: style.id,
        name: style.name,
        description: style.description
      }));
    }
  } catch (error) {
    console.warn('Error extracting styles:', error);
  }
  
  return styles;
}

// Extract all components from the document
async function extractAllComponents() {
  const components = [];
  
  try {
    // Get all component sets
    const componentSets = figma.getLocalComponentSets();
    if (componentSets && Array.isArray(componentSets)) {
      for (const componentSet of componentSets) {
        try {
          components.push({
            id: componentSet.id,
            name: componentSet.name,
            description: componentSet.description,
            type: 'COMPONENT_SET',
            children: componentSet.children ? componentSet.children.map(child => ({
              id: child.id,
              name: child.name,
              description: child.description
            })) : []
          });
        } catch (error) {
          console.warn('Could not extract component set:', componentSet.name, error);
        }
      }
    }
    
    // Get all individual components
    const individualComponents = figma.getLocalComponents();
    if (individualComponents && Array.isArray(individualComponents)) {
      for (const component of individualComponents) {
        try {
          components.push({
            id: component.id,
            name: component.name,
            description: component.description,
            type: 'COMPONENT'
          });
        } catch (error) {
          console.warn('Could not extract component:', component.name, error);
        }
      }
    }
  } catch (error) {
    console.warn('Error extracting components:', error);
  }
  
  return components;
}

// Extract assets from specific nodes
async function extractAssetsFromNodes(nodes) {
  const assets = [];
  
  for (const node of nodes) {
    const nodeAssets = await extractNodeAssets(node);
    assets.push(...nodeAssets);
  }
  
  return assets;
}

// Extract images from specific nodes
async function extractImagesFromNodes(nodes) {
  const images = [];
  
  for (const node of nodes) {
    const nodeImages = await extractNodeImages(node);
    images.push(...nodeImages);
  }
  
  return images;
}

// Extract fonts from specific nodes
async function extractFontsFromNodes(nodes) {
  const fonts = new Set();
  
  for (const node of nodes) {
    const nodeFonts = await extractNodeFonts(node);
    nodeFonts.forEach(font => fonts.add(JSON.stringify(font)));
  }
  
  return Array.from(fonts).map(font => JSON.parse(font));
}

// Extract assets from a single node
async function extractNodeAssets(node) {
  const assets = [];
  
  if (node.fills) {
    for (const fill of node.fills) {
      if (fill.type === 'IMAGE' && fill.imageHash) {
        try {
          const image = figma.getImageByHash(fill.imageHash);
          if (image) {
            const imageBytes = await image.getBytesAsync();
            assets.push({
              hash: fill.imageHash,
              nodeId: node.id,
              nodeName: node.name,
              bytes: imageBytes,
              width: image.width,
              height: image.height
            });
          }
        } catch (error) {
          console.warn('Could not extract image asset:', error);
        }
      }
    }
  }
  
  // Recursively check children
  if ('children' in node && node.children) {
    for (const child of node.children) {
      const childAssets = await extractNodeAssets(child);
      assets.push(...childAssets);
    }
  }
  
  return assets;
}

// Extract images from a single node (simplified version)
async function extractNodeImages(node) {
  const images = [];
  
  // Check fills for images
  if (node.fills) {
    for (const fill of node.fills) {
      if (fill.type === 'IMAGE' && fill.imageHash) {
        try {
          const image = figma.getImageByHash(fill.imageHash);
          if (image) {
            // Store metadata only to prevent freezing
            images.push({
              hash: fill.imageHash,
              nodeId: node.id,
              nodeName: node.name,
              width: image.width,
              height: image.height,
              type: 'fill',
              hasBytes: false
            });
            console.log(`📸 Found image in node: ${node.name} (${image.width}x${image.height})`);
          }
        } catch (error) {
          console.warn('Could not extract image from node:', node.name, error);
        }
      }
    }
  }
  
  // Check if node itself is an image
  if (node.type === 'RECTANGLE' && (node.name.toLowerCase().includes('image') || node.name.toLowerCase().includes('photo'))) {
    try {
      const image = figma.getImageByHash(node.id);
      if (image) {
        images.push({
          hash: node.id,
          nodeId: node.id,
          nodeName: node.name,
          width: image.width,
          height: image.height,
          type: 'rectangle',
          hasBytes: false
        });
        console.log(`📸 Found image rectangle: ${node.name} (${image.width}x${image.height})`);
      }
    } catch (error) {
      // Not all rectangles are images, so this is expected
    }
  }
  
  // Recursively check children
  if ('children' in node && node.children) {
    for (const child of node.children) {
      const childImages = await extractNodeImages(child);
      images.push(...childImages);
    }
  }
  
  return images;
}

// Extract fonts from a single node
async function extractNodeFonts(node) {
  const fonts = [];
  
  if (node.type === 'TEXT' && node.fontName) {
    fonts.push(node.fontName);
  }
  
  // Recursively check children
  if ('children' in node && node.children) {
    for (const child of node.children) {
      const childFonts = await extractNodeFonts(child);
      fonts.push(...childFonts);
    }
  }
  
  return fonts;
}

// Helper function to get all nodes recursively
function getAllNodes(node) {
  const nodes = [node];
  
  if ('children' in node && node.children) {
    for (const child of node.children) {
      nodes.push(...getAllNodes(child));
    }
  }
  
  return nodes;
} 