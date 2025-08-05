'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import SimpleFigmaRenderer from '@/components/SimpleFigmaRenderer';

import { extractFileKeyFromUrl, loadFigmaAssetsFromNodes } from '@/lib/utils';
import { isPluginExport, parsePluginData, figmaPlugin } from '@/lib/figma-plugin';

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

export default function OutputPage() {
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
  const [renderMode, setRenderMode] = useState<'simple' | 'enhanced'>('enhanced');
  const [showLayoutDebug, setShowLayoutDebug] = useState(false);
  const [dataSource, setDataSource] = useState<string>('');
  const [overflowHidden, setOverflowHidden] = useState<boolean>(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState<number>(0);
  const [devMode, setDevMode] = useState<boolean>(true);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [enableScaling, setEnableScaling] = useState<boolean>(true);
  const [maxScale, setMaxScale] = useState<number>(1.2);

  // Function to load assets (images and SVGs) from Figma API
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
        setAssetLoadingStatus('ℹ️ No assets found in design');
        setAssetLoadingProgress({ total: 0, loaded: 0, isLoading: false });
        console.log('ℹ️ No assets found in design');
      }
    } catch (error) {
      console.error('❌ Error loading assets from Figma API:', error);
      setAssetLoadingStatus(`❌ Failed to load assets: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAssetLoadingProgress({ total: 0, loaded: 0, isLoading: false });
    }
  };
  const [transformOrigin, setTransformOrigin] = useState<string>('center top');

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
  const clearAllData = () => {
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
    
    // Clear ALL localStorage data completely
    localStorage.clear();
    
    console.log('🧹 All data cleared including localStorage');
    
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
            setTimeout(() => {
              parseFigmaData(pluginData);
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
          setTimeout(() => {
            parseFigmaData(jsonData);
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
  const parseFigmaData = (data: FigmaData) => {
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

      // Log the structure for debugging
      console.log('🎨 Document structure:', {
        name: documentNode.name,
        type: documentNode.type,
        childrenCount: documentNode.children?.length || 0,
        children: documentNode.children?.map(child => ({
          name: child.name,
          type: child.type,
          id: child.id,
          hasBoundingBox: !!child.absoluteBoundingBox,
          childrenCount: child.children?.length || 0
        }))
      });

      // Force re-render by setting frame node and incrementing version
      setFrameNode(null); // Clear first
      setDataVersion(prev => prev + 1); // Increment version to force re-render
      setTimeout(() => {
        setFrameNode(documentNode);
        console.log('✅ Frame node updated, triggering re-render');
      }, 0);
      
    } catch (err) {
      console.error('❌ Error parsing Figma data:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse Figma data');
    }
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
          
          // Update localStorage with new data
          localStorage.setItem('figmaData', JSON.stringify(figmaData));
          console.log('✅ Updated localStorage with new data from URL');
          
          console.log(`✅ Figma data loaded successfully from ${dataSource}`);
          setDataSource(dataSource);
          setFigmaData(figmaData);
          parseFigmaData(figmaData);
          
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
          // No URL data, try to load from localStorage (from upload page)
          const storedData = localStorage.getItem('figmaData');
          if (storedData) {
            try {
              const figmaData = JSON.parse(storedData);
              console.log('📁 Loading data from localStorage (upload page)');
              
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
              parseFigmaData(figmaData);
              
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
      {/* Compact Single-Line Header with All Tools */}
      <div className="bg-white border-b border-gray-200 py-2 sticky top-0 z-50 shadow-sm" style={{ paddingLeft: '20px', paddingRight: '20px' }}>
        <div className="flex items-center justify-between space-x-4">
          {/* Left Section - Title & Info */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              Figma Output - {frameNode.name}
            </h1>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <span className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                {frameNode.children?.length || 0} elements
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                dataSource === 'URL parameters' 
                  ? 'bg-green-100 text-green-700' 
                  : dataSource === 'Plugin Export'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {dataSource}
              </span>
              {figmaData?.metadata?.exportedBy === 'DesignStorm Plugin' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                  🚀
                </span>
              )}
              {Object.keys(assetMap).length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                  🎨 {Object.keys(assetMap).length} assets
                </span>
              )}
            </div>
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
          
          {/* Right Section - All Controls */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Render Mode */}
            <select
              value={renderMode}
              onChange={(e) => setRenderMode(e.target.value as 'simple' | 'enhanced')}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              <option value="enhanced">Enhanced</option>
              <option value="simple">Simple</option>
            </select>
            
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
            
            {/* Overflow Toggle */}
            <button
              onClick={() => setOverflowHidden(!overflowHidden)}
              className={`px-2 py-1 text-xs rounded transition-colors font-medium ${
                overflowHidden 
                  ? 'bg-orange-100 hover:bg-orange-200 text-orange-800' 
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-800'
              }`}
            >
              {overflowHidden ? '🔒' : '🔓'} Overflow
            </button>
            
            {/* Layout Debug */}
            <button
              onClick={() => setShowLayoutDebug(!showLayoutDebug)}
              className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors font-medium"
            >
              {showLayoutDebug ? 'Hide' : 'Show'} Layout
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
        <div className="bg-blue-50/80 border-b border-blue-200/50 shadow-sm">
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
        <div className={`relative w-screen figma-renderer-container ${overflowHidden ? 'overflow-hidden' : 'overflow-hidden'}`} style={{ margin: 0, padding: 0 }}>
          
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
                        <div className="flex justify-between">
                          <span className="text-gray-600">Render Mode:</span>
                          <span className="font-medium capitalize">{renderMode}</span>
                        </div>
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
                          <span className={`font-medium ${showLayoutDebug ? 'text-green-600' : 'text-gray-600'}`}>
                            {showLayoutDebug ? 'On' : 'Off'}
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
                          <span className={`font-medium ${overflowHidden ? 'text-orange-600' : 'text-purple-600'}`}>
                            {overflowHidden ? 'Hidden' : 'Visible'}
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
              fileKey={fileKey}
              figmaToken={figmaToken}
              showDebug={showDebug}
              isRoot={true}
              imageMap={assetMap}
              devMode={devMode}
              enableScaling={enableScaling}
              maxScale={maxScale}
              transformOrigin={transformOrigin}
            />
          )}
          
          {/* Coordinate overlay for debugging */}
          {/*showDebug && !devMode && (
            <div className="absolute top-4 left-4 bg-black bg-opacity-90 text-white text-xs p-3 rounded shadow-lg z-50">
              <div className="font-bold mb-2">🔍 Debug Info</div>
              <div>Frame: {frameNode.name}</div>
              <div>Type: {frameNode.type}</div>
              <div>Children: {frameNode.children?.length || 0}</div>
              <div>File Key: {fileKey || 'Not provided'}</div>
              <div>Data Source: {dataSource}</div>
              <div className={figmaToken ? 'text-green-300' : 'text-yellow-300'}>
                {figmaToken ? '✅ Token loaded - images enabled' : '⚠️ No token - images may not load'}
              </div>
              <div>Node ID: 55446:11667</div>
              <div className="mt-2 text-yellow-300">
                {imageLoadingStatus}
              </div>
              <div className="mt-1">
                                        Assets: {Object.keys(assetMap).length}
              </div>
              <div className="mt-1">
                Renderer: {renderMode}
              </div>
              <div className="mt-1">
                Layout Debug: {showLayoutDebug ? 'On' : 'Off'}
              </div>
              <div className="mt-1">
                Dev Mode: {devMode ? 'On' : 'Off'}
              </div>
            </div>
          )*/}
        </div>
      </div>
    </div>
  );
} 