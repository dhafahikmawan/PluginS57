# Icon Integration Plan

This document defines the implementation plan to make the plugin use icon sprites from `Samples/Icons/` for Point and Symbol classes, matching the behavior described in `DOCS/Colors.md`.

## 1. Goal

Use the sprite assets in `Samples/Icons/sprite.png` and `Samples/Icons/sprite.json` to render S-57 Point and Symbol classes with actual icons instead of generic geometry-based styling.

## 2. Scope

Point and symbol object classes covered by this plan:
- Buoys: `BOYLAT`, `BOYCAR`, `BOYSPP`, `BOYISD`, `BOYSAW`
- Beacons: `BCNLAT`, `BCNCAR`, `BCNSPP`, `BCNISD`
- Lights: `LIGHTS`, `LITFLT`
- Wrecks: `WRECKS`
- Underwater rocks: `UWTROC`
- Obstacles: `OBSTRN`
- Landmarks: `LNDMRK`

These classes are described in `DOCS/Colors.md` as symbol-driven features whose color and appearance should come primarily from icon artwork.

## 3. Assets

Primary icon assets:
- `Samples/Icons/sprite.png`
- `Samples/Icons/sprite.json`

The `sprite.json` manifest contains sprite keys and image coordinates. The implementation should use those keys as MapLibre icon names.

## 4. Required architectural changes

### 4.1. Add sprite asset loading

The plugin must ensure the icon sprite sheet is available to the renderer.

Possible approaches:
- If the host exposes `resolvePluginAssetUrl`, use it to resolve `Samples/Icons/sprite.json` and `sprite.png` and attach them to the MapLibre style.
- If the plugin uses direct MapLibre access, load the sprite sheet via `map.addImage` for each key or via the MapLibre sprite URL mechanism.
- If the host accepts inline registration metadata, expose the sprite manifest and image URL in the native layer registration.

### 4.2. Extend the style registry / native style contract

The existing `GeoLibreNativeLayerStyle` contract currently includes fill, line, and circle properties. Extend this style contract to support symbol layers:
- `iconImage?: string`
- `iconSize?: number`
- `iconAllowOverlap?: boolean`
- `iconIgnorePlacement?: boolean`
- `textField?: string`
- `textSize?: number`
- `textOffset?: [number, number]`
- `textAnchor?: string`

This allows point layers to request icons and to render text labels with the same style selection infrastructure.

### 4.3. Preserve attributes for icon selection

Ensure converter output preserves original S-57 attributes needed to select an icon:
- `BOYSHP`, `BOYCAR`, `BOYLAT`, `BOYSPP`, `BOYISD`, `BOYSAW`
- `TOPSHP`, `TOPSHP`, `BOYSHP`, `STCTP`, etc.
- `CATLIT`, `COLOUR`, `LITCHR`, `SIGGRP`, `SIGPER`, `VALNMR`
- `CATWRK`, `VALSOU`, `WATLEV` for wrecks and rocks
- `CATOBS`, `VALSOU` for obstructions
- `OBJNAM` or `NOBJNM` for landmarks

A preserved `properties` object can be used by `s57StyleRegistry` to choose the correct sprite key.

## 5. Symbol selection logic

Implement a helper that maps S-57 object class and attributes to sprite keys.

### 5.1. Recommended mapping patterns

- `LIGHTS`, `LITFLT`
  - map to a light icon key such as `LIGHTS94`, `LIGHTS95`, `LIGHTS96`, or a generic `LIGHTS` key
  - choose variant based on `COLOUR` and `LITCHR` if possible
  - if no exact key exists, fall back to a generic `LIGHTS` icon

- Buoys: `BOYLAT`, `BOYCAR`, `BOYSPP`, `BOYISD`, `BOYSAW`
  - select by `BOYSHP`, `BQY` / `BQN`, or `CATBOY` attributes
  - use a keyed mapping table from shape/code combinations to sprite names
  - fallback to a generic buoy icon when shape is unknown

- Beacons: `BCNLAT`, `BCNCAR`, `BCNSPP`, `BCNISD`
  - select by `BCNSHP`, `CATSHP`, and `CATLIT`
  - prefer dedicated beacon sprite keys matching topmark or light behavior

- Wrecks: `WRECKS`
  - choose icon based on `CATWRK`, `VALSOU`, and `WATLEV`
  - if those fields are absent, use a generic wreck symbol

- Underwater rocks: `UWTROC`
  - choose a symbol that represents an underwater rock if available, otherwise use a generic point icon

- Obstacles: `OBSTRN`
  - choose an obstruction icon keyed from `CATOBS` or `VALSOU`

- Landmarks: `LNDMRK`
  - use a landmark sprite key and display a name label when zoomed in

### 5.2. Styling notes

- Set `iconAllowOverlap: true` for navigational aid symbols so they remain visible in dense areas.
- Use `iconIgnorePlacement: true` only for the highest-priority safety-critical marks.
- Use `iconSize` values that match the sprite pixel dimensions and the current zoom range.
- Apply `textField` labels for lights and landmarks on the same or companion layer; labels should use halos and proper anchor/offset.

## 6. Layer registration strategy

### 6.1. Point symbol layers

Register point symbol layers separately from circle/line layers:
- `S57_POINTS` or class-specific layers such as `LIGHTS`, `BOYLAT`, `BCNLAT`, etc.
- Use `nativeLayerIds` that correspond to symbolic MapLibre layers with `icon-image` and `text-field` layout.

### 6.2. Rendering order

Maintain explicit priority so point symbols render above area/line layers but below labels when appropriate:
- `LIGHT_SECTORS` or dynamic light fan polygons under lights
- `POINT_SYMBOLS` / `NAVIGATION` icons above hazards and water fills
- label layers on top of icons for `LIGHTS` and `LNDMRK`

## 7. Implementation steps

1. Add `DOCS/icons.md` as the canonical plan for icon sprite usage.
2. Add runtime asset registration that makes `Samples/Icons/sprite.png` and `sprite.json` available to the plugin/MapLibre renderer.
3. Extend the native style contract in `src/lib/geolibre/host-api.ts` to support `iconImage` and text label properties.
4. Update `src/lib/utils/s57Converter.ts` to preserve symbol-related properties in converted GeoJSON features.
5. Add an icon selection helper in `src/lib/styles/s57StyleRegistry.ts` or a new helper module.
6. Update `s57StyleRegistry.ts` to return symbol styling for the point classes listed above.
7. Add a sprite-loading helper in `src/geolibre.ts` or the host integration layer.
8. Add unit tests covering:
   - sprite key selection for each symbol category,
   - fallback behavior when attributes are missing,
   - successful loading of sprite asset URLs or image keys.
9. Add a manual smoke test verifying rendered icons for `LIGHTS`, `BOYLAT`, `BCNLAT`, `WRECKS`, `OBSTRN`, and `LNDMRK`.

## 8. Validation

Verify the implementation by checking:
- the plugin loads `Samples/Icons/sprite.json` and `sprite.png` at startup,
- point/symbol layers use `icon-image` values from the sprite manifest,
- expected classes appear as icons on the map,
- `LIGHTS` and `LITFLT` render as icons, not only as generic circles,
- icons remain visible with correct zoom thresholds and overlap behavior.

## 9. Future enhancements

Once basic icon integration works, extend the plan to support:
- colorized icon variants based on `COLOUR` and `SIGNGRP`,
- icon replacements for restricted/prohibition symbols such as `NOANCHR` and `ENTPRO`,
- dynamic icon selection from a broader sprite atlas where each class has multiple variants.
