# DesignStorm Figma Plugin

A powerful Figma plugin that exports complete design data including all images, assets, and design tokens for seamless integration with the DesignStorm rendering system.

## 🚀 Features

- **Complete Design Export**: Export entire Figma documents with all pages and content
- **Image Extraction**: All images embedded as base64 data (no API limits)
- **Asset Collection**: Comprehensive asset extraction including fonts, styles, and components
- **Selection Export**: Export only selected elements for focused workflows
- **Offline Support**: Works without Figma API tokens or internet connection
- **Rich Metadata**: Includes design tokens, styles, and component information

## 📦 Installation

### Method 1: Development Plugin (Recommended)

1. **Clone or download** the `figma-plugin` folder to your local machine
2. **Open Figma** and go to Plugins → Development → New Plugin
3. **Choose "Import plugin from manifest"**
4. **Select** the `manifest.json` file from the `figma-plugin` folder
5. **Install** the plugin

### Method 2: Manual Installation

1. **Copy** all files from the `figma-plugin` folder
2. **Create** a new plugin in Figma
3. **Replace** the default files with the plugin files
4. **Update** the manifest.json with the plugin details

## 🎯 Usage

### Step 1: Prepare Your Design

1. **Open** your Figma design file
2. **Ensure** all images are properly placed and visible
3. **Select** the elements you want to export (optional)

### Step 2: Run the Plugin

1. **Go to** Plugins → DesignStorm Exporter
2. **Choose** export option:
   - **Export Complete Design**: Exports entire document
   - **Export Selected Elements**: Exports only selected items

### Step 3: Configure Export Options

The plugin will automatically include:
- ✅ All image assets (embedded as base64)
- ✅ Font information
- ✅ Design styles
- ✅ Component data
- ✅ Layout and positioning data

### Step 4: Download Export

1. **Wait** for the export to complete
2. **Download** the JSON file
3. **Use** the exported data in DesignStorm

## 📊 Export Data Structure

The plugin exports a comprehensive JSON structure:

```json
{
  "metadata": {
    "exportedBy": "DesignStorm Plugin",
    "version": "1.0.0",
    "lastModified": "2024-01-01T00:00:00.000Z"
  },
  "document": {
    // Complete Figma document structure
  },
  "imageMap": {
    "nodeId1": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "nodeId1_meta": {
      "hash": "imageHash",
      "nodeName": "Image Name",
      "width": 800,
      "height": 600,
      "size": 12345
    }
  },
  "images": [
    {
      "hash": "imageHash",
      "nodeId": "nodeId1",
      "nodeName": "Image Name",
      "bytes": [137, 80, 78, 71, ...],
      "width": 800,
      "height": 600
    }
  ],
  "assets": [...],
  "fonts": [...],
  "styles": {...},
  "components": [...]
}
```

## 🖼️ Image Support

### Embedded Images
- All images are **embedded as base64** data
- **No API limits** or external dependencies
- **Offline rendering** support
- **Complete image metadata** included

### Image Types Supported
- ✅ PNG images
- ✅ JPEG images
- ✅ SVG graphics
- ✅ Image fills in shapes
- ✅ Background images
- ✅ Component images

### Image Processing
- **Automatic extraction** from all node types
- **Recursive scanning** of nested components
- **Metadata preservation** (dimensions, names, etc.)
- **Error handling** for corrupted images

## 🔧 Technical Details

### Plugin Architecture
- **Main Code**: `code.js` - Core export functionality
- **UI Interface**: `ui.html` - User interface
- **Configuration**: `manifest.json` - Plugin metadata

### Export Process
1. **Scan** all nodes in the document/selection
2. **Extract** image data using Figma API
3. **Convert** images to base64 format
4. **Build** comprehensive data structure
5. **Generate** downloadable JSON

### Performance Considerations
- **Large files**: May take time for documents with many images
- **Memory usage**: Base64 encoding increases file size
- **Browser limits**: Very large exports may need chunking

## 🛠️ Development

### Local Development
1. **Edit** plugin files in the `figma-plugin` folder
2. **Reload** plugin in Figma (Plugins → Development → Reload)
3. **Test** changes immediately

### File Structure
```
figma-plugin/
├── manifest.json      # Plugin configuration
├── code.js           # Main plugin logic
├── ui.html           # User interface
└── README.md         # This file
```

### Key Functions
- `exportCompleteDesign()` - Export entire document
- `exportSelectedNodes()` - Export selection only
- `extractAllImages()` - Extract all images
- `buildImageMap()` - Create image mapping
- `extractNodeData()` - Extract node information

## 🚨 Troubleshooting

### Common Issues

**Plugin not loading**
- Check manifest.json syntax
- Ensure all files are in the correct location
- Reload the plugin in Figma

**Export fails**
- Check console for error messages
- Ensure images are not corrupted
- Try exporting smaller selections

**Large file issues**
- Export in smaller chunks
- Check browser memory limits
- Use selection export for large documents

**Images not appearing**
- Verify images are properly placed in Figma
- Check image visibility settings
- Ensure images are not in hidden layers

### Debug Information
- **Console logs** provide detailed export information
- **Progress indicators** show export status
- **Error messages** help identify issues
- **Export summary** shows what was exported

## 📈 Integration with DesignStorm

### Using Exported Data
1. **Upload** the exported JSON to DesignStorm
2. **Images** will automatically load from base64 data
3. **No API tokens** required
4. **Full offline** rendering support

### Benefits
- **Complete fidelity** - All images and assets included
- **No dependencies** - Works without external APIs
- **Fast rendering** - No image loading delays
- **Reliable** - No network or API issues

## 🔄 Updates and Maintenance

### Version History
- **v1.0.0** - Initial release with complete export functionality
- **v1.1.0** - Enhanced image extraction and error handling
- **v1.2.0** - Added selection export and improved UI

### Future Enhancements
- [ ] Batch export capabilities
- [ ] Custom export formats
- [ ] Advanced filtering options
- [ ] Export templates
- [ ] Cloud storage integration

## 📞 Support

For issues or questions:
1. **Check** this README and troubleshooting section
2. **Review** console logs for error details
3. **Test** with smaller selections first
4. **Contact** the development team

---

**DesignStorm Plugin** - Making Figma exports seamless and complete! 🎨 