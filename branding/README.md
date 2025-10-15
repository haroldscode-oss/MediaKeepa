# MediaKeepa Branding Assets

This folder contains the SVG logo files for MediaKeepa that you can use for branding purposes.

## Files

### 1. `mediakeepa-logo.svg`
- **Dimensions**: 280x80px
- **Use case**: Horizontal logo with text, perfect for headers, websites, and presentations
- **Contains**: Icon + "MediaKeepa" text
- **Colors**: Primary blue (#6366f1) with customizable text color

### 2. `mediakeepa-icon-only.svg`
- **Dimensions**: 512x512px (square)
- **Use case**: App icons, favicons, social media profile pictures
- **Contains**: Video camera icon on colored background
- **Style**: Square with rounded corners, ready for app stores

## Color Palette

- **Primary Blue**: `#6366f1` (Indigo 500)
- **Primary Dark**: `#4f46e5` (Indigo 600)
- **Text Dark**: `#0f172a` (Slate 900)
- **Accent Red**: `#ef4444` (Red 500) - for recording indicator

## Usage Tips

1. **For Light Backgrounds**: Use the default SVG files as-is
2. **For Dark Backgrounds**: Change the text color from `#0f172a` to `#ffffff` in the SVG
3. **Custom Colors**: Replace `#6366f1` with your brand color
4. **Responsive**: SVG files scale perfectly to any size without quality loss

## Customization

All SVG files use `currentColor` where applicable, so you can change colors via CSS:

```css
.logo {
  color: #your-brand-color;
}
```

Or edit the SVG files directly by changing the `fill` attributes.

## File Locations

You can also find additional versions in:
- `spark-template/src/assets/` - For React imports
- `branding/` - For general use and documentation

## License

These logo files are part of the MediaKeepa project and follow the same license as the main project.
