# DesignStorm - Pixel-Perfect Figma to Next.js Renderer

A comprehensive Next.js application that renders Figma designs with pixel-perfect accuracy, featuring enhanced visual fidelity, advanced layout handling, rich text processing, and specialized component support.

## 🎯 Key Features

### 🎨 Pixel-Perfect Rendering
- **Exact Layout & Spacing**: Matches Figma's `absoluteBoundingBox` positioning with pixel-perfect accuracy
- **Typography Precision**: Exact font families, sizes, weights, line heights, and letter spacing
- **Color Accuracy**: Precise color conversion from Figma's RGB values to CSS
- **Border Radius**: Perfect corner radius handling including circular elements
- **Effects & Shadows**: Drop shadows, inner shadows, and background blur effects

### 📝 Rich Text Processing
- **Dynamic Character Styling**: Full support for `characterStyleOverrides` and `styleOverrideTable`
- **Color Variations**: Character-level color changes within text blocks
- **Font Weight Changes**: Dynamic font weight variations per character
- **Text Decoration**: Underline, strikethrough, and other text decorations
- **Hyperlink Support**: Clickable links with proper styling
- **Smart Alignment**: Intelligent text alignment override based on design patterns

### 🖼️ Enhanced Image & Mask Handling
- **Figma API Integration**: Automatic image loading via Figma's `/images` API
- **High-Resolution Support**: 2x scale images for crisp rendering
- **Fallback Handling**: Graceful degradation with `/public/placeholder.svg`
- **Scale Mode Support**: Respects Figma's image scale modes (FILL, FIT, CROP)
- **Mask Group Support**: Full support for Figma mask groups with VECTOR, RECTANGLE, and ELLIPSE masks
- **Circular Layouts**: Perfect circular image rendering with proper masking
- **Placeholder Images**: Clean placeholder system that inherits Figma styling

### 🧩 Advanced Layout System
- **Flexbox Layouts**: Automatic conversion of Figma's layout modes to CSS Flexbox
- **Grid Systems**: Intelligent grid layout detection and implementation
- **Spacing & Alignment**: Precise handling of item spacing and alignment properties
- **Responsive Design**: Mobile-first responsive breakpoints
- **Component Reuse**: Detection and reuse of Figma components and instances
- **Angled Sections**: Support for angled section transitions using clip-path

### 🎭 Mask Group Rendering
- **VECTOR Mask Support**: Full support for VECTOR type mask elements
- **Rectangular Masks**: Proper handling of rectangular mask shapes
- **Circular Masks**: Perfect circular masking with SVG path generation
- **Coordinate Transformation**: Accurate relative positioning within mask groups
- **Mask Debugging**: Visual debugging for mask group elements

### 🦶 Footer-Specific Enhancements
- **Perfect Circular Icons**: LinkedIn, Instagram, YouTube icons rendered as perfect circles
- **Grid Alignment**: Logo + links + address columns properly aligned horizontally
- **Social Icon Spacing**: Consistent spacing between social media icons
- **Responsive Footer**: Footer adapts to different screen sizes

### 🔧 Developer Experience
- **Enhanced Debug Mode**: Comprehensive debugging with element outlines, information overlays, and console logging
- **Rich Text Debugging**: Detailed logging for character style overrides and text processing
- **Mask Group Debugging**: Visual and console debugging for mask group rendering
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
│   │   ├── output/           # Main rendering page with enhanced features
│   │   ├── upload/           # Figma file upload
│   │   └── playground/       # Testing environment
│   ├── components/
│   │   ├── SimpleFigmaRenderer.tsx # Enhanced main renderer with rich text & mask support
│   │   ├── FigmaImageRenderer.tsx # Image handling
│   │   └── ZoomWrapper.tsx   # Zoom functionality
│   └── lib/
│       ├── utils.ts              # Enhanced utility functions
│       ├── figma-token-extractor.ts # Design token extraction
│       ├── optimization.ts       # Performance optimizations
│       └── dynamic-component-generator.ts # Dynamic component generation
├── public/                   # Static assets including placeholder.svg
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
   - Rich text will be processed with character-level styling
   - Mask groups will render with proper masking
   - Use debug mode to see element boundaries and properties

### Advanced Features

#### Rich Text Processing
- **Character-Level Styling**: Text with multiple colors, weights, and styles
- **Dynamic Color Changes**: Parts of text in different colors
- **Font Variations**: Different font weights within the same text block
- **Hyperlink Support**: Clickable links with proper styling

#### Mask Group Rendering
- **Circular Images**: Perfect circular image rendering
- **Rectangular Masks**: Proper rectangular masking
- **VECTOR Masks**: Full support for VECTOR type mask elements
- **Placeholder Support**: Clean placeholder images in masked areas

#### Debug Mode
- **Element Debug**: Shows bounding boxes, element types, and properties
- **Rich Text Debug**: Console logging for text processing
- **Mask Group Debug**: Visual debugging for mask elements
- **Layout Debug**: Highlights layout containers and their properties
- **API Debug**: Monitor Figma API calls and image loading status

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
  'Space Grotesk': 'Space Grotesk, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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

#### Rich Text Processing
```typescript
// Character-level styling support
const processRichText = (text: string) => {
  // Processes characterStyleOverrides and styleOverrideTable
  // Generates HTML with inline styles for each character segment
};
```

## 🎯 Technical Specifications

### Supported Figma Elements

#### Layout Elements
- ✅ **FRAME**: Full layout container support with background colors
- ✅ **GROUP**: Grouped elements with proper positioning
- ✅ **CANVAS**: Page-level containers
- ✅ **PAGE**: Document pages

#### Visual Elements
- ✅ **RECTANGLE**: Shapes with fills, strokes, effects, and corner radius
- ✅ **ELLIPSE**: Circular and elliptical shapes with perfect circles
- ✅ **VECTOR**: Vector graphics, paths, and mask elements
- ✅ **LINE**: Line elements with stroke properties and dash patterns

#### Text Elements
- ✅ **TEXT**: Typography with full style support and rich text processing
- ✅ **Font Families**: Extensive font mapping with fallbacks
- ✅ **Text Alignment**: Left, center, right, justified with smart overrides
- ✅ **Line Height**: Pixel and percentage values
- ✅ **Letter Spacing**: Precise character spacing
- ✅ **Character Styling**: Dynamic color, weight, and style changes
- ✅ **Hyperlinks**: Clickable links with proper styling

#### Component Elements
- ✅ **INSTANCE**: Component instances with proper rendering
- ✅ **COMPONENT**: Master components
- ✅ **Component Variants**: Support for component variants

#### Mask Elements
- ✅ **Mask Groups**: Full support for Figma mask groups
- ✅ **VECTOR Masks**: VECTOR type mask elements with proper rendering
- ✅ **Rectangular Masks**: Rectangular mask shapes
- ✅ **Circular Masks**: Perfect circular masking
- ✅ **Coordinate Transformation**: Accurate relative positioning

### Advanced Features

#### Effects & Styles
- ✅ **Drop Shadows**: Offset, radius, and color support
- ✅ **Inner Shadows**: Inset shadow effects
- ✅ **Background Blur**: Backdrop filter effects
- ✅ **Opacity**: Element transparency
- ✅ **Rotation**: Element rotation with proper coordinate transformation
- ✅ **Skew**: Element skewing support
- ✅ **Blend Modes**: Mix blend mode support

#### Layout Properties
- ✅ **Layout Mode**: HORIZONTAL and VERTICAL flex layouts
- ✅ **Alignment**: Primary and counter axis alignment
- ✅ **Spacing**: Item spacing between elements
- ✅ **Padding**: Container padding support
- ✅ **Z-Index**: Layer ordering
- ✅ **Overflow**: Hidden overflow support
- ✅ **Clip Content**: Content clipping support

#### Image Handling
- ✅ **Image Fills**: Background images from Figma
- ✅ **Scale Modes**: FILL, FIT, CROP support
- ✅ **High Resolution**: 2x scale for crisp display
- ✅ **Error Handling**: Fallback content for failed loads
- ✅ **Loading States**: Visual loading indicators
- ✅ **Placeholder System**: Clean placeholder images
- ✅ **Mask Integration**: Images properly masked by mask groups

#### Rich Text Features
- ✅ **Character Style Overrides**: Dynamic character-level styling
- ✅ **Style Override Table**: Complex text styling support
- ✅ **Color Variations**: Multiple colors within text blocks
- ✅ **Font Weight Changes**: Dynamic font weight variations
- ✅ **Text Decoration**: Underline, strikethrough support
- ✅ **Hyperlink Support**: Clickable links
- ✅ **Smart Alignment**: Intelligent alignment overrides

## 🚀 Performance Optimizations

### Image Loading
- **Batch Processing**: Images loaded in batches to respect API limits
- **Rate Limiting**: Automatic retry with exponential backoff
- **Caching**: Image URLs cached to prevent redundant requests
- **Lazy Loading**: Images loaded only when needed
- **Placeholder System**: Fast placeholder rendering while images load

### Rendering Performance
- **Component Memoization**: React.memo for expensive components
- **Style Optimization**: Efficient style calculation and caching
- **Tree Traversal**: Optimized node tree traversal algorithms
- **Memory Management**: Proper cleanup of image resources
- **Rich Text Processing**: Efficient character-level styling

## 🔍 Debugging & Troubleshooting

### Common Issues

#### Images Not Loading
1. Check Figma API token validity
2. Verify file permissions in Figma
3. Check browser console for API errors
4. Use the "Test API" button to verify connectivity
5. Check mask group debugging for masking issues

#### Rich Text Issues
1. Enable debug mode to see rich text processing logs
2. Check characterStyleOverrides in Figma JSON
3. Verify styleOverrideTable entries
4. Check console for text processing errors

#### Mask Group Issues
1. Enable debug mode to see mask element logs
2. Check for VECTOR type mask elements
3. Verify mask coordinate transformation
4. Check placeholder image rendering

#### Layout Issues
1. Enable "Layout Debug" to see layout containers
2. Check Figma layout mode properties
3. Verify absoluteBoundingBox values
4. Use "Enhanced Renderer" for better layout handling

### Debug Tools

#### Visual Debugging
- **Element Outlines**: Colored borders around elements
- **Property Overlays**: Hover information for elements
- **Layout Highlighting**: Special highlighting for layout containers
- **Coordinate Display**: Real-time coordinate information
- **Mask Group Info**: Visual debugging for mask elements

#### Console Debugging
- **Rich Text Logs**: Detailed character style processing logs
- **Mask Group Logs**: Mask element and content element logs
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
- Add debug logging for new features

### Testing
- Test with various Figma file types
- Verify responsive behavior
- Check accessibility compliance
- Test performance with large designs
- Test rich text processing
- Test mask group rendering

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
- Enable debug mode for detailed logging

---

**DesignStorm** - Transforming Figma designs into pixel-perfect Next.js applications with enhanced visual fidelity, rich text processing, advanced layout capabilities, and comprehensive mask group support.
