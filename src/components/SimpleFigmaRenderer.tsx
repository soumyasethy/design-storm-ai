'use client';

import React, { useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useFigmaScale } from '@/lib/useFigmaScale';
import {
    rgbaToCss,
    getFontFamilyWithFallback,
    getCornerRadius,
    getTextAlign,
    getVerticalAlign,
    isFooterComponent,
    getImageScaleMode,
    isNodeVisible,
} from '@/lib/utils';
import { createReactFontFamily } from '@/lib/fontUtils';

/* ===================== config ===================== */
/** set to true to use plain <img>, which avoids Next optimizer churn on signed figma urls */
const USE_PLAIN_IMG = true;
/** tiny safety buffers to avoid text cropping in tight boxes */
const TEXT_W_BUFFER = 4; // px
const TEXT_H_BUFFER = 4; // px

/* ===================== tiny utils ===================== */
// Accept any non-empty string so plugin-relative paths (e.g. 'plugin-assets/...') are allowed
const isUsableUrl = (u?: string) => typeof u === 'string' && u.trim().length > 0;

const sanitize = (styles: any): React.CSSProperties => {
    const allow = new Set([
        'position', 'top', 'right', 'bottom', 'left', 'zIndex', 'display', 'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'alignContent', 'alignSelf', 'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'order', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'overflow', 'overflowX', 'overflowY', 'visibility', 'boxSizing', 'border', 'borderWidth', 'borderStyle', 'borderColor', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius', 'boxShadow', 'background', 'backgroundColor', 'backgroundImage', 'backgroundRepeat', 'backgroundPosition', 'backgroundSize', 'color', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'textAlign', 'textDecoration', 'textTransform', 'textShadow', 'textOverflow', 'whiteSpace', 'wordBreak', 'transform', 'transformOrigin', 'opacity', 'WebkitFontSmoothing', 'WebkitMaskImage', 'WebkitMaskMode', 'WebkitMaskSize', 'WebkitMaskPosition', 'WebkitMaskRepeat', 'filter', 'backdropFilter', 'mixBlendMode',
    ]);
    const out: any = {};
    for (const [k, v] of Object.entries(styles || {})) {
        if (v == null) continue;
        let key = k;
        if (k === 'webkitFontSmoothing') key = 'WebkitFontSmoothing';
        if (k === 'webkitMaskImage') key = 'WebkitMaskImage';
        if (k === 'webkitMaskMode') key = 'WebkitMaskMode';
        if (k === 'webkitMaskSize') key = 'WebkitMaskSize';
        if (k === 'webkitMaskPosition') key = 'WebkitMaskPosition';
        if (k === 'webkitMaskRepeat') key = 'WebkitMaskRepeat';
        if (!allow.has(key)) continue;
        if (key === 'mixBlendMode' && ['pass-through', 'PASS_THROUGH'].includes(String(v))) continue;
        out[key] = v;
    }
    return out;
};

/* ---------- IMAGE RESOLUTION (fill.imageRef ➜ imageMap first) ---------- */
const resolveFillImageUrl = (
    f: any,
    nodeId?: string,
    imageMap?: Record<string, string>
): string => {
    if (!f || f.type !== 'IMAGE') return '';
    const direct = f.imageUrl as string | undefined;
    const byRef = f.imageRef && imageMap ? imageMap[f.imageRef] : '';
    const byNode = nodeId && imageMap ? imageMap[nodeId] : '';
    const url = direct || byRef || byNode || '';
    return isUsableUrl(url) ? url : '';
};

const fillStyles = (
    fills: any[],
    nodeId?: string,
    imageMap?: Record<string, string>,
    node?: any
): React.CSSProperties => {
    if (!fills || !fills.length) return { backgroundColor: 'transparent' };
    const f = fills[0];
    const s: React.CSSProperties = {};
    if (f.type === 'SOLID' && f.color) {
        const R = Math.round((f.color.r || 0) * 255);
        const G = Math.round((f.color.g || 0) * 255);
        const B = Math.round((f.color.b || 0) * 255);
        const A = f.color.a == null ? 1 : f.color.a;
        const isPureWhite = R === 255 && G === 255 && B === 255 && A >= 1;
        const isNearBlack = R <= 3 && G <= 3 && B <= 3; // ~#000
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const isShape = ['RECTANGLE', 'ELLIPSE', 'VECTOR', 'LINE'].includes(node?.type);
        const isContainer = ['FRAME','GROUP','INSTANCE','COMPONENT','PAGE','CANVAS'].includes(node?.type);
        const lowAlpha = A <= 0.12;
        // Skip common placeholder/overlay backgrounds on containers
        if (!(isContainer && (isPureWhite || lowAlpha || (isNearBlack && A <= 0.2)))) {
            s.backgroundColor = rgbaToCss(f.color.r, f.color.g, f.color.b, f.color.a);
        }
    } else if (f.type === 'IMAGE') {
        const url = resolveFillImageUrl(f, nodeId, imageMap);
        if (url) {
            s.backgroundImage = `url('${url}')`;
            s.backgroundSize = f.scaleMode === 'FILL' ? 'cover' : 'contain';
            s.backgroundPosition = 'center';
            s.backgroundRepeat = 'no-repeat';
        }
    } else if (f.gradientStops?.length) {
        const stops = f.gradientStops
            .map(
                (st: any) =>
                    `${rgbaToCss(st.color.r, st.color.g, st.color.b, st.color.a)} ${st.position * 100}%`
            )
            .join(', ');
        let dir = '';
        if (Array.isArray(f.gradientTransform)) {
            const t = f.gradientTransform.flat();
            const ang = (Math.atan2(t[1], t[0]) * 180) / Math.PI;
            dir = `${ang}deg`;
        }
        const type = f.type;
        s.background =
            type === 'GRADIENT_RADIAL'
                ? `radial-gradient(circle at center, ${stops})`
                : type === 'GRADIENT_ANGULAR'
                    ? `conic-gradient(from ${dir || '0deg'}, ${stops})`
                    : type === 'GRADIENT_DIAMOND'
                        ? `radial-gradient(ellipse at center, ${stops})`
                        : `linear-gradient(${dir || 'to bottom'}, ${stops})`;
        if (type === 'GRADIENT_DIAMOND') (s as any).clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    }
    return s;
};

const cornerRadius = (n: any) => {
    const {
        cornerRadius: cr,
        cornerRadiusTopLeft: tl,
        cornerRadiusTopRight: tr,
        cornerRadiusBottomLeft: bl,
        cornerRadiusBottomRight: br,
        absoluteBoundingBox: bb,
    } = n || {};
    if ([tl, tr, bl, br].some((v) => v !== undefined)) {
        const TL = tl ?? cr ?? 0,
            TR = tr ?? cr ?? 0,
            BL = bl ?? cr ?? 0,
            BR = br ?? cr ?? 0;
        return `${getCornerRadius(TL)} ${getCornerRadius(TR)} ${getCornerRadius(BR)} ${getCornerRadius(
            BL
        )}`;
    }
    if (cr !== undefined) return getCornerRadius(cr, bb?.width, bb?.height);
    return '0px';
};

const strokeStyles = (node: any): React.CSSProperties => {
    const s: React.CSSProperties = {};
    const st = node.strokes?.[0] || node.vectorStroke;
    if (!st) return s;
    let color = 'transparent',
        width = 0,
        align = 'CENTER',
        dash: number[] = [];
    if (st.type === 'SOLID' && st.color) {
        color = rgbaToCss(st.color.r, st.color.g, st.color.b, st.color.a);
        width = st.strokeWeight || node.strokeWeight || 1;
        align = st.strokeAlign || 'CENTER';
        dash = st.dashPattern || [];
    } else if (st?.color) {
        color = rgbaToCss(st.color.r, st.color.g, st.color.b, st.color.a);
        width = st.weight || 1;
        align = st.position || 'CENTER';
        dash = st.dashPattern || [];
    }
    if (width > 0) {
        s.boxSizing = 'border-box';
        if (align === 'OUTSIDE') {
            (s as any).outline = `${width}px solid ${color}`;
            (s as any).outlineOffset = '0px';
            if (dash.length) {
                (s as any).outlineStyle = 'dashed';
                (s as any).outlineDasharray = dash.join(', ');
            }
        } else {
            s.border = `${width}px ${dash.length ? 'dashed' : 'solid'} ${color}`;
            if (dash.length) (s as any).borderDasharray = dash.join(', ');
        }
    }
    if (st.type?.startsWith('GRADIENT') && st.gradientStops?.length) {
        const g = st.gradientStops
            .map(
                (p: any) =>
                    `${rgbaToCss(p.color.r, p.color.g, p.color.b, p.color.a)} ${p.position * 100}%`
            )
            .join(', ');
        s.borderImage =
            st.type === 'GRADIENT_LINEAR'
                ? `linear-gradient(to right, ${g}) 1`
                : `radial-gradient(circle, ${g}) 1`;
    }
    return s;
};

const effectStyles = (node: any): React.CSSProperties => {
    const s: React.CSSProperties = {};
    (node.effects || []).forEach((e: any) => {
        if (!e?.visible) return;
        if (e.type === 'DROP_SHADOW') {
            const filt = `drop-shadow(${e.offset?.x || 0}px ${e.offset?.y || 0}px ${e.radius || 0}px ${e.color ? rgbaToCss(e.color.r, e.color.g, e.color.b, e.color.a) : 'rgba(0,0,0,0.3)'
                })`;
            s.filter = s.filter ? `${s.filter} ${filt}` : filt;
        }
        if (e.type === 'INNER_SHADOW') {
            const bs = `inset ${e.offset?.x || 0}px ${e.offset?.y || 0}px ${e.radius || 0}px ${e.color ? rgbaToCss(e.color.r, e.color.g, e.color.b, e.color.a) : 'rgba(0,0,0,0.3)'
                }`;
            s.boxShadow = s.boxShadow ? `${s.boxShadow}, ${bs}` : bs;
        }
        if (e.type === 'LAYER_BLUR') {
            const b = `blur(${e.radius || 0}px)`;
            s.filter = s.filter ? `${s.filter} ${b}` : b;
        }
        if (e.type === 'BACKGROUND_BLUR') {
            s.backdropFilter = `blur(${e.radius || 0}px)`;
        }
    });
    return s;
};

/* ===================== image helpers ===================== */
const getNodeImageUrl = (node: any, imageMap: Record<string, string>) => {
    if (!node) return '';
    const imageFill = (node.fills || []).find((f: any) => f?.type === 'IMAGE');
    const byFill = resolveFillImageUrl(imageFill, node.id, imageMap);
    if (isUsableUrl(byFill)) return byFill;
    const byNode = node.id && imageMap[node.id] ? imageMap[node.id] : '';
    if (isUsableUrl(byNode)) return byNode;
    const byName = node.name && imageMap[node.name] ? imageMap[node.name] : '';
    return isUsableUrl(byName) ? byName : '';
};

const findFirstImageUrl = (n: any, imageMap: Record<string, string>): string => {
    if (!n) return '';
    const direct = getNodeImageUrl(n, imageMap);
    if (isUsableUrl(direct)) return direct;
    for (const c of n.children || []) {
        const u = findFirstImageUrl(c, imageMap);
        if (isUsableUrl(u)) return u;
    }
    return '';
};

const groupHasMaskChild = (n: any) =>
    n?.type === 'GROUP' && n?.children?.some((c: any) => c?.isMask && !!c?.maskType);

const exportedGroupUrl = (n: any, imageMap: Record<string, string>) => {
    if (!n) return '';
    const byId = n.id && imageMap[n.id] ? imageMap[n.id] : '';
    if (isUsableUrl(byId)) return byId;
    const byName = n.name && imageMap[n.name] ? imageMap[n.name] : '';
    return isUsableUrl(byName) ? byName : '';
};

/* ===================== registry types ===================== */
interface RegistryProps {
    node: any;
    styles: React.CSSProperties;
    imageMap: Record<string, string>;
    showDebug: boolean;
    devMode: boolean;
}
type Renderer = (p: RegistryProps) => React.ReactElement | null;

/* ===================== TEXT ===================== */
const TextRenderer: Renderer = ({ node, styles, showDebug, devMode }) => {
    if (!node || typeof node !== 'object') return null;
    const characters: string = node.characters?.replace(/\u2028/g, '\n') || '';
    const st = node.style || {};

    useEffect(() => {
        if (st.fontFamily)
            import('@/lib/fontLoader')
                .then(({ loadFont }) => loadFont(st.fontFamily, [st.fontWeight || 400, 700]).catch(() => { }))
                .catch(() => { });
    }, [st.fontFamily, st.fontWeight]);

    if (!characters) return null;

    const align = getTextAlign(st?.textAlignHorizontal || 'LEFT');

    const baseColor =
        node.fills?.[0]?.type === 'SOLID' && node.fills[0].color
            ? rgbaToCss(
                node.fills[0].color.r,
                node.fills[0].color.g,
                node.fills[0].color.b,
                node.fills[0].color.a
            )
            : undefined;

    const container: React.CSSProperties = {
        ...styles,
        width: styles.width ? `calc(${styles.width} + ${TEXT_W_BUFFER * 2}px)` : undefined,
        height: styles.height ? `calc(${styles.height} + ${TEXT_H_BUFFER * 2}px)` : undefined,
        // Padding disabled to avoid visible blocks around text

        display: 'flex',
        alignItems: getVerticalAlign(st?.textAlignVertical || 'TOP'),
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        textAlign: align as any,
        fontFamily:
            getFontFamilyWithFallback(st.fontFamily) || createReactFontFamily(st.fontFamily) || 'inherit',
        fontSize: st.fontSize ? `${st.fontSize}px` : 'inherit',
        fontWeight: st.fontWeight || 'normal',
        lineHeight: st.lineHeightPx
            ? `${st.lineHeightPx}px`
            : st.lineHeightPercent
                ? `${st.lineHeightPercent}%`
                : 'normal',
        letterSpacing: st.letterSpacing ? `${st.letterSpacing}px` : undefined,
        color: baseColor,
        whiteSpace: 'pre-wrap',
        overflow: 'visible',
        wordBreak: 'break-word' as any,
        background: 'transparent',
        pointerEvents: 'auto',
        zIndex: Math.min((typeof (styles as any).zIndex === 'number' ? (styles as any).zIndex : 0) + 10, 50),
    };

    const overrides: number[] = node.characterStyleOverrides || [];
    const table: Record<string, any> = node.styleOverrideTable || {};

    const rich =
        !overrides.length || !Object.keys(table).length
            ? characters
            : (() => {
                // Group characters by their style override
                const groups: Array<{ style: React.CSSProperties; text: string; key: string }> = [];
                let currentGroup: { style: React.CSSProperties; text: string; key: string } | null = null;
                
                characters.split('').forEach((ch, i) => {
                    if (ch === '\n') {
                        // End current group and add line break
                        if (currentGroup) {
                            groups.push(currentGroup);
                            currentGroup = null;
                        }
                        groups.push({ style: {}, text: '\n', key: `br-${i}` });
                        return;
                    }
                    
                    const overrideIndex = overrides[i] || 0;
                    const cs = table[String(overrideIndex)] || {};
                    
                    // Create style object
                    const style: React.CSSProperties = {};
                    if (cs.fontFamily) style.fontFamily = createReactFontFamily(cs.fontFamily);
                    if (cs.fontSize) style.fontSize = `${cs.fontSize}px`;
                    if (cs.fontWeight) style.fontWeight = cs.fontWeight;
                    if (cs.fontStyle) style.fontStyle = String(cs.fontStyle).toLowerCase();
                    if (cs.letterSpacing) style.letterSpacing = `${cs.letterSpacing}px`;
                    if (cs.lineHeightPx) style.lineHeight = `${cs.lineHeightPx}px`;
                    else if (cs.lineHeightPercent) style.lineHeight = `${cs.lineHeightPercent}%`;
                    
                    const fill = cs.fills?.[0];
                    if (fill?.type === 'SOLID' && fill.color)
                        style.color = rgbaToCss(fill.color.r, fill.color.g, fill.color.b, fill.color.a);

                    const deco = (cs.textDecoration || cs.textDecorationLine || '').toString().toLowerCase();
                    if (deco.includes('underline')) {
                        style.textDecoration = 'underline';
                        (style as any).textUnderlineOffset = '2px';
                        (style as any).textDecorationThickness = '1px';
                    }
                    if (cs.textCase === 'UPPER') style.textTransform = 'uppercase';
                    if (cs.textCase === 'LOWER') style.textTransform = 'lowercase';
                    if (cs.textCase === 'TITLE') style.textTransform = 'capitalize';

                    // Check if we can continue with current group
                    const styleKey = JSON.stringify(style);
                    if (currentGroup && currentGroup.key === styleKey) {
                        currentGroup.text += ch;
                    } else {
                        // End current group and start new one
                        if (currentGroup) {
                            groups.push(currentGroup);
                        }
                        currentGroup = { style, text: ch, key: styleKey };
                    }
                });
                
                // Add final group
                if (currentGroup) {
                    groups.push(currentGroup);
                }
                
                // Render groups - optimize to avoid unnecessary spans
                return groups.map((group, index) => {
                    if (group.text === '\n') {
                        return <br key={group.key} />;
                    }
                    
                    // Only wrap in span if there are actual styles to apply
                    if (Object.keys(group.style).length === 0) {
                        return group.text; // Return plain text without wrapper
                    }
                    
                    return (
                        <span key={`group-${index}`} style={group.style}>
                            {group.text}
                        </span>
                    );
                });
            })();

    return (
        <div style={container} title={`${node.name} (TEXT)`} data-figma-node-id={node.id}>
            {showDebug && devMode && (
                <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 shadow">
                    {node.name}
                </div>
            )}
            <div style={{ display: 'inline', lineHeight: 'inherit' }}>{rich}</div>
        </div>
    );
};

/* ===================== LINE ===================== */
const LineRenderer: Renderer = ({ node, styles }) => {
    if (!node || !node.strokes || !Array.isArray(node.strokes) || node.strokes.length === 0) {
        return null;
    }

    const stroke = node.strokes[0];
    if (!stroke || stroke.type !== 'SOLID' || !stroke.color) {
        return null;
    }

    const { r, g, b, a } = stroke.color;
    const strokeColor = rgbaToCss(r, g, b, a);
    const strokeWeight = node.strokeWeight || 1;
    
    // Get dimensions from bounding box
    const bb = node.absoluteBoundingBox;
    if (!bb) return null;
    
    const { width, height } = bb;
    const isVertical = height > width;
    
    const lineStyle: React.CSSProperties = {
        ...styles,
        backgroundColor: strokeColor,
        // For very thin lines, ensure minimum visibility
        width: isVertical ? Math.max(strokeWeight, 1) + 'px' : styles.width,
        height: isVertical ? styles.height : Math.max(strokeWeight, 1) + 'px',
    };

    return <div style={lineStyle} title={`${node.name} (LINE)`} data-figma-node-id={node.id} />;
};

/* ===================== IMAGE/SHAPE ===================== */
const ImageRendererBase: Renderer = ({ node, styles, imageMap, showDebug, devMode }) => {
    const url = useMemo(() => getNodeImageUrl(node, imageMap), [node, imageMap]);
    const isFooterIcon =
        isFooterComponent(node) || /linkedin|instagram|youtube|social/i.test(node.name || '');
    const isAvatar =
        /avatar|profile|user/i.test(node.name || '') ||
        node.absoluteBoundingBox?.width === node.absoluteBoundingBox?.height;

    const fit = getImageScaleMode(node) as any;
    const bb = node.absoluteBoundingBox || {};
    const w = Math.max(1, Math.round(Number(bb.width || 100)));
    const h = Math.max(1, Math.round(Number(bb.height || 100)));

    const imgStyles = useMemo<React.CSSProperties>(
        () => ({
            width: '100%',
            height: '100%',
            objectFit: fit,
            borderRadius: (isFooterIcon || isAvatar) ? '50%' : (styles as any).borderRadius,
        }),
        [fit, isFooterIcon, isAvatar, styles]
    );

    const placeholder = useMemo<React.CSSProperties>(
        () => ({
            ...imgStyles,
            backgroundImage: 'url(/placeholder.svg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            ...fillStyles(node.fills || [], node.id, imageMap),
            ...strokeStyles(node),
            ...effectStyles(node),
        }),
        [imgStyles, imageMap, node]
    );

    return (
        <div style={styles} title={`${node.name} (${node.type})`}>
            {showDebug && devMode && (
                <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 shadow">
                    {node.name} · Asset
                </div>
            )}
            {!url ? (
                <div style={placeholder} />
            ) : USE_PLAIN_IMG ? (
                <img
                    src={url}
                    alt={node.name || 'image'}
                    width={w}
                    height={h}
                    decoding="async"
                    loading="lazy"
                    style={imgStyles}
                    draggable={false}
                />
            ) : (
                <Image
                    src={url}
                    alt={node.name || 'image'}
                    width={w}
                    height={h}
                    style={imgStyles}
                    unoptimized
                    priority={false}
                />
            )}
        </div>
    );
};
const ImageRenderer: Renderer = (p) =>
    React.createElement(React.memo(ImageRendererBase as any), p as any);

const ShapeRenderer: Renderer = ({ node, styles, imageMap }) => {
    const type = node.type;
    const bb = node.absoluteBoundingBox || {};
    const base: React.CSSProperties = {
        ...styles,
        width: `${bb.width || 100}px`,
        height: `${bb.height || 100}px`,
        borderRadius: type === 'ELLIPSE' ? '50%' : cornerRadius(node),
        boxSizing: 'border-box',
        ...fillStyles(node.fills || [], node.id, imageMap), // <-- pass imageMap (fix)
        ...strokeStyles(node),
        ...effectStyles(node),
    };
    return <div style={base} title={`${node.name} (${type})`} />;
};

/* ===================== CONTAINER ===================== */

// Helper function to determine if a container can be flattened
const canFlattenContainer = (_node: any): boolean => {
    // Disable container flattening to avoid positioning issues with nested groups
    return false;
};

const ContainerRenderer: Renderer = ({ node, styles, imageMap, showDebug, devMode }) => {
    // background for frames/containers - moved to top to avoid conditional hook usage
    const bg = useMemo<React.CSSProperties>(() => {
        const base: React.CSSProperties = { ...styles };
        const hasFills = Array.isArray(node.fills) && node.fills.length > 0;
        if (hasFills) {
            Object.assign(base, fillStyles(node.fills, node.id, imageMap, node));
        } else if (node.backgroundColor) {
            const { r, g, b, a } = node.backgroundColor;
            const R = Math.round((r || 0) * 255);
            const G = Math.round((g || 0) * 255);
            const B = Math.round((b || 0) * 255);
            const A = a == null ? 1 : a;
            const isPureWhite = R === 255 && G === 255 && B === 255 && A >= 1;
            if (!isPureWhite) {
                base.backgroundColor = rgbaToCss(r, g, b, a);
            }
        }
        // Border radius for frames/containers
        (base as any).borderRadius = cornerRadius(node);

        // Never show default placeholder gray backgrounds for containers
        if (base.backgroundColor === 'rgba(200,200,200,0.25)') {
            delete (base as any).backgroundColor;
        }
        return base;
    }, [styles, imageMap, node]);

    // Check if this container can be flattened
    const shouldFlatten = node.type === 'GROUP' && canFlattenContainer(node);
    const children = node.children || [];
    
    // If we can flatten and have exactly one child, render the child with merged positioning
    if (shouldFlatten && children.length === 1) {
        const child = children[0];
        
        // For TEXT nodes, we want to preserve the container's positioning
        if (child.type === 'TEXT') {
            return (
                <div
                    style={styles}
                    data-figma-node-id={node.id}
                    title={`${node.name} (${node.type}, flattened)`}
                >
                    <Node
                        key={child.id}
                        node={{
                            ...child,
                            __parentBB: (node as any).__parentBB,
                            // Adjust child's positioning to be relative to the flattened container
                            absoluteBoundingBox: {
                                ...child.absoluteBoundingBox,
                                x: (child.absoluteBoundingBox?.x || 0) - (node.absoluteBoundingBox?.x || 0),
                                y: (child.absoluteBoundingBox?.y || 0) - (node.absoluteBoundingBox?.y || 0)
                            }
                        }}
                        imageMap={imageMap}
                        showDebug={showDebug}
                        devMode={devMode}
                    />
                </div>
            );
        }
    }

    /* -------- case: FLATTEN MASK GROUP --------
       If a GROUP contains a child with isMask=true & maskType set, we render the
       PARENT GROUP as a single exported bitmap (imageMap[node.id]) so we don't have
       to emulate Figma masking in the browser. Sibling nodes (like TEXT) will still
       render as separate DOM so they layer above correctly. */
    if (groupHasMaskChild(node)) {
        const url = exportedGroupUrl(node, imageMap) || findFirstImageUrl(node, imageMap);
        if (isUsableUrl(url)) {
            const m: React.CSSProperties = {
                ...bg,
                backgroundImage: `url('${url}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            };
            return (
                <div
                    className="relative"
                    style={m}
                    title={`${node.name} (${node.type})`}
                    data-figma-node-id={node.id}
                >
                    {showDebug && devMode && (
                        <div className="absolute -top-8 left-0 bg-purple-700 text-white text-xs px-2 py-1 rounded shadow">
                            {node.name} · Mask Group (flattened)
                        </div>
                    )}
                </div>
            );
        }
    }

    // default: compose its children normally
    return (
        <div
            className="relative"
            style={bg}
            title={`${node.name} (${node.type})`}
            data-figma-node-id={node.id}
        >
            {showDebug && devMode && (
                <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 shadow">
                    {node.name} · {node.type}
                </div>
            )}
            {node.children?.map((c: any) => (
                <Node
                    key={c.id}
                    node={c}
                    imageMap={imageMap}
                    showDebug={showDebug}
                    devMode={devMode}
                />
            ))}
        </div>
    );
};

const Registry: Record<string, Renderer> = {
    TEXT: TextRenderer,
    RECTANGLE: (p) => (getNodeImageUrl(p.node, p.imageMap) ? ImageRenderer(p) : ShapeRenderer(p)),
    ELLIPSE: (p) => (getNodeImageUrl(p.node, p.imageMap) ? ImageRenderer(p) : ShapeRenderer(p)),
    VECTOR: (p) => (getNodeImageUrl(p.node, p.imageMap) ? ImageRenderer(p) : ShapeRenderer(p)),
    LINE: LineRenderer,
    FRAME: ContainerRenderer,
    GROUP: ContainerRenderer,
    CANVAS: ContainerRenderer,
    PAGE: ContainerRenderer,
    INSTANCE: ContainerRenderer,
    COMPONENT: ContainerRenderer,
};

/* ===================== layout + stacking ===================== */
const layoutStyles = (node: any, parentBB?: any): React.CSSProperties => {
    const s: React.CSSProperties = {};
    
    // For VECTOR nodes, prefer absoluteRenderBounds over absoluteBoundingBox if available
    // This handles cases where rotation/transforms make the bounding box microscopic
    const isVector = node.type === 'VECTOR';
    const hasRotation = node.rotation && Math.abs(node.rotation) > 0.01;
    const renderBounds = node.absoluteRenderBounds;
    const boundingBox = node.absoluteBoundingBox;
    
    const bb = (isVector && hasRotation && renderBounds) ? renderBounds : boundingBox;

    if (bb) {
        const { x, y, width, height } = bb;
        if (parentBB) {
            s.position = 'absolute';
            s.left = `${x - parentBB.x}px`;
            s.top = `${y - parentBB.y}px`;
            s.width = `${width}px`;
            s.height = `${height}px`;
        } else {
            s.position = 'relative';
            s.width = `${width}px`;
            s.height = `${height}px`;
        }
    }

    if (node.minWidth !== undefined) s.minWidth = `${node.minWidth}px`;
    if (node.maxWidth !== undefined) s.maxWidth = `${node.maxWidth}px`;
    if (node.minHeight !== undefined) s.minHeight = `${node.minHeight}px`;
    if (node.maxHeight !== undefined) s.maxHeight = `${node.maxHeight}px`;

    const t: string[] = [];
    // Ignore rotation transforms - Figma exports already rotated elements in correct position
    if (node.scale && (node.scale.x !== 1 || node.scale.y !== 1)) t.push(`scale(${node.scale.x}, ${node.scale.y})`);
    if (node.skew) t.push(`skew(${node.skew}deg)`);
    if (node.relativeTransform?.length) t.push(`matrix(${node.relativeTransform.flat().join(', ')})`);
    if (node.transform?.length) t.push(`matrix(${node.transform.join(', ')})`);
    if (node.isMirrored) {
        if (node.mirrorAxis === 'HORIZONTAL') t.push('scaleX(-1)');
        else if (node.mirrorAxis === 'VERTICAL') t.push('scaleY(-1)');
        else if (node.mirrorAxis === 'BOTH') t.push('scale(-1,-1)');
    }
    if (t.length) {
        s.transform = t.join(' ');
        s.transformOrigin = 'center center';
    }

    if (node.opacity !== undefined && node.opacity !== 1) s.opacity = node.opacity;

    // Stacking: explicit zIndex else child order (cap at reasonable values)
    if (node.zIndex !== undefined) {
        s.zIndex = Math.min(Math.max(node.zIndex, -1000), 1000);
    } else if ((node as any).__order !== undefined) {
        s.zIndex = Math.min(Math.max((node as any).__order, 0), 100);
    }

    if (node.clipContent === true || ['CANVAS', 'PAGE'].includes(node.type)) s.overflow = 'hidden';

    // ----- Figma Auto-Layout ➜ CSS Flexbox -----
    const mapMain = (v?: string) => {
        switch (String(v || '').toUpperCase()) {
            case 'SPACE_BETWEEN':
                return 'space-between';
            case 'CENTER':
                return 'center';
            case 'MAX':
            case 'END':
                return 'flex-end';
            case 'MIN':
            case 'START':
            default:
                return 'flex-start';
        }
    };
    const mapCross = (v?: string) => {
        switch (String(v || '').toUpperCase()) {
            case 'CENTER':
                return 'center';
            case 'MAX':
            case 'END':
                return 'flex-end';
            case 'BASELINE':
                return 'baseline';
            case 'STRETCH':
                return 'stretch';
            case 'MIN':
            case 'START':
            default:
                return 'flex-start';
        }
    };
    if (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL') {
        s.display = 'flex';
        s.flexDirection = node.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
        (s as any).justifyContent = mapMain(node.primaryAxisAlignItems);
        (s as any).alignItems = mapCross(node.counterAxisAlignItems || node.primaryAxisAlignItems);
        if (typeof node.itemSpacing === 'number') (s as any).gap = `${node.itemSpacing}px`;
        if (typeof node.paddingLeft === 'number') (s as any).paddingLeft = `${node.paddingLeft}px`;
        if (typeof node.paddingRight === 'number') (s as any).paddingRight = `${node.paddingRight}px`;
        if (typeof node.paddingTop === 'number') (s as any).paddingTop = `${node.paddingTop}px`;
        if (typeof node.paddingBottom === 'number') (s as any).paddingBottom = `${node.paddingBottom}px`;
    }

    return sanitize(s);
};

/* ===================== Node + root ===================== */
const NodeInner: React.FC<{
    node: any;
    imageMap: Record<string, string>;
    showDebug: boolean;
    devMode: boolean;
}> = ({ node, imageMap, showDebug, devMode }) => {
    if (!node || !isNodeVisible(node)) return null;
    const styles = layoutStyles(node, (node as any).__parentBB);
    const R = Registry[node.type] || ((p: RegistryProps) => <ContainerRenderer {...p} />);
    const component = R({ node, styles, imageMap, showDebug, devMode });
    // console.log(`***** ${node.type}:`, React.isValidElement(component) ?
    //     `<${typeof component.type === 'string' ? component.type : (component.type?.name || 'Anonymous')} ${Object.entries(component.props ?? {}).filter(([k,v]) => k !== 'children').map(([k,v]) => `${k}={${typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}}`).join(' ')} />` :
    //     String(component)
    // );
    return component;
};

const Node = React.memo(
    NodeInner,
    (a, b) =>
        a.node === b.node &&
        a.imageMap === b.imageMap &&
        a.showDebug === b.showDebug &&
        a.devMode === b.devMode
);

interface Props {
    node: any;
    imageMap?: Record<string, string>;
    showDebug?: boolean;
    isRoot?: boolean;
    devMode?: boolean;
    enableScaling?: boolean;
    maxScale?: number;
}

const SimpleFigmaRenderer: React.FC<Props> = ({
    node,
    imageMap = {},
    showDebug = false,
    isRoot = false,
    devMode = false,
    enableScaling = true,
    maxScale = 2,
}) => {
    // annotate once with parent bounds + order for stacking
    const annotated = useMemo(() => {
        if (!node || typeof node !== 'object') return null;
        const mark = (n: any, parentBB?: any, depth = 0) => {
            const kids = (n.children || []).map((k: any, i: number) =>
                mark({ ...k, __order: i }, n.absoluteBoundingBox, depth + 1)
            );
            return { ...n, __parentBB: parentBB, __depth: depth, children: kids };
        };
        return mark(node, undefined, 0);
    }, [node]);

    const designWidth = node?.absoluteBoundingBox?.width ?? 1440;
    const scale = useFigmaScale(designWidth, maxScale);
    const rootBox = node?.absoluteBoundingBox;

    if (!node || typeof node !== 'object') return <div>Invalid node</div>;

    const content = (
        <div
            className="relative"
            style={{ width: `${rootBox?.width || 0}px`, height: `${rootBox?.height || 0}px` }}
        >
            <Node node={annotated} imageMap={imageMap} showDebug={showDebug} devMode={devMode} />
        </div>
    );

    if (!(enableScaling && isRoot)) return content;

    return (
        <div
            style={{
                width: '100vw',
                height: '100vh',
                overflowX: 'hidden',
                overflowY: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px',
            }}
        >
            <div
                style={{
                    width: `${designWidth}px`,
                    height: `${rootBox?.height || 800}px`,
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                    position: 'relative',
                    flexShrink: 0,
                    maxHeight: 'calc(100vh - 40px)', // Prevent overflow on tall designs
                }}
            >
                {devMode && (
                    <div
                        style={{
                            position: 'absolute',
                            top: -30,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#ff6b6b',
                            color: '#fff',
                            fontSize: 12,
                            padding: '4px 8px',
                            borderRadius: 4,
                            zIndex: 10,
                        }}
                    >
                        SCALED {scale.toFixed(2)}× · Design {designWidth}px
                    </div>
                )}
                {content}
            </div>
        </div>
    );
};

export default SimpleFigmaRenderer;