# Figma Image Extraction Guide

This guide explains how to use the Figma image extraction functionality to automatically extract and render images from Figma designs.

## Overview

The image extraction system consists of three main utilities:

1. **`findImageNodeIds(node: any): string[]`** - Recursively finds all image nodes
2. **`getImageUrls(fileKey: string, nodeIds: string[], token: string): Promise<Record<string, string>>`** - Fetches image URLs from Figma API
3. **`loadFigmaImages(node: any, fileKey: string, token: string)`** - Complete image loading utility

## Setup

### 1. Get Figma Access Token

1. Go to Figma → Settings → Account
2. Scroll down to "Personal access tokens"
3. Click "Create new token"
4. Give it a name and copy the token

### 2. Get Figma File Key

Extract the file key from your Figma URL:
```
https://www.figma.com/file/ABC123DEF456/My-Design
                    ^^^^^^^^^^^^^^^^
                    This is your file key
```

## Usage

### Basic Usage with FigmaImageRenderer

```tsx
import FigmaImageRenderer from './components/FigmaImageRenderer';

function MyComponent() {
  return (
    <FigmaImageRenderer
      node={figmaNode}
      fileKey="ABC123DEF456"
      figmaToken="your-figma-token"
      showDebug={true}
      isRoot={true}
    />
  );
}
```

### Advanced Usage with Manual Control

```tsx
import { loadFigmaImages, findImageNodeIds, getImageUrls } from './lib/utils';
import FigmaRenderer from './components/FigmaRenderer';

function MyComponent() {
  const [imageMap, setImageMap] = useState({});
  const [updatedNode, setUpdatedNode] = useState(figmaNode);

  useEffect(() => {
    const loadImages = async () => {
      const { imageMap, updatedNode } = await loadFigmaImages(
        figmaNode,
        'ABC123DEF456',
        'your-figma-token'
      );
      
      setImageMap(imageMap);
      setUpdatedNode(updatedNode);
    };

    loadImages();
  }, []);

  return (
    <FigmaRenderer
      node={updatedNode}
      imageMap={imageMap}
      showDebug={true}
      isRoot={true}
    />
  );
}
```

### Step-by-Step Manual Process

#### 1. Find Image Node IDs

```tsx
import { findImageNodeIds } from './lib/utils';

const imageNodeIds = findImageNodeIds(figmaNode);
console.log('Image node IDs:', imageNodeIds);
// Output: ['1:2', '3:4', '5:6']
```

#### 2. Get Image URLs

```tsx
import { getImageUrls } from './lib/utils';

const imageUrls = await getImageUrls(
  'ABC123DEF456',
  ['1:2', '3:4', '5:6'],
  'your-figma-token'
);
console.log('Image URLs:', imageUrls);
// Output: { '1:2': 'https://...', '3:4': 'https://...' }
```

#### 3. Render with Images

```tsx
import FigmaRenderer from './components/FigmaRenderer';

<FigmaRenderer
  node={figmaNode}
  imageMap={imageUrls}
  showDebug={true}
  isRoot={true}
/>
```

## API Reference

### `findImageNodeIds(node: any): string[]`

Recursively traverses a Figma node tree and returns an array of node IDs that have image fills.

**Parameters:**
- `node`: The Figma node to search through

**Returns:**
- Array of node IDs that contain image fills

**Example:**
```tsx
const imageIds = findImageNodeIds(figmaNode);
// ['1:2', '3:4', '5:6']
```

### `getImageUrls(fileKey: string, nodeIds: string[], token: string): Promise<Record<string, string>>`

Fetches image URLs from the Figma REST API for the given node IDs.

**Parameters:**
- `fileKey`: The Figma file key
- `nodeIds`: Array of node IDs to fetch images for
- `token`: Figma access token

**Returns:**
- Promise that resolves to a mapping of node ID to image URL

**Example:**
```tsx
const imageUrls = await getImageUrls('ABC123', ['1:2'], 'token');
// { '1:2': 'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/...' }
```

### `loadFigmaImages(node: any, fileKey: string, token: string): Promise<{ imageMap: Record<string, string>; updatedNode: any }>`

Complete utility that finds image nodes, fetches URLs, and injects them into the node tree.

**Parameters:**
- `node`: The Figma node to process
- `fileKey`: The Figma file key
- `token`: Figma access token

**Returns:**
- Promise that resolves to an object containing:
  - `imageMap`: Mapping of node IDs to image URLs
  - `updatedNode`: Node tree with image URLs injected

**Example:**
```tsx
const { imageMap, updatedNode } = await loadFigmaImages(
  figmaNode,
  'ABC123',
  'token'
);
```

### `extractFileKeyFromUrl(figmaUrl: string): string | null`

Utility to extract file key from a Figma URL.

**Parameters:**
- `figmaUrl`: Full Figma URL

**Returns:**
- File key string or null if not found

**Example:**
```tsx
const fileKey = extractFileKeyFromUrl('https://figma.com/file/ABC123/Design');
// 'ABC123'
```

## Figma Node Structure

Images in Figma are represented as nodes with `fills` array containing objects with `type: 'IMAGE'`:

```json
{
  "id": "1:2",
  "name": "Image Rectangle",
  "type": "RECTANGLE",
  "fills": [
    {
      "type": "IMAGE",
      "imageRef": "image-reference-id"
    }
  ],
  "absoluteBoundingBox": {
    "x": 100,
    "y": 100,
    "width": 200,
    "height": 150
  }
}
```

## Error Handling

The utilities include built-in error handling:

- **API Errors**: Network errors and Figma API errors are caught and logged
- **Missing Parameters**: Functions gracefully handle missing file keys or tokens
- **No Images**: Returns empty results when no images are found

## Testing

Visit `/test-images` to test the image extraction functionality with a sample Figma node.

## Security Notes

- Never expose your Figma token in client-side code in production
- Use environment variables for tokens
- Consider implementing server-side proxy for API calls in production

## Troubleshooting

### Common Issues

1. **"Figma API error: 403"**
   - Check that your token is valid and has proper permissions
   - Ensure the file is accessible with your account

2. **"No images found"**
   - Verify that your Figma design actually contains image fills
   - Check that the node structure is correct

3. **Images not rendering**
   - Ensure the `imageMap` prop is passed to `FigmaRenderer`
   - Check browser console for CORS errors

### Debug Mode

Enable debug mode to see detailed information:

```tsx
<FigmaImageRenderer
  node={figmaNode}
  fileKey="ABC123"
  figmaToken="token"
  showDebug={true}  // Enable debug mode
  isRoot={true}
/>
```

This will show:
- Node boundaries
- Node names and types
- Image loading status
- Coordinate normalization info 