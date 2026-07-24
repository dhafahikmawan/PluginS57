# S-57 Layer Priority Analysis

This document describes the priority values assigned to each S-57 layer class in this plugin, explaining the sorting mechanism and detailing every processed layer's drawing order.

---

## 1. How Layer Priority is Set & Evaluated

The plugin determines the rendering order of layers before loading them onto the map in [geolibre.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/geolibre.ts). This ensures correct overlapping hierarchy (e.g., soundings and navigation markers appear on top of land and water depth layers).

### The Priority Selection Function
Layer styles, including their `priority` and `family` group, are resolved by `selectS57LayerStyle()` inside [s57StyleRegistry.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/styles/s57StyleRegistry.ts).

### Sorting Mechanism
In [geolibre.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/geolibre.ts#L449-L457), loaded layers are sorted stably before registration using the following comparison:
```typescript
const indexed = sourceLayers.map((layer, idx) => ({ layer, idx }));
indexed.sort((a, b) => {
  const styleA = selectS57LayerStyle(a.layer.classCode, (a.layer.metadata?.sampleProperties as Record<string, unknown>) ?? {}, purposeCode);
  const styleB = selectS57LayerStyle(b.layer.classCode, (b.layer.metadata?.sampleProperties as Record<string, unknown>) ?? {}, purposeCode);
  if (styleA.priority !== styleB.priority) return styleA.priority - styleB.priority;
  return a.idx - b.idx;
});
```
* **Lower priority numbers** are registered first, rendering at the bottom of the stack (e.g., water background, dry land).
* **Higher priority numbers** are registered later, rendering on top (e.g., soundings, light sectors, text labels).
* **Stable Sort Fallback**: If two layers share the same priority, the original ordering (`idx`) from the chart source file is preserved.

### Special Relative Insertion Rules
To guarantee correct visual grouping, some derived layers bypass standard sort ordering and are inserted directly next to their related layers:
1. **`LIGHT_SECTORS`**: When a `LIGHTS` layer is processed, the converter looks up any pre-generated `LIGHT_SECTORS` variants for the same source file and inserts them immediately after the `LIGHTS` layer.
2. **`TSS_ARROWS`**: When a `TSSLPT` (Traffic Separation Scheme Lane Part) layer is processed, vector arrow overlays (`TSS_ARROWS`) are generated and registered immediately after the parent lane part.

---

## 2. Priority Hierarchy Table

The following table summarizes all layer groups, their assigned priority values, and the associated S-57 layers.

| Priority | Style Family | Description / Role | Layer Classes (S-57 Codes) |
| :--- | :--- | :--- | :--- |
| **10000** | `base` | Background chart, boundaries, basic structures, and unmapped fallbacks | `ACHARE` (Polygons||Outline), `ARCSLN` (Lines/Polygons||Outline), `ASLXIS` (Lines||Outline), `CHNWIR` (Polygons||Outline), `CONVYR` (Lines/Polygons||Outline), `FNCLNE` (Lines||Outline), `ISTZNE` (Polygons||Outline), `LAKSHR` (Lines||Outline), `LNDELV` (Points/Lines||Outline), `MARCUL` (Points/Lines/Polygons||Outline), `M_SREL` (Polygons||Outline), `NAVLNE` (Lines||Outline), `OILBAR` (Lines||Outline), `PRCARE` (Polygons||Outline), `PRDARE` (Points/Polygons||Outline), `RADLNE` (Lines||Outline), `RAILWY` (Lines||Outline), `RDOCAL` (Points/Lines||Outline), `RESTRC` (Polygons||Outline), `SNDWAV` (Lines/Polygons||Outline), `STSLNE` (Lines/Polygons||Outline), `TESARE` (Polygons||Outline), `TIDEWY` (Lines/Polygons||Outline), `TSEZNE` (Polygons||Outline), `VEGATN` (Points/Lines/Polygons||Outline), `WATFAL` (Points/Lines||Outline), `WATTUR` (Points/Lines/Polygons||Outline), `ZEMCNT` (Lines||Outline), `BRIDGE` (Lines/Polygons||Outline), `ADMARE` (Polygons||Outline), `FSHFAC` (Points/Lines/Polygons||Outline), `HRBFAC` (Points/Lines/Polygons||Outline), `LNDRGN` (Points/Lines/Polygons||Outline), `MAGVAR` (Points/Lines/Polygons||Outline), `RECTRC` (Lines||Outline), `SBDARE` (Points/Lines/Polygons||Outline), `SLOTOP` (Lines||Outline), and any unmapped fallback class (Points/Lines/Polygons||Outline/Fill/Symbol). |
| **20000** | `land` | Dry land areas and above-water artificial structures | `LNDARE` (Polygons/Points||Fill), `AIRARE` (Polygons/Points||Fill), `CAUSWY` (Lines/Polygons||Fill/Outline), `CRANES` (Points/Polygons||Fill), `DAMCON` (Lines/Polygons||Fill/Outline), `DYKCON` (Lines/Polygons||Fill/Outline), `FLODOC` (Polygons||Fill/Outline), `GATCON` (Lines/Polygons||Fill/Outline), `HULKES` (Points/Polygons||Fill), `ICEARE` (Polygons||Fill), `OFSPLF` (Points/Polygons||Fill), `RUNWAY` (Points/Lines/Polygons||Fill/Outline), `SMCFAC` (Points/Polygons||Fill), `BUAARE` (Polygons||Fill), `BUISGL` (Points/Polygons||Fill), `PYLONS` (Points/Polygons||Fill), `SILTNK` (Points/Polygons||Fill), `PONTON` (Points/Polygons||Fill/Outline), `COALNE` (Lines||Outline), `LAKARE` (Polygons||Fill - listed in `LAND_CLASSES`), `DRYDOC` (Polygons||Fill), `ROADWY` (Polygons||Fill). |
| **30000** | `depth` | Water depth areas, dredging areas, and underwater routes | `DEPARE` (Polygons||Fill), `DRGARE` (Polygons||Fill/Outline), `CANALS` (Lines/Polygons||Fill/Outline), `DOCARE` (Polygons||Fill), `LOKBSN` (Polygons||Fill), `RIVERS` (Lines/Polygons||Fill/Outline), `TUNNEL` (Lines/Polygons||Fill/Outline), `LAKARE` (Polygons||Fill - handled as depth), `RAPIDS` (Lines/Polygons||Fill/Outline), `SLOGRD` (Lines/Polygons||Fill/Outline). |
| **35000** | `restricted` | Marine restricted zones, pipeline areas, and submarine cables | `CBLSUB` (Lines||Outline), `RESARE` (Polygons||Fill/Outline), `PIPARE` (Lines/Polygons||Outline/Line), `CBLOHD` (Lines||Outline/Line - listed in `RESTRICTED_CLASSES`), `PIPOHD` (Lines||Outline/Line - listed in `RESTRICTED_CLASSES`). |
| **39000** | `other` | Overhead pipelines, cables, caution areas | `PIPOHD` (Lines||Outline/Line), `CBLOHD` (Lines||Outline/Line), `CTNARE` (Polygons/Lines||Outline/Line). |
| **40000** | `other` | Administrative meta-layers and dumping grounds | `DMPGRD` (Points/Polygons||Outline/Line), `M_NSYS` (Polygons||Outline/Line), `M_NPUB` (Polygons||Outline/Line). |
| **50000** | `contour` | Depth contours and shoreline construction outlines | `DEPCNT` (Lines||Line), `SLCONS` (Lines/Polygons||Line/Outline). |
| **60000** | `hazard` | Marine hazards, obstructions, and wrecks | `WRECKS` (Points/Polygons||Symbol), `OBSTRN` (Points/Lines/Polygons||Symbol), `UWTROC` (Points||Symbol), `CBLARE` (Polygons||Outline). |
| **69000** | `navigation` | Navigation light sectors (lines/polygons showing sector arcs) | `LIGHT_SECTORS` (Lines/Polygons||Line/Fill), `LIGHT_SECTORS--*` (Lines/Polygons||Line/Fill) (e.g. `--RED`, `--GRN`, `--YLW`). |
| **70000** | `navigation` | Standard navigation aids, buoys, and beacons | `LIGHTS` (Points||Symbol), `BOYINB` (Points||Symbol), `BOYISD` (Points||Symbol), `BCNARE` (Points||Symbol), `BCNLAT` (Points||Symbol), `BOYLAT` (Points||Symbol), `BOYCAR` (Points||Symbol), `BOYSPP` (Points||Symbol), `BOYSAW` (Points||Symbol), `BCNCAR` (Points||Symbol), `BCNSPP` (Points||Symbol), `BCNISD` (Points||Symbol), `LITFLT` (Points||Symbol). |
| **72000** | `navigation` | Landmark visual markers | `LNDMRK` (Points/Lines/Polygons||Symbol). |
| **75000** | `tsslpt` | Traffic separation scheme lane parts | `TSSLPT` (Polygons||Fill/Outline). |
| **76000** | `tss_arrows` | TSS direction vector arrows | `TSS_ARROWS` (Points/Lines||Symbol). |
| **80000** | `routing` | Traffic routing systems, bands, and limits | `TSELNE` (Lines||Outline), `SEAARE` (Points/Polygons||Fill), `TSSRON` (Polygons||Fill), `TSSBND` (Lines||Line), `TRFLNE` (Lines||Line). |
| **85000** | `sounding` | Individual depth measurement values (soundings) | `SOUNDG` (Points/MultiPoints||Text/Label), `SOUNDG_PROCESSED` (Points/MultiPoints||Text/Label). |
| **90000** | `label` | Text labels and meta-accuracy annotations | `TEXT` (Points/Polygons||Text/Label), `M_ACCY` (Polygons||Text/Label). |
