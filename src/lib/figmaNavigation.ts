import type { FigmaNode } from './figmaTypes';

export const NAV_TYPES = new Set(['PAGE', 'CANVAS', 'SECTION', 'FRAME', 'COMPONENT', 'INSTANCE']);
export const PREVIEWABLE_TYPES = new Set([
    'SECTION',
    'FRAME',
    'COMPONENT',
    'INSTANCE',
    'GROUP',
    'RECTANGLE',
    'ELLIPSE',
    'VECTOR',
    'LINE',
]);

export function hasChildren(n?: FigmaNode) {
    return Array.isArray(n?.children) && n!.children!.length > 0;
}

/** Ensure a node has an absoluteBoundingBox by unioning child bboxes when needed */
export function synthesizeAbsoluteBB(n: FigmaNode): FigmaNode {
    if (n.absoluteBoundingBox) return n;
    const kids = (n.children || []).filter((k) => k.absoluteBoundingBox);
    if (!kids.length) return n;
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    for (const k of kids) {
        const bb = k.absoluteBoundingBox!;
        minX = Math.min(minX, bb.x);
        minY = Math.min(minY, bb.y);
        maxX = Math.max(maxX, bb.x + bb.width);
        maxY = Math.max(maxY, bb.y + bb.height);
    }
    return { ...n, absoluteBoundingBox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY } };
}