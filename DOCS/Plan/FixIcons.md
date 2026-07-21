# Implementation Plan: Fix Icons

## Purpose
Restore S-57 symbol icons in the plugin by ensuring the icon sprite assets are bundled with the plugin and loaded into the host MapLibre style before symbol layers render.

## Diagnosis
- The plugin already selects sprite keys via `src/lib/utils/iconHelper.ts` and assigns them to `iconImage` in `src/lib/styles/s57StyleRegistry.ts`.
- However, the plugin does not currently make the corresponding sprite sheet available to the host or register icon images in the map style at runtime.
- The repository contains `Samples/Icons/sprite.png` and `Samples/Icons/sprite.json`, but the build config does not yet bundle or resolve these assets for runtime use.

## Scope
- `S57Convert/vite.geolibre.config.ts`
- `S57Convert/src/geolibre.ts`
- `S57Convert/src/lib/styles/s57StyleRegistry.ts`
- `S57Convert/src/lib/geolibre/host-api.ts` (if host contract updates are needed)
- `S57Convert/src/lib/utils/iconHelper.ts`
- `S57Convert/tests/iconHelper.test.ts`
- plugin asset packaging for sprite resources

## Proposed Changes

### 1. Bundle the sprite assets with the plugin
- Add `Samples/Icons/sprite.png` and `Samples/Icons/sprite.json` into the plugin asset pipeline.
- Update `S57Convert/vite.geolibre.config.ts` to include a build step that copies icon assets into `geolibre-plugin/dist`.
- Prefer a dedicated `public/` or `assets/` folder for plugin runtime assets and configure Vite to preserve them.

### 2. Resolve sprite asset URLs at runtime
- Add a new helper in `src/geolibre.ts` to resolve the packaged sprite asset URLs using `app.resolvePluginAssetUrl?.(pluginId, relativePath)`.
- If the host does not support `resolvePluginAssetUrl`, fall back to a safe built-in URL path or gracefully degrade.
- Ensure the helper is invoked during plugin activation and when a map instance is available.
- Write to the console on which method succeeds and which method fails

### 3. Register icon resources with the map style
- Add runtime logic in `src/geolibre.ts` for the host map:
  - Load `sprite.json` and `sprite.png` from the resolved asset URLs.
  - Register the sprite assets so MapLibre can resolve `icon-image` values like `LIGHTS_RED`, `BOYLAT_RED`, `WRECKS`, etc.
- If host support exists for image registration, use the native host API to attach these sprite resources; otherwise, use the map instance directly. Refer to how currently the plugin handles style drawing as reference on how to draw any style in the plugin.
- Ensure this registration happens before any S-57 symbol layers are added.

### 4. Confirm style generation and fallback behavior
- Review `src/lib/styles/s57StyleRegistry.ts` and verify the symbol style builders always provide:
  - `iconImage`
  - `iconSize`
  - `iconAllowOverlap`
  - `iconIgnorePlacement`
- Confirm `selectIconMapping` in `src/lib/utils/iconHelper.ts` returns valid sprite keys for all supported classes, including:
  - `LIGHTS`, `LITFLT`
  - `BOYLAT`, `BOYCAR`, `BOYSPP`, `BOYISD`, `BOYSAW`
  - `BCNLAT`, `BCNCAR`, `BCNSPP`, `BCNISD`
  - `WRECKS`, `UWTROC`, `OBSTRN`, `LNDMRK`
- Add a fallback sprite key for unknown point classes so missing class handling degrades gracefully.

### 5. Adjust or extend host contract if needed
- If the host does not currently expose sprite registration, document the needed host API behavior in `src/lib/geolibre/host-api.ts`.
- Ensure `GeoLibreNativeLayerStyle` carries the icon hints the host uses to create a symbol layer.

### 6. Add tests and verification
- Add or extend `S57Convert/tests/iconHelper.test.ts` to cover:
  - sprite key selection for lights, buoys, beacons, wrecks, underwater rocks, obstructions, landmarks
  - fallback behavior for unknown classes
- Add a runtime or manual verification checklist that includes:
  1. Build the plugin and confirm `sprite.png` and `sprite.json` are present in `geolibre-plugin/dist`.
  2. Load an S-57 chart and verify lights, buoys, and landmark icons appear.
  3. Confirm no console errors related to missing sprite assets or unresolved `icon-image` names.

## Manual Verification
- Upload a sample S-57 `.000` file in the plugin.
- Verify visual icons appear for point-type features such as lights, buoys, beacons, and landmarks.
- If icons still do not appear, inspect the map style layer entries for `icon-image` values and ensure the sprite names match the registered asset keys.
