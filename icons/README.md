# PWA Icons

This directory should contain the app icons for the Progressive Web App.

## Required Icon Sizes

The following icon sizes are required for the PWA manifest:

- `icon-72x72.png` - 72x72 pixels
- `icon-96x96.png` - 96x96 pixels
- `icon-128x128.png` - 128x128 pixels
- `icon-144x144.png` - 144x144 pixels
- `icon-152x152.png` - 152x152 pixels
- `icon-192x192.png` - 192x192 pixels (Android home screen)
- `icon-384x384.png` - 384x384 pixels
- `icon-512x512.png` - 512x512 pixels (Android splash screen)

## Creating Icons

### Option 1: Using Online Tools

1. Create a square logo/icon (at least 512x512 pixels)
2. Use an online PWA icon generator:
   - https://www.pwabuilder.com/imageGenerator
   - https://realfavicongenerator.net/
   - https://www.favicon-generator.org/

### Option 2: Using ImageMagick (Command Line)

If you have a source image (e.g., `logo.png`), you can generate all sizes:

```bash
# Install ImageMagick if needed: brew install imagemagick (macOS) or apt-get install imagemagick (Linux)

# Generate all icon sizes from a source image
for size in 72 96 128 144 152 192 384 512; do
  convert logo.png -resize ${size}x${size} icon-${size}x${size}.png
done
```

### Option 3: Using a Design Tool

1. Create a 512x512 pixel square design
2. Export at each required size
3. Ensure icons are optimized (PNG format, reasonable file size)

## Icon Design Guidelines

- **Square format**: Icons should be square (1:1 aspect ratio)
- **Safe zone**: Keep important content within the center 80% to avoid cropping on some devices
- **Simple design**: Icons should be recognizable at small sizes
- **High contrast**: Ensure visibility on both light and dark backgrounds
- **No text**: Avoid small text that won't be readable at small sizes
- **Maskable**: Consider creating maskable icons that adapt to different device shapes

## Current Status

⚠️ **Icons are not yet created.** You need to:

1. Design or obtain an app icon (512x512 minimum)
2. Generate all required sizes
3. Place them in this `icons/` directory
4. Update the manifest.json if you use different filenames

## Testing

After adding icons, test the PWA installation:

1. Open the app in Chrome/Edge on mobile
2. Look for the "Add to Home Screen" prompt
3. Verify the icon appears correctly on the home screen
4. Check that the splash screen shows the correct icon


