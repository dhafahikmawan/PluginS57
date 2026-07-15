# S-57 Plugin Recoloring Strategy
## Solution Plan for Persistent Layer Styling

**Problem Statement**: When users interact with GeoLibre's layer features (hide, move up, move down, reorder), the S-57 data colors revert to GeoLibre's defaults, losing the plugin's custom S-57 styling.

**Root Cause**: The current plugin applies styles via `applyS57Style()` as a one-time operation after layer registration. GeoLibre layer operations may reconstruct or reset MapLibre layers, clearing the applied paint properties without re-triggering the plugin's styling logic.

---

## 1. Current Architecture Analysis

### 1.1 Current Flow
1. User uploads S-57 file → `handleLayersLoaded()` is invoked
2. Layers are registered via `appAPI.addGeoJsonLayer()` 
3. `applyS57Style()` is called with a setTimeout to apply paint properties via `map.setPaintProperty()`
4. Styles are applied directly to MapLibre paint properties

### 1.2 Why Styles Are Lost
- GeoLibre layer operations (reorder, hide, show) may modify the MapLibre layer state
- Paint properties applied directly are not guaranteed to persist through layer reconstruction
- No event listeners watch for style resets
- Styles are not encoded in the layer definition itself

---

## 2. Proposed Solutions (Multi-Layered Approach)

### 2.1 Solution A: Style Persistence via Metadata + Event Listeners (Recommended)
**Priority**: High | **Complexity**: Medium | **Persistence**: Excellent

#### Strategy
Combine metadata storage with MapLibre event monitoring:

1. **Store Style Information**:
   - Attach full style objects to layer metadata via `app.addGeoJsonLayer()`
   - Track style with layer ID mapping in the plugin

2. **Monitor and Reapply**:
   - Listen to MapLibre `data` event to detect layer modifications
   - Listen to `style.load` event to detect full style resets
   - Implement a `re-styleAll()` function that reapplies all tracked styles
   - Debounce re-styling to avoid excessive paint property updates

3. **Implementation Details**:
   - Create `StyleRegistry` class to track: `layerId → S57StyleSelection` mapping
   - Store original styles in `app.addGeoJsonLayer()` metadata parameter
   - Attach event listeners to map: `map.on('data', handleLayerModification)`
   - Implement exponential backoff retry in `applyS57Style()` with max attempts

#### Benefits
- ✅ Works with existing GeoLibre API (no breaking changes)
- ✅ Survives most layer operations
- ✅ Provides visual feedback of reapplication

#### Drawbacks
- ⚠️ May cause slight visual flicker on layer operations
- ⚠️ Event monitoring adds performance overhead
- ⚠️ Requires careful debouncing to avoid excessive re-renders

---

### 2.2 Solution B: Style Encoding in Layer Registration (Alternative)
**Priority**: Medium | **Complexity**: Low | **Persistence**: Good

#### Strategy
Encode styles directly in the layer registration via MapLibre layer definitions:

1. **Use `app.getMap()` to Access MapLibre Directly**:
   - Instead of relying on `addGeoJsonLayer()`, use `getMap()` to access MapLibre
   - Create MapLibre sources and layers manually with paint/layout properties
   - Ensures styles are part of the layer definition, not applied post-hoc

2. **Layer Definition Approach**:
   ```
   map.addSource('layer-source', { type: 'geojson', data: geojson })
   map.addLayer({
     id: 'layer-id',
     type: 'fill',
     source: 'layer-source',
     paint: { /* S-57 styles here */ },
     layout: { /* S-57 layout here */ }
   })
   ```

3. **Integration with GeoLibre**:
   - Let GeoLibre discover these layers in its layer panel
   - Or use hybrid: `addGeoJsonLayer()` for discovery + `getMap()` for style control

#### Benefits
- ✅ Styles are part of layer definition (more durable)
- ✅ Better performance (styles applied upfront)
- ✅ Simpler architecture (no event listeners needed)

#### Drawbacks
- ⚠️ Bypasses GeoLibre's layer panel grouping
- ⚠️ May require manual layer sync with GeoLibre's UI
- ⚠️ Less integration with GeoLibre's native layer management

---

### 2.3 Solution C: Centralized Style Cache + Layer Reconstruction (Advanced)
**Priority**: Low | **Complexity**: High | **Persistence**: Excellent

#### Strategy
Maintain a persistent cache of styles and rebuild layer styles on every map mutation:

1. **Style Cache**:
   - Store complete style objects keyed by layer ID
   - Include: colors, opacity, stroke properties, etc.
   - Persist cache in plugin state or localStorage

2. **Layer Reconstruction Hook**:
   - Monitor for `layers` configuration changes
   - Detect when GeoLibre modifies layer stack
   - Automatically rebuild styles for affected layers

3. **Fail-Safe Mechanism**:
   - Periodic style validation (every N seconds)
   - Detect paint property mismatches
   - Auto-correct if drift detected

#### Benefits
- ✅ Maximum durability
- ✅ Catches all edge cases
- ✅ Can recover from unexpected resets

#### Drawbacks
- ⚠️ Complex implementation
- ⚠️ Significant performance cost
- ⚠️ May cause visual artifacts

---

## 3. Recommended Implementation Path

### Phase 1: Immediate Fix (Solution A - Core)
**Timeframe**: 1-2 days | **Effort**: Medium

#### 3.1 Create Style Registry
File: `src/lib/styles/S57StyleRegistry.ts` (existing file - extend)

- Add `class StyleTracker`:
  - `trackStyle(layerId: string, style: S57StyleSelection, classCode: string, attributes: Record<string, unknown>)`
  - `getStyle(layerId: string): S57StyleSelection | null`
  - `getAllTrackedLayers(): string[]`
  - `resetAll()`

- Add `class StyleReapplier`:
  - `reapplyStyle(map: MapLibreMap, layerId: string, style: S57StyleSelection, attempt?: number): Promise<boolean>`
  - `reapplyAllStyles(map: MapLibreMap): Promise<number>` (returns count reapplied)

#### 3.2 Integrate Metadata Storage
File: `src/geolibre.ts`

Modify `handleLayersLoaded()`:
```typescript
// After registering with addGeoJsonLayer, store in StyleTracker
const hostedLayerId = appAPI.addGeoJsonLayer(layer.layerName, layer.geojson, layer.fileName);

// Track the style mapping
styleTracker.trackStyle(
  hostedLayerId,
  styleSelection,
  layer.classCode,
  layer.metadata?.sampleProperties as Record<string, unknown>
);

// Apply style with improved retry logic
if (map) {
  styleReapplier.reapplyStyle(map, layer.layerName, styleSelection);
}
```

#### 3.3 Implement Event Listeners
File: `src/geolibre.ts`

Add to plugin's `activate()`:
```typescript
if (app.getMap) {
  const map = app.getMap();
  if (map) {
    // Listen for layer changes
    map.on('data', () => {
      // Debounced call to reapplyAllStyles
      debounced(() => styleReapplier.reapplyAllStyles(map));
    });

    // Listen for style load (full reset)
    map.on('style.load', () => {
      // Schedule immediate reapplication
      setTimeout(() => styleReapplier.reapplyAllStyles(map), 500);
    });

    // Listen for layer visibility/reorder changes
    map.on('layer', () => {
      debounced(() => styleReapplier.reapplyAllStyles(map));
    });
  }
}
```

---

### Phase 2: Enhanced Robustness (Solution A - Extended)
**Timeframe**: 2-3 days | **Effort**: Medium-High

#### 3.4 Improve applyS57Style Logic
File: `src/geolibre.ts`

- **Exponential Backoff**: Increase retry delays (250ms → 500ms → 1000ms)
- **Layer Discovery**: Enhance candidate matching with:
  - Exact ID match
  - Source ID match
  - Substring matching with priority scoring
  - Layer type inference (fill, line, circle based on geometry)

- **Verification**: After applying each property, verify it was set:
  ```typescript
  const applied = map.getPaintProperty(layerId, property);
  if (applied !== value) {
    // Log mismatch, retry
  }
  ```

#### 3.5 Add Debugging/Telemetry
File: `src/geolibre.ts`

- Extend `writeDebug()` with structured logs:
  - Track style application attempts
  - Log layer discovery process
  - Record reapplication events
  - Include timing information

- Add debug UI toggle in S57Uploader component:
  - Enable/disable detailed logging
  - Show style application status per layer
  - Display layer ID mappings

---

### Phase 3: Optimized Performance (Solution B - Integration)
**Timeframe**: 3-4 days | **Effort**: High

#### 3.6 Direct MapLibre Layer Control
File: `src/lib/geolibre/layer-manager.ts` (new)

- Implement `GeoLibreLayerManager`:
  - Use `app.getMap()` for direct MapLibre access
  - Create sources and layers with paint properties upfront
  - Coordinate with `addGeoJsonLayer()` for discovery
  - Maintain dual registration (GeoLibre + MapLibre native)

#### 3.7 Hybrid Registration Approach
- Call `addGeoJsonLayer()` for GeoLibre panel integration
- Simultaneously create MapLibre layer with full style definition
- Let GeoLibre manage layer visibility; MapLibre handles styling

---

## 4. Implementation Checklist

### Phase 1 Tasks
- [ ] Create `StyleTracker` class in s57StyleRegistry.ts
- [ ] Create `StyleReapplier` class in s57StyleRegistry.ts
- [ ] Add debounce utility function (or use lodash-es)
- [ ] Modify `handleLayersLoaded()` to use StyleTracker
- [ ] Add map event listeners in `activate()`
- [ ] Test with sample S-57 file:
  - [ ] Load data
  - [ ] Verify styles applied
  - [ ] Hide/show layers → check styles persist
  - [ ] Reorder layers → check styles persist
  - [ ] Move layers up/down → check styles persist

### Phase 2 Tasks
- [ ] Enhance `applyS57Style()` with exponential backoff
- [ ] Improve layer discovery logic
- [ ] Add verification checks for applied properties
- [ ] Add comprehensive debug logging
- [ ] Create debug UI toggle in S57Uploader
- [ ] Test style recovery on edge cases

### Phase 3 Tasks (Optional, if Phase 1/2 insufficient)
- [ ] Implement GeoLibreLayerManager
- [ ] Add direct MapLibre layer creation
- [ ] Implement hybrid registration
- [ ] Performance benchmarking
- [ ] Test with large datasets

---

## 5. Testing Strategy

### 5.1 Test Cases
1. **Basic Recolor Test**
   - Load S-57 file with multiple layer families
   - Verify each layer displays correct color/style
   - Assert specific color hex values are applied

2. **Hide/Show Persistence**
   - Load S-57 file
   - Hide a layer in GeoLibre panel
   - Show the layer again
   - Verify original style is restored (not default)

3. **Layer Reorder Persistence**
   - Load S-57 file with 3+ layers
   - Reorder layers in GeoLibre panel (move up/down)
   - Verify styles remain unchanged after reorder

4. **Multi-File Load**
   - Load 2+ S-57 files sequentially
   - Each file has different layers with distinct styles
   - Verify no style mixing/collision
   - Verify each layer retains its correct style

5. **Performance**
   - Load large S-57 file (1000+ features)
   - Measure style application time
   - Measure re-application time on layer operations
   - Ensure <500ms re-application latency for responsive UX

6. **Edge Cases**
   - Rapid hide/show toggles
   - Simultaneous load of multiple files
   - GeoLibre theme changes (if applicable)
   - Browser tab visibility changes

### 5.2 Debug Checklist
- [ ] Enable debug logging during tests
- [ ] Inspect browser console for errors
- [ ] Verify MapLibre paint properties via dev tools
- [ ] Monitor performance with DevTools profiler
- [ ] Test across different browsers (Chrome, Firefox)
- [ ] Test on different GeoLibre versions (if applicable)

---

## 6. Files to Create/Modify

### Files to Create
- `src/lib/styles/StyleTracker.ts` - Style registry and tracking
- `src/lib/styles/StyleReapplier.ts` - Style reapplication logic
- `src/lib/utils/debounce.ts` - Utility for debounced functions (or import from library)
- `src/lib/geolibre/layer-manager.ts` - (Phase 3 only) Direct MapLibre control

### Files to Modify
- `src/geolibre.ts` - Main plugin entry point (event listeners, handler updates)
- `src/lib/styles/s57StyleRegistry.ts` - Extend with new classes
- `src/lib/components/S57Uploader.tsx` - (Phase 2) Add debug UI toggle
- `package.json` - (if using external debounce library)

---

## 7. Success Criteria

✅ **MVP Success**:
- Styles persist when hiding/showing layers
- Styles persist when reordering layers (move up/down)
- No visual flicker or errors in console
- <200ms reapplication latency

✅ **Full Success**:
- All test cases pass
- Performance acceptable for large datasets
- Debug UI shows clear status
- Documentation updated

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Event listener overhead | Medium | Low | Debounce listeners, profile performance |
| Layer ID mismatches | Low | High | Improve discovery logic, add validation |
| GeoLibre API changes | Low | High | Version pin, add API version check |
| Style conflicts with themes | Medium | Medium | Test with different GeoLibre themes |
| Large dataset performance | Medium | High | Implement batched reapplication |

---

## 9. Future Enhancements

1. **Style Presets**: Allow users to save/load custom color schemes
2. **Layer Visibility API**: Expose layer visibility toggle to plugin
3. **Style Invalidation**: GeoLibre emits event when styles need refresh
4. **Paint Property Validation**: Verify all S-57 paint properties survive layer operations
5. **Incremental Styling**: Only reapply changed properties (not full reset)

