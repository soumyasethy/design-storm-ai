'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { FigmaNode } from '@/lib/figmaTypes';
import { NAV_TYPES, PREVIEWABLE_TYPES, hasChildren } from '@/lib/figmaNavigation';
import { figmaAuthHeaders } from '@/lib/utils';
import { Search, ArrowUp, X, ChevronRight, FolderOpen, Eye, Zap, Grid3X3 } from 'lucide-react';

type BrowserTarget = { id: string; name: string; type: string; node: FigmaNode };

const CHUNK = 20; // Reduced from 90 to prevent URL length issues

function displayChildrenOf(node: FigmaNode): FigmaNode[] {
    if (node.type === 'DOCUMENT') {
        return (node.children || []).filter((c) => c && (c.type === 'PAGE' || c.type === 'CANVAS'));
    }
    return (node.children || []).filter((c) => {
        if (NAV_TYPES.has(c.type)) return true;
        if (c.type === 'GROUP' && hasChildren(c)) return true;
        return false;
    });
}

function highlight(text: string, q: string) {
    if (!q) return text;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return text;
    const before = text.slice(0, i);
    const match = text.slice(i, i + q.length);
    const after = text.slice(i + q.length);
    return (
        <>
            {before}
            <mark className="bg-gradient-to-r from-yellow-200 to-orange-200 px-1 rounded">{match}</mark>
            {after}
        </>
    );
}

export default function NodeBrowser({
    root,
    fileKey,
    figmaToken,
    fileThumbnailUrl,
    onClose,
    onPick,
}: {
    root: FigmaNode;
    fileKey?: string;
    figmaToken?: string;
    fileThumbnailUrl?: string | null;
    onClose: () => void;
    onPick: (picked: FigmaNode) => void;
}) {
    const [path, setPath] = useState<FigmaNode[]>(() => [root]);
    const current = path[path.length - 1];

    const [query, setQuery] = useState('');
    const [deepSearch, setDeepSearch] = useState(false);
    const debouncedQueryRef = useRef<number | null>(null);
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (debouncedQueryRef.current) window.clearTimeout(debouncedQueryRef.current);
        debouncedQueryRef.current = window.setTimeout(() => setDebouncedQuery(query.trim()), 200);
        return () => {
            if (debouncedQueryRef.current) window.clearTimeout(debouncedQueryRef.current);
        };
    }, [query]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + K for search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            }
            // Escape to clear search or close
            if (e.key === 'Escape') {
                if (query) {
                    setQuery('');
                } else {
                    onClose();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [query, onClose]);

    const children = useMemo(() => displayChildrenOf(current), [current]);
    const targetsImmediate: BrowserTarget[] = useMemo(
        () => children.map((n) => ({ id: n.id, name: n.name, type: n.type, node: n })),
        [children],
    );

    const collectDeep = (n: FigmaNode, out: FigmaNode[]) => {
        (n.children || []).forEach((c) => {
            if (NAV_TYPES.has(c.type) || PREVIEWABLE_TYPES.has(c.type) || (c.type === 'GROUP' && hasChildren(c)))
                out.push(c);
            if (hasChildren(c)) collectDeep(c, out);
        });
    };

    const searchList: BrowserTarget[] = useMemo(() => {
        if (!debouncedQuery) return [];
        if (!deepSearch) {
            return targetsImmediate.filter(
                (t) =>
                    (t.name || '').toLowerCase().includes(debouncedQuery.toLowerCase()) ||
                    t.type.toLowerCase().includes(debouncedQuery.toLowerCase()),
            );
        }
        const bucket: FigmaNode[] = [];
        collectDeep(current, bucket);
        const filtered = bucket.filter(
            (n) =>
                (n.name || '').toLowerCase().includes(debouncedQuery.toLowerCase()) ||
                n.type.toLowerCase().includes(debouncedQuery.toLowerCase()),
        );
        return filtered.map((n) => ({ id: n.id, name: n.name, type: n.type, node: n }));
    }, [debouncedQuery, deepSearch, current, targetsImmediate]);

    const showingSearch = debouncedQuery.length > 0;
    const gridTargets: BrowserTarget[] = showingSearch ? searchList : targetsImmediate;

    const [previewMap, setPreviewMap] = useState<Record<string, string>>({});
    async function fetchPreviews(ids: string[]) {
        if (!fileKey || !figmaToken || ids.length === 0) return;
        const want = ids.filter((id) => !previewMap[id] && PREVIEWABLE_TYPES.has((gridTargets.find((t) => t.id === id)?.type || '') as any));
        if (!want.length) return;
        for (let i = 0; i < want.length; i += CHUNK) {
            const chunk = want.slice(i, i + CHUNK);
            const figmaUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(
                chunk.join(','),
            )}&format=png&scale=2`;
            const url = `/api/assets?url=${encodeURIComponent(figmaUrl)}`;
            
            console.log(`Fetching chunk ${Math.floor(i/CHUNK) + 1}/${Math.ceil(want.length/CHUNK)} with ${chunk.length} images`);
            
            try {
                const res = await fetch(url, { headers: { 'X-Figma-Token': figmaToken } });
                if (!res.ok) {
                    console.warn(`Chunk failed with status ${res.status}: ${chunk.length} images`);
                    continue;
                }
                const data = await res.json();
                if (data?.images) {
                    setPreviewMap((prev) => ({ ...prev, ...data.images }));
                    console.log(`Successfully loaded ${Object.keys(data.images).length} images from chunk`);
                }
            } catch (error) {
                console.warn(`Chunk failed with error:`, error);
            }
            
            // Add a small delay between chunks to prevent overwhelming the server
            if (i + CHUNK < want.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }
    useEffect(() => {
        fetchPreviews(gridTargets.map((t) => t.id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gridTargets.map((t) => t.id).join(','), fileKey, figmaToken]);

    const goEnter = (n: FigmaNode) => setPath((prev) => [...prev, n]);
    const goPick = (n: FigmaNode) => onPick(n);
    const goPickHere = () => onPick(current);
    const goUp = () => setPath((p) => p.slice(0, -1));

    const clearSearch = () => setQuery('');

    return (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-blue-50 via-white to-purple-50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6 py-6 h-full flex flex-col">
                {/* Modern Header */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="flex items-center gap-3">
                            {fileThumbnailUrl ? (
                                <img src={fileThumbnailUrl} alt="file" className="w-10 h-10 rounded-lg object-cover border-2 border-gray-200 shadow-sm" />
                            ) : (
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">
                                    Browse & pick any{' '}
                                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                        level
                                    </span>
                                </h1>
                                <p className="text-sm text-gray-600">Search & drill down as far as you like</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={goPickHere}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            Use current level
                        </button>
                        <button 
                            onClick={onClose} 
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Modern Breadcrumb */}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                    {path.map((n, idx) => (
                        <div key={n.id} className="flex items-center gap-2">
                            <button
                                onClick={() => setPath(path.slice(0, idx + 1))}
                                className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 ${
                                    idx === path.length - 1 
                                        ? 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border border-blue-200' 
                                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                                }`}
                                title={n.name}
                            >
                                [{n.type}] {n.name || n.id}
                            </button>
                            {idx < path.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                        </div>
                    ))}
                    {path.length > 1 && (
                        <button
                            onClick={goUp}
                            className="ml-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm flex items-center gap-2"
                        >
                            <ArrowUp className="w-4 h-4" />
                            Up one
                        </button>
                    )}
                </div>

                {/* Advanced Search Section */}
                <div className="mt-6 flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by name or type… (⌘/Ctrl+K)"
                                className="w-full h-11 pl-10 pr-12 text-sm bg-white border border-gray-200 rounded-lg hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                            />
                            {query && (
                                <button 
                                    onClick={clearSearch} 
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="absolute -bottom-8 left-0 text-xs text-gray-500">
                            Press ⌘/Ctrl+K to focus search
                        </div>
                    </div>
                    
                    <label className="flex items-center gap-2 text-sm text-gray-700 bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 cursor-pointer">
                        <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={deepSearch}
                            onChange={(e) => setDeepSearch(e.target.checked)}
                        />
                        Deep search subtree
                    </label>
                    
                    {debouncedQuery && (
                        <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
                            <span className="text-sm font-medium text-blue-700">
                                {gridTargets.length} result{gridTargets.length === 1 ? '' : 's'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Modern Grid */}
                <div className="mt-6 flex-1 overflow-auto">
                    {gridTargets.length ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {gridTargets.map((t) => (
                                <div
                                    key={t.id}
                                    className="group rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 bg-white overflow-hidden transform hover:scale-105"
                                    title={`${t.type} • ${t.name}`}
                                >
                                    <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                                        {previewMap[t.id] ? (
                                            <img src={previewMap[t.id]} alt={t.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center">
                                                <Grid3X3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                <div className="text-xs text-gray-400">No preview</div>
                                            </div>
                                        )}
                                        
                                        {/* Modern Action Buttons */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-end justify-between p-3 opacity-0 group-hover:opacity-100">
                                            {hasChildren(t.node) && (
                                                <button
                                                    onClick={() => goEnter(t.node)}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white hover:text-gray-900 transition-all duration-200 shadow-lg flex items-center gap-1"
                                                >
                                                    <FolderOpen className="w-3 h-3" />
                                                    Enter
                                                </button>
                                            )}
                                            <button
                                                onClick={() => goPick(t.node)}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center gap-1"
                                            >
                                                <Eye className="w-3 h-3" />
                                                Select
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="px-3 py-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="truncate text-sm font-medium text-gray-900" title={t.name}>
                                                {highlight(t.name || t.id, debouncedQuery)}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] px-2 py-1 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 font-medium">
                                                {t.type}
                                            </span>
                                            {hasChildren(t.node) && (
                                                <span className="text-[10px] text-blue-500 font-medium">
                                                    {t.node.children?.length || 0} items
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-lg font-medium text-gray-700 mb-2">
                                {debouncedQuery ? 'No matches found' : 'No navigable children here'}
                            </p>
                            <p className="text-sm text-gray-500">
                                {debouncedQuery ? 'Try a different search term' : 'This level contains no browseable elements'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}