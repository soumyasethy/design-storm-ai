# DesignStorm - Pixel-Perfect Figma to Next.js Renderer

A comprehensive Next.js application that renders Figma designs with pixel-perfect accuracy, featuring enhanced visual fidelity, advanced layout handling, and specialized component support.

## 🎯 Key Features

### 🎨 Pixel-Perfect Rendering
- **Exact Layout & Spacing**: Matches Figma's `absoluteBoundingBox` positioning with pixel-perfect accuracy
- **Typography Precision**: Exact font families, sizes, weights, line heights, and letter spacing
- **Color Accuracy**: Precise color conversion from Figma's RGB values to CSS
- **Border Radius**: Perfect corner radius handling including circular elements
- **Effects & Shadows**: Drop shadows, inner shadows, and background blur effects

### 🖼️ Enhanced Image Handling
- **Figma API Integration**: Automatic image loading via Figma's `/images` API
- **High-Resolution Support**: 2x scale images for crisp rendering
- **Fallback Handling**: Graceful degradation when images fail to load
- **Scale Mode Support**: Respects Figma's image scale modes (FILL, FIT, CROP)
- **Circular Icons**: Special handling for footer social media icons

### 🧩 Advanced Layout System
- **Flexbox Layouts**: Automatic conversion of Figma's layout modes to CSS Flexbox
- **Grid Systems**: Intelligent grid layout detection and implementation
- **Spacing & Alignment**: Precise handling of item spacing and alignment properties
- **Responsive Design**: Mobile-first responsive breakpoints
- **Component Reuse**: Detection and reuse of Figma components and instances

### 🦶 Footer-Specific Enhancements
- **Perfect Circular Icons**: LinkedIn, Instagram, YouTube icons rendered as perfect circles
- **Grid Alignment**: Logo + links + address columns properly aligned horizontally
- **Social Icon Spacing**: Consistent spacing between social media icons
- **Responsive Footer**: Footer adapts to different screen sizes

### 🔧 Developer Experience
- **Debug Mode**: Visual debugging with element outlines and information overlays
- **Layout Debug**: Specialized debugging for layout components
- **API Testing**: Built-in Figma API testing tools
- **Sample Data**: Pre-built sample designs for testing
- **Error Handling**: Comprehensive error handling and user feedback

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Figma Access Token

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd designstorm-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env.local file
   NEXT_PUBLIC_FIGMA_TOKEN=your_figma_access_token
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
designstorm-app/
├── src/
│   ├── app/
│   │   ├── output/           # Main rendering page
│   │   ├── upload/           # Figma file upload
│   │   └── playground/       # Testing environment
│   ├── components/
│   │   ├── FigmaRenderer.tsx     # Enhanced main renderer
│   │   ├── SimpleFigmaRenderer.tsx # Simplified renderer
│   │   ├── FigmaLayout.tsx       # Layout-specific components
│   │   └── FigmaImageRenderer.tsx # Image handling
│   └── lib/
│       ├── utils.ts              # Utility functions
│       ├── figma-token-extractor.ts # Design token extraction
│       └── optimization.ts       # Performance optimizations
├── public/                   # Static assets
└── figma-plugin/            # Figma plugin for export
```

## 🎨 Usage

### Basic Rendering

1. **Upload Figma File**
   - Navigate to the upload page
   - Upload your Figma JSON export or provide a Figma URL
   - The system will automatically parse and render your design

2. **View Output**
   - The design will be rendered with pixel-perfect accuracy
   - Use debug mode to see element boundaries and properties
   - Toggle between simple and enhanced renderers

### Advanced Features

#### Debug Mode
- **Element Debug**: Shows bounding boxes, element types, and properties
- **Layout Debug**: Highlights layout containers and their properties
- **API Debug**: Monitor Figma API calls and image loading status

#### Layout Controls
- **Enhanced Renderer**: Uses advanced layout detection and component handling
- **Simple Renderer**: Basic rendering without layout optimizations
- **Layout Debug**: Visual debugging for layout-specific components

#### Image Handling
- **Automatic Loading**: Images are automatically fetched from Figma API
- **High Resolution**: 2x scale images for crisp display
- **Fallback Support**: Placeholder content when images fail to load

## 🔧 Configuration

### Figma API Setup

1. **Get Access Token**
   - Go to Figma Settings → Account → Personal access tokens
   - Create a new token with appropriate permissions

2. **Configure Token**
   - Add your token to environment variables
   - Or use the hardcoded token in the output page for testing

### Customization

#### Font Mapping
```typescript
// src/lib/utils.ts
const fontMap: Record<string, string> = {
  'Inter': 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  'Roboto': 'Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  // Add your custom fonts here
};
```

#### Color Conversion
```typescript
// Enhanced color utilities
export function rgbaToCss(r: number, g: number, b: number, a: number = 1): string {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
}
```

#### Layout Detection
```typescript
// Footer component detection
export function isFooterComponent(node: any): boolean {
  const footerKeywords = ['footer', 'social', 'linkedin', 'instagram', 'youtube', 'twitter'];
  const nodeName = node.name?.toLowerCase() || '';
  return footerKeywords.some(keyword => nodeName.includes(keyword));
}
```

## 🎯 Technical Specifications

### Supported Figma Elements

#### Layout Elements
- ✅ **FRAME**: Full layout container support
- ✅ **GROUP**: Grouped elements with proper positioning
- ✅ **CANVAS**: Page-level containers
- ✅ **PAGE**: Document pages

#### Visual Elements
- ✅ **RECTANGLE**: Shapes with fills, strokes, and effects
- ✅ **ELLIPSE**: Circular and elliptical shapes
- ✅ **VECTOR**: Vector graphics and paths
- ✅ **LINE**: Line elements with stroke properties

#### Text Elements
- ✅ **TEXT**: Typography with full style support
- ✅ **Font Families**: Extensive font mapping
- ✅ **Text Alignment**: Left, center, right, justified
- ✅ **Line Height**: Pixel and percentage values
- ✅ **Letter Spacing**: Precise character spacing

#### Component Elements
- ✅ **INSTANCE**: Component instances with proper rendering
- ✅ **COMPONENT**: Master components
- ✅ **Component Variants**: Support for component variants

### Advanced Features

#### Effects & Styles
- ✅ **Drop Shadows**: Offset, radius, and color support
- ✅ **Inner Shadows**: Inset shadow effects
- ✅ **Background Blur**: Backdrop filter effects
- ✅ **Opacity**: Element transparency
- ✅ **Rotation**: Element rotation in radians

#### Layout Properties
- ✅ **Layout Mode**: HORIZONTAL and VERTICAL flex layouts
- ✅ **Alignment**: Primary and counter axis alignment
- ✅ **Spacing**: Item spacing between elements
- ✅ **Padding**: Container padding support
- ✅ **Z-Index**: Layer ordering

#### Image Handling
- ✅ **Image Fills**: Background images from Figma
- ✅ **Scale Modes**: FILL, FIT, CROP support
- ✅ **High Resolution**: 2x scale for crisp display
- ✅ **Error Handling**: Fallback content for failed loads
- ✅ **Loading States**: Visual loading indicators

## 🚀 Performance Optimizations

### Image Loading
- **Batch Processing**: Images loaded in batches to respect API limits
- **Rate Limiting**: Automatic retry with exponential backoff
- **Caching**: Image URLs cached to prevent redundant requests
- **Lazy Loading**: Images loaded only when needed

### Rendering Performance
- **Component Memoization**: React.memo for expensive components
- **Style Optimization**: Efficient style calculation and caching
- **Tree Traversal**: Optimized node tree traversal algorithms
- **Memory Management**: Proper cleanup of image resources

## 🔍 Debugging & Troubleshooting

### Common Issues

#### Images Not Loading
1. Check Figma API token validity
2. Verify file permissions in Figma
3. Check browser console for API errors
4. Use the "Test API" button to verify connectivity

#### Layout Issues
1. Enable "Layout Debug" to see layout containers
2. Check Figma layout mode properties
3. Verify absoluteBoundingBox values
4. Use "Enhanced Renderer" for better layout handling

#### Typography Problems
1. Verify font family mapping in utils.ts
2. Check font loading in browser
3. Verify text style properties in Figma
4. Use debug mode to inspect text elements

### Debug Tools

#### Visual Debugging
- **Element Outlines**: Colored borders around elements
- **Property Overlays**: Hover information for elements
- **Layout Highlighting**: Special highlighting for layout containers
- **Coordinate Display**: Real-time coordinate information

#### Console Debugging
- **API Logs**: Detailed Figma API call logs
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Rendering performance data
- **State Monitoring**: Component state changes

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

### Code Style
- Use TypeScript for all new code
- Follow React best practices
- Add JSDoc comments for complex functions
- Maintain consistent naming conventions

### Testing
- Test with various Figma file types
- Verify responsive behavior
- Check accessibility compliance
- Test performance with large designs

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Figma API for providing the design data
- Next.js team for the excellent framework
- Tailwind CSS for the utility-first styling
- React community for the component ecosystem

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting guide
- Test with the sample designs provided

---

**DesignStorm** - Transforming Figma designs into pixel-perfect Next.js applications with enhanced visual fidelity and advanced layout capabilities.

