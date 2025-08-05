'use client';

import React from 'react';
import { createReactFontFamily, createTailwindFontFamily, createCSSFontDeclaration } from '@/lib/fontUtils';

interface EmojiTextDemoProps {
  className?: string;
}

export const EmojiTextDemo: React.FC<EmojiTextDemoProps> = ({ className = '' }) => {
  const demoTexts = [
    {
      text: "🏀❤️🔥 Let's build India's largest sports company! 🚀",
      font: "Space Grotesk",
      description: "Space Grotesk with emojis"
    },
    {
      text: "🎯💪 Building the future of sports 🏆",
      font: "Inter",
      description: "Inter with emojis"
    },
    {
      text: "⚡️🚀 Innovation meets passion 💎",
      font: "Poppins",
      description: "Poppins with emojis"
    },
    {
      text: "🌟✨ Creating magic together 🎨",
      font: "Montserrat",
      description: "Montserrat with emojis"
    },
    {
      text: "💻🔧 Code with style 🎯",
      font: "Source Code Pro",
      description: "Monospace with emojis"
    },
    {
      text: "📚📖 Reading with elegance ✨",
      font: "Playfair Display",
      description: "Serif with emojis"
    }
  ];

  return (
    <div className={`p-6 bg-white rounded-lg shadow-lg ${className}`}>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        🎨 Emoji Font Support Demo
      </h2>
      
      <div className="space-y-6">
        {demoTexts.map((demo, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              {demo.description}
            </h3>
            <div 
              className="text-lg leading-relaxed"
              style={{ 
                fontFamily: createReactFontFamily(demo.font),
                fontSize: '18px',
                lineHeight: '1.6'
              }}
            >
              {demo.text}
            </div>
            <div className="mt-2 text-xs text-gray-500 font-mono">
              Font: {demo.font}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">🔧 Font Utility Examples</h3>
        
        <div className="space-y-3 text-sm">
          <div>
            <strong>React Inline Style:</strong>
            <code className="block mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
              {`fontFamily: "${createReactFontFamily('Space Grotesk')}"`}
            </code>
          </div>
          
          <div>
            <strong>Tailwind Config:</strong>
            <code className="block mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
              {`fontFamily: "${createTailwindFontFamily('Space Grotesk')}"`}
            </code>
          </div>
          
          <div>
            <strong>CSS Declaration:</strong>
            <code className="block mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
              {createCSSFontDeclaration('Space Grotesk')}
            </code>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-blue-800">✨ Features</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 🎯 Automatic emoji font fallbacks (Apple Color Emoji, Segoe UI Emoji, etc.)</li>
          <li>• 🔄 Smart font category detection (sans, serif, mono)</li>
          <li>• 🎨 Google Fonts integration with proper fallbacks</li>
          <li>• 📱 Cross-platform emoji rendering</li>
          <li>• 🛠️ Ready for React inline styles and Tailwind config</li>
        </ul>
      </div>
    </div>
  );
};

export default EmojiTextDemo; 