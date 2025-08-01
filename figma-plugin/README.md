# DesignStorm Figma Plugin

A powerful Figma plugin that exports complete design data including all assets, images, fonts, and styles for better code generation.

## 🚀 **Why Use This Plugin?**

### **Current Limitations of JSON Export:**
- ❌ **No actual image files** - Only image references
- ❌ **Missing font files** - Only font names
- ❌ **No vector assets** - Limited SVG data
- ❌ **Incomplete effects** - Missing shadow/blur data
- ❌ **No component variants** - Limited component data

### **Plugin Benefits:**
- ✅ **Complete image assets** - Actual image bytes included
- ✅ **Full font information** - Font families, weights, styles
- ✅ **Complete effects data** - Shadows, blurs, overlays
- ✅ **Component variants** - All component states and variants
- ✅ **Design tokens** - Colors, typography, spacing systems
- ✅ **Layout data** - Auto-layout, constraints, positioning

## 📦 **Installation**

### **Method 1: Development Installation**

1. **Clone or download** this plugin folder
2. **Open Figma Desktop App**
3. **Go to Plugins** → **Development** → **New Plugin**
4. **Click "Import plugin from manifest"**
5. **Select the `manifest.json` file** from this folder
6. **The plugin will appear** in your development plugins list

### **Method 2: Manual Installation**

1. **Create a new folder** in your Figma plugins directory:
   ```
   ~/Library/Application Support/Figma/plugins/designstorm-exporter/
   ```
2. **Copy all files** from this folder to the new directory
3. **Restart Figma**
4. **Go to Plugins** → **Development** → **DesignStorm Exporter**

## 🎯 **How to Use**

### **1. Export Complete Design**
1. **Open your Figma design**
2. **Go to Plugins** → **DesignStorm Exporter**
3. **Click "Export Complete Design"**
4. **Wait for processing** (progress bar will show status)
5. **Download the JSON file** with all assets

### **2. Export Selected Elements**
1. **Select specific elements** in your Figma design
2. **Open the plugin**
3. **Click "Export Selected Elements"**
4. **Download the focused export**

### **3. Download Options**
- **Download JSON** - Complete design data
- **Download Assets** - Images and assets only
- **Download All (ZIP)** - Complete package

## 📊 **What Gets Exported**

### **Complete Design Data:**
```json
{
  "pages": [
    {
      "id": "page-id",
      "name": "Page Name",
      "children": [...]
    }
  ],
  "assets": [
    {
      "id": "asset-id",
      "name": "hero-image.png",
      "type": "IMAGE",
      "bytes": "base64-encoded-image-data",
      "width": 1920,
      "height": 1080
    }
  ],
  "images": [
    {
      "hash": "image-hash",
      "nodeId": "node-id",
      "nodeName": "Hero Section",
      "bytes": "base64-encoded-image-data",
      "width": 1920,
      "height": 1080
    }
  ],
  "fonts": [
    {
      "family": "Inter",
      "style": "Regular"
    }
  ],
  "styles": {
    "paint": [...],
    "text": [...],
    "effect": [...],
    "grid": [...]
  },
  "components": [
    {
      "id": "component-id",
      "name": "Button",
      "type": "COMPONENT",
      "variants": [...]
    }
  ],
  "metadata": {
    "name": "Design Name",
    "version": "1.0.0",
    "lastModified": "2024-01-01T00:00:00.000Z",
    "pluginVersion": "1.0.0"
  }
}
```

### **Enhanced Node Data:**
```json
{
  "id": "node-id",
  "name": "Hero Section",
  "type": "FRAME",
  "x": 0,
  "y": 0,
  "width": 1920,
  "height": 1080,
  "fills": [
    {
      "type": "IMAGE",
      "image": {
        "hash": "image-hash",
        "bytes": "base64-encoded-image-data",
        "width": 1920,
        "height": 1080
      }
    }
  ],
  "effects": [
    {
      "type": "DROP_SHADOW",
      "color": {"r": 0, "g": 0, "b": 0, "a": 0.1},
      "offset": {"x": 0, "y": 4},
      "radius": 8,
      "spread": 0
    }
  ],
  "children": [...]
}
```

## 🔧 **Integration with DesignStorm**

### **1. Upload Plugin Export**
1. **Export your design** using the Figma plugin
2. **Go to DesignStorm** → **Upload**
3. **Upload the plugin JSON file**
4. **Get enhanced code generation** with all assets

### **2. Enhanced Code Output**
The plugin export enables:
- ✅ **Real image assets** in your code
- ✅ **Proper font loading** with fallbacks
- ✅ **Complete CSS effects** (shadows, blurs)
- ✅ **Component variants** and states
- ✅ **Design token system** for consistency

### **3. Example Output**
```jsx
// With plugin export - Real assets included
const HeroSection = () => (
  <section 
    style={{
      backgroundImage: `url(data:image/png;base64,${imageBytes})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
    }}
  >
    <h1 style={{ fontFamily: 'Inter, sans-serif' }}>
      Welcome to DesignStorm
    </h1>
  </section>
);
```

## 🛠 **Development**

### **File Structure:**
```
figma-plugin/
├── manifest.json      # Plugin configuration
├── code.js           # Main plugin logic
├── ui.html           # Plugin UI
└── README.md         # This file
```

### **Key Features:**
- **Asset Extraction** - Gets actual image bytes
- **Font Analysis** - Extracts all font information
- **Style Collection** - Gathers design tokens
- **Component Data** - Exports component variants
- **Progress Tracking** - Shows export progress
- **Error Handling** - Graceful error management

### **API Methods Used:**
- `figma.getImageByHash()` - Get image data
- `figma.getLocalImageAssets()` - Get all assets
- `figma.getLocalPaintStyles()` - Get color styles
- `figma.getLocalTextStyles()` - Get typography styles
- `figma.getLocalEffectStyles()` - Get effect styles
- `figma.getLocalComponents()` - Get components

## 🚨 **Limitations**

### **Figma API Restrictions:**
- **File size limits** - Large exports may be truncated
- **Memory constraints** - Very large designs may fail
- **Network timeouts** - Slow connections may timeout
- **Permission scope** - Some data requires specific permissions

### **Browser Limitations:**
- **Download size** - Large files may not download properly
- **Memory usage** - Large exports may cause browser issues
- **Processing time** - Complex designs take longer to export

## 🔄 **Updates & Maintenance**

### **Version History:**
- **v1.0.0** - Initial release with basic export functionality
- **v1.1.0** - Added progress tracking and error handling
- **v1.2.0** - Enhanced asset extraction and UI improvements

### **Future Features:**
- **Batch export** - Export multiple designs at once
- **Custom formats** - Export to different file formats
- **Cloud storage** - Direct upload to cloud services
- **Real-time sync** - Live design updates
- **Team collaboration** - Shared export settings

## 📞 **Support**

### **Common Issues:**
1. **Plugin not loading** - Check manifest.json syntax
2. **Export fails** - Try with smaller selection
3. **Download issues** - Check browser download settings
4. **Memory errors** - Close other Figma tabs

### **Getting Help:**
- **Check the console** for error messages
- **Try with a simple design** first
- **Restart Figma** if issues persist
- **Update the plugin** to latest version

## 📄 **License**

This plugin is part of the DesignStorm project and follows the same licensing terms.

---

**Happy exporting! 🎉**

The DesignStorm Figma Plugin will revolutionize your design-to-code workflow by providing complete access to all your design assets and data. 