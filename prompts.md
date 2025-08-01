# ✨ Prompt Recipes for Cursor AI (DesignStorm)

## Prompt: Initial Absolute Renderer

```txt
Take a Figma node (with absoluteBoundingBox, fills, strokes, etc.) and render it using Tailwind CSS classes with absolute positioning.

Output a React component using:
- `absolute`, `top-[value]`, `left-[value]`, `w-[value]`, `h-[value]`
- Text styles using Tailwind (font size, weight, color)
- Add fallback for fills as background colors
