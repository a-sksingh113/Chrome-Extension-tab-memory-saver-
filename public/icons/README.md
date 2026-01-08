# Tab Memory Saver Icons

This folder contains placeholder icons for the extension.

## Icon Requirements

The extension needs the following icon sizes:
- icon16.png (16×16 pixels)
- icon32.png (32×32 pixels)
- icon48.png (48×48 pixels)
- icon128.png (128×128 pixels)

## Creating Icons

You can create icons in several ways:

### Option 1: Online Icon Generator
1. Visit https://www.favicon-generator.org/ or similar service
2. Upload a square image or create a simple design
3. Generate and download all required sizes
4. Rename files to match: icon16.png, icon32.png, icon48.png, icon128.png
5. Place all files in this directory

### Option 2: Use the SVG Template Below

Save this SVG code as `icon.svg` and convert to PNG at different sizes:

```svg
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="#1a73e8" rx="20"/>
  <text x="64" y="80" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle">TM</text>
</svg>
```

### Option 3: Quick Placeholder (For Testing)

For quick testing, you can create simple colored squares:
- Use any image editor (Paint, Photoshop, GIMP, etc.)
- Create images with blue background (#1a73e8)
- Add white text "TM" or a memory icon
- Export at required sizes

## Temporary Workaround

If you need to test the extension immediately without creating icons:
1. You can temporarily comment out the icons section in manifest.json
2. Or create simple 128x128 PNG files and resize copies for smaller sizes

The extension will work without proper icons, but they improve the user experience.
