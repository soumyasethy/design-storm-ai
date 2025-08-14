'use client';

import React, { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { Upload, X, Eye, Code, ArrowRight, Figma, Zap, CheckCircle, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useFigmaFile } from '@/lib/useFigmaFile';
import { useFigmaData } from '@/lib/useFigmaData';

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
  originalData?: unknown;
}

type UploadMethod = 'oauth' | 'url' | 'file' | 'paste';

function UploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDragOver, setIsDragOver] = useState(false);
  const [figmaData, setFigmaData] = useState<FigmaDocument | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'json' | 'layout'>('layout');
  const [figmaUrl, setFigmaUrl] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [figmaToken, setFigmaToken] = useState<string>('');
  const [tokenMode, setTokenMode] = useState<'auto'|'oauth'|'pat'>(() => {
    try { return (localStorage.getItem('tokenMode') as any) || 'auto'; } catch { return 'auto'; }
  });
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('oauth');
  const [selectedFileKey, setSelectedFileKey] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // IndexedDB storage hook
  const { saveFigmaData, saveFigmaToken, saveFigmaUrl } = useFigmaData();

  // Figma OAuth integration
  const {
    isAuthenticated,
    user,
    isLoading: oauthLoading,
    error: oauthError,
    currentFile: oauthFile,
    availableFiles,
    projects,
    login,
    logout,
    loadFiles,
    loadFileByLink,
    loadFileByKey,
    clearError: clearOAuthError
  } = useFigmaFile();

  // Ensure we hydrate auth state from cookie when page loads/refocuses
  useEffect(() => {
    const syncFromCookie = async () => {
      try {
        const res = await fetch('/api/auth/figma/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.authenticated) {
            // Trigger hook refresh by dispatching our custom event
            try { window.dispatchEvent(new Event('figma-auth-updated')); } catch {}
          }
        }
      } catch {}
    };
    syncFromCookie();
    const onFocus = () => syncFromCookie();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Load files when authenticated
  useEffect(() => {
    if (isAuthenticated && availableFiles.length === 0) {
      loadFiles();
    }
  }, [isAuthenticated, availableFiles.length, loadFiles]);

  // Handle OAuth file selection and URL-loaded files
  useEffect(() => {
    if (oauthFile) {
      setFigmaData({
        document: oauthFile.document,
        components: oauthFile.components,
        styles: oauthFile.styles
      });
      setError(null);
    }
  }, [oauthFile]);

  // Handle OAuth callback results
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      console.log('✅ OAuth completed successfully');
      // Clear the URL parameters and show success message
      router.replace('/upload');
      setError(null);
      // Ensure auth UI sync
      try {
        document.dispatchEvent(new Event('figma-auth-updated'));
      } catch {}
      // Show success message
      setError(null);
      // Force refresh auth state
      setTimeout(() => {
        try {
          window.dispatchEvent(new Event('figma-auth-updated'));
        } catch {}
      }, 100);
    } else if (error) {
      console.error('❌ OAuth error:', error);
      let errorMessage = 'OAuth authentication failed';

      switch (error) {
        case 'oauth_error':
          errorMessage = 'OAuth authorization was denied or failed';
          break;
        case 'missing_params':
          errorMessage = 'Missing OAuth parameters';
          break;
        case 'token_exchange_failed':
          errorMessage = 'Token exchange failed. We tried both Figma endpoints. Verify Client ID, Secret, and Redirect URI match exactly.';
          break;
        case 'user_info_failed':
          errorMessage = 'Failed to retrieve user information';
          break;
        case 'callback_failed':
          errorMessage = 'OAuth callback processing failed';
          break;
        default:
          errorMessage = `OAuth error: ${error}`;
      }

      setError(errorMessage);
      // Clear the URL parameters
      router.replace('/upload');
    }
  }, [searchParams, router]);

  const parseFigmaJSON = useCallback((jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);

      if (data.document) {
        return data as FigmaDocument;
      }

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

      if (typeof data === 'object' && data !== null) {
        const keys = Object.keys(data);
        if (keys.length > 0) {
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
            originalData: data
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
      const parsedData = parseFigmaJSON(text);
      setFigmaData(parsedData);
    } catch (err) {
      console.error('Parsing error:', err);
      setError((err as Error).message);
    } finally {
      setIsParsing(false);
    }
  }, [parseFigmaJSON]);

  const handleGenerateOutput = useCallback(async () => {
    if (!figmaData) return;

    // Save to IndexedDB instead of localStorage
    try {
      await saveFigmaData(figmaData);
      console.log('✅ Saved Figma data to IndexedDB');

      if (figmaToken) {
        await saveFigmaToken(figmaToken);
        console.log('✅ Saved Figma token to IndexedDB');
      }

      if (figmaUrl) {
        await saveFigmaUrl(figmaUrl);
        console.log('✅ Saved Figma URL to IndexedDB');
      }
    } catch (error) {
      console.error('❌ Failed to save data to IndexedDB:', error);
      // Fallback to localStorage if IndexedDB fails
      try {
        localStorage.setItem('figmaData', JSON.stringify(figmaData));
        if (figmaToken) localStorage.setItem('figmaToken', figmaToken);
        if (figmaUrl) localStorage.setItem('figmaUrl', figmaUrl);
        console.log('⚠️ Fallback: Saved to localStorage');
      } catch (fallbackError) {
        console.error('❌ Both IndexedDB and localStorage failed:', fallbackError);
        alert('Failed to save data. The design might be too large.');
        return;
      }
    }

    const params = new URLSearchParams();
    params.set('source', 'upload'); // Indicate data was uploaded
    if (figmaUrl) {
      params.set('url', figmaUrl);
    }

    router.push(`/output?${params.toString()}`);
  }, [figmaData, figmaUrl, figmaToken, router, saveFigmaData, saveFigmaToken, saveFigmaUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'));

    if (jsonFile) {
      setUploadMethod('file');
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
        setUploadMethod('paste');
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
      setUploadMethod('file');
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleUrlSubmit = useCallback(async (url: string) => {
    const u = url.trim();
    if (!u) return;
    setUploadMethod('url');
    setError(null);
    // Persist URL first so /output can fetch live
    try {
      const { saveFigmaUrl } = await import('@/lib/figmaStorage');
      await saveFigmaUrl(u);
    } catch {}
    localStorage.setItem('figmaUrl', u);
    setFigmaUrl(u);
    // Persist token + mode for output page
    try {
      const { saveFigmaToken, saveFigmaTokenMode } = await import('@/lib/figmaStorage');
      if (figmaToken) await saveFigmaToken(figmaToken);
      await saveFigmaTokenMode(tokenMode);
    } catch {}
    try { localStorage.setItem('tokenMode', tokenMode); } catch {}
    // Navigate immediately; /output now prefers url param and fetches the file there
    try {
      router.push('/output?source=upload&url=' + encodeURIComponent(u));
    } catch {
      (window as any).location.href = '/output?source=upload&url=' + encodeURIComponent(u);
    }
  }, [router, figmaToken, tokenMode]);

  const handleFileSelect = useCallback(async (fileKey: string) => {
    if (!fileKey) return;

    setSelectedFileKey(fileKey);
    setError(null);

    try {
      await loadFileByKey(fileKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load selected file');
    }
  }, [loadFileByKey]);

  const renderNode = (node: FigmaNode, depth: number = 0): React.JSX.Element => {
    const indent = depth * 20;

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
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Design Preview</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('layout')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
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
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
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
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DS</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">LazyCode.ai</h1>
            </div>
            <nav className="flex items-center space-x-6">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                Home
              </Link>
              <Link href="/upload" className="text-blue-600 font-medium">
                Upload
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              <Link href="/upload" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Auth status bar */}
        <div className="flex items-center justify-end mb-2">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1 shadow-sm">
              {user.img_url ? (
                <img src={user.img_url} alt="avatar" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-700">
                  {(user.handle || user.email || '?').slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="text-sm text-gray-700 max-w-[12rem] truncate" title={user.handle || user.email}>
                {user.handle || user.email}
              </span>
              <button
                onClick={logout}
                className="text-xs text-gray-500 hover:text-gray-700 ml-1"
                title="Logout"
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Transform Figma designs into production-ready code</h1>
          <p className="text-gray-600">Choose your preferred method to import your design</p>
        </div>

        {/* Upload Methods */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* OAuth Method */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Figma className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Figma OAuth</h3>
                <p className="text-sm text-gray-600">Connect your Figma account</p>
              </div>
            </div>

            {!isAuthenticated ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Recommended Method</p>
                      <p>Access all your Figma files with full permissions</p>
                    </div>
                  </div>
                </div>
                                 <button
                   onClick={() => {
                     console.log('🔐 Login button clicked');
                     console.log('Current auth state:', { isAuthenticated, oauthLoading, oauthError });
                     try {
                       login();
                     } catch (error) {
                       console.error('❌ Login error:', error);
                       setError('Failed to start OAuth login: ' + (error instanceof Error ? error.message : 'Unknown error'));
                     }
                   }}
                   className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center justify-center space-x-2"
                 >
                   <Figma className="w-5 h-5" />
                   <span>Connect Figma Account</span>
                 </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {user?.img_url && (
                      <img src={user.img_url} alt={user.handle} className="w-8 h-8 rounded-full" />
                    )}
                    <div>
                      <p className="font-medium text-green-800">{user?.handle}</p>
                      <p className="text-sm text-green-600">Connected to Figma</p>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="text-green-600 hover:text-green-700 text-sm"
                  >
                    Disconnect
                  </button>
                </div>

                <div>
                  {/* Project file picker removed per feedback */}
                </div>

                {/* Refresh files button removed per feedback */}
              </div>
            )}
          </div>

          {/* URL Method */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-purple-100 p-2 rounded-lg">
                <LinkIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Direct Link</h3>
                <p className="text-sm text-gray-600">Paste a Figma file URL</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div className="text-sm text-purple-800">
                    <p className="font-medium">Public or Private Files</p>
                    <p>Works with any Figma file you have access to</p>
                  </div>
                </div>
              </div>

              <div>
                  <input
                    type="url"
                    placeholder="https://figma.com/file/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
              </div>

              <button
                onClick={() => {
                  setUploadMethod('url');
                  if (urlInput.trim()) {
                    console.log('🔗 Loading from URL (button):', urlInput.trim());
                    handleUrlSubmit(urlInput.trim());
                  } else {
                    setError('Please paste a valid Figma file URL');
                  }
                }}
                className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center space-x-2"
              >
                                  <LinkIcon className="w-5 h-5" />
                <span>Load from URL</span>
              </button>
              <div className="mt-4 space-y-2">
                <div className="font-medium text-sm">Token mode</div>
                <div className="flex flex-wrap gap-6 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="tokenModeUrl" value="auto" checked={tokenMode==='auto'} onChange={() => { setTokenMode('auto'); try{localStorage.setItem('tokenMode','auto');}catch{}}} />
                    Auto (prefer OAuth, fallback PAT)
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="tokenModeUrl" value="oauth" checked={tokenMode==='oauth'} onChange={() => { setTokenMode('oauth'); try{localStorage.setItem('tokenMode','oauth');}catch{}}} />
                    OAuth only
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="tokenModeUrl" value="pat" checked={tokenMode==='pat'} onChange={() => { setTokenMode('pat'); try{localStorage.setItem('tokenMode','pat');}catch{}}} />
                    PAT only
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* File Upload Method */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-green-100 p-2 rounded-lg">
              <Upload className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">File Upload</h3>
              <p className="text-sm text-gray-600">Upload JSON file or paste content</p>
            </div>
          </div>

          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-green-400 bg-green-50'
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
                  className="text-green-600 hover:text-green-500 font-medium"
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
                <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-md">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700 mr-2"></div>
                  Parsing Figma JSON...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {(error || oauthError) && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <X className="h-5 w-5 text-red-400" />
                <p className="text-red-700">{error || oauthError}</p>
              </div>
                <button
                onClick={() => { setError(null); clearOAuthError(); }}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Generate Output Section */}
        {figmaData && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Output</h3>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Figma URL (optional - for image loading)
                  </label>
                  <input
                    type="url"
                    value={figmaUrl}
                    onChange={(e) => setFigmaUrl(e.target.value)}
                    placeholder="https://figma.com/file/..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Token (optional - for private files)
                  </label>
                  <input
                    type="password"
                    value={figmaToken}
                    onChange={(e) => setFigmaToken(e.target.value)}
                    placeholder="figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={handleGenerateOutput}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-medium"
              >
                <span>Generate Code Output</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Preview Section */}
        {figmaData && renderPreview()}

        {/* Instructions */}
        {!figmaData && !error && !oauthError && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">How to use LazyCode.ai:</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Choose Method</h4>
                <p className="text-sm text-gray-600">
                  Connect with OAuth, paste a URL, or upload a JSON file
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Preview Design</h4>
                <p className="text-sm text-gray-600">
                  Review the structure and layout of your design
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Generate Code</h4>
                <p className="text-sm text-gray-600">
                  Get production-ready HTML, CSS, and React components
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    }>
      <UploadPageContent />
    </Suspense>
  );
}