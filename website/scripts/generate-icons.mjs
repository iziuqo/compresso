import sharp from 'sharp';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');

const iconSvg = readFileSync(join(publicDir, 'icon-source.svg'));
const maskableSvg = readFileSync(join(publicDir, 'icon-maskable-source.svg'));

const targets = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-192.png', size: 192, maskable: true },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
];

for (const { file, size, maskable } of targets) {
  const input = maskable ? maskableSvg : iconSvg;
  await sharp(input)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(publicDir, file));
  console.log(`wrote ${file} (${size}x${size})`);
}
