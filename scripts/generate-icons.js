const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const base = '/opt/data/DC-Minigame';
const icon = path.join(base, 'assets/icon.svg');
const sizes = [72,96,128,144,152,192,384,512,1024];

async function main() {
  for (const s of sizes) {
    await sharp(icon)
      .resize(s, s)
      .png()
      .toFile(path.join(base, `assets/icon-${s}.png`));
    console.log('created', `icon-${s}.png`);
  }
  const splashes = [[640,1136],[750,1334],[1125,2436],[1242,2208],[1536,2048]];
  for (const [w,h] of splashes) {
    await sharp(icon)
      .resize(w, h, { fit: 'contain', background: { r:20, g:20, b:47, alpha:1 } })
      .png()
      .toFile(path.join(base, `assets/splash-${w}x${h}.png`));
    console.log('created', `splash-${w}x${h}.png`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
