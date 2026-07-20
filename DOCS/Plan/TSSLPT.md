# TSSLPT Implementation Plan

This document provides a concrete, step-by-step implementation plan for adding TSSLPT (Traffic-Separation-Scheme Limit/Marker Points) and TSS_ARROWS (derived directional arrows) support to the S57 plugin.

---

## Overview

TSSLPT processing involves two primary deliverables:

1. **TSSLPT Input Layer** - Processed, validated, and styled point features
2. **TSS_ARROWS Derived Layer** - Synthesized arrow features indicating traffic flow direction

---

## Phase 1: TSSLPT Input Layer Processing

### 1.1 Create TSSLPT Utilities Module

**File:** `S57Convert/src/lib/utils/tsslptProcessor.ts`

**Functions to implement:**

```typescript
interface TSSLPTFeature {
  id?: string;
  geometry: Point;
  properties: {
    OBJL?: number;
    OBJNAM?: string;
    SEQCCL?: number;      // Sequence/order within group
    ORCCL?: number;       // Orientation class (direction hint)
    RESTRN?: string[];    // Restriction codes
    [key: string]: unknown;
  };
}

interface ProcessedTSSLPT {
  originalFeature: GeoJSON.Feature;
  validated: boolean;
  reprojected: Coordinate;
  order?: number;
  direction?: number;    // bearing/angle in degrees
  groupId?: string;      // groups related points
  isDuplicate?: boolean;
  style?: TSSLPTStyle;
}

interface TSSLPTStyle {
  symbolSize: number;
  color: string;
  opacity: number;
  rotationAngle?: number;
  labelText?: string;
  labelOffset?: [number, number];
}

// Core processing functions:
function validateTSSLPTGeometry(feature: GeoJSON.Feature): boolean
function reprojectTSSLPTCoordinate(coord: [number, number], sourceProj?: string): [number, number]
function extractOrderingAttributes(feature: GeoJSON.Feature): { order?: number; direction?: number; groupId?: string }
function deduplicateTSSLPTPoints(features: ProcessedTSSLPT[], toleranceMeters?: number): ProcessedTSSLPT[]
function applyVisibilityRules(feature: ProcessedTSSLPT, zoomLevel: number): boolean
function resolveTSSLPTStyle(attributes: Record<string, unknown>): TSSLPTStyle
function processTSSLPTBatch(rawFeatures: GeoJSON.Feature[], options?: TSSLPTProcessOptions): ProcessedTSSLPT[]
```

**Configuration interface:**

```typescript
interface TSSLPTProcessOptions {
  sourceProjection?: string;         // default: EPSG:4326
  targetProjection?: string;         // default: EPSG:3857 (Web Mercator)
  deduplicationTolerance?: number;   // meters, default: 10
  minZoom?: number;                  // visibility threshold, default: 8
  maxZoom?: number;                  // visibility cap, default: 22
  preserveSourceId?: boolean;        // keep original ID, default: true
}
```

### 1.2 Add TSSLPT to Style Registry

**File Update:** `S57Convert/src/lib/styles/s57StyleRegistry.ts`

**Tasks:**
- [ ] Add TSSLPT to class sets:
  ```typescript
  const TSSLPT_CLASSES = new Set(['TSSLPT']);
  ```
- [ ] Define TSSLPT layer family and priority:
  ```typescript
  export type S57LayerFamily = '...' | 'tsslpt' | 'tss_arrows';
  ```
- [ ] Add priority constant:
  ```typescript
  // TSSLPT priority: 75000 (between navigation aids and routing)
  // TSS_ARROWS priority: 76000 (immediately after TSSLPT)
  ```
- [ ] Create styling function:
  ```typescript
  function buildTSSLPTStyle(attributes: Record<string, unknown>): GeoLibreNativeLayerStyle
  ```
- [ ] Add to `selectS57LayerStyle()`:
  ```typescript
  if (TSSLPT_CLASSES.has(normalizedCode)) {
    return {
      family: 'tsslpt',
      priority: 75000,
      minZoom: 8,
      style: buildTSSLPTStyle(normalizedAttributes),
    };
  }
  ```

### 1.3 Update S57 Converter for TSSLPT

**File Update:** `S57Convert/src/lib/utils/s57Converter.ts`

**Tasks:**
- [ ] Import tsslptProcessor utilities
- [ ] Add TSSLPT recognition in `buildConversionBundleFromGeoJSON()`:
  ```typescript
  if (acronym === 'TSSLPT') {
    // Extract ordering and grouping attributes
    const orderAttr = feature.properties?.SEQCCL;
    const directionAttr = feature.properties?.ORCCL;
    // Store for later arrow synthesis
    feature.properties._tsslpt_order = orderAttr;
    feature.properties._tsslpt_direction = directionAttr;
  }
  ```
- [ ] Apply TSSLPT processing pipeline in layer creation
- [ ] Preserve metadata for arrow synthesis

### 1.4 Create TSSLPT Integration in GeoLibre Handler

**File Update:** `S57Convert/src/geolibre.ts`

**Tasks:**
- [ ] After TSSLPT layers are registered, trigger arrow synthesis
- [ ] Store processed TSSLPT features in a cache for arrow derivation
- [ ] Add handler to queue arrow generation

---

## Phase 2: TSS_ARROWS Derived Layer

### 2.1 Create TSS_ARROWS Synthesis Module

**File:** `S57Convert/src/lib/utils/tssArrowsGenerator.ts`

**Core functions:**

```typescript
interface TSSLane {
  id: string;
  points: ProcessedTSSLPT[];
  direction: number;      // primary bearing
  startPoint: Coordinate;
  endPoint: Coordinate;
}

interface ArrowGeometry {
  type: 'Point' | 'LineString' | 'Polygon';
  coordinates: Coordinate | Coordinate[] | Coordinate[][];
}

interface GeneratedArrow {
  id: string;
  geometry: ArrowGeometry;
  properties: {
    sourceFeatureIds?: string[];
    direction: number;     // bearing in degrees
    laneId: string;
    positionAlong?: number; // 0-1 normalized position
    arrowType: 'icon' | 'vector';
    [key: string]: unknown;
  };
}

// Core functions:
function identifyTSSLanes(tsslptFeatures: ProcessedTSSLPT[], lineFeatures?: GeoJSON.Feature[]): TSSLane[]
function orderPointsWithinLane(points: ProcessedTSSLPT[]): ProcessedTSSLPT[]
function constructCenterlineSegments(orderedPoints: Coordinate[]): LineString[]
function computeDirectionVectors(segments: LineString[]): Array<{ angle: number; length: number }>
function placeArrowsAlongLane(lane: TSSLane, interval: number, arrowType: 'icon' | 'vector'): GeneratedArrow[]
function buildVectorArrowhead(centerPoint: Coordinate, direction: number, size?: number): Polygon
function buildIconArrow(position: Coordinate, direction: number): Point
function applyOffsetToArrows(arrows: GeneratedArrow[], offsetMeters: number): GeneratedArrow[]
function clipArrowsToViewport(arrows: GeneratedArrow[], bounds: BBox): GeneratedArrow[]
function generateTSSArrows(tsslptFeatures: ProcessedTSSLPT[], options?: TSSArrowsOptions): GeneratedArrow[]
```

**Configuration interface:**

```typescript
interface TSSArrowsOptions {
  arrowInterval?: number;            // meters between arrows, default: 5000
  arrowType?: 'icon' | 'vector';     // default: 'vector'
  arrowSize?: number;                // pixels/meters, default: 50
  offsetMeters?: number;             // lateral offset, default: 0
  minZoom?: number;                  // visibility threshold, default: 8
  maxZoom?: number;                  // visibility cap, default: 22
  preserveSourceTraceability?: boolean; // include source IDs, default: true
  enableCaching?: boolean;           // cache results, default: true
}
```

### 2.2 Implement Lane Detection Algorithm

**Tasks:**
- [ ] **Identify lane groups** by proximity and directional consistency
  ```typescript
  // Algorithm: Group nearby TSSLPT points by proximity clusters
  // Use SEQCCL or ORCCL attributes if available
  // Otherwise, infer groups by spatial clustering (e.g., k-means or DBSCAN)
  ```
- [ ] **Order points within each lane**
  ```typescript
  // Use SEQCCL (sequence) if available
  // Otherwise, compute order by distance along primary axis
  ```
- [ ] **Validate lane coherence**
  ```typescript
  // Check that points form a logical path (no sharp reversals)
  // Validate direction consistency
  ```

### 2.3 Implement Centerline & Arrow Placement

**Tasks:**
- [ ] **Construct centerlines** from ordered point sequences
  ```typescript
  // Connect points with LineString segments
  // Optional: smooth with Catmull-Rom or quadratic splines
  ```
- [ ] **Compute direction vectors**
  ```typescript
  // For each segment, calculate bearing and length
  // Use atan2 for robust angle computation
  ```
- [ ] **Place arrows at intervals**
  ```typescript
  // For each segment, distribute arrows at regular distances
  // Respect arrowInterval configuration
  ```
- [ ] **Handle arrow type selection**
  ```typescript
  // icon: rotated point symbols
  // vector: programmatic polygon arrowheads
  ```

### 2.4 Create TSS_ARROWS Arrow Styling

**File Update:** `S57Convert/src/lib/styles/s57StyleRegistry.ts`

**Tasks:**
- [ ] Define arrow style function:
  ```typescript
  function buildTSSArrowStyle(attributes: Record<string, unknown>): GeoLibreNativeLayerStyle {
    return {
      fillColor: COLORS.TRFCD,        // magenta/traffic color
      fillOpacity: 0.7,
      strokeColor: COLORS.CHBLK,
      strokeWidth: 1.0,
    };
  }
  ```
- [ ] Add to style selection:
  ```typescript
  if (normalizedCode === 'TSS_ARROWS') {
    return {
      family: 'tss_arrows',
      priority: 76000,
      minZoom: 8,
      style: buildTSSArrowStyle(normalizedAttributes),
    };
  }
  ```

### 2.5 Integrate Arrow Generation into GeoLibre Handler

**File Update:** `S57Convert/src/geolibre.ts`

**Tasks:**
- [ ] In `handleLayersLoaded()`, after TSSLPT layers are processed:
  ```typescript
  // 1. Retrieve TSSLPT features from cache
  // 2. Invoke generateTSSArrows() with options
  // 3. Create a new S57LayerData for TSS_ARROWS
  // 4. Register with appAPI.addGeoJsonLayer()
  // 5. Apply styling via styleTracker
  ```

---

## Phase 3: Testing & Validation

### 3.1 Unit Tests

**File:** `S57Convert/tests/tsslptProcessor.test.ts`

**Test cases:**
- [ ] Validate TSSLPT geometry validation
- [ ] Verify reprojection to Web Mercator
- [ ] Test ordering attribute extraction
- [ ] Verify deduplication logic
- [ ] Test visibility rules at different zoom levels
- [ ] Verify style resolution from attributes

**File:** `S57Convert/tests/tssArrowsGenerator.test.ts`

**Test cases:**
- [ ] Lane detection from TSSLPT points
- [ ] Point ordering within lanes
- [ ] Centerline construction
- [ ] Direction vector computation
- [ ] Arrow placement at intervals
- [ ] Arrow geometry generation (both icon and vector)
- [ ] Offset and clipping behavior

### 3.2 Integration Tests

**File:** `S57Convert/tests/tsslpt-integration.test.ts`

**Test cases:**
- [ ] End-to-end TSSLPT → TSS_ARROWS pipeline
- [ ] Known sample validation (directional correctness)
- [ ] Layer registration and visibility
- [ ] Style application
- [ ] Zoom constraint enforcement

### 3.3 Manual Validation

**Tasks:**
- [ ] Load a test ENC with TSSLPT features
- [ ] Verify TSSLPT points appear with correct styling
- [ ] Verify TSS_ARROWS are generated correctly
- [ ] Validate arrow direction against chart specifications
- [ ] Check zoom-based visibility at different scales
- [ ] Verify no visual overlap or collision issues
- [ ] Test with multiple traffic separation schemes

---

## Phase 4: Configuration & Documentation

### 4.1 Expose Configuration Options

**File Update:** `S57Convert/src/lib/components/S57Uploader.tsx`

**UI additions:**
- [ ] Add collapsible "TSS Options" section
- [ ] Control for `arrowInterval` (slider, meters)
- [ ] Radio buttons for `arrowType` (icon vs. vector)
- [ ] Toggle for `offsetMeters`
- [ ] Min/max zoom level controls
- [ ] Reset to defaults button

**File:** `S57Convert/src/lib/config/tssDefaults.ts`

```typescript
export const DEFAULT_TSS_OPTIONS: TSSArrowsOptions = {
  arrowInterval: 5000,
  arrowType: 'vector',
  arrowSize: 50,
  offsetMeters: 0,
  minZoom: 8,
  maxZoom: 22,
  preserveSourceTraceability: true,
  enableCaching: true,
};
```

### 4.2 Add Documentation

**File:** `DOCS/TSSLPT_Implementation.md`

**Sections:**
- [ ] Feature overview
- [ ] Configuration guide
- [ ] Troubleshooting common issues
- [ ] Performance tuning tips
- [ ] Example workflow

---

## Phase 5: Performance Optimization

### 5.1 Implement Caching Strategy

**Tasks:**
- [ ] Cache processed TSSLPT features per source file
- [ ] Cache generated TSS_ARROWS per zoom level (if applicable)
- [ ] Implement cache invalidation on data updates
- [ ] Add cache statistics to debug output

### 5.2 Lazy Geometry Generation

**Tasks:**
- [ ] Generate arrow geometries only on first render
- [ ] Defer polygon construction for vector arrows until needed
- [ ] Implement viewport clipping to reduce rendered arrows
- [ ] Profile performance with large TSSLPT datasets

### 5.3 Memory Management

**Tasks:**
- [ ] Monitor ProcessedTSSLPT array sizes
- [ ] Implement cleanup after arrow generation
- [ ] Add garbage collection hints for large features

---

## Implementation Checklist

### Phase 1: TSSLPT Input Layer
- [ ] Create tsslptProcessor.ts utilities
- [ ] Add TSSLPT style registry entries
- [ ] Update s57Converter.ts for TSSLPT recognition
- [ ] Integrate TSSLPT handler in geolibre.ts
- [ ] Verify TSSLPT layers register and style correctly

### Phase 2: TSS_ARROWS Derived Layer
- [ ] Create tssArrowsGenerator.ts module
- [ ] Implement lane detection algorithm
- [ ] Implement centerline & arrow placement
- [ ] Add TSS_ARROWS styling
- [ ] Integrate arrow generation into handler

### Phase 3: Testing & Validation
- [ ] Write unit tests for processors
- [ ] Write unit tests for arrow generator
- [ ] Write integration tests
- [ ] Manual validation with test data
- [ ] Validate against chart specifications

### Phase 4: Configuration & Documentation
- [ ] Add UI controls for TSS options
- [ ] Create configuration defaults file
- [ ] Write user documentation
- [ ] Write developer guide

### Phase 5: Performance Optimization
- [ ] Implement caching strategy
- [ ] Optimize lazy geometry generation
- [ ] Profile and optimize memory usage
- [ ] Document performance tuning

---

## Integration Points with Existing Code

### s57Converter.ts
- Add TSSLPT acronym recognition
- Preserve ordering/direction attributes
- Queue arrow synthesis after conversion

### s57StyleRegistry.ts
- Add TSSLPT and TSS_ARROWS layer families
- Define styling rules for both layers
- Add priority ordering

### geolibre.ts
- Cache TSSLPT features during layer loading
- Call arrow generation after TSSLPT registration
- Register TSS_ARROWS as derived layer
- Track styles for both TSSLPT and TSS_ARROWS

### S57Uploader.tsx
- Add TSS configuration UI
- Expose configuration options to handler

---

## Success Criteria

- [ ] All 69 existing tests continue to pass
- [ ] All new unit tests pass
- [ ] Integration tests validate end-to-end pipeline
- [ ] TSSLPT points render with correct styling
- [ ] TSS_ARROWS generate with correct directions
- [ ] Arrow directions match chart specifications
- [ ] Zoom constraints work correctly
- [ ] No visual overlaps or collision issues
- [ ] Configuration options function correctly
- [ ] Performance acceptable for large datasets

---

## Timeline Estimate

- **Phase 1:** 2-3 hours
- **Phase 2:** 4-5 hours
- **Phase 3:** 2-3 hours
- **Phase 4:** 1-2 hours
- **Phase 5:** 1-2 hours

**Total: 10-15 hours**

---

## References

- [DOCS/Tsslpt.md](../Tsslpt.md) - Feature specification
- [DOCS/LayerPrioritizationGuide.md](../LayerPrioritizationGuide.md) - Priority reference
- [DOCS/StylingToDoList.md](../StylingToDoList.md) - Styling patterns
- S-57 Standard (IHO): Traffic Separation Scheme feature descriptions
- S-52 Rendering Standard: Symbol and styling references
