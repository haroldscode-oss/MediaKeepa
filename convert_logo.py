#!/usr/bin/env python3
"""
Convert MediaKeepa SVG logo to PNG in multiple sizes for branding

Since cairosvg has Windows DLL issues, this script provides instructions
for manual conversion using online tools.
"""

from pathlib import Path

svg_file = Path("branding/mediakeepa-logo.svg")
output_dir = Path("branding")

sizes = {
    "32": "Favicon (tiny icon)",
    "64": "Small icon",
    "128": "Medium icon",
    "256": "Standard icon",
    "512": "App icon, social media, Open Graph",
    "1024": "High-res for printing/large displays",
}

print("🎨 MediaKeepa Logo Conversion Guide")
print("=" * 60)
print(f"\n📁 SVG Source: {svg_file.absolute()}")
print(f"📂 Output Folder: {output_dir.absolute()}\n")

print("⚠️  Windows DLL Issue: cairosvg requires system libraries")
print("✅ Solution: Use online conversion (fast & easy)\n")

print("🌐 RECOMMENDED METHOD - Online Converter:")
print("-" * 60)
print("1. Go to: https://cloudconvert.com/svg-to-png")
print("   OR: https://convertio.co/svg-png/")
print(f"2. Upload: {svg_file.absolute()}")
print("3. Convert to PNG for each size:\n")

for size, description in sizes.items():
    print(f"   📐 {size}px × {size}px - {description}")
    print(f"      → Save as: mediakeepa-logo-{size}px.png")

print("\n💡 Alternative: Use Inkscape (Free Desktop App)")
print("-" * 60)
print("1. Download: https://inkscape.org/release/")
print("2. Open SVG in Inkscape")
print("3. File → Export PNG")
print("4. Set width/height to each size")
print("5. Save to branding folder")

print("\n🎯 Quick Verification:")
print("-" * 60)
print("After conversion, you should have:")
for size in sizes.keys():
    print(f"   ✓ branding/mediakeepa-logo-{size}px.png")

print("\n" + "=" * 60)
print("📝 Note: The logo is Phosphor Video icon (fill) in purple #8b5cf6")
print("=" * 60)
