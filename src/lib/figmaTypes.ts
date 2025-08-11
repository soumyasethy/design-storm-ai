export interface FigmaData {
    name?: string;
    lastModified?: string;
    thumbnailUrl?: string;
    version?: string;
    role?: string;
    editorType?: string;
    linkAccess?: string;
    nodes?: { [key: string]: { document: FigmaNode } };
    document?: FigmaNode;
    components?: Record<string, unknown> | any[];
    componentSets: Record<string, any>;
    styles?: Record<string, unknown> | any[];
    originalData?: unknown;
    metadata?: { exportedBy?: string; pluginVersion?: string; lastModified?: string };
    imageMap?: Record<string, string>;
    images?: Array<{
        hash: string;
        nodeId: string;
        nodeName: string;
        bytes: Uint8Array;
        width: number;
        height: number;
    }>;
}

export interface FigmaNode {
    id: string;
    name: string;
    type: string;
    children?: FigmaNode[];
    absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
    backgroundColor?: { r: number; g: number; b: number; a?: number };
    fills?: Array<{
        type: string;
        color?: { r: number; g: number; b: number; a?: number };
        imageRef?: string;
        gradientStops?: any[];
        gradientTransform?: any;
    }>;
    strokes?: Array<{
        type: string;
        color?: { r: number; g: number; b: number; a?: number };
        strokeWeight?: number;
        strokeAlign?: string;
        dashPattern?: number[];
    }>;
    strokeWeight?: number;
    cornerRadius?: number;
    cornerRadiusTopLeft?: number;
    cornerRadiusTopRight?: number;
    cornerRadiusBottomLeft?: number;
    cornerRadiusBottomRight?: number;
    characters?: string;
    style?: {
        fontFamily?: string;
        fontSize?: number;
        fontWeight?: number;
        textAlignHorizontal?: string;
        lineHeight?: number;
        letterSpacing?: number;
        lineHeightPx?: number;
        lineHeightPercent?: number;
        textDecoration?: string;
        textDecorationLine?: string;
        textCase?: string;
        hyperlink?: { url?: string };
    };
    opacity?: number;
    visible?: boolean;
    clipContent?: boolean;
    effects?: any[];
    vectorRotation?: number;
    rotation?: number;
    relativeTransform?: number[][];
    transform?: number[];
    isMirrored?: boolean;
    mirrorAxis?: 'HORIZONTAL' | 'VERTICAL' | 'BOTH';
    scale?: { x: number; y: number };
    background?: Array<{ type: string; imageRef?: string }>;
    exportSettings?: any[];
    layoutMode?: string;
    primaryAxisAlignItems?: string;
    counterAxisAlignItems?: string;
    paddingLeft?: number;
    paddingRight?: number;
    itemSpacing?: number;
    isMask?: boolean;
    maskType?: any;
}