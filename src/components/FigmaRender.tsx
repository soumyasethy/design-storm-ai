'use client';

import React, { useState, useEffect } from 'react';
// import FigmaImageRenderer from './FigmaImageRenderer';
import DynamicFigmaRenderer from './figma/DynamicFigmaRenderer';
import { loadFigmaImages } from '@/lib/utils';

interface FigmaRenderProps {
  data: any;
  frameName?: string;
  fileKey?: string;
  figmaToken?: string;
  showDebug?: boolean;
  className?: string;
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
    textAlignVertical?: string;
    lineHeight?: number;
    letterSpacing?: number;
  };
  opacity?: number;
  visible?: boolean;
  isMask?: boolean;
  maskType?: string;
  effects?: Array<{
    type: string;
    visible?: boolean;
    radius?: number;
    color?: { r: number; g: number; b: number; a?: number };
  }>;
}

const FigmaRender: React.FC<FigmaRenderProps> = ({ 
  data, 
  frameName = "Home", 
  fileKey,
  figmaToken,
  showDebug = false,
  className = ""
}) => {
  const [frameNode, setFrameNode] = useState<FigmaNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [imageLoadingStatus, setImageLoadingStatus] = useState<string>('Not started');

  // Parse Figma data and find the specified frame
  const parseFigmaData = (figmaData: any, targetFrameName?: string) => {
    console.log('🔍 Parsing Figma data for frame:', targetFrameName);
    
    let documentNode: FigmaNode | null = null;
    
    // Handle different JSON structures
    if (figmaData.document) {
      // Direct document structure
      documentNode = figmaData.document;
      console.log('📄 Found direct document:', documentNode?.name, documentNode?.type);
    } else if (figmaData.nodes) {
      // Standard Figma export structure
      const nodeKeys = Object.keys(figmaData.nodes);
      console.log('🔑 Node keys:', nodeKeys);
      
      let foundNode = null;
      for (const key of nodeKeys) {
        const node = figmaData.nodes[key];
        if (node.document) {
          console.log('🔍 Checking node:', key, node.document.name, node.document.type);
          
          // If frameName is specified, look for exact match
          if (targetFrameName && node.document.name === targetFrameName) {
            foundNode = node.document;
            console.log('✅ Found target frame:', node.document.name);
            break;
          }
          
          // Look for PAGE, FRAME, or CANVAS type nodes
          if (node.document.type === 'PAGE' || node.document.type === 'CANVAS' || node.document.type === 'FRAME') {
            foundNode = node.document;
            console.log('✅ Found main page/canvas:', node.document.name);
            
            // If no specific frame name requested, use this one
            if (!targetFrameName) {
              break;
            }
          }
        }
      }
      documentNode = foundNode;
      console.log('📄 Selected document node:', documentNode);
    }
    
    if (!documentNode) {
      throw new Error(`No valid document node found for frame: ${targetFrameName || 'default'}`);
    }
    
    return documentNode;
  };

  // Load and process Figma data
  useEffect(() => {
    const loadFigmaData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('📂 Loading Figma data:', data);
        
        // Parse the Figma data
        const mainFrame = parseFigmaData(data, frameName);
        
        console.log('🎯 Main frame found:', mainFrame.name, mainFrame.type);
        console.log('📐 Frame bounds:', mainFrame.absoluteBoundingBox);
        console.log('👶 Children count:', mainFrame.children?.length);
        
        setFrameNode(mainFrame);
        
        // Load images if we have a valid frame and credentials
        if (mainFrame && fileKey && figmaToken) {
          console.log('🖼️ Starting image loading process...');
          setImageLoadingStatus('Loading images...');
          
          try {
            const { imageMap: loadedImages } = await loadFigmaImages(mainFrame, fileKey, figmaToken);
            console.log('✅ Images loaded:', Object.keys(loadedImages).length);
            setImageMap(loadedImages);
            setImageLoadingStatus(`Loaded ${Object.keys(loadedImages).length} images`);
          } catch (imageError) {
            console.error('❌ Image loading failed:', imageError);
            setImageLoadingStatus('Image loading failed');
          }
        }
        
      } catch (err) {
        console.error('❌ Error loading Figma data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (data) {
      loadFigmaData();
    }
  }, [data, frameName, fileKey, figmaToken]);

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading Figma design...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-50 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 text-2xl mb-2">⚠️</div>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!frameNode) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 ${className}`}>
        <div className="text-center">
          <div className="text-gray-500 text-2xl mb-2">📄</div>
          <p className="text-gray-600 text-sm">No frame data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Debug container outline */}
      {showDebug && (
        <div 
          className="absolute inset-0 border-2 border-red-500 border-dashed pointer-events-none z-10"
          style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(239, 68, 68, 0.1) 10px, rgba(239, 68, 68, 0.1) 20px)'
          }}
        >
          <div className="absolute top-1 left-1 bg-red-500 text-white text-xs px-1 py-0.5 rounded">
            Container
          </div>
        </div>
      )}
      
      {/* Render the Figma content with dynamic renderer */}
      <DynamicFigmaRenderer
        node={frameNode}
        fileKey={fileKey}
        figmaToken={figmaToken}
        showDebug={showDebug}
        isRoot={true}
        imageMap={imageMap}
        devMode={false}
      />
      
      {/* Debug overlay */}
      {showDebug && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-90 text-white text-xs p-2 rounded shadow-lg z-50">
          <div className="font-bold mb-1">🔍 {frameNode.name}</div>
          <div>Type: {frameNode.type}</div>
          <div>Children: {frameNode.children?.length || 0}</div>
          <div className="text-green-300 text-xs">
            {imageLoadingStatus}
          </div>
          <div className="text-xs">
            Images: {Object.keys(imageMap).length}
          </div>
        </div>
      )}
    </div>
  );
};

export default FigmaRender; 