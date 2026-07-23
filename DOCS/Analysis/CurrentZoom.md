# S-57 Object Class Zoom Visibility Reference

This document provides a detailed reference of the zoom level visibility for each S-57 object class layer across the different navigational purpose ranges.

---

## 1. Overview of S-57 Purpose Ranges

The base zoom levels are determined by the navigational purpose code (`PURPOSE`, `ENC_PURPOSE`, etc.) associated with the S-57 chart data:

| Purpose Code | Navigational Purpose | Base Min Zoom | Base Max Zoom |
| :---: | :--- | :---: | :---: |
| **1** | Overview | 0 | 9 |
| **2** | General | 7 | 10 |
| **3** | Coastal | 9 | 12 |
| **4** | Approach | 11 | 14 |
| **5** | Harbour | 13 | 17 |
| **6** | Berthing | 16 | 22 |

---

## 2. Zoom Level Visibility Matrix by Class Group

For each object class, the final visibility range is determined by applying class-specific minimum zoom constraints onto the base purpose zoom range:

*   **`minZoom`** is typically constrained using `Math.max(purposeRange.minZoom, classConstraint)` (with minor exceptions like `LIGHT_SECTORS` which uses `Math.min`, and TSS elements which override it).
*   **`maxZoom`** always matches the base purpose's `maxZoom`.
*   If the adjusted `minZoom` exceeds the `maxZoom` for a given purpose, the layer is **invisible** in that purpose range.

### Zoom Visibility Matrix

| Class Group / S-57 Object Classes | Purpose 1 (Overview)<br>Base: [0, 9] | Purpose 2 (General)<br>Base: [7, 10] | Purpose 3 (Coastal)<br>Base: [9, 12] | Purpose 4 (Approach)<br>Base: [11, 14] | Purpose 5 (Harbour)<br>Base: [13, 17] | Purpose 6 (Berthing)<br>Base: [16, 22] |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Base Chart Classes**<br>`LNDARE`, `DEPARE`, `DRGARE`, `COALNE`, `FLODOC`, `PONTON`, `UNSARE`, `HULKES`, `LAKARE`, `BUAARE`, `RIVERS`, `CANALS`, `ROADWY`, `SLCONS`, `BRIDGE` | **0 - 9** | **7 - 10** | **9 - 12** | **11 - 14** | **13 - 17** | **16 - 22** |
| **Depths & Land Regions**<br>`DEPCNT`, `LNDRGN` | **5 - 9** | **7 - 10** | **9 - 12** | **11 - 14** | **13 - 17** | **16 - 22** |
| **Soundings, Traffic & Administrative Areas**<br>`SOUNDG`, `SOUNDG_PROCESSED`, `RESARE`, `MIPARE`, `ISTZNE`, `PRCARE`, `COSARE`, `CONZNE`, `RECTRC`, `TSELNE`, `TSSBND`, `TSEZNE`, `CTNARE`, `EXEZNE`, `ADMARE` | **7 - 9** | **7 - 10** | **9 - 12** | **11 - 14** | **13 - 17** | **16 - 22** |
| **Sea Areas**<br>`SEAARE` | **4 - 9** | **7 - 10** | **9 - 12** | **11 - 14** | **13 - 17** | **16 - 22** |
| **Seabed Areas & Anchorage Areas**<br>`SBDARE`, `ACHARE` | **8 - 9** | **8 - 10** | **9 - 12** | **11 - 14** | **13 - 17** | **16 - 22** |
| **Dumping Grounds, Cables & Pipes**<br>`DMPGRD`, `CBLSUB`, `PIPSOL`, `LIGHTS` | **9 - 9** | **9 - 10** | **9 - 12** | **11 - 14** | **13 - 17** | **16 - 22** |
| **Obstructions, Landmarks & Buoys**<br>`PIPOHD`, `CBLOHD`, `BOYLAT`, `BOYCAR`, `BOYSPP`, `BOYISD`, `BOYSAW`, `BCNLAT`, `BCNSPP`, `BCNCAR`, `BCNISD`, `WRECKS`, `UWTROC`, `OBSTRN`, `LNDMRK` | *Invisible* | **10 - 10** | **10 - 12** | **11 - 14** | **13 - 17** | **16 - 22** |
| **Light Sectors**<br>`LIGHT_SECTORS`, `LIGHT_SECTORS--*` | **0 - 9** | **7 - 10** | **9 - 12** | **9 - 14** | **9 - 17** | **9 - 22** |
| **Float Lights & Mooring Facilities**<br>`LITFLT`, `MORFAC` | *Invisible* | *Invisible* | **11 - 12** | **11 - 14** | **13 - 17** | **16 - 22** |
| **Topmarks, Berths & Cranes**<br>`TOPMAR`, `PILBOP`, `BERTHS`, `CRANES` | *Invisible* | *Invisible* | **12 - 12** | **12 - 14** | **13 - 17** | **16 - 22** |
| **Traffic Separation Scheme Elements (Override)**<br>`TSSLPT`, `TSS_ARROWS` | **8 - 9** | **8 - 10** | **8 - 12** | **8 - 14** | **8 - 17** | **8 - 22** |
| **Other / Default S-57 Classes**<br>*Any class not listed above* | **1 - 9** | **7 - 10** | **9 - 12** | **11 - 14** | **13 - 17** | **16 - 22** |

---

## 3. Detailed Logic and Implementation

### Base Calculation (`getLayerZoomRange`)

The helper function `getLayerZoomRange` in [s57StyleRegistry.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/styles/s57StyleRegistry.ts#L343-L412) executes the following logic to determine the layer's raw zoom limits:

```typescript
function getLayerZoomRange(classCode: string, purposeCode?: string | number): { minZoom: number; maxZoom: number } {
  const normalizedCode = String(classCode || '').toUpperCase();
  const purposeRange = getPurposeZoomRange(purposeCode);

  if (BASE_CHART_CLASSES.has(normalizedCode)) {
    return { minZoom: purposeRange.minZoom, maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'DEPCNT') {
    return { minZoom: Math.max(purposeRange.minZoom, 5), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'SOUNDG' || normalizedCode === 'SOUNDG_PROCESSED') {
    return { minZoom: Math.max(purposeRange.minZoom, 7), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'SEAARE') {
    return { minZoom: Math.max(purposeRange.minZoom, 4), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'LNDRGN') {
    return { minZoom: Math.max(purposeRange.minZoom, 5), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'SBDARE') {
    return { minZoom: Math.max(purposeRange.minZoom, 8), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'RESARE' || normalizedCode === 'MIPARE' || ... ) {
    return { minZoom: Math.max(purposeRange.minZoom, 7), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'ACHARE') {
    return { minZoom: Math.max(purposeRange.minZoom, 8), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'DMPGRD' || normalizedCode === 'CBLSUB' || normalizedCode === 'PIPSOL') {
    return { minZoom: Math.max(purposeRange.minZoom, 9), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'PIPOHD' || normalizedCode === 'CBLOHD') {
    return { minZoom: Math.max(purposeRange.minZoom, 10), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'LIGHTS') {
    return { minZoom: Math.max(purposeRange.minZoom, 9), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'LIGHT_SECTORS' || normalizedCode.startsWith('LIGHT_SECTORS--')) {
    return { minZoom: Math.min(purposeRange.minZoom, 9), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'LITFLT' || normalizedCode === 'MORFAC') {
    return { minZoom: Math.max(purposeRange.minZoom, 11), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'TOPMAR' || normalizedCode === 'PILBOP' || normalizedCode === 'BERTHS' || normalizedCode === 'CRANES') {
    return { minZoom: Math.max(purposeRange.minZoom, 12), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'BOYLAT' || normalizedCode === 'BOYCAR' || ... ) {
    return { minZoom: Math.max(purposeRange.minZoom, 10), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'WRECKS' || normalizedCode === 'UWTROC' || normalizedCode === 'OBSTRN' || normalizedCode === 'LNDMRK') {
    return { minZoom: Math.max(purposeRange.minZoom, 10), maxZoom: purposeRange.maxZoom };
  }

  return { minZoom: Math.max(purposeRange.minZoom, 1), maxZoom: purposeRange.maxZoom };
}
```

### Hardcoded Style Selection Overrides

In `selectS57LayerStyle`, some layer families override the `minZoom` returned by `getLayerZoomRange` to enforce a hardcoded lower limit:

*   **TSSLPT (Traffic Separation Scheme Lane Parts):**
    ```typescript
    minZoom: 8,
    maxZoom: zoomRange.maxZoom
    ```
*   **TSS Arrows (Traffic Separation Scheme Arrows):**
    ```typescript
    minZoom: 8,
    maxZoom: zoomRange.maxZoom
    ```
