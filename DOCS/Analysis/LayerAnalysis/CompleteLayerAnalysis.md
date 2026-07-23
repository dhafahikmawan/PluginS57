# Complete Layer Analysis: Plugin vs Samples/MAP Styling

This document compares the layer-level styling choices made by the plugin in `S57Convert/src/lib/styles/s57StyleRegistry.ts` against the `Samples/MAP` program configuration in `Samples/MAP/config.js` and `Samples/MAP/app.js`.

## Comparison Approach
- Each entry compares one or more S-57 layer classes that are present in both implementations.
- The focus is on visual style: paint type, color, outline, dash patterns, zoom behavior, and rendering priority.
- Implementation flow details are intentionally omitted; only the effective styling outcomes are described.

## Common Foundations
- Both implementations use S-52-inspired color names such as `CHGRY`, `DEPCN`, `LANDA`, `TRFCD`, and `CHBLK`.
- The plugin defines a static color palette in `s57StyleRegistry.ts` and applies layer styles with explicit `family`, `priority`, `minZoom`, and `maxZoom` values.
- `Samples/MAP` resolves the same tokens through `S52_COLORS` per display mode (`day`, `dusk`, `night`) and maps layer classes to explicit MapLibre paint values.
- In the plugin, layer order is controlled numerically by `priority`; in `Samples/MAP`, order is derived from the layer creation sequence and geometry type sorting.

## Layer-by-Layer Comparison

### LNDARE
- Plugin:
  - Type: fill + stroke
  - Fill: `LANDA` (#AB9D68)
  - Stroke: `CSTLN` (#525A5C)
  - Stroke width: `1`
  - Family: `land`
  - Priority: `20000`
  - Zoom: derives from chart purpose range
- Samples/MAP:
  - Type: fill
  - Fill: `LANDA`
  - No explicit stroke shown in the main `areas` config for `LNDARE`
  - Zoom: base fill layers show from minimum zoom `0`
- Difference: the plugin explicitly adds a thin outline, while `Samples/MAP` primarily treats `LNDARE` as a filled land area.

### DEPARE and DRGARE
- Plugin:
  - Type: fill + stroke
  - Fill: dynamic depth-based palette: `DEPIT`, `DEPVS`, `DEPMS`, `DEPDW`
  - Stroke: `DEPCN` (#7D898C)
  - Stroke width: `0.5`
  - Family: `depth`
  - Priority: `30000`
  - Zoom: chart-purpose driven; `DEPARE` and `DRGARE` inherit general depth visibility criteria
- Samples/MAP:
  - `DRGARE`: rendered as a fill plus a line outline
    - Fill: `getDepthAreaExpression(...)` based on the same depth palette
    - Outline: `CHGRF` (#8B999B), width `1`, dash `[4, 4]`
  - `DEPARE`: closer to a plain line fill in the runtime logic, using `getDepthAreaExpression` and no separate dash override in the excerpt
  - Zoom: `DRGARE` and deep areas follow map-specific purpose logic; coastline depth areas become visible by purpose band
- Difference: both systems use the same depth color palette, but the plugin applies the depth shading more directly inside its `depth` family, while `Samples/MAP` treats `DRGARE` as a combined fill+outline element with explicit line styling.

### DEPCNT (Depth Contours)
- Plugin:
  - Type: line
  - Stroke color: `DEPCN` (#7D898C)
  - Stroke width: `1`
  - Dash: none for normal contours
  - Family: `contour`
  - Priority: `50000`
  - Zoom: at least `purposeRange.minZoom`, often `5` for general categories
- Samples/MAP:
  - Type: line
  - Stroke color: resolved `DEPCN`
  - Stroke width: `1`
  - Dash: no dash for standard lines; `DEPCNT` is rendered as a solid contour line
  - Zoom: explicitly begins at purpose-based minimum zoom and is visible on nautical detail levels
- Difference: styling is effectively aligned; both use the same grey contour line and similar zoom entry.

### RESARE (Restricted Area)
- Plugin:
  - Type: filled area with outline
  - Fill pattern: restricted-area pattern selected by `buildRestrictedStyle()`
  - Stroke color: `TRFCD` (#c545c3)
  - Stroke width: `2`
  - Stroke dasharray: `4,4`
  - Text color: `TRFCD`
  - Family: `restricted`
  - Priority: `35000`
  - Zoom: at least purpose minimum, often `7`
- Samples/MAP:
  - Type: line outline in `areaOutlines`
  - Stroke color: `TRFCD`
  - Stroke width: `2`
  - Dash: `true` → `[4, 4]`
  - Zoom: `RESARE` is also treated as a restricted-area visibility layer with focus at closer zooms
- Difference: the plugin adds a fill/pattern element to restricted areas, while `Samples/MAP` emphasizes the outline definition via the S-52 area outline configuration.

### CTNARE (Cable Area)
- Plugin:
  - Type: restricted-area style
  - Outline color: `TRFCD` (#c545c3)
  - Stroke width: `2`
  - Stroke dasharray: `4,4`
  - Fill pattern: `RESARE_pattern` or another restricted fill pattern via `buildRestrictedStyle()`
  - Family: `restricted`
  - Priority: `35000`
  - Zoom: `7` or higher due to the restricted-area zoom rules
- Samples/MAP:
  - Type: outline-only area in `areaOutlines`
  - Color: `TRFCD`
  - Width: `2`
  - Dash: `true` → `[4, 4]`
  - Zoom: `CTNARE` is explicitly configured to start at zoom `7`
  - Rendering order: falls under the generic polygon viewing group (`39000`) since `CTNARE` has no dedicated S-52 viewing-group override
- Difference: both use the same magenta outline style, but the plugin may also render `CTNARE` with a restricted-area fill/pattern while `Samples/MAP` renders it as outline-only. The plugin’s `35000` restricted priority is slightly earlier (below) than MAP’s generic polygon viewing order of `39000`.

### M_NPUB (Nautical Publication Info)
- Plugin:
  - Type: line only
  - Stroke color: `CHGRY` (#a3b4b7)
  - Stroke width: `1`
  - Stroke dasharray: `4,4`
  - Fill: none (`fillOpacity: 0`)
  - Family: `other`
  - Priority: `40000`
- Samples/MAP:
  - Type: line only in `areaOutlines`
  - Color: `CHGRY`
  - Width: `1`
  - Dash: `true` → `[4, 4]`
- Difference: this is one of the closest layer-to-layer matches; both implementations render `M_NPUB` as a dashed grey outline-only feature.

### SEAARE
- Plugin:
  - Type: line/outline
  - Stroke color: `DEPCN`
  - Stroke width: `1`
  - Dash: false
  - Family: `routing`
  - Priority: `80000`
  - Zoom: at least `4`
- Samples/MAP:
  - Type: area outline
  - Color: `DEPCN`
  - Width: `1`
  - Dash: false
  - Zoom: explicit `SEAARE` min zoom `4`
- Difference: both use the same color and width; `Samples/MAP` explicitly classifies it as an area outline in its S-52 config.

### LIGHTS / LITFLT / LIGHT_SECTORS
- Plugin:
  - `LIGHTS`/`LITFLT` are `navigation` family symbol layers
  - Icon and label generation are data-driven by `_light_label` and `OBJNAM`
  - `LIGHT_SECTORS` get semi-transparent fill and stroke matching their color group
  - Priority values range from `69000` to `70000`
- Samples/MAP:
  - Light-related geometries use symbol layers with explicit `icon-image` and label rules
  - Label color: `CHBLK` for most navigation symbols
  - Line or fill style for light sectors is derived from S-52 color token resolution and geometry type
- Difference: the plugin uses a structured style selection family for navigation and derives light labels internally, while `Samples/MAP` uses rule-based label definitions and direct MapLibre layer creation.

### SOUNDG / SOUNDG_processed
- Plugin:
  - Type: circle point style
  - Fill color: `CHBLK`
  - Circle radius: `2`
  - Family: `sounding`
  - Priority: `85000`
  - Zoom: at least purpose minimum, often `7`
- Samples/MAP:
  - Type: circle point style for soundings
  - Color: likely black or dark text, radius `3` in the sample runtime logic
  - Zoom: starts around `7`
- Difference: both use a small dark circle design for soundings, with the MAP program using a slightly larger radius.

### TSSLPT / TSS_ARROWS
- Plugin:
  - `TSSLPT`: fill color `TRFCD`, `fillOpacity: 0.9`, stroke `CHBLK`, circle radius `4`
  - `TSS_ARROWS`: symbol icon layer with additional style priority
  - Zoom: starts at `8`
- Samples/MAP:
  - `TSS_ARROWS` is rendered as a symbol layer using an icon image (`TSSLPT51`) and map-aligned rotation
  - `TSSLPT` may also appear as symbol or arrow geometries depending on the layer type and label rules
- Difference: the plugin uses an explicit area/circle style for TSSLPT and separate arrow style objects, while Samples/MAP relies on S-52 symbol definitions and icon rules.

### M_COVR and General Fallbacks
- Plugin:
  - Any class not matched by a specific set falls back to `base` family
  - Default style: fill `CHGRY`, fill opacity `0.4`, stroke `DEPCN`, width `1`
  - Priority: `10000`
- Samples/MAP:
  - Generic polygons and lines are handled by geometric type branches in `app.js`
  - Polygon outlines default to `line-color` and `line-dasharray` values derived from `areaOutlines` or generic line rules
- Difference: the plugin has a formal default styling path, while `Samples/MAP` falls back to generic MapLibre layer creation based on geometry type when no S-52 rule exists.

## Zoom Behavior Comparison
- Plugin:
  - Uses a purpose-coded range system identical to S-52 purpose categories (1–6)
  - `minZoom` and `maxZoom` are derived from a purpose range plus class-specific thresholds
- Samples/MAP:
  - Uses explicit `ENC_ZOOM_RANGE` and `LAYER_MIN_ZOOM`
  - Certain layers have hard-coded minimum zooms (e.g. `DEPCNT` begins at `5`, `LIGHTS` at `9`)
- Difference: the plugin is more declarative about purpose-driven ranges and inherits visibility through the same chart-purpose logic, while Samples/MAP uses explicit per-layer zoom thresholds in its configuration.

## Priority / Rendering Order
- Plugin:
  - Uses numeric `priority` values from `10000` to `90000` to order layers from base fills through labels
  - This ensures consistent layering of land, depth, contours, navigation, and labels
- Samples/MAP:
  - Uses a geometry-order strategy where polygons are added below lines, and lines are added below points/symbols
  - The configuration also separates fills, outlines, and symbols at runtime
- Difference: plugin priority is explicit and fine-grained; Samples/MAP relies on layer insertion order and type-based stacking.

## Summary
- `M_NPUB` is the strongest match between the two systems: both render it as an outline-only dashed grey line.
- Depth areas and contours are similar in palette, but the plugin embeds depth shading into its style family, while Samples/MAP splits `DRGARE` into a combined fill+outline implementation.
- Restricted-area styling differs: the plugin emphasizes pattern-filled restricted areas with magenta outlines, whereas `Samples/MAP` emphasizes area outlines with S-52 line styling.
- Light and navigation symbols are handled with more structured style families in the plugin, while Samples/MAP uses explicit S-52 label rules and icon mapping.
- The plugin’s layer priorities provide a clearer numeric stacking model, while Samples/MAP depends on MapLibre layer creation order and geometry type.
