'use client';

import React, { useState, useEffect } from 'react';
import FigmaRenderer from './FigmaRenderer';
import { loadFigmaImages, extractFileKeyFromUrl, findImageNodeIds } from '../lib/utils';

interface FigmaImageRendererProps {
  node: any;
  fileKey?: string;
  figmaToken?: string;
  showDebug?: boolean;
  isRoot?: boolean;
  onImageMapUpdate?: (imageMap: Record<string, string>) => void;
  onLoadingStatusUpdate?: (status: string) => void;
}

const FigmaImageRenderer: React.FC<FigmaImageRendererProps> = ({
  node,
  fileKey,
  figmaToken,
  showDebug = false,
  isRoot = false,
  onImageMapUpdate,
  onLoadingStatusUpdate
}) => {
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [updatedNode, setUpdatedNode] = useState<any>(node);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImages = async () => {
      if (!fileKey || !figmaToken) {
        console.warn('FigmaImageRenderer: Missing fileKey or figmaToken');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log('🔄 Starting batch image loading process...');
        console.log('📁 File Key:', fileKey);
        console.log('🔑 Token:', figmaToken ? '***' + figmaToken.slice(-4) : 'Not provided');
        
        onLoadingStatusUpdate?.('Finding image nodes...');
        
        // First, find all image nodes
        const imageNodeIds = findImageNodeIds(node);
        console.log('🖼️ Found image node IDs:', imageNodeIds);
        
        if (imageNodeIds.length === 0) {
          console.log('ℹ️ No image nodes found');
          onLoadingStatusUpdate?.('No images found');
          setImageMap({});
          setUpdatedNode(node);
          return;
        }
        
        onLoadingStatusUpdate?.(`Loading ${imageNodeIds.length} images in batches...`);
        
        const { imageMap: newImageMap, updatedNode: newUpdatedNode } = await loadFigmaImages(
          node,
          fileKey,
          figmaToken
        );

        setImageMap(newImageMap);
        setUpdatedNode(newUpdatedNode);
        onImageMapUpdate?.(newImageMap);

        if (Object.keys(newImageMap).length > 0) {
          console.log('✅ Successfully loaded Figma images:', Object.keys(newImageMap).length);
          console.log('📋 Image map keys:', Object.keys(newImageMap));
          console.log('📋 Sample image URLs:', Object.values(newImageMap).slice(0, 3));
          onLoadingStatusUpdate?.(`✅ Loaded ${Object.keys(newImageMap).length} images successfully`);
        } else {
          console.log('⚠️ No images were loaded (possible API rate limit)');
          onLoadingStatusUpdate?.('⚠️ No images loaded - check API limits');
        }
      } catch (err) {
        console.error('Error loading Figma images:', err);
        setError(err instanceof Error ? err.message : 'Failed to load images');
        onLoadingStatusUpdate?.(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadImages();
  }, [node, fileKey, figmaToken]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800 text-sm">Error loading images: {error}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute top-4 left-4 bg-blue-500 text-white text-xs px-2 py-1 rounded z-50">
          Loading images...
        </div>
      )}
      
      <FigmaRenderer
        node={updatedNode}
        showDebug={showDebug}
        isRoot={isRoot}
        imageMap={imageMap}
        fileKey={fileKey}
        figmaToken={figmaToken}
      />
      
      {/* Debug info */}
      {showDebug && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white text-xs p-3 rounded shadow-lg z-50">
          <div className="font-bold mb-2">🖼️ Image Debug Info</div>
          <div>Image Map Keys: {Object.keys(imageMap).length}</div>
          <div>Sample Keys: {Object.keys(imageMap).slice(0, 3).join(', ')}</div>
          <div>Sample URLs: {Object.values(imageMap).slice(0, 2).map(url => {
            if (!url) return 'null/undefined';
            return url.substring(0, 50) + '...';
          }).join(', ')}</div>
          <div>Valid URLs: {Object.values(imageMap).filter(url => url && url.length > 0).length}</div>
          <div>Null URLs: {Object.values(imageMap).filter(url => !url).length}</div>
        </div>
      )}
    </div>
  );
};

export default FigmaImageRenderer; 