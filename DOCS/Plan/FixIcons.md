# Implementation Plan: Fix Point Icons Rendering

## Problem Description
In the S-57 GeoLibre plugin, point features (such as buoys like `BOYSPP` in purpose band 3) are loaded onto the map but do not display their corresponding icons. 
This occurs because the plugin's `StyleReapplier` (located in [s57StyleRegistry.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/styles/s57StyleRegistry.ts)) treats all visual attributes as paint properties. It applies style properties using `map.setPaintProperty`:

```typescript
paintOps.forEach(([property, value]) => {
  try {
    const currentValue = map.getPaintProperty?.(candidateLayerId, property);
    if (currentValue !== value) {
      map.setPaintProperty?.(candidateLayerId, property, value);
    }
    applied = true;
  } catch { ... }
});
```

However, MapLibre GL / Mapbox GL treats symbol/icon styling attributes (such as `icon-image`, `icon-size`, `icon-allow-overlap`, `icon-ignore-placement`, `text-field`, `text-size`, `text-offset`, `text-anchor`) as **layout properties**, not paint properties. Attempting to get or set them via `getPaintProperty`/`setPaintProperty` fails silently or throws errors, preventing the icons from rendering.

This plan details how to resolve this bug by properly separating layout and paint properties in `StyleReapplier` and using the correct MapLibre API methods (`setLayoutProperty` and `getLayoutProperty`).

---

## Proposed Changes

### [s57StyleRegistry.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/styles/s57StyleRegistry.ts)

We need to modify the type definitions of `map` passed to `reapplyStyle` and split the styling operations inside `StyleReapplier` into **paint properties** and **layout properties**.

#### 1. Update `reapplyStyle` Signature
Update the `map` argument type declaration to include MapLibre layout setters/getters:
- `setLayoutProperty?: (layerId: string, property: string, value: unknown) => void`
- `getLayoutProperty?: (layerId: string, property: string) => unknown`

```typescript
// Replace:
async reapplyStyle(
  map: { getStyle?: () => { layers?: Array<{ id?: string; source?: string }> }; setPaintProperty?: (layerId: string, property: string, value: unknown) => void; getPaintProperty?: (layerId: string, property: string) => unknown; setLayerZoomRange?: (layerId: string, minZoom: number, maxZoom?: number) => void },
  layerId: string,
  ...
)

// With:
async reapplyStyle(
  map: { 
    getStyle?: () => { layers?: Array<{ id?: string; source?: string }> }; 
    setPaintProperty?: (layerId: string, property: string, value: unknown) => void; 
    getPaintProperty?: (layerId: string, property: string) => unknown; 
    setLayoutProperty?: (layerId: string, property: string, value: unknown) => void; 
    getLayoutProperty?: (layerId: string, property: string) => unknown; 
    setLayerZoomRange?: (layerId: string, minZoom: number, maxZoom?: number) => void 
  },
  layerId: string,
  ...
)
```

#### 2. Update `reapplyAllStyles` Signature
Similarly update the signature of `reapplyAllStyles` to declare layout methods.

```typescript
// Replace:
async reapplyAllStyles(map: { getStyle?: () => { layers?: Array<{ id?: string; source?: string }> }; setPaintProperty?: (layerId: string, property: string, value: unknown) => void; getPaintProperty?: (layerId: string, property: string) => unknown }): Promise<number>

// With:
async reapplyAllStyles(map: { 
  getStyle?: () => { layers?: Array<{ id?: string; source?: string }> }; 
  setPaintProperty?: (layerId: string, property: string, value: unknown) => void; 
  getPaintProperty?: (layerId: string, property: string) => unknown;
  setLayoutProperty?: (layerId: string, property: string, value: unknown) => void; 
  getLayoutProperty?: (layerId: string, property: string) => unknown; 
}): Promise<number>
```

#### 3. Separate Paint and Layout Operations
Inside `StyleReapplier`, change `buildPaintOps` to return two separate lists (one for paint properties and one for layout properties), or classify each property type dynamically.

##### Define lists of Layout Properties:
```typescript
const LAYOUT_PROPERTIES = new Set([
  'icon-image',
  'icon-size',
  'icon-allow-overlap',
  'icon-ignore-placement',
  'text-field',
  'text-size',
  'text-offset',
  'text-anchor',
  'visibility'
]);
```

##### Refactor the apply loop:
Modify `reapplyStyle` to check the property type and invoke the correct MapLibre method:

```typescript
// Refactored property application loop in reapplyStyle:
paintOps.forEach(([property, value]) => {
  try {
    if (LAYOUT_PROPERTIES.has(property)) {
      const currentValue = map.getLayoutProperty?.(candidateLayerId, property);
      if (currentValue !== value) {
        map.setLayoutProperty?.(candidateLayerId, property, value);
      }
    } else {
      const currentValue = map.getPaintProperty?.(candidateLayerId, property);
      if (currentValue !== value) {
        map.setPaintProperty?.(candidateLayerId, property, value);
      }
    }
    applied = true;
  } catch {
    // Ignore transient MapLibre setter failures and retry later.
  }
});
```

---

## Verification Plan

### Automated Verification
1. Run compilation to ensure TypeScript checks pass:
   ```bash
   npm run build
   ```
2. Run any unit/integration tests to ensure no regressions:
   ```bash
   npm run test
   ```

### Manual Verification
1. Open the plugin interface in the host application.
2. Upload the raw S-57 sample chart file: [ID300071.000](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/Samples/S57/ID300071.000).
3. Select **Purpose 3** in the UI.
4. Zoom in on a coordinate containing a special buoy (e.g., coordinates `[105.3916667, -6.1305556]` from `BOYSPP.geojson` corresponding to the "Tsunami RWVS" buoy).
5. Verify that:
   - The buoy shows up as an icon from the sprite sheet (e.g. `BOYSPP11`).
   - Console logs do not print any errors related to layout/paint property mismatch on MapLibre.
