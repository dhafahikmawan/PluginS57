# Layer Grouping Plan: Group S-57 Layers by Source File

## Background

When a user loads an S-57 file (e.g. `ID409010.000`), the plugin converts it into
dozens of individual layers — one per S-57 object class (LNDARE, DEPARE, LIGHTS,
etc.). The goal is to make all those layers appear **under a single named group** in
GeoLibre's layer panel, where the group name is the filename of the converted file
(e.g. `ID409010.000`).

---

## API Audit & New Findings

> [!IMPORTANT]
> The current `GeoLibreAppAPI` in the local `host-api.ts` uses a low-level
> `registerExternalNativeLayer` method which lacks a native grouping primitive. 
> However, a review of the [latest live GeoLibre API docs](https://github.com/opengeos/GeoLibre/blob/main/docs/plugin-api.md)
> reveals a newer, higher-level method for this exact use case: `addGeoJsonLayer`.

The latest `GeoLibreAppAPI` exposes the following method:

```typescript
addGeoJsonLayer: (
  name: string,
  data: FeatureCollection,
  sourcePath?: string,
) => string;
```

### Why this is better:
1. **Native Grouping Support**: The `sourcePath` parameter is specifically designed to indicate the origin of the data. GeoLibre uses this `sourcePath` to group layers in its layer panel. By passing the S-57 filename (e.g., `ID409010.000`) as the `sourcePath`, the host will automatically group all the extracted layers under a single collapsible folder named after the file.
2. **Simplified API**: It returns a `string` (the layer ID) and removes the need to manually construct complex MapLibre layer/source IDs or manage `metadata` dictionaries for grouping.

---

## Implementation Strategy

We will update the local `host-api.ts` to reflect the latest `GeoLibreAppAPI` contract and then refactor the plugin to use `addGeoJsonLayer`.

### Step 1: Update the Host API Contract

In `src/lib/geolibre/host-api.ts`, update `GeoLibreAppAPI` to include the `addGeoJsonLayer` method (and any other relevant new methods, if desired). We also need to add a corresponding removal method if we want to clear layers, although if the host manages them via the Layers panel, users can delete them directly there. The docs don't explicitly list a `removeLayer` method in the snippet, but typically `removeLayer(id)` or similar exists. Assuming we just need to add them for now:

```diff
  export interface GeoLibreAppAPI<TControl extends GeoLibreControl = GeoLibreControl> {
    // ... existing methods ...

+   /**
+    * Adds a GeoJSON layer to the map. The layer appears in the Layers panel and
+    * persists with the project.
+    * @param name The human-readable name of the layer.
+    * @param data The GeoJSON FeatureCollection.
+    * @param sourcePath An optional path or filename. Layers with the same sourcePath
+    *                   are grouped together in the host's Layers panel.
+    * @returns The generated layer ID.
+    */
+   addGeoJsonLayer?: (
+     name: string,
+     data: GeoLibreFeatureCollection,
+     sourcePath?: string,
+   ) => string;
  }
```

### Step 2: Refactor `geolibre.ts` to use `addGeoJsonLayer`

We will update `handleLayersLoaded` to use `appAPI.addGeoJsonLayer` instead of `registerExternalNativeLayer`. 

```ts
function handleLayersLoaded(layers: S57LayerData[]) {
  if (!appAPI) return;

  // Use the new API if available
  if (appAPI.addGeoJsonLayer) {
    for (const layer of layers) {
      // The sourcePath acts as the grouping key in GeoLibre's layer panel
      const layerId = appAPI.addGeoJsonLayer(
        layer.layerName,       // e.g. "LNDARE"
        layer.geojson,         // FeatureCollection
        layer.fileName         // e.g. "ID409010.000" (Used for grouping!)
      );
      
      activeLayerIds.push(layerId);
    }
  } else if (appAPI.registerExternalNativeLayer) {
    // Fallback to the old method if running on an older host
    handleClearLayers();
    
    for (const layer of layers) {
      const layerId = `s57-layer-${layer.fileName}-${layer.classCode.toLowerCase()}`;
      appAPI.registerExternalNativeLayer({
        id: layerId,
        name: layer.layerName,
        geojson: layer.geojson,
        nativeLayerIds: [layerId],
        sourceIds: [layerId],
        opacity: 0.8,
        style: getLayerStyle(layer.classCode),
        metadata: {
          s57Class: layer.classCode,
          source: 'S-57 Import',
          group: layer.fileName
        }
      });
      activeLayerIds.push(layerId);
    }
  }
}
```

### Step 3: Handle Styling and Teardown (Open Questions)

- **Styling**: `addGeoJsonLayer` in the provided docs does not show a `style` parameter. If GeoLibre automatically assigns random colors or provides UI for the user to style it, that's fine. If we must strictly define the styles (like `getLayerStyle` does), we need to confirm if there is a way to pass style hints (e.g., via metadata or an extended options object not fully detailed in the snippet).
- **Clearing Layers**: The `handleClearLayers` function currently uses `unregisterExternalNativeLayer`. We will need to verify how layers added via `addGeoJsonLayer` can be removed programmatically, or if we should leave layer management entirely to the user via the host's Layers panel once added.

---

## Conclusion

By adopting the `addGeoJsonLayer` method from the latest GeoLibre API, we can achieve perfect grouping out-of-the-box simply by providing the filename as the `sourcePath`. This aligns the plugin with the official, higher-level host API intended for adding data layers.
