import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const samples = resolve(root, '../Samples/Icons');
const output = resolve(root, 'src/lib/assets');

const pngPath = resolve(samples, 'sprite.png');
const jsonPath = resolve(samples, 'sprite.json');
const pngTsPath = resolve(output, 'spritePng.ts');
const manifestTsPath = resolve(output, 'spriteManifest.ts');

const pngBuffer = await readFile(pngPath);
const manifestJson = JSON.parse(await readFile(jsonPath, 'utf8'));

const base64 = pngBuffer.toString('base64');
const dataUri = `data:image/png;base64,${base64}`;

await writeFile(pngTsPath, `export const SPRITE_PNG_BASE64 = ${JSON.stringify(dataUri)};\n`);

await writeFile(
  manifestTsPath,
  `import type { SpriteManifest } from '../utils/iconHelper';\n\n` +
    `export const spriteManifest: SpriteManifest = ${JSON.stringify(manifestJson, null, 2)};\n`
);

console.log(`Generated embedded sprite assets:\n  - ${pngTsPath}\n  - ${manifestTsPath}`);
