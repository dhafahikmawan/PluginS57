# Bug Fix Implementation Plan: S-57 Layer Visibility Toggle Fix

## Problem Statement & Root Cause Analysis

### Background
In the GeoLibre S-57 Marine Chart Reader plugin, a hide/show toggle button (`👁️` / `🙈`) is displayed next to each loaded file entry in the "Loaded layers" side panel. However, clicking the button currently changes the UI icon state but **fails to hide or show the layers on the MapLibre map**.

### Identified Root Causes

1. **Layer ID Mismatch & Direct Lookup Failure (`map.getLayer` returning `undefined`)**:
   - When layers are loaded in [geolibre.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/geolibre.ts), `appAPI.addGeoJsonLayer(...)` returns a `hostedLayerId` (e.g. `uploaded-1.000--DEPARE`).
   - The GeoLibre host application creates underlying MapLibre map layers using suffixes or custom IDs (e.g. `uploaded-1.000--DEPARE-fill`, `uploaded-1.000--DEPARE-line`, `uploaded-1.000--DEPARE-circle`, or layers where `layer.source` equals `uploaded-1.000--DEPARE`).
   - `handleToggleFileVisibility` in `geolibre.ts` previously attempted:
     ```typescript
     if (map.getLayer?.(layerId)) {
       map.setLayoutProperty(layerId, 'visibility', visibilityValue);
     }
     ```
   - Because `map.getLayer(hostedLayerId)` looks for an exact layer ID match, it evaluated to `undefined` for host-managed layers. Consequently, `map.setLayoutProperty` was never invoked on any actual MapLibre layer on the map.

2. **Lack of Candidate Layer Resolution**:
   - While [s57StyleRegistry.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/styles/s57StyleRegistry.ts) implemented `getCandidateLayerIds(map, layerId, targetName)` to resolve actual MapLibre layer IDs for styling, `handleToggleFileVisibility` did not resolve candidate layers and only checked exact `layerId` matches.

3. **Style Reapplication Overwrites & Persistence**:
   - MapLibre triggers `'data'` or `'layer'` events on layout/style changes, which triggers `queueStyleReapply(map)` -> `styleReapplier.reapplyAllStyles(map)`.
   - If `StyleReapplier` does not check or respect the file's hidden state, re-applying layout/paint properties during map style events can inadvertently reset or conflict with the visibility state.

---

## Proposed Solution

1. **Implement Candidate Layer Resolution in `handleToggleFileVisibility`**:
   - Update `handleToggleFileVisibility` in [geolibre.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/geolibre.ts) to query all active style layers via `map.getStyle()?.layers`.
   - Match candidate MapLibre layers whose `id` or `source` contains or equals any of the file's `layerIds` or the `fileName`.
   - Execute `map.setLayoutProperty(candidateId, 'visibility', visibilityValue)` on **all** matched candidate layers as well as direct `layerId` matches.

2. **Integrate Hidden State into Style Reapplication**:
   - Export a helper function or check `fileLayerMap` during `styleReapplier.reapplyStyle` / `queueStyleReapply` to ensure that if a file is marked as `hidden: true`, its layers maintain `visibility: 'none'`.

3. **Add Comprehensive Unit Tests**:
   - Add test cases in [groupByFile.test.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/tests/groupByFile.test.ts) or a dedicated test file verifying that candidate MapLibre layers with suffixes (`-fill`, `-line`, `-circle`) receive `setLayoutProperty('visibility', 'none' | 'visible')`.

---

## Step-by-Step Execution Instructions

### Step 1: Update `handleToggleFileVisibility` in `S57Convert/src/geolibre.ts`
[geolibre.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/geolibre.ts)

- Replace direct `map.getLayer(layerId)` check with a candidate layer lookup:
```typescript
export function handleToggleFileVisibility(fileId: number, hide?: boolean): boolean {
  const entry = fileLayerMap.get(fileId);
  if (!entry || !appAPI) return false;

  const map = appAPI.getMap?.();
  const targetHiddenState = hide !== undefined ? hide : !entry.hidden;
  entry.hidden = targetHiddenState;

  const visibilityValue = targetHiddenState ? 'none' : 'visible';

  if (map) {
    const styleLayers: Array<{ id?: string; source?: string }> = map.getStyle?.()?.layers ?? [];
    const targetCandidateIds = new Set<string>();

    // Add direct layer IDs
    entry.layerIds.forEach(id => targetCandidateIds.add(id));

    // Resolve candidate layers from MapLibre style
    styleLayers.forEach(layer => {
      if (!layer?.id) return;
      const layerId = layer.id;
      const sourceName = layer.source ?? '';

      const matchesEntry = entry.layerIds.some(id =>
        layerId === id ||
        sourceName === id ||
        layerId.startsWith(`${id}-`) ||
        layerId.includes(id)
      );

      if (matchesEntry) {
        targetCandidateIds.add(layerId);
      }
    });

    targetCandidateIds.forEach((candidateId) => {
      try {
        if (typeof map.setLayoutProperty === 'function') {
          map.setLayoutProperty(candidateId, 'visibility', visibilityValue);
        }
      } catch (error) {
        console.error(`Error updating visibility for layer ${candidateId}:`, error);
      }
    });
  }

  return entry.hidden;
}
```

### Step 2: Preserve Hidden Visibility during Style Reapplication
[geolibre.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/geolibre.ts) & [s57StyleRegistry.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/styles/s57StyleRegistry.ts)

- Ensure `reapplyStyle` checks if the layer belongs to a hidden file entry:
  - Check if any `fileLayerMap` entry containing `layerId` has `hidden: true`.
  - If hidden, enforce `map.setLayoutProperty(candidateLayerId, 'visibility', 'none')` after applying style properties.

### Step 3: Write Unit Tests for Visibility Resolution
[groupByFile.test.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/tests/groupByFile.test.ts)

- Add unit test verifying:
  1. `handleToggleFileVisibility` correctly identifies candidate MapLibre layers with suffixes (`-fill`, `-stroke`, `-symbol`).
  2. `setLayoutProperty` is called with `'none'` when toggling off, and `'visible'` when toggling back on.
  3. Returns correct boolean hidden state.

---

## Verification Plan

### Automated Tests
Run the test suite and build verification:
```bash
cd S57Convert
npm test
npm run build
```

### Manual Verification
1. Load an S-57 `.000` chart file into the GeoLibre plugin.
2. In the "Loaded layers" panel, click the `👁️` toggle button for the loaded file.
3. **Verify**:
   - Button icon changes to `🙈`.
   - File item in list is dimmed/struck-through.
   - All associated map features (polygons, lines, symbols, soundings, TSS arrows) vanish from the map.
4. Click the `🙈` toggle button again.
5. **Verify**:
   - Button icon restores to `👁️`.
   - All map features re-appear on the map instantly with correct styling preserved.
