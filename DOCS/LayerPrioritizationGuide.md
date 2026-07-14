# S-57 Styling Guide for Future MapLibre Implementation

This document describes how the current S-57 ENC rendering pipeline styles chart features and how those layers are ordered on the canvas. It is written so the same rules can be ported to a future JavaScript + MapLibre application without losing the original S-52 intent.

## 1. Rendering model

The current implementation reads S-57 data from GeoJSON files, groups it by S-57 object class, and converts each group into one or more MapLibre layers.

Each rendered feature is styled using three main inputs:

- Geometry type: polygon, line, point, or text
- S-57 object class: for example DEPARE, DRGARE, LIGHTS, BOYLAT, SOUNDG_processed
- Attribute-driven rules: depth values, contour values, light characteristics, buoy/beacon shape, restriction codes, and label fields

The rendering pipeline follows a consistent pattern:

1. Load a GeoJSON source for one S-57 layer.
2. Derive the appropriate MapLibre layer type from the geometry and object class.
3. Apply paint and layout properties from the S-52-inspired style tables.
4. Apply zoom constraints based on the ENC purpose and the layer’s own minimum display scale.
5. Insert the layer into the render stack according to its viewing-group priority.

## 2. Style sources and palette

### 2.1 Color palette

The renderer uses a palette derived from S-52 color tokens. The color system is centralized in the configuration layer and supports day, dusk, and night modes.

Examples:

- `CHBLK` for black/neutral chart symbols
- `CHRED` / `CHGRN` / `CHYLW` for navigation marks and lights
- `DEPVS`, `DEPMS`, `DEPMD`, `DEPDW` for depth-area shading
- `TRFCD` and `RADHI` for traffic and restricted areas
- `LANDA` / `LANDF` for land and land features

The implementation resolves these tokens through a function such as `resolveColor(token)`, which maps the S-52 token to a concrete hex color for the active color mode.

### 2.2 Pattern symbols

Some area features use custom pattern images instead of plain fills:

- `pattern-magenta-hash` for restricted or prohibited areas such as RESARE
- `pattern-grey-stipple` for DRGARE-style stippled areas
- `NOANCHR_pattern` for anchoring-prohibited zones
- `ENTPRO_pattern` for entry-prohibited zones

These are generated as canvas-based images and registered with the MapLibre map before the layers are added.

### 2.3 Dynamic symbol images

Several point features use symbolic icons selected from their attributes:

- Buoys use `BOYSHP` to select a buoy icon.
- Beacons use `BCNSHP` to select a beacon icon.
- Topmarks use `TOPSHP` to select a topmark icon.
- Lights use `CATLIT` and `COLOUR` to select the appropriate light symbol.
- Wrecks and obstructions use attribute-driven symbol selection based on water level, depth, and category.

## 3. Styling by layer family

### 3.1 Sea and land background

The base map uses a light blue sea background and an OpenStreetMap raster layer beneath the chart content.

- Background layer: `background` with `background-color` set to the deep-water color
- OSM raster layer: rendered below the chart layers so ENC features appear above it

This is the lowest visual layer and should be treated as an underlay rather than part of the S-57 symbology itself.

### 3.2 Depth areas

Depth areas are rendered as fills and are one of the most important parts of the S-57 styling model.

- `DEPARE` and `DRGARE` use a depth-dependent color ramp based on `DRVAL1`
- The color selection is ordered by depth thresholds:
  - very shallow areas use the shallows color
  - safety contour areas use the safety contour color
  - deeper areas use the medium/deep colors
  - the default deep-water color is used when no threshold is met
- `DRGARE` also receives a grey stipple pattern overlay to distinguish it visually from normal depth areas

This is a strong example of attribute-driven styling in the current implementation and should be preserved in any future MapLibre port.

### 3.3 Land and landcover features

Land and landcover features are generally rendered as filled polygons.

- `LNDARE` is filled with the land color
- `M_COVR` is filled with a neutral no-data color
- `SLCONS` is treated as a land or structure feature and rendered in a high-priority band

These layers are intended to form the base fabric of the chart and should be drawn before more detailed navigation features.

### 3.4 Coastlines and boundaries

Coastlines, limits, and chart boundaries are rendered as lines.

- `COALNE` uses a standard coastline style with a neutral coastline color
- `SLCONS` and similar structure lines are drawn with a stronger line characteristic
- `DEPCNT` is treated specially and split into multiple layers for dashed/solid rendering

The line width and dash pattern are taken from a style table keyed by S-57 feature name.

### 3.5 Depth contours

Depth contours are rendered as line layers with special handling.

- The base `DEPCNT` layer uses a contour color and a thin line width
- If the feature has a `QUAPOS` value indicating uncertain position, it is drawn as a dashed line
- If the feature is certain, it is drawn as a solid line
- If the contour equals the configured safety contour, it is highlighted with a brighter line color

This is an important visual cue for mariners and should be preserved in future implementations.

### 3.6 Restricted and regulated areas

Restricted areas are treated as both outlines and patterns.

- `RESARE` uses a dashed boundary plus a fill-pattern overlay
- Some restricted areas use special pattern images depending on `RESTRN` values
  - anchoring prohibited: `NOANCHR_pattern`
  - entry prohibited: `ENTPRO_pattern`
  - default: a magenta hash pattern
- Other area outlines such as `MIPARE`, `ACHARE`, `DMPGRD`, and `ISTZNE` are rendered as dashed outlines rather than solid fills

These layers should appear above general sea/land features but below navigation aids and labels.

### 3.7 Hazards and obstructions

Hazards are drawn as point or symbol layers and are visually emphasized.

- `WRECKS` uses a hazard-dependent symbol selection based on `CATWRK`, depth, and water level
- `OBSTRN` uses a symbol selection based on `CATOBS` and sounding depth
- `UWTROC` uses a symbol selection based on `WATLEV`

These layers are intended to be salient and to stand out against the surrounding chart background.

### 3.8 Aids to navigation

Buoys, beacons, lights, and similar navigation aids are drawn as symbol layers.

- Buoys use `BOYSHP` to select a symbol and `COLOUR` to tint the icon
- Beacons use `BCNSHP` and `COLOUR`
- Lights use `CATLIT` and `COLOUR` to choose the correct light symbol
- Light sectors are generated as polygons with semi-transparent fills and dashed outlines to show the visible sector of the light
- Light labels are generated dynamically and rendered as text labels

These layers are among the most detailed chart features and are intended to appear above most general chart features but below text labels in the final stack.

### 3.9 Routing and traffic separation

Traffic-related features such as `TSELNE`, `TSSBND`, `RECTRC`, `NAVLNE`, and `TSS`-related overlays are styled as prominent lines or symbols.

- Routing lines are drawn with stronger line widths and contrast colors
- TSS arrow symbols are rotated according to `ORIENT`
- These features are intended to be visible for route planning and navigation decisions

### 3.10 Soundings

Soundings are rendered as text labels rather than as simple points.

- `SOUNDG_processed` uses a text symbol layer
- The display text combines depth integer and decimal parts
- The text color is selected by sounding depth relative to the safety depth
- Halo and contrast styling help keep the values legible over the chart background

These should be considered a secondary layer that is visible only at appropriate zoom levels and should generally remain below labels and major navigation aids.

### 3.11 Labels

Text labels are rendered as symbol layers with a halo and offset placement.

- Labels are derived from the `s52_labels` table
- Most labels use `OBJNAM`, but some use special attribute fields such as `VERCCL`, `ORIENT`, `VALMAG`, or the dynamically generated `_light_label`
- Label color is taken from the configured S-52 token
- Labels use a halo to improve legibility and are filtered to only appear when the relevant attribute exists

Text is the highest-priority layer family because it must remain readable over all other geometry.

## 4. Layer priority and render order

The current implementation uses a viewing-group priority model. Each layer family is assigned a numeric priority and the layers are sorted before rendering.

Lower values are drawn first; higher values are drawn later and therefore appear above earlier layers.

| Priority band | Typical contents | Purpose |
| --- | --- | --- |
| 10000 | `M_COVR` | Base coverage / mask layer |
| 20000 | `LNDARE`, `SLCONS` | Land and major structure features |
| 30000 | `DEPARE`, `DRGARE` | Depth areas |
| 35000 | `RESARE` | Restricted areas |
| 39000 | Default polygon features | General area features |
| 50000 | `DEPCNT` | Contours |
| 60000 | `UWTROC`, `OBSTRN`, `WRECKS` | Hazards |
| 70000 | `BOY*`, `BCN*`, `LIGHTS`, `LIGHT_SECTORS` | Navigation aids |
| 80000 | `TSS*`, `NAVLNE` | Routing and traffic features |
| 85000 | `SOUNDG`, `SOUNDG_processed` | Soundings |
| 90000 | Labels | Text overlays |

In practical terms:

- Land and hydrographic fill appear first
- Contours and area boundaries appear next
- Hazards and navigation marks are drawn above them
- Soundings and labels are drawn last so they remain visible and readable

## 5. Zoom and display constraints

The current implementation also applies zoom constraints so that layers only appear at appropriate chart scales.

### 5.1 ENC purpose range

Each ENC map has an intended purpose range from overview to berthing scale. The effective zoom range is derived from the map purpose code.

### 5.2 Layer minimum zoom

Each S-57 object class has its own minimum zoom threshold. For example:

- general sea/land features appear early
- depth contours appear at medium zoom
- navigation aids and hazards appear only when enough detail is available
- highly detailed symbols appear only at larger scales

The final effective minimum zoom is the maximum of:

- the ENC purpose minimum zoom
- the layer-specific minimum zoom

This ensures the chart does not become visually crowded at small scales.

## 6. Display categories and decluttering

The current renderer also supports display categories that control which feature classes are visible.

- Category 1: base features
- Category 2: standard features
- Category 3: other features and labels
- Category 4: custom mode with optional decluttering controls

This gives the user a simple way to reduce chart clutter while keeping the chart legible. A future MapLibre port should preserve this concept, even if it is implemented as a separate layer visibility toggle rather than a single global style state.

## 7. Porting guidance for a future MapLibre implementation

If this logic is moved to a modern MapLibre setup, the following structure is recommended:

1. Keep a style registry keyed by S-57 object class.
2. Use one GeoJSON source per object class.
3. Create one or more MapLibre layers per source: fill, line, symbol, or text.
4. Use expressions for dynamic styling instead of hard-coded branches wherever possible.
5. Keep the viewing-group priority table explicit and separate from the style table.
6. Preserve zoom-based visibility and display-category toggles as first-class concerns.
7. Keep color tokens and pattern definitions centralized so day/night themes remain consistent.

The important design principle is that S-57 styling is not only “draw this feature with this color”; it is a layered system of geometry, semantics, mariner intent, and chart scale. A future MapLibre implementation should preserve that hierarchy rather than flattening it into a single general-purpose style.
