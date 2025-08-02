'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TestPluginPage() {
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setUploadError('Please select a valid JSON file');
      return;
    }

    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        setUploadedData(jsonData);
        console.log('📁 Test file uploaded:', jsonData);
        
        // Log image information for debugging
        if (jsonData.imageMap) {
          console.log('🖼️ Image Map Keys:', Object.keys(jsonData.imageMap));
          console.log('📊 Total Images:', Object.keys(jsonData.imageMap).filter(key => !key.endsWith('_meta')).length);
        }
        
        if (jsonData.images) {
          console.log('🖼️ Images Array:', jsonData.images.length);
          jsonData.images.forEach((img: any, index: number) => {
            console.log(`🖼️ Image ${index}:`, {
              nodeId: img.nodeId,
              nodeName: img.nodeName,
              width: img.width,
              height: img.height,
              size: img.bytes?.length || 0
            });
          });
        }
      } catch (error) {
        console.error('❌ Error parsing JSON file:', error);
        setUploadError('Invalid JSON file. Please check the file format.');
      }
    };

    reader.onerror = () => {
      setUploadError('Error reading file. Please try again.');
    };

    reader.readAsText(file);
  };

  const isPluginData = uploadedData?.metadata?.exportedBy === 'DesignStorm Plugin';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Figma Plugin Test</h1>
          <p className="text-gray-600">Test your Figma plugin exports and see the data structure</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Plugin Instructions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🚀 How to Use Figma Plugin</h2>
            
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-semibold text-blue-900 mb-2">Step 1: Install Plugin</h3>
                <p className="text-blue-700">
                  Copy the plugin files from <code className="bg-blue-100 px-1 rounded">figma-plugin/</code> folder
                  and install in Figma as a development plugin.
                </p>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <h3 className="font-semibold text-green-900 mb-2">Step 2: Export Design</h3>
                <p className="text-green-700">
                  Select your design in Figma, run the plugin, and export the complete design data
                  (including all images as base64).
                </p>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                <h3 className="font-semibold text-purple-900 mb-2">Step 3: Test Export</h3>
                <p className="text-purple-700">
                  Upload the exported JSON file here to verify it contains all the data and images.
                </p>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                <h3 className="font-semibold text-orange-900 mb-2">Step 4: Render Design</h3>
                <p className="text-orange-700">
                  Go to the <Link href="/output" className="text-orange-600 underline">Output Page</Link> 
                  to see your design rendered with full image support.
                </p>
              </div>
            </div>

            <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded">
              <h3 className="font-semibold text-gray-900 mb-2">Plugin Benefits</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✅ All images included as base64 (no API limits)</li>
                <li>✅ Complete design tokens and styles</li>
                <li>✅ Components and assets data</li>
                <li>✅ No need for Figma API tokens</li>
                <li>✅ Works offline</li>
              </ul>
            </div>
          </div>

          {/* File Upload Test */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📁 Test Plugin Export</h2>
            
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

              {uploadedData && (
                <div className="space-y-4">
                  <div className={`p-3 rounded border ${
                    isPluginData 
                      ? 'bg-green-50 border-green-200 text-green-700' 
                      : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                  }`}>
                    <h3 className="font-semibold mb-2">
                      {isPluginData ? '✅ Plugin Data Detected' : '⚠️ Regular JSON Data'}
                    </h3>
                    <p className="text-sm">
                      {isPluginData 
                        ? 'This is a valid plugin export with embedded images and design tokens.'
                        : 'This appears to be regular Figma JSON. Plugin exports are preferred for full image support.'
                      }
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <h4 className="font-semibold text-gray-900 mb-2">Data Summary</h4>
                    <div className="text-sm text-gray-700 space-y-1">
                      <div><strong>Name:</strong> {uploadedData.name || 'N/A'}</div>
                      <div><strong>Type:</strong> {uploadedData.metadata?.exportedBy || 'Regular JSON'}</div>
                      <div><strong>Images:</strong> {uploadedData.imageMap ? Object.keys(uploadedData.imageMap).filter(key => !key.endsWith('_meta')).length : 0}</div>
                      <div><strong>Image Array:</strong> {uploadedData.images ? uploadedData.images.length : 0}</div>
                      <div><strong>Assets:</strong> {uploadedData.assets ? uploadedData.assets.length : 0}</div>
                      <div><strong>Components:</strong> {uploadedData.components ? uploadedData.components.length : 0}</div>
                      <div><strong>Fonts:</strong> {uploadedData.fonts ? uploadedData.fonts.length : 0}</div>
                      <div><strong>Pages:</strong> {uploadedData.pages ? uploadedData.pages.length : 0}</div>
                    </div>
                  </div>

                  {uploadedData.imageMap && Object.keys(uploadedData.imageMap).filter(key => !key.endsWith('_meta')).length > 0 && (
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">🖼️ Image Details</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <div><strong>Total Images:</strong> {Object.keys(uploadedData.imageMap).filter(key => !key.endsWith('_meta')).length}</div>
                        <div><strong>Image Format:</strong> Base64 embedded</div>
                        <div><strong>Status:</strong> Ready for rendering</div>
                      </div>
                      <div className="mt-2 text-xs text-blue-600">
                        {Object.keys(uploadedData.imageMap)
                          .filter(key => !key.endsWith('_meta'))
                          .slice(0, 3)
                          .map(key => (
                            <div key={key}>• {key}: {uploadedData.imageMap[key].substring(0, 50)}...</div>
                          ))}
                        {Object.keys(uploadedData.imageMap).filter(key => !key.endsWith('_meta')).length > 3 && (
                          <div>... and {Object.keys(uploadedData.imageMap).filter(key => !key.endsWith('_meta')).length - 3} more</div>
                        )}
                      </div>
                    </div>
                  )}

                  {isPluginData && (
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2">Plugin Data Ready!</h4>
                      <p className="text-sm text-green-700 mb-3">
                        Your plugin export is ready for rendering. All images are embedded as base64 data.
                      </p>
                      <Link 
                        href="/output" 
                        className="inline-block bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        View Rendered Design
                      </Link>
                    </div>
                  )}

                  <details className="bg-gray-50 p-3 rounded">
                    <summary className="font-semibold text-gray-900 cursor-pointer">View Raw Data</summary>
                    <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-40">
                      {JSON.stringify(uploadedData, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link 
            href="/output" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Output Page
          </Link>
        </div>
      </div>
    </div>
  );
} 