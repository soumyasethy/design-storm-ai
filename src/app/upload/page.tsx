'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, Eye, Code, ArrowRight } from 'lucide-react';

import { useRouter } from 'next/navigation';

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
  };
}

interface FigmaDocument {
  document: FigmaNode;
  components: Record<string, unknown>;
  styles: Record<string, unknown>;
  originalData?: unknown; // For storing non-Figma JSON data
}

export default function UploadPage() {
  const router = useRouter();
  const [isDragOver, setIsDragOver] = useState(false);
  const [figmaData, setFigmaData] = useState<FigmaDocument | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'json' | 'layout'>('layout');
  const [figmaUrl, setFigmaUrl] = useState<string>('');
  const [figmaToken, setFigmaToken] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFigmaJSON = useCallback((jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      
      // Check if it's a valid Figma JSON structure with direct document property
      if (data.document) {
        return data as FigmaDocument;
      }
      
      // Check if it's a Figma JSON with nodes structure (real Figma export)
      if (data.nodes && typeof data.nodes === 'object') {
        const nodeKeys = Object.keys(data.nodes);
        if (nodeKeys.length > 0) {
          const firstNode = data.nodes[nodeKeys[0]];
          if (firstNode.document) {
            return {
              document: firstNode.document,
              components: data.components || {},
              styles: data.styles || {},
            } as FigmaDocument;
          }
        }
      }
      
      // If no document property, check if it might be a different structure
      if (typeof data === 'object' && data !== null) {
        // Try to find a root node or create a mock structure
        const keys = Object.keys(data);
        if (keys.length > 0) {
          // Create a mock document structure for non-Figma JSON
          return {
            document: {
              id: 'root',
              name: 'Imported JSON',
              type: 'DOCUMENT',
              children: [{
                id: 'mock-frame',
                name: 'JSON Content',
                type: 'FRAME',
                children: [{
                  id: 'mock-content',
                  name: 'Data',
                  type: 'TEXT',
                  characters: JSON.stringify(data, null, 2).substring(0, 200) + (JSON.stringify(data, null, 2).length > 200 ? '...' : ''),
                  absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 100 }
                }]
              }]
            },
            components: {},
            styles: {},
            originalData: data // Store the original data for reference
          } as FigmaDocument;
        }
      }
      
      throw new Error('Invalid JSON structure: No recognizable document or data structure found');
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error('Invalid JSON syntax: ' + err.message);
      }
      throw new Error('Failed to parse JSON: ' + (err as Error).message);
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsParsing(true);
    setError(null);
    
    try {
      const text = await file.text();
      console.log('File content preview:', text.substring(0, 200) + '...');
      const parsedData = parseFigmaJSON(text);
      console.log('Parsed data structure:', {
        hasDocument: !!parsedData.document,
        documentType: parsedData.document?.type,
        hasChildren: !!parsedData.document?.children,
        childrenCount: parsedData.document?.children?.length,
        firstChildType: parsedData.document?.children?.[0]?.type
      });
      setFigmaData(parsedData);
    } catch (err) {
      console.error('Parsing error:', err);
      setError((err as Error).message);
    } finally {
      setIsParsing(false);
    }
  }, [parseFigmaJSON]);

  const handleGenerateOutput = useCallback(() => {
    console.log('🚀 handleGenerateOutput called with:');
    console.log('  - figmaData:', !!figmaData);
    console.log('  - figmaUrl:', figmaUrl);
    console.log('  - figmaToken:', !!figmaToken);
    
    if (!figmaData) {
      console.log('❌ No figmaData, returning early');
      return;
    }
    
    // Store data in localStorage for the output page
    localStorage.setItem('figmaData', JSON.stringify(figmaData));
    console.log('✅ Stored figmaData in localStorage');
    
    // Store token in localStorage for the output page
    if (figmaToken) {
      localStorage.setItem('figmaToken', figmaToken);
      console.log('✅ Stored figmaToken in localStorage');
    } else {
      console.log('❌ No figmaToken to store');
    }
    
    // Store Figma URL in localStorage for the output page
    if (figmaUrl) {
      localStorage.setItem('figmaUrl', figmaUrl);
      console.log('✅ Stored Figma URL in localStorage:', figmaUrl);
    } else {
      console.log('❌ No Figma URL to store');
    }
    
    // Create URL parameters
    const params = new URLSearchParams();
    if (figmaUrl) {
      params.set('url', figmaUrl);
    }
    
    // Navigate to output page
    router.push(`/output?${params.toString()}`);
  }, [figmaData, figmaUrl, figmaToken, router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'));
    
    if (jsonFile) {
      handleFileUpload(jsonFile);
    } else {
      setError('Please upload a valid JSON file');
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.trim()) {
      try {
        const parsedData = parseFigmaJSON(pastedText);
        setFigmaData(parsedData);
        setError(null);
      } catch (err) {
        setError('Invalid JSON pasted: ' + (err as Error).message);
      }
    }
  }, [parseFigmaJSON]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const renderNode = (node: FigmaNode, depth: number = 0): React.JSX.Element => {
    const indent = depth * 20;
    
    // Basic styling based on node type
    const getNodeStyles = () => {
      const baseStyles = {
        marginLeft: `${indent}px`,
        padding: '4px 8px',
        marginBottom: '2px',
        borderRadius: '4px',
        fontSize: '14px',
        fontFamily: 'monospace',
      };

      switch (node.type) {
        case 'FRAME':
        case 'GROUP':
          return {
            ...baseStyles,
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            fontWeight: 'bold',
          };
        case 'TEXT':
          return {
            ...baseStyles,
            backgroundColor: '#dbeafe',
            border: '1px solid #93c5fd',
          };
        case 'RECTANGLE':
          return {
            ...baseStyles,
            backgroundColor: '#fef3c7',
            border: '1px solid #fbbf24',
          };
        default:
          return {
            ...baseStyles,
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
          };
      }
    };

    return (
      <div key={node.id} style={getNodeStyles()}>
        <div className="flex items-center justify-between">
          <span className="font-medium">{node.name}</span>
          <span className="text-xs text-gray-500">({node.type})</span>
        </div>
        {node.absoluteBoundingBox && (
          <div className="text-xs text-gray-600 mt-1">
            {node.absoluteBoundingBox.width.toFixed(0)} × {node.absoluteBoundingBox.height.toFixed(0)}
          </div>
        )}
        {node.children && node.children.length > 0 && (
          <div className="mt-2">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };



  const renderPreview = () => {
    if (!figmaData) return null;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Figma Document Preview</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('layout')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                viewMode === 'layout'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Layout
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                viewMode === 'preview'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Eye className="w-4 h-4 inline mr-1" />
              Structure
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                viewMode === 'json'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Code className="w-4 h-4 inline mr-1" />
              JSON
            </button>
          </div>
        </div>

        {viewMode === 'layout' ? (
          <div className="space-y-4">
            {Boolean(figmaData.originalData) && !figmaData.document.children?.some(child => child.type === 'CANVAS') && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This appears to be a non-Figma JSON file. Layout preview may not be accurate.
                </p>
              </div>
            )}
            {figmaData.document.children?.some(child => child.type === 'CANVAS') && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  <strong>✓ Figma File Detected:</strong> This is a valid Figma JSON export with proper layout data.
                </p>
              </div>
            )}
            <div className="max-w-4xl mx-auto">
              {renderNode(figmaData.document)}
            </div>
          </div>
        ) : viewMode === 'preview' ? (
          <div className="max-h-96 overflow-y-auto">
            {Boolean(figmaData.originalData) && !figmaData.document.children?.some(child => child.type === 'CANVAS') && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This appears to be a non-Figma JSON file. Showing a preview of the data structure.
                </p>
              </div>
            )}
            {renderNode(figmaData.document)}
          </div>
        ) : (
          <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto max-h-96">
            {figmaData.originalData ? JSON.stringify(figmaData.originalData, null, 2) : JSON.stringify(figmaData, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Figma to Code</h1>
          <p className="text-gray-600">Upload your Figma JSON and preview the layout structure</p>
        </div>
        
        {/* Plugin Information Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start space-x-3">
            <div className="text-blue-600 text-xl">🚀</div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">
                Use the Figma Plugin for Complete Data Export
              </h3>
              <p className="text-blue-700 text-sm mb-3">
                The DesignStorm Figma Plugin exports all images, assets, and design data directly from Figma, 
                eliminating API limitations and providing pixel-perfect rendering.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">✅ All Images Included</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">✅ No API Limits</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">✅ Design Tokens</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">✅ Components & Assets</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="mb-8">
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onPaste={handlePaste}
            tabIndex={0}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileInputChange}
              className="hidden"
            />
            
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">
                Drop your Figma JSON file here
              </h3>
              <p className="text-gray-600">
                or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  browse files
                </button>
                {' '}or paste JSON directly
              </p>
              <p className="text-sm text-gray-500">
                Supports .json files exported from Figma
              </p>
            </div>

            {isParsing && (
              <div className="mt-4">
                <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-md">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                  Parsing Figma JSON...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <X className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Figma URL Input */}
        {figmaData && (
          <div className="mb-6 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Output with Images</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Figma URL (optional - for image loading)
                </label>
                <input
                  type="url"
                  value={figmaUrl}
                  onChange={(e) => {
                    console.log('🔗 Figma URL input changed:', e.target.value);
                    setFigmaUrl(e.target.value);
                  }}
                  placeholder="https://figma.com/file/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add your Figma file URL to enable image loading in the output
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Figma Access Token (optional - for image loading)
                </label>
                <input
                  type="password"
                  value={figmaToken}
                  onChange={(e) => {
                    console.log('🔑 Figma token input changed:', e.target.value ? '***' : '');
                    setFigmaToken(e.target.value);
                  }}
                  placeholder="figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your token from Figma → Settings → Account → Personal access tokens
                </p>
              </div>
              <button
                onClick={handleGenerateOutput}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Generate Output with Images</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Preview Section */}
        {figmaData && renderPreview()}

        {/* Instructions */}
        {!figmaData && !error && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">How to use:</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">From Figma:</h4>
                <ol className="text-sm text-gray-600 space-y-1">
                  <li>1. Open your Figma design</li>
                  <li>2. Select the frame you want to export</li>
                  <li>3. Right-click and select &quot;Copy/Paste as&quot; → &quot;Copy as JSON&quot;</li>
                  <li>4. Paste the JSON here or save as .json file</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Supported Formats:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Figma JSON exports (preferred)</li>
                  <li>• Any valid JSON file</li>
                  <li>• Raw JSON text pasted directly</li>
                  <li>• Drag & drop .json files</li>
                  <li>• Visual layout preview</li>
                  <li>• Component structure analysis</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 