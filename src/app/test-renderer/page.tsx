'use client';

import React from 'react';
import { FigmaRenderer } from '@/components/FigmaRenderer';

export default function TestRendererPage() {
  // Sample Figma data structure
  const sampleData = {
    selection: [
      {
        id: "test-frame",
        name: "Test Frame",
        type: "FRAME",
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        fills: [
          {
            type: "SOLID",
            color: { r: 0.95, g: 0.95, b: 0.95 }
          }
        ],
        children: [
          {
            id: "test-text",
            name: "Test Text",
            type: "TEXT",
            x: 20,
            y: 20,
            width: 200,
            height: 40,
            characters: "Hello World!",
            fontSize: 24,
            fontName: { family: "Inter", style: "Regular" },
            fills: [
              {
                type: "SOLID",
                color: { r: 0.1, g: 0.1, b: 0.1 }
              }
            ]
          },
          {
            id: "test-rectangle",
            name: "Test Rectangle",
            type: "RECTANGLE",
            x: 20,
            y: 80,
            width: 100,
            height: 60,
            fills: [
              {
                type: "SOLID",
                color: { r: 0.2, g: 0.6, b: 1.0 }
              }
            ],
            cornerRadius: 8
          }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Figma Renderer Test</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Sample Design</h2>
          <div className="border border-gray-200 rounded-lg p-4">
            <FigmaRenderer
              data={sampleData}
              scale={1}
              showBorders={true}
              showNames={true}
            />
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Info</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(sampleData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
} 