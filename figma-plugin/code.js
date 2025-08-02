// DesignStorm Exporter - Figma Plugin
// This plugin extracts all assets, images, and design data for better code generation

figma.showUI(__html__, { width: 400, height: 600 });

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

  // Extract all pages and their content
  designData.pages = await extractPages(figma.root.children);
  
  // Extract all assets
  designData.assets = await extractAllAssets();
  
  // Extract all images with actual image data
  designData.images = await extractAllImages();
  
  // Build image map for easy access
  designData.imageMap = await buildImageMap(designData.images);
  
  // Extract all fonts
  designData.fonts = await extractAllFonts();
  
  // Extract all styles
  designData.styles = await extractAllStyles();
  
  // Extract all components
  designData.components = await extractAllComponents();
  
  return designData;
}

// Export selected nodes
async function exportSelectedNodes() {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    throw new Error('No nodes selected. Please select one or more elements.');
  }
  
  const exportData = {
    selection: [],
    assets: [],
    images: [],
    fonts: [],
    metadata: {
      selectionCount: selection.length,
      exportedAt: new Date().toISOString(),
      pluginVersion: '1.0.0'
    }
  };
  
  // Extract selected nodes
  for (const node of selection) {
    const nodeData = await extractNodeData(node);
    exportData.selection.push(nodeData);
  }
  
  // Extract assets from selection
  exportData.assets = await extractAssetsFromNodes(selection);
  exportData.images = await extractImagesFromNodes(selection);
  exportData.fonts = await extractFontsFromNodes(selection);
  
  return exportData;
}

// Extract pages and their content
async function extractPages(pages) {
  const extractedPages = [];
  
  for (const page of pages) {
    const pageData = {
      id: page.id,
      name: page.name,
      type: page.type,
      children: []
    };
    
    // Extract all children recursively
    pageData.children = await extractNodeChildren(page.children);
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

// Extract complete node data
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
  
  // Extract effects (shadows, blurs, etc.)
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
  
  // Extract fills (colors, gradients, images)
  if (node.fills) {
    nodeData.fills = await extractFills(node.fills);
  }
  
  // Extract strokes
  if (node.strokes) {
    nodeData.strokes = node.strokes.map(stroke => ({
      type: stroke.type,
      visible: stroke.visible,
      color: stroke.color,
      opacity: stroke.opacity
    }));
  }
  
  // Extract children if node has them
  if ('children' in node && node.children) {
    nodeData.children = await extractNodeChildren(node.children);
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
  
  // Get all image assets
  const imageAssets = figma.getLocalImageAssets();
  for (const asset of imageAssets) {
    try {
      const imageBytes = await asset.getBytesAsync();
      assets.push({
        id: asset.id,
        name: asset.name,
        type: 'IMAGE',
        bytes: imageBytes,
        width: asset.width,
        height: asset.height
      });
    } catch (error) {
      console.warn('Could not extract asset:', asset.name, error);
    }
  }
  
  return assets;
}

// Extract all images from the document
async function extractAllImages() {
  const images = [];
  
  // Traverse all nodes to find images
  const allNodes = getAllNodes(figma.root);
  
  for (const node of allNodes) {
    if (node.fills) {
      for (const fill of node.fills) {
        if (fill.type === 'IMAGE' && fill.imageHash) {
          try {
            const image = figma.getImageByHash(fill.imageHash);
            if (image) {
              const imageBytes = await image.getBytesAsync();
              images.push({
                hash: fill.imageHash,
                nodeId: node.id,
                nodeName: node.name,
                bytes: imageBytes,
                width: image.width,
                height: image.height
              });
            }
          } catch (error) {
            console.warn('Could not extract image:', fill.imageHash, error);
          }
        }
      }
    }
  }
  
  return images;
}

// Build image map for easy access
async function buildImageMap(images) {
  const imageMap = {};
  
  for (const image of images) {
    if (image.nodeId && image.bytes) {
      // Convert bytes to base64 for easy transfer
      const base64 = btoa(String.fromCharCode(...new Uint8Array(image.bytes)));
      imageMap[image.nodeId] = `data:image/png;base64,${base64}`;
    }
  }
  
  return imageMap;
}

// Extract all fonts used in the document
async function extractAllFonts() {
  const fonts = new Set();
  
  // Traverse all nodes to find text nodes
  const allNodes = getAllNodes(figma.root);
  
  for (const node of allNodes) {
    if (node.type === 'TEXT' && node.fontName) {
      fonts.add(JSON.stringify(node.fontName));
    }
  }
  
  return Array.from(fonts).map(font => JSON.parse(font));
}

// Extract all styles from the document
async function extractAllStyles() {
  const styles = {
    paint: figma.getLocalPaintStyles(),
    text: figma.getLocalTextStyles(),
    effect: figma.getLocalEffectStyles(),
    grid: figma.getLocalGridStyles()
  };
  
  return styles;
}

// Extract all components from the document
async function extractAllComponents() {
  const components = [];
  
  // Get all component sets
  const componentSets = figma.getLocalComponentSets();
  for (const componentSet of componentSets) {
    components.push({
      id: componentSet.id,
      name: componentSet.name,
      description: componentSet.description,
      type: 'COMPONENT_SET',
      children: componentSet.children.map(child => ({
        id: child.id,
        name: child.name,
        description: child.description
      }))
    });
  }
  
  // Get all individual components
  const individualComponents = figma.getLocalComponents();
  for (const component of individualComponents) {
    components.push({
      id: component.id,
      name: component.name,
      description: component.description,
      type: 'COMPONENT'
    });
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

// Extract images from a single node
async function extractNodeImages(node) {
  const images = [];
  
  if (node.fills) {
    for (const fill of node.fills) {
      if (fill.type === 'IMAGE' && fill.imageHash) {
        try {
          const image = figma.getImageByHash(fill.imageHash);
          if (image) {
            const imageBytes = await image.getBytesAsync();
            images.push({
              hash: fill.imageHash,
              nodeId: node.id,
              nodeName: node.name,
              bytes: imageBytes,
              width: image.width,
              height: image.height
            });
          }
        } catch (error) {
          console.warn('Could not extract image:', error);
        }
      }
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