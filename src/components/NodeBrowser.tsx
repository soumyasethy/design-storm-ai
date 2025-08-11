'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { FigmaNode } from '@/lib/figmaTypes';
import { NAV_TYPES, PREVIEWABLE_TYPES, hasChildren } from '@/lib/figmaNavigation';
import { figmaAuthHeaders } from '@/lib/utils';

type BrowserTarget = { id: string; name: string; type: string; node: FigmaNode };

const CHUNK = 90;

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
            <mark className="bg-yellow-200">{match}</mark>
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

    useEffect(() => {
        if (debouncedQueryRef.current) window.clearTimeout(debouncedQueryRef.current);
        debouncedQueryRef.current = window.setTimeout(() => setDebouncedQuery(query.trim()), 200);
        return () => {
            if (debouncedQueryRef.current) window.clearTimeout(debouncedQueryRef.current);
        };
    }, [query]);

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
            const url = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(
                chunk.join(','),
            )}&format=png&scale=2`;
            try {
                const res = await fetch(url, { headers: figmaAuthHeaders(figmaToken) });
                if (!res.ok) continue;
                const data = await res.json();
                if (data?.images) setPreviewMap((prev) => ({ ...prev, ...data.images }));
            } catch {
                /* ignore */
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

    const clearSearch = () => setQuery('');

    return (
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 py-4 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                        {fileThumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={fileThumbnailUrl} alt="file" className="w-8 h-8 rounded object-cover border" />
                        ) : (
                            <div className="w-8 h-8 rounded bg-gray-200" />
                        )}
                        <div className="font-semibold truncate">Browse & pick any level</div>
                        <div className="text-xs text-gray-500 hidden sm:block">Search & drill down as far as you like</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={goPickHere}
                            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                            Use current level
                        </button>
                        <button onClick={onClose} className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200">
                            Close
                        </button>
                    </div>
                </div>

                {/* Breadcrumb */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    {path.map((n, idx) => (
                        <div key={n.id} className="flex items-center gap-2">
                            <button
                                onClick={() => setPath(path.slice(0, idx + 1))}
                                className={`px-2 py-0.5 rounded ${
                                    idx === path.length - 1 ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                                title={n.name}
                            >
                                [{n.type}] {n.name || n.id}
                            </button>
                            {idx < path.length - 1 && <span className="text-gray-400">›</span>}
                        </div>
                    ))}
                    {path.length > 1 && (
                        <button
                            onClick={() => setPath((p) => p.slice(0, -1))}
                            className="ml-2 px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                        >
                            Up one
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by name or type… (⌘/Ctrl+K)"
                            className="h-9 w-72 sm:w-96 px-3 pr-16 text-sm bg-white border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                                    e.preventDefault();
                                    const el = e.currentTarget;
                                    el.focus();
                                    el.select();
                                }
                                if (e.key === 'Escape') clearSearch();
                            }}
                        />
                        {query && (
                            <button onClick={clearSearch} className="absolute right-2 top-1.5 text-xs text-gray-500 hover:text-gray-700">
                                Clear
                            </button>
                        )}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={deepSearch}
                            onChange={(e) => setDeepSearch(e.target.checked)}
                        />
                        Deep search subtree
                    </label>
                    {debouncedQuery && (
                        <span className="text-xs text-gray-500">
              {gridTargets.length} result{gridTargets.length === 1 ? '' : 's'}
            </span>
                    )}
                </div>

                {/* Grid */}
                <div className="mt-4 flex-1 overflow-auto">
                    {gridTargets.length ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {gridTargets.map((t) => (
                                <div
                                    key={t.id}
                                    className="group rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-sm transition bg-white overflow-hidden"
                                    title={`${t.type} • ${t.name}`}
                                >
                                    <div className="relative aspect-[4/3] w-full bg-gray-100 flex items-center justify-center">
                                        {previewMap[t.id] ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={previewMap[t.id]} alt={t.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-xs text-gray-400">No preview</div>
                                        )}
                                        {hasChildren(t.node) && (
                                            <button
                                                onClick={() => goEnter(t.node)}
                                                className="absolute bottom-2 left-2 px-2 py-1 text-[11px] rounded bg-white/90 border hover:bg-white"
                                            >
                                                Enter
                                            </button>
                                        )}
                                        <button
                                            onClick={() => goPick(t.node)}
                                            className="absolute bottom-2 right-2 px-2 py-1 text-[11px] rounded bg-blue-600 text-white hover:bg-blue-700"
                                        >
                                            Select
                                        </button>
                                    </div>
                                    <div className="px-2 py-2 flex items-center justify-between">
                                        <div className="truncate text-sm font-medium" title={t.name}>
                                            {highlight(t.name || t.id, debouncedQuery)}
                                        </div>
                                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {t.type}
                    </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                            {debouncedQuery ? 'No matches. Try a different term.' : 'No navigable children here.'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}