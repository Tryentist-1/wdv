#!/bin/bash
# Generate PWA icons from a source image
# Usage: ./generate-icons.sh source-image.png

if [ -z "$1" ]; then
  echo "Usage: $0 <source-image.png>"
  echo "Example: $0 logo.png"
  exit 1
fi

SOURCE="$1"

if [ ! -f "$SOURCE" ]; then
  echo "Error: Source image '$SOURCE' not found"
  exit 1
fi

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
  echo "Error: ImageMagick not found. Install it with:"
  echo "  macOS: brew install imagemagick"
  echo "  Linux: sudo apt-get install imagemagick"
  exit 1
fi

echo "Generating PWA icons from $SOURCE..."

# Generate all required sizes
for size in 72 96 128 144 152 192 384 512; do
  OUTPUT="icon-${size}x${size}.png"
  echo "  Creating $OUTPUT..."
  convert "$SOURCE" -resize ${size}x${size} -background transparent -gravity center -extent ${size}x${size} "$OUTPUT"
done

echo "Done! Icons generated in current directory."
echo ""
echo "Next steps:"
echo "1. Review the generated icons"
echo "2. Ensure they look good at all sizes"
echo "3. The manifest.json is already configured to use these icons"






