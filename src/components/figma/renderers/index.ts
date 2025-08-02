// Import all renderers
import { TextRenderer } from './TextRenderer';
import { RectangleRenderer } from './RectangleRenderer';
import { EllipseRenderer } from './EllipseRenderer';
import { ImageRenderer } from './ImageRenderer';
import { FrameRenderer } from './FrameRenderer';
import { GroupRenderer } from './GroupRenderer';
import { VectorRenderer } from './VectorRenderer';

// Import registry functions
import { registerComponent } from '../ComponentRegistry';

// Register all component renderers
registerComponent('TEXT', TextRenderer);
registerComponent('RECTANGLE', RectangleRenderer);
registerComponent('ELLIPSE', EllipseRenderer);
registerComponent('IMAGE', ImageRenderer);
registerComponent('FRAME', FrameRenderer);
registerComponent('GROUP', GroupRenderer);
registerComponent('VECTOR', VectorRenderer);

// Register aliases for common types
registerComponent('LINE', VectorRenderer); // Lines are typically vectors
registerComponent('POLYGON', VectorRenderer); // Polygons are vectors
registerComponent('STAR', VectorRenderer); // Stars are vectors
registerComponent('COMPONENT', FrameRenderer); // Components render like frames
registerComponent('INSTANCE', FrameRenderer); // Instances render like frames
registerComponent('BOOLEAN_OPERATION', VectorRenderer); // Boolean operations are vectors

// Export the main DynamicRenderer
export { DynamicRenderer } from '../ComponentRegistry';
export { FigmaRendererProps } from '../ComponentRegistry'; 