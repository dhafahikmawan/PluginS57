# Plan and Instructions: Add ZIP Download for Converted GeoJSONs

## Goal
Add a download feature so the user can export all converted GeoJSON outputs for one uploaded S-57 file as a single .zip archive.

## Important requirement
The ZIP must contain the GeoJSONs in their pre-processed form, meaning before any extra transformations such as:
- LIGHTS sector generation
- DEPARE / DRGARE splitting by depth range
- DEPCNT / SLCONS uncertainty splitting
- SOUNDG enrichment into processed sounding features

In other words, the archive should be created from the original converted GeoJSON data before the system adds extra attributes or splits features into derived layers.

---

## Expected behavior
When the user uploads an S-57 file and the plugin finishes conversion:
1. The system should create a ZIP file.
2. The ZIP should contain one or more GeoJSON files.
3. Each GeoJSON file should represent the original grouped output before extra processing logic is applied.
4. The user should be able to download the ZIP from the UI with one click.

---

## Recommended implementation plan

### 1. Keep a raw copy of the converted data
The current converter already builds processed layers and adds derived features. Before that happens, the code should keep a copy of the original grouped GeoJSON data.

Recommended structure:

```ts
export interface DownloadBundle {
  sourceFileName: string;
  rawGeojsonByClass: Record<string, any>;
  processedLayers: S57LayerData[];
}
```

The raw copy should be created immediately after parsing the S-57 file and before any of these happen:
- adding `_light_label`
- creating light-sector polygons
- applying DEPARE suffix logic
- creating processed SOUNDG features

### 2. Create a helper to build the ZIP
Create a utility file such as:
- [S57Convert/src/lib/utils/downloadZip.ts](../S57Convert/src/lib/utils/downloadZip.ts)

This helper should:
- accept the raw GeoJSON bundle
- create a ZIP archive using JSZip
- write each raw GeoJSON as a file inside the archive
- optionally add a manifest file such as `manifest.json`

Suggested file naming:
- `raw/LIGHTS.geojson`
- `raw/DEPARE.geojson`
- `raw/SOUNDG.geojson`
- `raw/manifest.json`

### 3. Add a download button to the UI
Update the upload UI in:
- [S57Convert/src/lib/components/S57Uploader.tsx](../S57Convert/src/lib/components/S57Uploader.tsx)

After the conversion finishes, show a button such as:
- Download ZIP

When clicked, the button should:
- receive the raw conversion bundle
- call the ZIP builder
- trigger a browser download

### 4. Do not build the ZIP from the processed layers
This is the most important rule.

Do not use the processed layer objects directly for the ZIP because they may include:
- extra polygon sectors for LIGHTS
- split DEPARE layers by depth class
- derived SOUNDG_processed features

The ZIP must be based on the original grouped GeoJSON before those extra outputs are created.

---

## Junior-programmer / AI implementation instructions

### Step 1: Install dependency
Add JSZip to the project:

```bash
npm install jszip
```

### Step 2: Create a download utility
Create a small helper file that does the following:
1. Accepts a bundle of raw GeoJSON data.
2. Creates a ZIP archive.
3. Writes each GeoJSON feature collection to the archive.
4. Uses Blob and `URL.createObjectURL` for browser download.

Example structure:

```ts
import JSZip from 'jszip';

export async function downloadGeoJsonZip(bundle: DownloadBundle, fileName: string) {
  const zip = new JSZip();

  Object.entries(bundle.rawGeojsonByClass).forEach(([className, geojson]) => {
    zip.file(`${className}.geojson`, JSON.stringify(geojson, null, 2));
  });

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.zip`;
  link.click();
  URL.revokeObjectURL(url);
}
```

### Step 3: Preserve raw data in the converter
Inside the converter logic, create a raw copy before any extra processing begins.

Do not mutate the original features in place. Use a deep copy if needed.

Example idea:

```ts
const rawGeojsonByClass: Record<string, any> = {};

// after grouping raw features by class, store a copy here
rawGeojsonByClass[acronym] = {
  type: 'FeatureCollection',
  features: structuredClone(features)
};
```

Then later, when building processed layers, use the processed version only for UI/layer display.

### Step 4: Wire the button into the uploader
In the upload component:
- after conversion succeeds, store the bundle result
- show a button only when the bundle exists
- on click, call the ZIP download helper

### Step 5: Keep naming predictable
Use simple and stable names such as:
- `LIGHTS.geojson`
- `DEPARE.geojson`
- `SOUNDG.geojson`

Avoid names that include processed suffixes unless the user specifically asks for them.

---

## Recommended file changes
- [S57Convert/src/lib/utils/s57Converter.ts](../S57Convert/src/lib/utils/s57Converter.ts) - preserve raw GeoJSON and expose a bundle for download
- [S57Convert/src/lib/utils/downloadZip.ts](../S57Convert/src/lib/utils/downloadZip.ts) - create the ZIP archive
- [S57Convert/src/lib/components/S57Uploader.tsx](../S57Convert/src/lib/components/S57Uploader.tsx) - add the Download ZIP button

---

## Implementation checklist
- [ ] Install JSZip
- [ ] Create helper to generate ZIP files
- [ ] Preserve raw GeoJSON before extra processing
- [ ] Add a download button to the UI
- [ ] Verify that the ZIP contains raw GeoJSONs, not processed-only outputs
- [ ] Test with sample files from the Samples folder

---

## Testing notes
Test with at least one file that triggers extra processing, such as:
- LIGHTS
- DEPARE
- SOUNDG

Verify that the ZIP contains the original grouped GeoJSONs and that the derived outputs are not the only contents.

---

## Final note for the programmer
Keep the implementation simple and explicit:
- build the ZIP from raw converted GeoJSON
- keep processed layers separate for display and styling
- do not mix the two concepts in one output

This will make the feature easier to maintain and much safer for future changes.
