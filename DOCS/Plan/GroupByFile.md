# Implementation Plan: Group By File (Delete Uploaded Layer by File ID)

## Purpose
Allow users to remove loaded map layers grouped by the file they originated from. Every file load operation maps its generated layer IDs (`addGeoJsonLayer` return values) to an integer `fileId`. When a user deletes a file from the loaded list UI, all associated layer IDs are unregistered from the host map via `unregisterExternalNativeLayer`, and the file entry is cleaned up from the mapping.

## Scope
- **Plugin Host Integration (`src/geolibre.ts`)**: Maintain `fileId` counter and a map tracking `fileId` -> `layerId[]`. Expose file deletion logic calling `unregisterExternalNativeLayer`.
- **UI Component (`src/lib/components/S57Uploader.tsx`)**: Update `loadedFiles` state to track `{ id: number, name: string }`, render a delete button beside each file in the opened files list, and handle individual file deletion.
- **Styling (`src/lib/styles/uploader.css`)**: Style the file list item layout and delete button.
- **Tests**: Add unit test coverage for file-based layer grouping and deletion logic.

---

## Technical Architecture & Workflow

```mermaid
flowchart TD
    A[User Uploads File] --> B[handleLayersLoaded]
    B --> C[addGeoJsonLayer for each layer]
    C --> D[Collect layerId strings array]
    D --> E[Assign integer fileId]
    E --> F[Store fileId -> layerId[] in fileLayerMap]
    F --> G[Pass fileId & fileName to UI State]
    
    H[User clicks Delete Button beside file] --> I[handleDeleteFile fileId]
    I --> J[Lookup layerId[] from fileLayerMap]
    J --> K[Call unregisterExternalNativeLayer for each layerId]
    K --> L[Clean up styleTracker & everyloadedlayers]
    L --> M[Delete fileId entry from fileLayerMap]
    M --> N[Remove file item from UI loadedFiles list]
```

---

## Proposed Changes

### 1. Plugin Host Logic & Layer Tracking

#### [MODIFY] [geolibre.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/geolibre.ts)
- Maintain an internal `nextFileId` counter (starting at `1`) and a `fileLayerMap`:
  ```ts
  let nextFileId = 1;
  const fileLayerMap = new Map<number, { fileName: string; layerIds: string[] }>();
  ```
- Modify `handleLayersLoaded(layers: S57LayerData[], purposeCode?: number)`:
  - Track all `hostedLayerId` strings generated during layer creation (including `LIGHT_SECTORS` and `TSS_ARROWS`).
  - Assign `const fileId = nextFileId++`.
  - Save `fileLayerMap.set(fileId, { fileName, layerIds })`.
  - Return `{ id: fileId, name: fileName }`.
- Add `handleDeleteFileLayer(fileId: number)` function:
  - Retrieve entry from `fileLayerMap.get(fileId)`.
  - For each `layerId` in `entry.layerIds`:
    - Call `appAPI?.unregisterExternalNativeLayer?.(layerId)`.
    - Remove `layerId` from `styleTracker` / `everyloadedlayers`.
  - Perform `fileLayerMap.delete(fileId)`.
- Pass `handleDeleteFileLayer` into `S57Uploader` props inside `s57ReaderPlugin.activate`.

---

### 2. User Interface (S-57 Loader Panel)

#### [MODIFY] [S57Uploader.tsx](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/components/S57Uploader.tsx)
- Update `LoadedFile` type:
  ```ts
  interface LoadedFileItem {
    id: number;
    name: string;
  }
  ```
- Update `S57UploaderProps`:
  ```ts
  interface S57UploaderProps {
    onLayersLoaded: (layers: S57LayerData[], purposeCode?: number, fileName?: string) => LoadedFileItem | undefined;
    onDeleteFile: (fileId: number) => void;
    onClearLayers: () => void;
  }
  ```
- Update `loadedFiles` state type to `LoadedFileItem[]`.
- In `handleFileUpload` and `handleApiSubmit`, retrieve the returned `LoadedFileItem` from `onLayersLoaded` and append it to `loadedFiles`.
- In the loaded files list (`<ul className="loaded-list">`), render each file with a delete button:
  ```tsx
  {loadedFiles.map((file) => (
    <li key={file.id} className="loaded-file-item">
      <span className="file-name">📄 {file.name}</span>
      <button
        type="button"
        className="delete-file-button"
        onClick={() => handleDeleteFile(file.id)}
        title={`Delete ${file.name}`}
      >
        🗑️
      </button>
    </li>
  ))}
  ```
- Implement `handleDeleteFile(fileId: number)`:
  - Call `onDeleteFile(fileId)`.
  - Update `loadedFiles` state: `setLoadedFiles(prev => prev.filter(f => f.id !== fileId))`.

---

### 3. Styling

#### [MODIFY] [uploader.css](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/styles/uploader.css)
- Add CSS rules for `.loaded-file-item`, `.file-name`, and `.delete-file-button`:
  - Space filename and delete button nicely using Flexbox.
  - Add hover and active state styles for `.delete-file-button`.

---

## Verification Plan

### Automated Tests
- Run existing unit test suite:
  ```bash
  npm test
  ```
- Add unit tests in `tests/s57Uploader.test.tsx` and `tests/groupByFile.test.ts`:
  1. Test file ID generation and mapping when `handleLayersLoaded` is called.
  2. Test `unregisterExternalNativeLayer` is invoked for all layer IDs linked to a specific `fileId` when `handleDeleteFileLayer` is called.
  3. Test map deletion (verify `fileLayerMap.has(fileId)` becomes `false`).
  4. Test UI delete button click triggers `onDeleteFile` callback and updates `loadedFiles` list.

### Manual Verification
1. Launch dev server or example page (`npm run dev`).
2. Upload an S-57 `.000` chart file. Verify the file appears in the loaded files list with a `🗑️` button.
3. Upload a second S-57 file. Verify two file items exist with unique IDs.
4. Click `🗑️` next to the first file. Verify that only the layers for that file are removed from the map and `everyloadedlayers`, while the second file's layers remain rendered.
5. Verify `Clear layers` removes all remaining files and layers.
