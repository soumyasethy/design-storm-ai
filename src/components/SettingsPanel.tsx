'use client';

import React from 'react';

export default function SettingsPanel({
                                          isOpen,
                                          onClose,
                                          devMode,
                                          setDevMode,
                                          showDebug,
                                          setShowDebug,
                                          enableScaling,
                                          setEnableScaling,
                                          maxScale,
                                          setMaxScale,
                                          figmaToken,
                                          setFigmaToken,
                                           fileKey,
                                           tokenMode,
                                           setTokenMode,
                                      }: {
    isOpen: boolean;
    onClose: () => void;
    devMode: boolean;
    setDevMode: (v: boolean) => void;
    showDebug: boolean;
    setShowDebug: (v: boolean) => void;
    enableScaling: boolean;
    setEnableScaling: (v: boolean) => void;
    maxScale: number;
    setMaxScale: (v: number) => void;
    figmaToken: string;
    setFigmaToken: (v: string) => void;
    fileKey: string;
    tokenMode: 'auto' | 'oauth' | 'pat';
    setTokenMode: (v: 'auto' | 'oauth' | 'pat') => void;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] bg-black/30">
            <div className="absolute right-0 top-0 h-full w-full sm:w-[28rem] bg-white shadow-2xl">
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">⚙️</span>
                        <h3 className="font-semibold">Settings</h3>
                    </div>
                    <button className="p-2 rounded hover:bg-gray-100" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    <section className="space-y-2">
                        <h4 className="font-semibold">General</h4>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={devMode}
                                onChange={(e) => setDevMode(e.target.checked)}
                            />
                            Dev mode
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={showDebug}
                                onChange={(e) => setShowDebug(e.target.checked)}
                            />
                            Show debug overlay
                        </label>
                    </section>

                    <section className="space-y-2">
                        <h4 className="font-semibold">Scaling</h4>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={enableScaling}
                                onChange={(e) => setEnableScaling(e.target.checked)}
                            />
                            Enable auto scale
                        </label>
                        {enableScaling && (
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min={0.5}
                                    max={3}
                                    step={0.1}
                                    value={maxScale}
                                    onChange={(e) => setMaxScale(parseFloat(e.target.value))}
                                    className="w-48"
                                />
                                <span className="text-sm text-gray-600">{maxScale.toFixed(1)}×</span>
                            </div>
                        )}
                    </section>

                    <section className="space-y-2">
                        <h4 className="font-semibold">Figma API</h4>
                        <div className="text-xs text-gray-600">
                            File key: <span className="font-mono">{fileKey || '—'}</span>
                        </div>
                        <div className="text-sm space-y-1">
                            <div className="font-medium">Token selection</div>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="tokenMode" value="auto" checked={tokenMode === 'auto'} onChange={() => setTokenMode('auto')} />
                                    Auto (prefer OAuth, fallback to PAT)
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="tokenMode" value="oauth" checked={tokenMode === 'oauth'} onChange={() => setTokenMode('oauth')} />
                                    OAuth only
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="tokenMode" value="pat" checked={tokenMode === 'pat'} onChange={() => setTokenMode('pat')} />
                                    PAT only
                                </label>
                            </div>
                        </div>
                        <label className="block text-sm">
                            Personal Access Token (or OAuth token)
                            <input
                                type="password"
                                value={figmaToken}
                                onChange={(e) => {
                                    const v = e.target.value.trim();
                                    setFigmaToken(v);
                                    try { localStorage.setItem('figmaToken', v); } catch {}
                                }}
                                placeholder="Paste token…"
                                className="mt-1 w-full border rounded px-2 py-1 text-sm"
                            />
                        </label>
                        <div className="text-xs text-gray-500">
                            We’ll use <code>X-Figma-Token</code> for PATs or <code>Authorization: Bearer</code> for OAuth.
                            Make sure the file is shared to this token’s account.
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}