# Update RESARE Styling Implementation Plan

Updates the S-57 RESARE (Restricted Area) layer styling to match the rules defined in `/DOCS/Analysis/RESARE.md`.

## User Review Required

Please review the proposed changes for dynamically generating patterns and applying the style without modifying `host-api.ts`.

## Proposed Changes

### s57StyleRegistry.ts

Update the style registry to locally extend the style interface, map the new properties, and implement the RESARE logic, keeping the host API untouched.

#### [MODIFY] [s57StyleRegistry.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/styles/s57StyleRegistry.ts)
- Define a local type: `type ExtendedLayerStyle = GeoLibreNativeLayerStyle & { fillPattern?: string; textColor?: string; };`
- Update `S57StyleSelection.style` to use `ExtendedLayerStyle` instead of `GeoLibreNativeLayerStyle`.
- In `StyleReapplier.buildPaintOps`:
  - Accept `style: ExtendedLayerStyle`.
  - Map `style.fillPattern` to `['fill-pattern', style.fillPattern]`.
  - Map `style.textColor` to `['text-color', style.textColor]`.
- In `buildRestrictedStyle`:
  - Add `attributes: Record<string, unknown>` as a parameter.
  - Return `ExtendedLayerStyle`.
  - Update line boundary: `strokeWidth: 2` and `strokeDasharray: '4,4'`.
  - Implement fill pattern logic based on the `RESTRN` attribute string:
    - If `RESTRN` includes `'1'`, use `fillPattern: 'NOANCHR_pattern'`.
    - If `RESTRN` includes `'14'`, use `fillPattern: 'ENTPRO_pattern'`.
    - Otherwise, use a default base pattern `fillPattern: 'RESARE_pattern'`.
  - Add `textColor: COLORS.TRFCD` to render the label in magenta.
- In `selectS57LayerStyle`:
  - Pass `normalizedAttributes` to `buildRestrictedStyle`.
  - Set the `labelField` property of the `S57StyleSelection` to `asString(normalizedAttributes.OBJNAM) ?? undefined` for restricted classes.

### Pattern Generation

Generate the required map fill patterns dynamically when the map loads so they are available in the sprite sheet.

#### [NEW] [patternGenerator.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/utils/patternGenerator.ts)
- Create a utility `ensureResarePatternsAdded(map)` that checks if the patterns exist via `map.hasImage`.
- If missing, use the HTML `<canvas>` API to draw:
  - `RESARE_pattern`: A dynamically generated magenta hash/diagonal pattern (`rgba(197, 69, 195, 0.4)`).
  - `NOANCHR_pattern`: A placeholder pattern (e.g., a circle with an anchor or a cross).
  - `ENTPRO_pattern`: A placeholder pattern (e.g., a "no entry" circle).
- Extract `ImageData` from the canvas and add them to the map using `map.addImage(id, imageData)`.

#### [MODIFY] Map Initialization Context (e.g., plugin activation or style reapplication)
- Call `ensureResarePatternsAdded(map)` when the map instance is available to ensure the dynamically generated patterns are registered before the styles are applied.

## Verification Plan

### Manual Verification
- Render a chart with RESARE areas.
- Verify the restricted area boundary is a 2px magenta dashed line (4px on, 4px off).
- Verify the dynamically generated patterns are successfully applied:
  - Default magenta hash pattern.
  - NOANCHR_pattern for areas where `RESTRN` contains `'1'`.
  - ENTPRO_pattern for areas where `RESTRN` contains `'14'`.
- Verify text labels display the `OBJNAM` attribute in magenta.
- Verify that `host-api.ts` remains unmodified.
