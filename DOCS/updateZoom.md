# Implementation Plan: ENC Purpose Selection Dropdown for S-57 Loader

## Goal
Give the user a dropdown option that selects which ENC purpose code (Overview, General, Coastal, Approach, Harbour, Berthing) the input S-57 file will be loaded as, ensuring that the loaded layers adhere to the visibility rules defined in [Zoom.md](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/DOCS/Zoom.md).

## Problem Statement
Currently, the S-57 chart loader defaults to Overview (Purpose Code 1, zoom range 0-9) unless a purpose code is hardcoded or extracted from specific dataset attributes (which features typically lack). Because of this:
- An approach (Purpose 4) or harbour (Purpose 5) scale chart, which is designed to be viewed at zoom 11-14 or 13-17, will be loaded with overview visibility thresholds.
- When the user zooms in past zoom level 9, the layers disappear entirely. This makes high-detail charts completely invisible at the scales they are meant to be inspected.

## Zoom Rules Reference (from [Zoom.md](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/DOCS/Zoom.md))
| Purpose Code | Use Case | Min Zoom | Max Zoom |
| --- | --- | --- | --- |
| 1 | Overview | 0 | 9 |
| 2 | General | 7 | 10 |
| 3 | Coastal | 9 | 12 |
| 4 | Approach | 11 | 14 |
| 5 | Harbour | 13 | 17 |
| 6 | Berthing | 16 | 22 |

The effective visibility of each layer is computed as:
- `effective minZoom = max(ENC purpose minZoom, layer-specific minZoom)`
- `effective maxZoom = ENC purpose maxZoom`

---

## Proposed Changes

We will modify three files in the codebase to implement this:
1. [S57Uploader.tsx](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/components/S57Uploader.tsx)
2. [geolibre.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/geolibre.ts)
3. [s57StyleRegistry.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/styles/s57StyleRegistry.ts) (verification only)

### 1. Update [S57Uploader.tsx](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/components/S57Uploader.tsx)

#### A. Add State & Prop Signature Updates
We will:
- Add a new state variable:
  ```typescript
  const [purposeCode, setPurposeCode] = useState<number>(1); // Default is 1 (Overview)
  ```
- Update `S57UploaderProps` signature to support passing `purposeCode`:
  ```typescript
  interface S57UploaderProps {
    onLayersLoaded: (layers: S57LayerData[], purposeCode?: number) => void;
    onClearLayers: () => void;
  }
  ```

#### B. Add Purpose Selection Dropdown to UI
We will insert the dropdown selection block inside `s57-panel-body` immediately after the Conversion Mode card:
```tsx
{/* ENC Purpose Selection Dropdown */}
<section className="s57-panel-card">
  <label htmlFor="s57-purpose-select" className="input-label">ENC Usage Purpose</label>
  <select
    id="s57-purpose-select"
    value={purposeCode}
    onChange={(e) => {
      const val = Number(e.target.value);
      setPurposeCode(val);
      if (conversionBundle) {
        onLayersLoaded(conversionBundle.processedLayers, val);
      }
    }}
    className="mode-select-dropdown"
  >
    <option value={1}>1 - Overview (Zoom 0-9)</option>
    <option value={2}>2 - General (Zoom 7-10)</option>
    <option value={3}>3 - Coastal (Zoom 9-12)</option>
    <option value={4}>4 - Approach (Zoom 11-14)</option>
    <option value={5}>5 - Harbour (Zoom 13-17)</option>
    <option value={6}>6 - Berthing (Zoom 16-22)</option>
  </select>
</section>
```

#### C. Pass selected purpose code during load
Ensure the upload handles in `handleFileUpload` and `handleApiSubmit` pass `purposeCode` to `onLayersLoaded`:
- In `handleFileUpload`:
  ```typescript
  onLayersLoaded(bundle.processedLayers, purposeCode);
  ```
- In `handleApiSubmit`:
  ```typescript
  onLayersLoaded(bundle.processedLayers, purposeCode);
  ```

---

### 2. Update [geolibre.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/geolibre.ts)

We will update the layer load handler to accept and forward `purposeCode` down to the style selectors:
- Update function signature:
  ```typescript
  function handleLayersLoaded(layers: S57LayerData[], purposeCode?: number) {
  ```
- Update layer sorting priority logic:
  ```typescript
  const orderedLayers = [...layers].sort((a, b) => {
    const styleA = selectS57LayerStyle(a.classCode, (a.metadata?.sampleProperties as Record<string, unknown>) ?? {}, purposeCode);
    const styleB = selectS57LayerStyle(b.classCode, (b.metadata?.sampleProperties as Record<string, unknown>) ?? {}, purposeCode);
    return styleA.priority - styleB.priority;
  });
  ```
- Update style selection logic:
  ```typescript
  const styleSelection = selectS57LayerStyle(layer.classCode, sampleProperties, purposeCode);
  ```

---

### 3. Verify [s57StyleRegistry.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/styles/s57StyleRegistry.ts)

The existing styling logic in `s57StyleRegistry.ts` is fully equipped to compute the dynamic zoom ranges via `selectS57LayerStyle` and `getLayerZoomRange`. No changes are necessary in this file, as `reapplyStyle` already dynamically updates MapLibre's zoom bounds via `map.setLayerZoomRange()`.

---

## Verification Plan

### Manual Verification
1. Open the S-57 Loader panel in the GeoLibre app.
2. Verify the new "ENC Usage Purpose" dropdown is visible and has options 1 to 6.
3. Select **5 - Harbour (Zoom 13-17)**.
4. Upload an S-57 chart file.
5. Verify that the loaded features (e.g. `LNDARE`, `DEPARE`) are only visible at zoom levels 13 to 17, and disappear once zoomed out past zoom 13.
6. Change the dropdown to **1 - Overview (Zoom 0-9)**.
7. Verify that the map updates dynamically and the layers are now visible only between zoom levels 0 and 9.
