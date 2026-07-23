# Implementation Plan: Hide & Show File Layers Toggle Feature

## Goal Description
Add a visibility toggle feature to the Geolibre S-57 Marine Chart Reader plugin that enables users to dynamically **hide or show** all MapLibre map layers associated with a specific loaded file. In the "Loaded layers" list within the side panel, an interactive hide/show toggle button (`👁️` / `🙈`) will be added next to the existing delete button (`🗑️`) for each file entry. 

Clicking the button acts as a **two-way toggle**:
- If layers are currently **visible**, clicking hides them (`visibility` set to `'none'`) and switches the icon to `🙈`.
- If layers are currently **hidden**, clicking shows them again (`visibility` set to `'visible'`) and restores the icon to `👁️`.

---

## Proposed Changes

### 1. `S57Convert/src/geolibre.ts`
[geolibre.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/geolibre.ts)

- **Track Visibility State**: Update `fileLayerMap` to track the hidden status for each loaded `fileId`.
  ```typescript
  const fileLayerMap = new Map<number, { fileName: string; layerIds: string[]; hidden?: boolean }>();
  ```
- **Export `handleToggleFileVisibility`**: Add a toggle function that flips between hidden (`'none'`) and visible (`'visible'`) states depending on the current state (or an explicit boolean argument if supplied).
  ```typescript
  /**
   * Toggles or sets the visibility state of all MapLibre layers associated with a file.
   * @param fileId The ID of the loaded file.
   * @param hide Optional explicit boolean (true to hide, false to show). If omitted, toggles current state.
   * @returns boolean The new hidden state (true if hidden, false if visible).
   */
  export function handleToggleFileVisibility(fileId: number, hide?: boolean): boolean {
    const entry = fileLayerMap.get(fileId);
    if (!entry || !appAPI) return false;

    const map = appAPI.getMap?.();
    // Toggle current state if `hide` argument is not explicitly provided
    const targetHiddenState = hide !== undefined ? hide : !entry.hidden;
    entry.hidden = targetHiddenState;

    const visibilityValue = targetHiddenState ? 'none' : 'visible';

    entry.layerIds.forEach((layerId) => {
      try {
        if (map && typeof map.setLayoutProperty === 'function') {
          if (map.getLayer?.(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', visibilityValue);
          }
        }
      } catch (error) {
        console.error(`Error updating visibility for layer ${layerId}:`, error);
      }
    });

    return entry.hidden;
  }
  ```
- **Pass Handler to Component**: Pass `onToggleFileVisibility: handleToggleFileVisibility` to the `S57Uploader` component rendered in `activate()`.

---

### 2. `S57Convert/src/lib/components/S57Uploader.tsx`
[S57Uploader.tsx](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/components/S57Uploader.tsx)

- **Update `S57UploaderProps`**: Add `onToggleFileVisibility` prop.
  ```typescript
  interface S57UploaderProps {
    onLayersLoaded: (layers: S57LayerData[], purposeCode?: number, fileName?: string) => LoadedFileItem | undefined;
    onDeleteFile: (fileId: number) => void;
    onToggleFileVisibility?: (fileId: number, hide?: boolean) => boolean;
    onClearLayers: () => void;
  }
  ```
- **Track Hidden File IDs State**: Add state to track hidden file IDs for UI rendering.
  ```typescript
  const [hiddenFileIds, setHiddenFileIds] = useState<Set<number>>(new Set());
  ```
- **Add Toggle Handler**:
  ```typescript
  const handleToggleVisibility = (fileId: number) => {
    if (!onToggleFileVisibility) return;
    const isNowHidden = onToggleFileVisibility(fileId); // returns true if now hidden, false if now visible
    setHiddenFileIds(prev => {
      const next = new Set(prev);
      if (isNowHidden) {
        next.add(fileId);
      } else {
        next.delete(fileId);
      }
      return next;
    });
  };
  ```
- **Update Rendered Loaded Item**: Add the hide/show toggle button next to the delete button in the loaded files list:
  ```tsx
  <li key={file.id} className={`loaded-file-item ${hiddenFileIds.has(file.id) ? 'is-hidden' : ''}`}>
    <span className="file-name">📄 {file.name}</span>
    <div className="file-item-actions">
      <button
        type="button"
        className="toggle-visibility-button"
        onClick={() => handleToggleVisibility(file.id)}
        title={hiddenFileIds.has(file.id) ? `Show ${file.name}` : `Hide ${file.name}`}
      >
        {hiddenFileIds.has(file.id) ? '🙈' : '👁️'}
      </button>
      <button
        type="button"
        className="delete-file-button"
        onClick={() => handleDeleteFile(file.id)}
        title={`Delete ${file.name}`}
      >
        🗑️
      </button>
    </div>
  </li>
  ```
- **Reset Logic**: Clear `hiddenFileIds` in `handleReset()` and when a file is deleted.

---

### 3. `S57Convert/src/lib/styles/uploader.css`
[uploader.css](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/styles/uploader.css)

- **Button & Container Styles**: Add styles for `.file-item-actions`, `.toggle-visibility-button`, and `.loaded-file-item.is-hidden`.
  ```css
  .s57-uploader-panel .file-item-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .s57-uploader-panel .toggle-visibility-button {
    border: none;
    background: transparent;
    color: var(--pc-muted, #6b7280);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    font-size: 0.9rem;
    transition: background-color 0.2s, color 0.2s, transform 0.2s;
  }

  .s57-uploader-panel .toggle-visibility-button:hover {
    background: rgba(74, 144, 217, 0.12);
    color: var(--pc-accent, #4a90d9);
    transform: scale(1.05);
  }

  .s57-uploader-panel .toggle-visibility-button:active {
    transform: scale(0.95);
  }

  .s57-uploader-panel .loaded-file-item.is-hidden {
    opacity: 0.6;
  }

  .s57-uploader-panel .loaded-file-item.is-hidden .file-name {
    text-decoration: line-through;
  }
  ```

---

## Detailed Step-by-Step Instructions for Developer / AI Agent

1. **Step 1**: Open [geolibre.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/geolibre.ts).
   - Update `fileLayerMap` definition to support storing `hidden?: boolean`.
   - Implement and export `handleToggleFileVisibility(fileId: number, hide?: boolean): boolean`. Ensure it toggles between hidden (`'none'`) and visible (`'visible'`).
   - Pass `onToggleFileVisibility: handleToggleFileVisibility` into `React.createElement(S57Uploader, { ... })` inside `s57ReaderPlugin.activate()`.

2. **Step 2**: Open [S57Uploader.tsx](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/components/S57Uploader.tsx).
   - Add `onToggleFileVisibility?: (fileId: number, hide?: boolean) => boolean;` to `S57UploaderProps`.
   - Add state `const [hiddenFileIds, setHiddenFileIds] = useState<Set<number>>(new Set());`.
   - Implement `handleToggleVisibility(fileId: number)`.
   - Wrap the hide/show toggle button and delete button inside `<div className="file-item-actions">`.
   - Render the toggle button (`👁️` when visible, `🙈` when hidden) next to the delete button (`🗑️`).
   - Clear `hiddenFileIds` in `handleReset()` and when deleting a file in `handleDeleteFile()`.

3. **Step 3**: Open [uploader.css](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/styles/uploader.css).
   - Append `.file-item-actions`, `.toggle-visibility-button`, and `.loaded-file-item.is-hidden` CSS rules.

4. **Step 4**: Update unit tests in `S57Convert/tests/s57Uploader.test.tsx` to pass `onToggleFileVisibility` mock prop if required.

---

## Verification Plan

### Automated Tests
- Run project build and tests to verify zero TypeScript errors or test breakages:
  ```bash
  cd S57Convert
  npm run build
  npm test
  ```

### Manual Verification
1. Open the plugin in Geolibre host application.
2. Load an S-57 `.000` chart file or execute an API conversion.
3. Verify that the file appears in the "Loaded layers" list with an eye icon button (`👁️`) beside the delete button (`🗑️`).
4. **Test Hide (1st Click)**: Click the eye button:
   - Icon changes from `👁️` to `🙈`.
   - File item styling changes (dimmed / strike-through).
   - All vector map layers associated with that file are hidden from the map (`visibility: 'none'`).
5. **Test Show (2nd Click)**: Click the eye button again:
   - Icon changes from `🙈` back to `👁️`.
   - File item returns to normal styling.
   - All map layers re-appear on the map (`visibility: 'visible'`).
6. Delete the file or clear layers to verify state cleanup.
