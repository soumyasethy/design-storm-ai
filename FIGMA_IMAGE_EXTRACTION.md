# 🖼️ Figma Image Extraction Guide

## Overview

This guide explains how to use the Figma image extraction functionality to load images from your Figma designs into the rendered output.

## ✅ Step-by-Step Implementation

### Step 1: Collect All Image Node IDs
The system automatically traverses the Figma JSON tree to find all nodes with `fills[].type === 'IMAGE'` and collects their IDs.

**Example:**
```typescript
const imageNodeIds = ["2784:2982", "1234:5678", "9999:0000"];
```

### Step 2: Call the Figma API /images Endpoint
The system uses the Figma API to fetch image URLs:

```bash
GET https://api.figma.com/v1/images/:file_key?ids=ID1,ID2,ID3&format=png
```

**Parameters:**
- `:file_key` - Your Figma File Key (extracted from URL)
- `ids` - Comma-separated string of node IDs (URL-encoded)
- `format` - Image format (png or jpg)

**Example Curl:**
```bash
curl --location 'https://api.figma.com/v1/images/ypmbs59kFHrbHGEGAdImU6?ids=2784%3A2982,1234%3A5678&format=png' \
--header 'X-Figma-Token: figd_xxxxxxxx'
```

**Response:**
```json
{
  "images": {
    "2784:2982": "https://figma-alpha-api.s3.amazonaws.com/images/...",
    "1234:5678": "https://figma-alpha-api.s3.amazonaws.com/images/..."
  }
}
```

### Step 3: Final Output (Mapped)
```typescript
{
  "2784:2982": "https://figma-cdn-url.png",
  "1234:5678": "https://figma-cdn-url2.png"
}
```

## 🚀 How to Use

### Method 1: Upload Page (Recommended)

1. **Upload your Figma JSON file** to the upload page
2. **Add your Figma URL** (optional but recommended)
   - Format: `https://figma.com/file/xxxxxxxx/...`
   - The system will extract the file key automatically
3. **Add your Figma Access Token** (required for image loading)
   - Get your token from: Figma → Settings → Account → Personal access tokens
   - Format: `figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
4. **Click "Generate Output with Images"**
5. **Images will load automatically** in the output page

### Method 2: Manual API Loading

1. **Load your design** in the output page
2. **Open the debug panel** (click the debug button)
3. **Click "Load Images from API"** button
4. **Images will be fetched** and displayed

## 🔧 Technical Implementation

### Core Function: `loadFigmaImagesFromNodes`

```typescript
export async function loadFigmaImagesFromNodes({
  figmaFileKey,
  figmaToken,
  rootNode,
}: {
  figmaFileKey: string;
  figmaToken: string;
  rootNode: any;
}): Promise<Record<string, string>> {
  // Step 1: Find all image nodes
  const imageNodeIds: string[] = [];
  
  function findImageNodes(node: any) {
    if (node?.fills?.some((f: any) => f.type === "IMAGE")) {
      imageNodeIds.push(node.id);
    }
    node.children?.forEach(findImageNodes);
  }
  
  findImageNodes(rootNode);
  
  // Step 2: Call Figma API
  const idsParam = encodeURIComponent(imageNodeIds.join(","));
  const url = `https://api.figma.com/v1/images/${figmaFileKey}?ids=${idsParam}&format=png&scale=2`;
  
  const res = await fetch(url, {
    headers: {
      "X-Figma-Token": figmaToken,
    },
  });
  
  const data = await res.json();
  return data.images ?? {};
}
```

### Integration with Renderer

```typescript
// Pass imageMap to renderer
<SimpleFigmaRenderer 
  node={frameNode} 
  imageMap={imageMap} 
  fileKey={fileKey}
  figmaToken={figmaToken}
/>
```

## 🎯 Features

### ✅ Automatic Image Detection
- Scans entire Figma JSON tree
- Identifies all nodes with image fills
- Collects unique node IDs

### ✅ Batch Processing
- Handles multiple images efficiently
- Respects Figma API rate limits
- Automatic retry on failures

### ✅ Error Handling
- Graceful fallback when images fail to load
- Detailed error logging
- User-friendly status messages

### ✅ Security
- Token stored securely in localStorage
- No hardcoded credentials
- Secure API communication

## 🔍 Debug Information

The debug panel shows:
- **Images Found**: Number of image nodes detected
- **Image Status**: Current loading status
- **File Key**: Extracted from Figma URL
- **Token Status**: Whether token is loaded
- **Image URLs**: List of all loaded image URLs

## 🧪 Testing

### Test File
Use `public/test-figma-with-images.json` to test the functionality:

```json
{
  "document": {
    "children": [
      {
        "children": [
          {
            "id": "3:3",
            "fills": [{"type": "IMAGE"}]
          }
        ]
      }
    ]
  }
}
```

### Manual Testing
1. Upload the test file
2. Add a valid Figma URL and token
3. Check that images load in the output
4. Verify debug panel shows correct information

## 🚨 Troubleshooting

### Common Issues

**"No images found"**
- Check that your Figma design actually contains image elements
- Verify the JSON export includes image fills

**"API error"**
- Ensure your Figma token is valid and has proper permissions
- Check that the file key is correct
- Verify the Figma file is accessible

**"Rate limit hit"**
- The system automatically retries with exponential backoff
- Wait a few minutes and try again

**"Images not displaying"**
- Check browser console for errors
- Verify image URLs are accessible
- Ensure CORS is not blocking the requests

### Debug Steps
1. Open browser developer tools
2. Check the Console tab for error messages
3. Look at the Network tab for failed requests
4. Verify the debug panel information

## 📚 API Reference

### Figma API Endpoints Used

**GET /v1/images/:file_key**
- **Purpose**: Fetch image URLs for specific node IDs
- **Authentication**: X-Figma-Token header
- **Parameters**: 
  - `ids`: Comma-separated node IDs
  - `format`: Image format (png/jpg)
  - `scale`: Image scale factor

### Response Format
```json
{
  "images": {
    "node_id": "image_url",
    "node_id_2": "image_url_2"
  }
}
```

## 🔄 Future Enhancements

- [ ] Support for different image formats
- [ ] Image optimization and compression
- [ ] Caching for better performance
- [ ] Batch size optimization
- [ ] Progressive image loading
- [ ] Image fallback handling 