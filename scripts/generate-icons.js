// scripts/generate-icons.js
// Generiert App-Icons und Splash-Screens aus SVG-Vorlagen
// Nutzung: node scripts/generate-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const ICON_SVG = path.join(ASSETS_DIR, 'icon.svg');
const ICON_MASKABLE_SVG = path.join(ASSETS_DIR, 'icon-maskable.svg');

// Android adaptive icon sizes
const ANDROID_ICONS = [
  { name: 'mdpi', size: 48 },
  { name: 'hdpi', size: 72 },
  { name: 'xhdpi', size: 96 },
  { name: 'xxhdpi', size: 144 },
  { name: 'xxxhdpi', size: 192 },
];

// iOS icon sizes
const IOS_ICONS = [
  { name: 'icon-20', size: 20 },
  { name: 'icon-20@2x', size: 40 },
  { name: 'icon-20@3x', size: 60 },
  { name: 'icon-29', size: 29 },
  { name: 'icon-29@2x', size: 58 },
  { name: 'icon-29@3x', size: 87 },
  { name: 'icon-40', size: 40 },
  { name: 'icon-40@2x', size: 80 },
  { name: 'icon-40@3x', size: 120 },
  { name: 'icon-60@2x', size: 120 },
  { name: 'icon-60@3x', size: 180 },
  { name: 'icon-76', size: 76 },
  { name: 'icon-76@2x', size: 152 },
  { name: 'icon-83.5@2x', size: 167 },
  { name: 'icon-1024', size: 1024 },
];

// Splash screen sizes
const SPLASH_SCREENS = [
  { name: 'Default@2x~universal~anyany', width: 2732, height: 2732 },
];

async function generateIcons() {
  console.log('Generating icons...');

  // Ensure output dirs exist
  const androidIconDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
  const iosIconDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');

  // Generate Android adaptive icons
  for (const icon of ANDROID_ICONS) {
    const dir = path.join(androidIconDir, `mipmap-${icon.name}`);
    fs.mkdirSync(dir, { recursive: true });

    // Foreground layer
    await sharp(ICON_SVG)
      .resize(icon.size, icon.size)
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    // Background layer (solid color)
    await sharp({
      create: { width: icon.size, height: icon.size, channels: 4, background: { r: 8, g: 10, b: 22, alpha: 1 } }
    })
      .png()
      .toFile(path.join(dir, 'ic_launcher_background.png'));

    // Legacy icon
    await sharp(ICON_SVG)
      .resize(icon.size, icon.size)
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    console.log(`  Android ${icon.name} (${icon.size}x${icon.size})`);
  }

  // Generate iOS icons
  fs.mkdirSync(iosIconDir, { recursive: true });
  for (const icon of IOS_ICONS) {
    await sharp(ICON_SVG)
      .resize(icon.size, icon.size)
      .png()
      .toFile(path.join(iosIconDir, `${icon.name}.png`));
    console.log(`  iOS ${icon.name} (${icon.size}x${icon.size})`);
  }

  // Generate splash screens
  const splashDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
  fs.mkdirSync(splashDir, { recursive: true });
  for (const splash of SPLASH_SCREENS) {
    await sharp({
      create: { width: splash.width, height: splash.height, channels: 4, background: { r: 8, g: 10, b: 22, alpha: 1 } }
    })
      .composite([{ input: await sharp(ICON_SVG).resize(400, 400).png().toBuffer(), gravity: 'center' }])
      .png()
      .toFile(path.join(splashDir, `${splash.name}.png`));
    console.log(`  Splash ${splash.name} (${splash.width}x${splash.height})`);
  }

  console.log('Done!');
}

generateIcons().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
