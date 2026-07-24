# Implementation Plan: Embed Icons in Source Code

## Goal Description
Resolve the issue where the S-57 plugin is unable to read/load external icon assets (`sprite.json` and `sprite.png`) because the host app does not support reading external file assets for plugins. This plan outlines the approach to embed both the sprite sheet image (as a Base64 encoded string) and the sprite manifest (as a TypeScript object/module) directly into the compiled plugin bundle, completely eliminating runtime HTTP/file requests for these assets.

## Proposed Changes

### 1. Asset Conversion (Automation / Build Step)
- Create a script or use a simple task to convert the icon files:
  - `Samples/Icons/sprite.png` -> base64 string -> `S57Convert/src/lib/assets/spritePng.ts`
  - `Samples/Icons/sprite.json` -> TypeScript object -> `S57Convert/src/lib/assets/spriteManifest.ts`

### 2. S57Convert

#### [NEW] [spritePng.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/assets/spritePng.ts)
- Contains the Base64 representation of `sprite.png`:
  ```typescript
  export const SPRITE_PNG_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
  ```

#### [NEW] [spriteManifest.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/assets/spriteManifest.ts)
- Contains the typed manifest JSON object directly to avoid JSON module resolution issues:
  ```typescript
  import { SpriteManifest } from '../utils/iconHelper';

  export const spriteManifest: SpriteManifest = {
    "BLKADJ01": { "width": 58, "height": 58, "x": 0, "y": 0, "pixelRatio": 1 },
    ...
  };
  ```

#### [MODIFY] [geolibre.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/geolibre.ts)
- Import `SPRITE_PNG_BASE64` and `spriteManifest` from the new assets folder.
- Modify `ensureSpriteRegistered` and `registerSpriteWithMap` to use the embedded assets.
- Eliminate `resolveSpriteBaseUrl` and any network fetch calls for `sprite.json` and `sprite.png`.
- The revised `registerSpriteWithMap` will load the image from the data URI:
  ```typescript
  async function registerSpriteWithMap(map: any): Promise<void> {
    let image: ImageBitmap;

    try {
      const res = await fetch(SPRITE_PNG_BASE64);
      const blob = await res.blob();
      image = await createImageBitmap(blob);
    } catch (err) {
      writeDebug(`[sprite] Error decoding embedded sprite image: ${err}`);
      return;
    }

    let registered = 0;
    let skipped = 0;

    for (const [key, entry] of Object.entries(spriteManifest)) {
      if (typeof map.hasImage === 'function' && map.hasImage(key)) {
        skipped++;
        continue;
      }
      try {
        const sub = await createImageBitmap(image, entry.x, entry.y, entry.width, entry.height);
        map.addImage(key, sub, { pixelRatio: entry.pixelRatio ?? 1 });
        registered++;
      } catch (err) {
        writeDebug(`[sprite] Could not register icon "${key}": ${err}`);
      }
    }
  }
  ```

## Verification Plan

### Automated Tests
- Run existing tests to ensure code compiles and there are no TypeScript errors:
  - `npm run build` or `vitest`

### Manual Verification
1. Verify that `spritePng.ts` and `spriteManifest.ts` are generated correctly.
2. Build the plugin and verify the bundle contains the embedded resources.
3. Test chart uploading to verify that icons display properly.
