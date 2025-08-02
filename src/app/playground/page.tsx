'use client';

import React, { useState } from 'react';
import FigmaRender from '@/components/FigmaRender';

// Import the Figma JSON data
import figmaHomeJson from '../../../public/figma-home.json';

export default function PlaygroundPage() {
  const [showDebug, setShowDebug] = useState(false);

  // Figma API credentials - use environment variables in production
  const fileKey = process.env.NEXT_PUBLIC_FIGMA_FILE_KEY || 'Rv0N6ijDn4ZetvZFSdOVEb';
  const figmaToken = process.env.NEXT_PUBLIC_FIGMA_TOKEN || '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with controls */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-gray-900">
            Figma Playground - Home
          </h1>
          <span className="text-sm text-gray-500">
            Production-grade Figma rendering
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            {showDebug ? 'Hide' : 'Show'} Debug
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
          >
            Back
          </button>
        </div>
      </div>

      {/* Main render area */}
      <div className="bg-white p-4">
        <div className="relative mx-auto">
          {/* Render the Figma content using FigmaRender component */}
          <FigmaRender
            data={figmaHomeJson}
            frameName="Home"
            fileKey={fileKey}
            figmaToken={figmaToken}
            showDebug={showDebug}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
} 