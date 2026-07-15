# Migrating S-57 Parsing to GDAL.js (gdal3.js)

This document provides step-by-step instructions for replacing the `@s57-parser/s57` JavaScript parser with **GDAL.js** (`gdal3.js`). Using GDAL's native `ogr2ogr` capability inside WebAssembly ensures robust, industry-standard compliance for S-57 (.000) parsing.

Since this plugin is built as an ES module for the GeoLibre host and bundled into a final ZIP package, special configuration is required to handle Emscripten's Node.js shims and compile assets cleanly without dynamic `require` statements.

---

## 1. Update Dependencies

Remove the old pure JavaScript parser and install `gdal3.js`:

```bash
# Uninstall the old S-57 parser
npm uninstall @s57-parser/s57

# Install GDAL.js
npm install gdal3.js
```

---

## 2. Bundler Configuration (Vite & Rollup)

GDAL.js is compiled using Emscripten. The generated glue code contains conditional Node.js statements like `require('fs')` and `require('path')`. When bundling for the browser, standard Rollup/Vite will emit warnings, attempt to resolve them, or introduce dynamic `require` calls that cause browser errors (e.g., `fs is not defined` or module resolution errors).

To prevent this, modify your Vite configurations (`vite.config.ts` and `vite.geolibre.config.ts`) to:
1. **Shim Node.js built-ins to `false`**: Tell Vite's resolver that these modules are empty, preventing Rollup from outputting dynamic imports or requires.
2. **Copy WASM assets automatically**: Hook into the build process to copy the `gdal3.js` WebAssembly and data bundle into the plugin's `dist/` directory.

### Modify [vite.geolibre.config.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/vite.geolibre.config.ts)

Apply the following changes to the configuration file:

```typescript
import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cp } from "node:fs/promises";
import type { Plugin } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Vite custom plugin to copy GDAL WASM/Data assets to dist
function copyGdalAssets(): Plugin {
  return {
    name: "geolibre-plugin:copy-gdal-assets",
    async closeBundle() {
      const srcDir = resolve(__dirname, "node_modules/gdal3.js/dist/package");
      const destDir = resolve(__dirname, "geolibre-plugin/dist");
      
      // Ensure the build output directory exists
      await cp(resolve(srcDir, "gdal3WebAssembly.wasm"), resolve(destDir, "gdal3WebAssembly.wasm"));
      await cp(resolve(srcDir, "gdal3WebAssembly.data"), resolve(destDir, "gdal3WebAssembly.data"));
      await cp(resolve(srcDir, "gdal3.js"), resolve(destDir, "gdal3.js"));
      console.log("Copied GDAL.js WASM, Data, and Worker files to geolibre-plugin/dist/");
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      // CRITICAL: Shim Node built-ins referenced by Emscripten to prevent dynamic requires
      fs: false,
      path: false,
      crypto: false,
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env': {}
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/geolibre.ts"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    outDir: "geolibre-plugin/dist",
    emptyOutDir: true,
    rollupOptions: {
      external: [],
      output: {
        assetFileNames: () => "style.css",
      },
    },
    cssCodeSplit: false,
    sourcemap: false,
    minify: false,
  },
  plugins: [copyGdalAssets()],
});
```

---

## 3. Package and Archive Configuration

The packaging script needs to include the newly copied WASM and data assets in the final ZIP archive. Update [package-geolibre-plugin.mjs](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/scripts/package-geolibre-plugin.mjs):

```javascript
// Locate the entries array in scripts/package-geolibre-plugin.mjs and add the assets:
const entries = [
  ["plugin.json", manifestPath],
  [manifest.entry, join(bundleDir, manifest.entry)],
  // Add GDAL.js assets to the zip entries
  ["dist/gdal3WebAssembly.wasm", join(bundleDir, "dist/gdal3WebAssembly.wasm")],
  ["dist/gdal3WebAssembly.data", join(bundleDir, "dist/gdal3WebAssembly.data")],
  ["dist/gdal3.js", join(bundleDir, "dist/gdal3.js")],
];
```

---

## 4. Export App Context from Entrypoint

To load the GDAL.js WebAssembly files dynamically at runtime in both local web development and native desktop environments, we use GeoLibre's `resolvePluginAssetUrl` helper. Export the `appAPI` from [src/geolibre.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/geolibre.ts) to make it accessible to our utility functions:

```typescript
// src/geolibre.ts

// Export the app context reference
export let appAPI: GeoLibreAppAPI | null = null;

export const s57ReaderPlugin: GeoLibrePlugin = {
  id: "geolibre-s57-reader",
  name: "S-57 Marine Chart Reader",
  version: "1.0.0",

  activate(app: GeoLibreAppAPI) {
    appAPI = app; // Captured context
    // ... rest of activation code ...
  },
  
  deactivate(app: GeoLibreAppAPI) {
    // ... cleanup ...
    appAPI = null;
    return true;
  }
};
```

---

## 5. Implement the GDAL Converter

Update [src/lib/utils/s57Converter.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/utils/s57Converter.ts) to load GDAL.js, parse S-57 layers, convert them to GeoJSON format, and align metadata properties.

> [!IMPORTANT]
> Because GDAL initialization and processing are asynchronous, the function `convertS57ToGeoJSONLayers` must be updated to return a `Promise<S57LayerData[]>`.

```typescript
import initGdalJs from 'gdal3.js';
import { getS57Acronym, S57_CODE_TO_ACRONYM } from './s57ObjectClasses';
import { appAPI } from '../../geolibre';

// Configurable paths for GDAL WASM/Data.
// Fallback to CDN for development/local testing.
const GDAL_VERSION = '2.6.0'; // Matches your package.json version
const CDN_PATHS = {
  wasm: `https://cdn.jsdelivr.net/npm/gdal3.js@${GDAL_VERSION}/dist/package/gdal3WebAssembly.wasm`,
  data: `https://cdn.jsdelivr.net/npm/gdal3.js@${GDAL_VERSION}/dist/package/gdal3WebAssembly.data`,
  js: `https://cdn.jsdelivr.net/npm/gdal3.js@${GDAL_VERSION}/dist/package/gdal3.js`,
};

export interface S57LayerData {
  classCode: string; // e.g., ADMARE, AIRARE, etc.
  layerName: string; // Layer representation (e.g., ADMARE:IT)
  geojson: any;      // FeatureCollection GeoJSON
  fileName: string;  // Source file name
  metadata?: Record<string, unknown>;
}

/**
 * Resolves the path to the GDAL.js assets depending on deployment environment
 */
function resolveGdalPaths() {
  const app = appAPI;
  const pluginId = 'geolibre-s57-reader';

  // If the host provides asset resolution, use the packaged offline assets
  if (app?.resolvePluginAssetUrl) {
    return {
      wasm: app.resolvePluginAssetUrl(pluginId, 'dist/gdal3WebAssembly.wasm') || CDN_PATHS.wasm,
      data: app.resolvePluginAssetUrl(pluginId, 'dist/gdal3WebAssembly.data') || CDN_PATHS.data,
      js: app.resolvePluginAssetUrl(pluginId, 'dist/gdal3.js') || CDN_PATHS.js,
    };
  }

  // Fallback to CDN for generic browser runs or development configurations
  return CDN_PATHS;
}

/**
 * Mengonversi buffer file S-57 (.000) menjadi daftar layer GeoJSON yang terkelompok menggunakan GDAL.js.
 */
export async function convertS57ToGeoJSONLayers(arrayBuffer: ArrayBuffer, fileName: string): Promise<S57LayerData[]> {
  // 1. Initialize GDAL
  const paths = resolveGdalPaths();
  const Gdal = await initGdalJs({ paths });

  // 2. Prepare files for the virtual filesystem (MEMFS)
  const fileObj = new File([arrayBuffer], fileName);

  // 3. Open the dataset inside the GDAL environment
  const openResult = await Gdal.open([fileObj]);
  if (!openResult || !openResult.datasets || openResult.datasets.length === 0) {
    throw new Error("Gagal memuat file S-57 dengan GDAL.");
  }
  const dataset = openResult.datasets[0];

  // 4. Retrieve S-57 layer details using ogrinfo
  const infoText = await Gdal.ogrinfo(dataset);
  if (!infoText) {
    throw new Error("Gagal membaca metadata dari S-57.");
  }

  // Extract layer names (acronyms) from ogrinfo output e.g. "1: LNDARE (Polygon)"
  const layerMatches = infoText.matchAll(/^\d+:\s+(\w+)\s+\(/gm);
  const layerNames = Array.from(layerMatches, m => m[1]);

  if (layerNames.length === 0) {
    throw new Error("File S-57 tidak memiliki layer fitur data yang valid.");
  }

  // 5. Convert layers to GeoJSON one by one using ogr2ogr
  const allFeatures: any[] = [];

  for (const layerName of layerNames) {
    // DSID contains metadata only, skip conversion for spatial display
    if (layerName === 'DSID') continue;

    try {
      const outputName = `out_${layerName}.geojson`;
      // Convert to WGS-84 coordinate system using -t_srs EPSG:4326
      const outputFilePath = await Gdal.ogr2ogr(dataset, [
        '-f', 'GeoJSON',
        '-t_srs', 'EPSG:4326',
        layerName
      ], outputName);

      // Read output bytes and parse GeoJSON
      const bytes = await Gdal.getFileBytes(outputFilePath);
      const text = new TextDecoder().decode(bytes);
      const geojson = JSON.parse(text);

      if (geojson && geojson.features) {
        for (const feature of geojson.features) {
          // Normalize features to align with existing style and grouping logic
          const props = feature.properties || {};
          props.OBJ_CLASS = layerName;
          
          if (!props.OBJL) {
            // Find corresponding numeric code for styling rules
            const numericCode = Object.keys(S57_CODE_TO_ACRONYM).find(
              key => S57_CODE_TO_ACRONYM[key] === layerName
            );
            if (numericCode) {
              props.OBJL = Number(numericCode);
            }
          }
          allFeatures.push(feature);
        }
      }
    } catch (layerErr) {
      console.warn(`Layer ${layerName} dilewati karena kesalahan:`, layerErr);
    }
  }

  if (allFeatures.length === 0) {
    throw new Error("File S-57 tidak menghasilkan fitur geometri apa pun.");
  }

  // 6. Group features (Keeps all downstream styling, soundings & lights processing identical)
  const groupedFeatures: Record<string, any[]> = {};
  const groupAcronyms: Record<string, string> = {};

  for (const feature of allFeatures) {
    const rawCode: any = feature.properties?.OBJL || feature.properties?.OBJ_CLASS;
    const codeStr = rawCode != null ? String(rawCode) : "UNKNOWN";
    const acronym = getS57Acronym(codeStr);

    let suffix = '';
    const props = feature.properties || {};

    if (acronym === 'LIGHTS' || acronym === 'LITFLT') {
      props._light_label = deriveLightLabel(props, acronym);
      const sectorFeature = buildLightSectorFeature(feature, acronym);
      if (sectorFeature) {
        props._light_sector = sectorFeature;
      }
    }
    
    if (acronym === 'DEPARE' || acronym === 'DRGARE') {
      const drval1 = Number(props.DRVAL1) || 0;
      if (drval1 < 0) suffix = ':IT';
      else if (drval1 < 2.0) suffix = ':VS';
      else if (drval1 < 30.0) suffix = ':MS';
      else suffix = ':DW';
    } else if (acronym === 'DEPCNT' || acronym === 'SLCONS') {
      const uncertain = String(props.QUAPOS) === '2' || String(props.CONDTN) === '2';
      suffix = uncertain ? ':UNC' : ':CER';
    } else if (acronym === 'LIGHTS') {
      const color = String(props.COLOUR || '');
      if (color.includes('3')) suffix = ':RED';
      else if (color.includes('4')) suffix = ':GRN';
      else suffix = ':YLW';
    }

    const groupKey = `${acronym}${suffix}`;

    if (!groupedFeatures[groupKey]) {
      groupedFeatures[groupKey] = [];
      groupAcronyms[groupKey] = acronym;
    }
    groupedFeatures[groupKey].push(feature);
  }

  // 7. Structure the layers
  const layers: S57LayerData[] = Object.keys(groupedFeatures).map((groupKey) => {
    const features = groupedFeatures[groupKey];
    const sampleProperties = features[0]?.properties ?? {};
    const acronym = groupAcronyms[groupKey];

    if (acronym === 'LIGHTS' || acronym === 'LITFLT') {
      const sectorFeatures = features.flatMap((item) => {
        const sectorFeature = buildLightSectorFeature(item, acronym);
        return sectorFeature ? [sectorFeature] : [];
      });

      if (sectorFeatures.length > 0) {
        features.push(...sectorFeatures);
      }
    }

    return {
      classCode: acronym,
      layerName: groupKey,
      fileName: fileName,
      metadata: {
        featureCount: features.length,
        sampleProperties,
        sourcePath: fileName,
        styleHints: {
          objl: sampleProperties.OBJL ?? sampleProperties.OBJ_CLASS ?? acronym,
          labelField: acronym === 'LIGHTS' || acronym === 'LITFLT'
            ? (sampleProperties._light_label ? '_light_label' : 'OBJNAM')
            : (sampleProperties.OBJNAM ?? 'OBJNAM')
        }
      },
      geojson: {
        type: "FeatureCollection",
        features
      }
    };
  });

  // Process soundings
  const rawSoundingFeatures = groupedFeatures['SOUNDG'] ?? [];
  const processedSoundingFeatures = rawSoundingFeatures.flatMap((feature) => buildProcessedSoundingFeatures(feature));

  if (processedSoundingFeatures.length > 0) {
    layers.push({
      classCode: 'SOUNDG_processed',
      layerName: 'SOUNDG_processed',
      fileName,
      metadata: {
        featureCount: processedSoundingFeatures.length,
        sampleProperties: processedSoundingFeatures[0]?.properties ?? {},
        sourcePath: fileName,
        styleHints: {
          objl: 'SOUNDG_processed',
          labelField: 'DEPTH',
        }
      },
      geojson: {
        type: 'FeatureCollection',
        features: processedSoundingFeatures,
      }
    });
  }

  return layers;
}
```

---

## 6. Update the React Uploader Component

Since the S-57 converter function now returns a `Promise`, update [src/lib/components/S57Uploader.tsx](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/components/S57Uploader.tsx) to resolve it:

```tsx
// Locate handleFileUpload in src/lib/components/S57Uploader.tsx:
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.000')) {
    setError("Format file tidak valid. Harap masukkan file S-57 dengan ekstensi '.000'");
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) throw new Error("Gagal membaca data file biner.");
        
        // Await the asynchronous S-57 converter output
        const layers = await convertS57ToGeoJSONLayers(buffer, file.name);
        onLayersLoaded(layers);
        
        setLoadedFiles(prev => [...prev, file.name]);
      } catch (err: any) {
        setError(err.message || "Gagal mengurai file S-57.");
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Gagal membaca file dari disk.");
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  } catch (err: any) {
    setError(err.message || "Terjadi kesalahan proses.");
    setLoading(false);
  }
};
```

---

## 7. Verification and Testing

1. Run the local build script to test bundler compatibility:
   ```bash
   npm run build
   ```
2. Ensure there are no warnings or errors concerning `require` or unresolved externals like `fs` and `path`.
3. Check the `geolibre-plugin/dist/` output folder and verify that `gdal3WebAssembly.wasm`, `gdal3WebAssembly.data`, and `gdal3.js` are copied alongside `index.js`.
4. Run the install script to copy the package:
   ```bash
   npm run install:geolibre
   ```
5. Open GeoLibre, import a `.000` chart file, and confirm that layers render correctly and their styling persists exactly as before.
