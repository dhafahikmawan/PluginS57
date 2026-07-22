# Implementation Plan: Fix Feature Selection Event Listener Cleanup

## Purpose
Ensure that the click event listener registered to the MapLibre map by the feature selector is correctly removed when selection is deactivated via the control button, or when the control panel is collapsed.

## Diagnosis
1. In [PluginControl.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/core/PluginControl.ts#L608-L628), `_getFeatures` defines `clickHandler` as a local function:
   ```typescript
   const clickHandler = (event :maplibregl.MapMouseEvent) => this._selectFeatures(event, map);
   ```
   Every time `_getFeatures` is called (either to start or stop selecting features), a new closure instance is created. Consequently, calling `map.off("click", clickHandler)` tries to remove a listener that was never registered, leaving the active event listener attached to the map.
2. In `collapse` (lines 207-216), a new local `clickHandler` closure is also created and passed to `map.off`, which fails to remove the actual event listener.
3. When multiple toggles occur, multiple click listeners pile up, causing redundant queries on map clicks.

## Scope
* [PluginControl.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/core/PluginControl.ts)

## Proposed Changes

### 1. Store the Click Handler Instance as a Private Class Property
Add a new private property to the `PluginControl` class to store the bound reference to the feature selection click handler so that it can be referenced across different method calls.

* Add `_featuresClickHandler` under the existing private fields:
  ```typescript
  private _featuresClickHandler?: (event: maplibregl.MapMouseEvent) => void;
  ```

### 2. Update `_getFeatures` to Reuse the Stored Handler
* Modify `_getFeatures` to construct the `_featuresClickHandler` once if it does not already exist, and reference `this._featuresClickHandler` when attaching/removing the event listener.
* Make sure it uses `this._featuresClickHandler` for both `map.on` and `map.off`.
* Reference implementation idea:
  ```typescript
  async _getFeatures(map? : MapLibreMap){
    if(!map){
      console.log("Map not initialized");
      return;
    }
    
    if (!this._featuresClickHandler) {
      this._featuresClickHandler = (event: maplibregl.MapMouseEvent) => this._selectFeatures(event, map);
    }
    
    this._selectActive = !this._selectActive;
    if(!this._getFeaturesButton) return;
    
    if(this._selectActive){
      console.log("Activating Selection.....");
      this._getFeaturesButton.style.background = "red";
      this._getFeaturesButton.textContent = "Stop Selecting Features";
      map.on("click", this._featuresClickHandler);
    }
    else{
      console.log("Deactivating Selection.....");
      this._getFeaturesButton.style.background = "var(--pc-accent)";
      this._getFeaturesButton.textContent = "Start Selecting Features";
      map.off("click", this._featuresClickHandler);
    }
  }
  ```

### 3. Update `collapse` to Clean Up the Stored Handler and Reset UI/State
* In the `collapse(map : MapLibreMap)` function, retrieve the map instance (defaulting to `this._map` if the passed `map` argument is null/undefined).
* If `this._featuresClickHandler` is defined, call `off` on the map instance using it.
* Reset the selection state variables:
  * Set `this._selectActive = false`.
  * Reset the styling and text of `this._getFeaturesButton` to its default state.
* Reference implementation idea:
  ```typescript
  collapse(map : MapLibreMap): void {
    if (!this._state.collapsed) {
      this.toggle();
    }
    console.log("Collapsing...");
    
    const activeMap = map || this._map;
    if (activeMap && this._featuresClickHandler) {
      activeMap.off("click", this._featuresClickHandler);
    }
    
    this._selectActive = false;
    if (this._getFeaturesButton) {
      this._getFeaturesButton.style.background = "var(--pc-accent)";
      this._getFeaturesButton.textContent = "Start Selecting Features";
    }
  }
  ```

## Verification Plan

### Manual Verification
1. **Toggle Verification**:
   - Add the plugin control to the MapLibre map.
   - Click **Start Selecting Features** (button turns red).
   - Click a feature on the map and check the console logs to confirm properties are retrieved.
   - Click the button again (turns back to "Start Selecting Features").
   - Click the map and confirm that **no** new logs are printed to the console (the listener is successfully removed).

2. **Collapse/Close Verification**:
   - Click **Start Selecting Features** (button turns red).
   - Collapse the panel (e.g. by clicking the close "×" button or clicking outside the control).
   - Click the map and confirm that **no** logs are printed to the console.
   - Expand the panel again and verify that the button's background is back to the default accent color and text is reset to "Start Selecting Features".
