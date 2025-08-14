'use client';

import React from 'react';
import { Eye, Zap, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { VisualAnalysisResult } from '@/lib/visualAnalyzer';

interface VisualAnalysisPanelProps {
  analysis: VisualAnalysisResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export function VisualAnalysisPanel({ analysis, isOpen, onClose }: VisualAnalysisPanelProps) {
  if (!isOpen || !analysis) return null;

  return (
    <div className="fixed right-4 top-20 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-y-auto">
      <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <h3 className="font-semibold">Visual AI Analysis</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Primary Pattern */}
        {analysis.primaryPattern && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-600" />
                Detected Pattern
              </h4>
              <span className="text-sm font-medium text-purple-600">
                {analysis.primaryPattern.confidence}% confidence
              </span>
            </div>
            <div className="text-lg font-bold text-gray-900 capitalize mb-2">
              {analysis.primaryPattern.type}
            </div>
            {analysis.primaryPattern.visualCues.length > 0 && (
              <div className="space-y-1">
                {analysis.primaryPattern.visualCues.map((cue, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{cue}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Visual Hints */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            Visual Elements Detected
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(analysis.visualHints).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-gray-700">
                  {key.replace(/^has/, '').replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Other Detected Patterns */}
        {analysis.detectedPatterns.length > 1 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">Alternative Patterns</h4>
            <div className="space-y-2">
              {analysis.detectedPatterns.slice(1).map((pattern, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-gray-700">{pattern.type}</span>
                  <span className="text-gray-500">{pattern.confidence}% match</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="bg-amber-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              AI Recommendations
            </h4>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Enhancements */}
        {analysis.primaryPattern?.suggestedEnhancements && 
         analysis.primaryPattern.suggestedEnhancements.length > 0 && (
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">Suggested Enhancements</h4>
            <ul className="space-y-2">
              {analysis.primaryPattern.suggestedEnhancements.map((enhancement, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-600 mt-0.5">+</span>
                  <span>{enhancement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
        <p className="text-xs text-gray-500 text-center">
          Visual AI analyzes design patterns to enhance code generation
        </p>
      </div>
    </div>
  );
}
