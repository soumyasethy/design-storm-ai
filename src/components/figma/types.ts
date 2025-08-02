export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  
  // Position & Layout
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  relativeTransform?: Array<Array<number>>;
  rotation?: number;
  x?: number;
  y?: number;
  
  // Group Support
  isGroup?: boolean;
  groupId?: string;
  
  // Alignment
  layoutAlign?: string;
  layoutGrow?: number;
  layoutMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  
  // Resizing
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  
  // Spacing & Padding
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  
  // Appearance
  opacity?: number;
  visible?: boolean;
  cornerRadius?: number;
  cornerRadiusTopLeft?: number;
  cornerRadiusTopRight?: number;
  cornerRadiusBottomLeft?: number;
  cornerRadiusBottomRight?: number;
  
  // Fill
  fills?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a?: number };
    imageRef?: string;
    imageUrl?: string;
    gradientStops?: Array<{
      position: number;
      color: { r: number; g: number; b: number; a?: number };
    }>;
    gradientTransform?: Array<Array<number>>;
    opacity?: number;
    blendMode?: string;
  }>;
  
  // Stroke
  strokes?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a?: number };
    strokeWeight?: number;
    strokeAlign?: string;
    strokeCap?: string;
    strokeJoin?: string;
    dashPattern?: Array<number>;
    gradientStops?: Array<{
      position: number;
      color: { r: number; g: number; b: number; a?: number };
    }>;
    gradientTransform?: Array<Array<number>>;
    opacity?: number;
    blendMode?: string;
  }>;
  strokeWeight?: number;
  strokeAlign?: string;
  
  // Effects
  effects?: Array<{
    type: string;
    visible?: boolean;
    radius?: number;
    color?: { r: number; g: number; b: number; a?: number };
    offset?: { x: number; y: number };
    spread?: number;
    blendMode?: string;
    showShadowBehindNode?: boolean;
  }>;
  
  // Text
  characters?: string;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    textAlignHorizontal?: string;
    textAlignVertical?: string;
    lineHeight?: number;
    lineHeightPx?: number;
    lineHeightPercent?: number;
    letterSpacing?: number;
    textDecoration?: string;
    textCase?: string;
    paragraphIndent?: number;
    paragraphSpacing?: number;
    autoRename?: boolean;
    fills?: Array<{
      type: string;
      color?: { r: number; g: number; b: number; a?: number };
    }>;
  };
  
  // Rich Text Support
  characterStyleOverrides?: number[];
  styleOverrideTable?: Record<string, any>;
  
  // Mask Support
  isMask?: boolean;
  maskType?: string;
  
  // Component Support
  componentId?: string;
  componentSetId?: string;
  
  // Z-Index & Stacking
  zIndex?: number;
  
  // Enhanced properties for geometric elements and transforms
  transform?: Array<number>;
  skew?: number;
  scale?: { x: number; y: number };
  clipPath?: string;
  maskImage?: string;
  geometricType?: string;
  lineStart?: { x: number; y: number };
  lineEnd?: { x: number; y: number };
  angleDegrees?: number;
  sectionTransition?: string;
  
  // Enhanced Rectangle & Vector Support
  isRectangle?: boolean;
  isVector?: boolean;
  vectorPaths?: Array<{
    path: string;
    fillRule?: 'NONZERO' | 'EVENODD';
    windingRule?: 'NONZERO' | 'EVENODD';
  }>;
  
  // Enhanced Vector Support
  vectorType?: string;
  vectorPoints?: Array<{ x: number; y: number }>;
  vectorClosed?: boolean;
  vectorFillRule?: 'NONZERO' | 'EVENODD';
  vectorWindingRule?: 'NONZERO' | 'EVENODD';
  
  // Enhanced Vector Rotation Support
  vectorRotation?: number;
  vectorRotationCenter?: { x: number; y: number };
  vectorRotationAxis?: 'X' | 'Y' | 'Z' | 'CENTER';
  vectorRotationMode?: 'ABSOLUTE' | 'RELATIVE' | 'INCREMENTAL';
  
  // Vector Position & Alignment
  vectorX?: number;
  vectorY?: number;
  vectorAlign?: string;
  vectorAnchor?: { x: number; y: number };
  
  // Vector Mirroring Support
  vectorMirror?: boolean;
  vectorMirrorAxis?: 'HORIZONTAL' | 'VERTICAL' | 'BOTH';
  vectorMirrorAngle?: number;
  vectorMirrorLength?: number;
  vectorMirrorTransform?: Array<Array<number>>;
  
  // Vector Fill Support
  vectorFill?: {
    type: string;
    color?: { r: number; g: number; b: number; a?: number };
    gradientStops?: Array<{
      position: number;
      color: { r: number; g: number; b: number; a?: number };
    }>;
    gradientTransform?: Array<Array<number>>;
    opacity?: number;
  };
  
  // Vector Stroke Support
  vectorStroke?: {
    color?: { r: number; g: number; b: number; a?: number };
    weight?: number;
    position?: string;
    cap?: string;
    join?: string;
    dashPattern?: Array<number>;
    gradientStops?: Array<{
      position: number;
      color: { r: number; g: number; b: number; a?: number };
    }>;
    gradientTransform?: Array<Array<number>>;
    opacity?: number;
  };
  
  // Vector Corner Radius Support
  vectorCornerRadius?: number;
  vectorCornerRadiusTopLeft?: number;
  vectorCornerRadiusTopRight?: number;
  vectorCornerRadiusBottomLeft?: number;
  vectorCornerRadiusBottomRight?: number;
  
  // Mirroring & Transform Support
  isMirrored?: boolean;
  mirrorAxis?: 'HORIZONTAL' | 'VERTICAL' | 'BOTH';
  mirrorTransform?: Array<Array<number>>;
  
  // Aspect Ratio Support
  aspectRatio?: number;
  maintainAspectRatio?: boolean;
  aspectRatioLocked?: boolean;
  
  // Individual Corner Support
  cornerRadiusLocked?: boolean;
  
  // Dimension Support
  width?: number;
  height?: number;
  originalWidth?: number;
  originalHeight?: number;
  dimensionLocked?: boolean;
  
  // Union & Boolean Operations
  isUnion?: boolean;
  unionChildren?: FigmaNode[];
  booleanOperation?: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE';
  
  // Enhanced Blend Mode Support
  blendMode?: string;
  isolation?: boolean;
  
  // Show/Hide Support
  isVisible?: boolean;
  isLocked?: boolean;
  isHidden?: boolean;
  
  // Enhanced mask group support
  isMaskGroup?: boolean;
  maskGroupId?: string;
  maskGroupMode?: 'ADD' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE';
  maskGroupChildren?: FigmaNode[];
  maskGroupParent?: string;
  maskGroupIndex?: number;
  maskGroupOpacity?: number;
  maskGroupBlendMode?: string;
  
  // Selection Colors (for debugging/development)
  selectionColors?: {
    fill?: string;
    stroke?: string;
    background?: string;
  };
} 