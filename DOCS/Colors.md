# S-52 color guide for the MAP renderer

This document describes how every rendered object class in a chart-rendering pipeline gets its color. The implementation uses a token-based S-52 palette and applies those tokens through the renderer’s style tables and dynamic attribute rules.

## 1. Color system overview

The renderer does not hard-code colors for each feature in the drawing loop. Instead, it uses a small set of named S-52 color tokens and resolves them to a concrete hex value depending on the active display mode:

- Day
- Dusk
- Night

The active mode is stored in the renderer state and is resolved through the palette table for the selected display mode.

### 1.1 Core color tokens used by the renderer

The following tokens are the ones that matter most for drawn features:

| Token | Day | Dusk | Night | Meaning |
|---|---:|---:|---:|---|
| CHBLK | #070707 | #1A1C1D | #1F2223 | Black / chart outline |
| CHGRY | #a3b4b7 | #5A6365 | #1A1C1D | Grey |
| CHRED | #CD4759 | #8B2832 | #3B110A | Red |
| CHGRN | #59C249 | #3A6B2A | #162207 | Green |
| CHYLW | #D0BA3D | #8B7A20 | #29210A | Yellow |
| LANDA | #AB9D68 | #6B5D3A | #0D0A08 | Land area fill |
| LANDF | #8b661f | #4a3610 | #0D0A08 | Land features |
| CHBRN | #b19139 | #5a4a1d | #0D0A08 | Brownish fill |
| DEPDW | #D4EAEE | #7A9AA0 | #070707 | Deep water |
| DEPMD | #BAD5E1 | #6B8A91 | #070707 | Medium depth |
| DEPMS | #98C5F2 | #4A7A9C | #070707 | Moderate shallow |
| DEPVS | #73B6EF | #3A6B9C | #070707 | Very shallow |
| DEPIT | #83B295 | #4A6B5A | #0A1208 | Intertidal / isolated danger |
| DEPCN | #7D898C | #4A5A5C | #1A1C1D | Contour / chart grey |
| CSTLN | #525A5C | #3A4244 | #1A1C1D | Coastline |
| TRFCD | #c545c3 | #6B256A | #341234 | Traffic / restricted / magenta |
| RADHI | #d3a6e9 | #7A6287 | #341234 | Radar / highlight |
| LITYW | #f4da48 | #8B7A20 | #29210A | Light yellow |

### 1.2 How the renderer chooses a color

The color application logic is:

1. Resolve the token from the active mode.
2. For area fills, use the token assigned in the area style table.
3. For lines, use the token assigned in the line style table.
4. For labels, use the label color token from the label table.
5. For special dynamic layers, compute a color from attributes instead of using a fixed token.

## 2. Special calculations that override the base palette

### 2.1 Depth areas (DEPARE and DRGARE)

Depth areas are not drawn with a single fixed fill. Their color is calculated from the attribute `DRVAL1`.

```text
if DRVAL1 < 0            -> DEPIT
else if DRVAL1 < 2.0     -> DEPVS
else if DRVAL1 < 30.0    -> DEPMS
else if DRVAL1 < 30.0    -> DEPMD
else                     -> DEPDW
```

In practice, the code uses the following thresholds:

- `shallowContour = 2.0`
- `safetyContour = 30.0`
- `deepContour = 30.0`

The result is applied to depth-area layers in the rendering pipeline.

### 2.2 Soundings

Sounding text color is computed from `DEPTH_INT` and `DEPTH_DEC`:

```text
depth = DEPTH_INT + (DEPTH_DEC / 10)
if depth <= safetyDepth (30.0) -> CHBLK
else -> DEPCN
```

### 2.3 Light sectors

Light sectors are generated as polygons and colored from the light attribute `COLOUR`.

```text
if COLOUR contains '3' -> #FF0000 (red)
else if COLOUR contains '4' -> #00FF00 (green)
else -> #F2E959 (white/yellow)
```

### 2.4 Restricted areas (RESARE)

RESARE is rendered with a magenta hatch pattern instead of a simple solid fill. The outline is forced to the restricted-area traffic color token `TRFCD`.

### 2.5 Pattern-based fills

- `DRGARE` uses a grey stipple pattern.
- `RESARE` uses a magenta hash pattern.
- `NOANCHR` and `ENTPRO` use simplified magenta prohibition patterns.

## 3. Area object classes

These classes are rendered as filled polygons or as filled area-like features.

| Object class | Geometry | Fill token | Resulting color behavior |
|---|---|---|---|
| AIRARE | Area | LANDA | Light sand / land-like fill |
| BUAARE | Area | CHBRN | Brownish land area |
| BUISGL | Area | CHBRN | Brownish land area |
| CANALS | Area | DEPVS | Shallow-water blue fill |
| CAUSWY | Area | DEPIT | Intertidal / greenish fill |
| CRANES | Area | CHBRN | Brownish fill |
| DAMCON | Area | CHBRN | Brownish fill |
| DOCARE | Area | DEPVS | Shallow-water blue fill |
| DRYDOC | Area | LANDA | Land-like fill |
| DYKCON | Area | CHBRN | Brownish fill |
| FLODOC | Area | CHBRN | Brownish fill |
| FORSTC | Area | CHBRN | Brownish fill |
| GATCON | Area | CHBRN | Brownish fill |
| HULKES | Area | CHBRN | Brownish fill |
| ICEARE | Area | CHGRY | Grey area |
| LAKARE | Area | DEPVS | Shallow-water blue fill |
| LNDARE | Area | LANDA | Land-like fill |
| LNDMRK | Area | CHBRN | Brownish fill |
| LOKBSN | Area | DEPVS | Shallow-water blue fill |
| MORFAC | Area | CHBRN | Brownish fill |
| OFSPLF | Area | CHBRN | Brownish fill |
| PONTON | Area | CHBRN | Brownish fill |
| PYLONS | Area | CHBRN | Brownish fill |
| RAPIDS | Area | DEPCN | Contour grey |
| RIVERS | Area | DEPVS | Shallow-water blue fill |
| ROADWY | Area | LANDA | Land-like fill |
| RUNWAY | Area | CHBRN | Brownish fill |
| SILTNK | Area | CHBRN | Brownish fill |
| SLOGRD | Area | DEPCN | Contour grey |
| SMCFAC | Area | CHBRN | Brownish fill |
| TUNNEL | Area | DEPVS | Shallow-water blue fill |
| UNSARE | Area | CHGRY | Grey area |

## 4. Line object classes

These classes are rendered as line features with a fixed color token, width, and optional dash pattern.

| Object class | Line color token | Width | Dash | Notes |
|---|---|---:|---|---|
| ASLXIS | RADHI | 2 | Yes | Highlight / magenta-ish line |
| BERTHS | DEPCN | 3 | No | Chart grey |
| BRIDGE | DEPCN | 5 | No | Chart grey |
| CANALS | CHBLK | 1 | No | Black |
| CAUSWY | LANDF | 3 | Yes | Land brown |
| CBLOHD | DEPCN | 4 | Yes | Chart grey |
| CBLSUB | TRFCD | 1 | Yes | Restricted / magenta |
| CHNWIR | CHBLK | 1 | Yes | Black |
| COALNE | CSTLN | 1 | No | Coastline grey |
| CONVYR | DEPCN | 4 | Yes | Chart grey |
| DAMCON | CSTLN | 2 | No | Coastline grey |
| DYKCON | CHBLK | 2 | No | Black |
| FLODOC | CSTLN | 3 | No | Coastline grey |
| FNCLNE | CHBLK | 1 | No | Black |
| FORSTC | LANDF | 3 | No | Land brown |
| FSHFAC | DEPCN | 2 | Yes | Chart grey |
| GATCON | CSTLN | 2 | No | Coastline grey |
| LAKSHR | CSTLN | 1 | No | Coastline grey |
| LNDELV | LANDF | 1 | No | Land brown |
| LNDMRK | CHBLK | 1 | No | Black |
| LOCMAG | RADHI | 1 | Yes | Highlight |
| MAGVAR | RADHI | 2 | No | Highlight |
| MARCUL | CHGRY | 2 | Yes | Grey |
| MORFAC | CSTLN | 2 | No | Coastline grey |
| NAVLNE | DEPCN | 1 | Yes | Chart grey |
| OBSTRN | CSTLN | 1 | Yes | Coastline grey |
| OILBAR | CHBLK | 1 | Yes | Black |
| PIPOHD | DEPCN | 3 | No | Chart grey |
| PONTON | CSTLN | 2 | No | Coastline grey |
| RADLNE | TRFCD | 2 | Yes | Magenta |
| RAILWY | LANDF | 2 | No | Land brown |
| RAPIDS | DEPCN | 3 | No | Chart grey |
| RDOCAL | TRFCD | 1 | Yes | Magenta |
| RESTRC | TRFCD | 1 | Yes | Magenta |
| RIVERS | CHBLK | 1 | No | Black |
| ROADWY | LANDF | 2 | No | Land brown |
| RUNWAY | LANDF | 3 | No | Land brown |
| SBDARE | DEPCN | 1 | No | Chart grey |
| SLOGRD | CHBLK | 1 | No | Black |
| SLOTOP | CHBLK | 1 | No | Black |
| SNDWAV | DEPCN | 2 | Yes | Chart grey |
| STSLNE | CHGRY | 1 | Yes | Grey |
| TIDEWY | CHGRY | 1 | No | Grey |
| TRFLNE | TRFCD | 2 | Yes | Magenta |
| TSELNE | RADHI | 6 | No | Highlight |
| TSSBND | TRFCD | 2 | Yes | Magenta |
| TUNNEL | CHBLK | 2 | Yes | Black |
| VEGATN | LANDF | 1 | Yes | Land brown |
| WATFAL | DEPDW | 3 | No | Water blue |
| WATTUR | DEPCN | 1 | Yes | Chart grey |
| ZEMCNT | CHBLK | 1 | No | Black |
| DEPCNT | DEPCN | 1 | No | Contour grey |
| ADMARE | CHGRY | 2 | Yes | Grey |
| CONZNE | CHGRY | 2 | Yes | Grey |
| COSARE | CHGRY | 2 | Yes | Grey |
| CTNARE | TRFCD | 2 | Yes | Magenta |
| EXEZNE | CHGRY | 2 | Yes | Grey |
| RECTRC | DEPCN | 1 | Yes | Chart grey |
| SLCONS | CSTLN | 2 | No | Coastline grey |
| TESARE | CHGRY | 2 | Yes | Grey |
| TSEZNE | RADHI | 1 | No | Highlight |
| M_NSYS | LITYW | 1 | Yes | Light yellow |

## 5. Area-outline object classes

These are rendered as outlines only, without a filled interior.

| Object class | Outline token | Width | Dash | Notes |
|---|---|---:|---|---|
| ACHARE | RADHI | 2 | Yes | Highlight outline |
| ARCSLN | DEPCN | 1 | Yes | Chart grey |
| DMPGRD | TRFCD | 1 | Yes | Restricted / magenta |
| ISTZNE | TRFCD | 1 | Yes | Restricted / magenta |
| MIPARE | TRFCD | 2 | Yes | Restricted / magenta |
| PRCARE | TRFCD | 2 | Yes | Restricted / magenta |
| PRDARE | CHBLK | 1 | Yes | Black |
| SEAARE | DEPCN | 1 | No | Chart grey |
| LNDRGN | LANDF | 1 | Yes | Land brown |
| HRBFAC | DEPCN | 2 | Yes | Chart grey |
| M_NPUB | CHGRY | 1 | Yes | Grey |
| M_SREL | CHGRY | 1 | Yes | Grey |

## 6. Point and symbol classes

Point features are not colored by the same line/area token logic. They are drawn using sprite symbols, so the color comes mainly from the symbol artwork rather than from a runtime calculation.

The currently supported point/symbol-driven feature families are:

- Buoys: `BOYLAT`, `BOYCAR`, `BOYSPP`, `BOYISD`, `BOYSAW`
- Beacons: `BCNLAT`, `BCNCAR`, `BCNSPP`, `BCNISD`
- Lights: `LIGHTS`, `LITFLT`
- Wrecks: `WRECKS`
- Underwater rocks: `UWTROC`
- Obstacles: `OBSTRN`
- Landmarks: `LNDMRK`

### 6.1 Light symbols

Lights are special because their symbol color is derived from the `COLOUR` attribute for the sector geometry. The label text is generated from `LITCHR`, `SIGGRP`, `COLOUR`, `SIGPER`, and `VALNMR`, but the actual sector polygons use the color rules listed in section 2.3.

### 6.2 Wrecks, obstructions, and underwater rocks

These are represented by sprite-based symbols rather than by token-based fill colors. Their visual appearance depends on the selected sprite icon and the attribute-driven symbol selection logic:

- `WRECKS`: selected by `CATWRK`, `VALSOU`, and `WATLEV`
- `OBSTRN`: selected by `VALSOU` and `CATOBS`
- `UWTROC`: selected by `WATLEV`

## 7. Label colors

Labels are not colored by geometry; they use the label table in the style configuration. Their text color is assigned from the layer’s label color token and uses a white halo in day mode and a dark halo in dusk/night mode.

| Label layer | Label color token |
|---|---|
| Buoys and beacons | CHBLK |
| Lights | CHBLK |
| `SEAARE` | DEPCN |
| `LNDARE` | LANDF |
| `RIVERS`, `LAKARE` | CSTLN |
| `RESARE` | TRFCD |
| Bridge/clearance labels | CHBLK |
| `MAGVAR` | CHBLK |

## 8. Practical summary

When implementing or changing colors, follow this order:

1. Start from the S-52 token mapping in the style configuration.
2. Apply the class-specific style from the area, line, outline, and label tables.
3. For depth-based geometries, override with the `DRVAL1` calculation.
4. For soundings, use the `DEPTH_INT` + `DEPTH_DEC` calculation.
5. For light sectors, use the `COLOUR` attribute rules.
6. For pattern-based areas, use the generated image patterns instead of solid fills.

This is the current authoritative color behavior for the renderer.
