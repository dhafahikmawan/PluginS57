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

---

## Layer-by-Layer Comparison

### ADMARE (Administrative Area)
- **Plugin**:
  - Family: `base` (fallback)
  - Type: fill + stroke
  - Fill: `CHGRY` (#a3b4b7), opacity `0.4`
  - Stroke: `DEPCN` (#7D898C), width `1`
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 7)`
- **Samples/MAP**:
  - Type: line
  - Color: `CHGRY`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
  - Zoom: starts at zoom `7`
- **Difference**: Samples/MAP renders `ADMARE` as a dashed grey line (width 2), while the plugin falls back to a filled grey area with a thin solid contour outline.

### AIRARE (Airport Area)
- **Plugin**:
  - Family: `base` (fallback)
  - Type: fill + stroke
  - Fill: `CHGRY` (#a3b4b7), opacity `0.4`
  - Stroke: `DEPCN` (#7D898C), width `1`
  - Priority: `10000`
  - Zoom: purposeRange default
- **Samples/MAP**:
  - Type: fill
  - Color: `LANDA`
  - Zoom: starts at zoom `0`
- **Difference**: Samples/MAP styles `AIRARE` as land fill (`LANDA`), while the plugin falls back to the generic grey `base` style.

### BCNLAT (Lateral Beacon)
- **Plugin**:
  - Family: `navigation`
  - Type: symbol (icon mapping via attributes)
  - Priority: `70000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 10)`
- **Samples/MAP**:
  - Type: symbol
  - Label: `OBJNAM` attribute, color `CHBLK`
  - Zoom: starts at zoom `10`
- **Difference**: Aligned. Both treat it as a navigation beacon starting at zoom 10.

### BCNSPP (Special Purpose Beacon)
- **Plugin**:
  - Family: `navigation`
  - Type: symbol (icon mapping via attributes)
  - Priority: `70000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 10)`
- **Samples/MAP**:
  - Type: symbol
  - Label: `OBJNAM` attribute, color `CHBLK`
  - Zoom: starts at zoom `10`
- **Difference**: Aligned. Both treat it as a navigation beacon starting at zoom 10.

### BOYCAR (Cardinal Buoy)
- **Plugin**:
  - Family: `navigation`
  - Type: symbol (icon mapping via attributes)
  - Priority: `70000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 10)`
- **Samples/MAP**:
  - Type: symbol
  - Label: `OBJNAM` attribute, color `CHBLK`
  - Zoom: starts at zoom `10`
- **Difference**: Aligned.

### BOYLAT (Lateral Buoy)
- **Plugin**:
  - Family: `navigation`
  - Type: symbol (icon mapping via attributes)
  - Priority: `70000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 10)`
- **Samples/MAP**:
  - Type: symbol
  - Label: `OBJNAM` attribute, color `CHBLK`
  - Zoom: starts at zoom `10`
- **Difference**: Aligned.

### BOYSPP (Special Purpose Buoy)
- **Plugin**:
  - Family: `navigation`
  - Type: symbol (icon mapping via attributes)
  - Priority: `70000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 10)`
- **Samples/MAP**:
  - Type: symbol
  - Label: `OBJNAM` attribute, color `CHBLK`
  - Zoom: starts at zoom `10`
- **Difference**: Aligned.

### BRIDGE (Bridge)
- **Plugin**:
  - Family: `base` (fallback)
  - Type: fill + stroke
  - Fill: `CHGRY` (#a3b4b7), opacity `0.4`
  - Stroke: `DEPCN` (#7D898C), width `1`
  - Priority: `10000`
  - Zoom: purposeRange default
- **Samples/MAP**:
  - Type: line
  - Color: `DEPCN`
  - Width: `5`
  - Label: `VERCCL` attribute (prefixed with 'clr ', suffixed with 'm'), color `CHBLK`
  - Zoom: starts at zoom `0`
- **Difference**: Samples/MAP renders `BRIDGE` as a prominent solid line (width 5) with vertical clearance text, while the plugin defaults to a generic grey `base` area.

### BUAARE (Built-up Area)
- **Plugin**:
  - Family: `land`
  - Type: fill + stroke
  - Fill: `LANDA` (#AB9D68)
  - Stroke: `CSTLN` (#525A5C), width `1`
  - Priority: `20000`
  - Zoom: purposeRange default
- **Samples/MAP**:
  - Type: fill
  - Color: `CHBRN`
  - Label: `OBJNAM`, color `CHBLK`
  - Zoom: starts at zoom `0`
- **Difference**: The plugin colors `BUAARE` as land fill (`LANDA`) with a CSTLN stroke, while Samples/MAP colors it brown (`CHBRN`) and includes name labels.

### BUISGL (Building Single)
- **Plugin**:
  - Family: `land`
  - Type: fill + stroke
  - Fill: `LANDA` (#AB9D68)
  - Stroke: `CSTLN` (#525A5C), width `1`
  - Priority: `20000`
  - Zoom: purposeRange default
- **Samples/MAP**:
  - Type: fill
  - Color: `CHBRN`
  - Zoom: starts at zoom `0`
- **Difference**: Similar to `BUAARE`, the plugin uses land fill `LANDA` and stroke, while Samples/MAP uses brown `CHBRN` fill.

### CBLOHD (Cable Overhead)
- **Plugin**:
  - Family: `restricted`
  - Type: pattern fill + stroke
  - Pattern: `RESARE_pattern` or similar pattern
  - Stroke: `TRFCD` (#c545c3), width `2`, dashed `4,4`
  - Priority: `35000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 10)`
- **Samples/MAP**:
  - Type: line
  - Color: `DEPCN`
  - Width: `4`
  - Dash: `true` -> `[4, 4]`
  - Label: `VERCLR` attribute (prefixed with 'clr ', suffixed with 'm'), color `CHBLK`
  - Zoom: starts at zoom `10`
- **Difference**: Samples/MAP renders it as a thick dashed contour line with vertical clearance labels. The plugin applies restricted area styling (magenta outline and pattern fill).

### CBLSUB (Submarine Cable)
- **Plugin**:
  - Family: `restricted`
  - Type: pattern fill + stroke
  - Stroke: `TRFCD` (#c545c3), width `2`, dashed `4,4`
  - Priority: `35000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 9)`
- **Samples/MAP**:
  - Type: line
  - Color: `TRFCD`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
  - Zoom: starts at zoom `9`
- **Difference**: Samples/MAP renders `CBLSUB` as a thin dashed magenta line, while the plugin applies restricted-area styling.

### COALNE (Coastline)
- **Plugin**:
  - Family: `land`
  - Type: fill + stroke
  - Fill: `LANDA` (#AB9D68)
  - Stroke: `CSTLN` (#525A5C), width `1`
  - Priority: `20000`
  - Zoom: purposeRange default
- **Samples/MAP**:
  - Type: line
  - Color: `CSTLN`
  - Width: `1`
  - Zoom: starts at zoom `0`
- **Difference**: Effectively aligned on the outline color (`CSTLN`) and width. The plugin also applies a land fill polygon layer to the feature.

### CTNARE (Cable Area)
- **Plugin**:
  - Family: `other`
  - Type: line (no fill)
  - Stroke: `TRFCD` (#c545c3), width `2`, dashed `4,4`
  - Priority: `39000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 7)`
- **Samples/MAP**:
  - Type: line
  - Color: `TRFCD`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
  - Zoom: starts at zoom `7`
- **Difference**: Aligned. Both render a dashed magenta outline starting at zoom 7.

### CTRPNT (Control Point)
- **Plugin**:
  - Family: `base` (fallback)
  - Type: fill + stroke
  - Priority: `10000`
  - Zoom: purposeRange default
- **Samples/MAP**:
  - Type: symbol (label only)
  - Label: `OBJNAM`, color `CHBLK`
  - Zoom: default/fallback
- **Difference**: Samples/MAP labels control points with their names, while the plugin applies fallback `base` styling.

### DAYMAR (Daymark)
- **Plugin**:
  - Family: `base` (fallback)
  - Type: fill + stroke
  - Priority: `10000`
- **Samples/MAP**:
  - Type: symbol
  - Label: `OBJNAM`, color `CHBLK`
  - Zoom: starts at zoom `12` (inherited via general nav group/fallback rules)
- **Difference**: Samples/MAP provides labels, while the plugin uses fallback `base` styling.

### DEPARE (Depth Area)
- **Plugin**:
  - Family: `depth`
  - Type: fill + stroke
  - Fill: dynamic depth-based palette (`DEPIT`, `DEPVS`, `DEPMS`, `DEPDW`)
  - Stroke: `DEPCN` (#7D898C), width `0.5`
  - Priority: `30000`
  - Zoom: purposeRange default
- **Samples/MAP**:
  - Type: fill
  - Fill: dynamic depth-based palette (`DEPIT`, `DEPVS`, `DEPMS`, `DEPDW`)
  - Zoom: starts at zoom `0`
- **Difference**: The plugin explicitly adds a thin `DEPCN` contour outline around depth areas, whereas Samples/MAP renders depth areas strictly as flat color polygons.

### DEPCNT (Depth Contour)
- **Plugin**:
  - Family: `contour`
  - Type: line
  - Stroke: `DEPCN` (#7D898C), width `1`
  - Dash: `none` (unless `QUAPOS` or `CONDTN` indicates uncertain: `4,4`)
  - Priority: `50000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 5)`
- **Samples/MAP**:
  - Type: line
  - Color: `DEPCN`
  - Width: `1`
  - Zoom: starts at zoom `5`
- **Difference**: Aligned. Both use solid grey line styling. The plugin dynamically supports dashed outlines for uncertain contours.

### DMPGRD (Dumping Ground)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 9)`
- **Samples/MAP**:
  - Type: area outline
  - Color: `TRFCD` (#c545c3)
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
  - Zoom: starts at zoom `9`
- **Difference**: Samples/MAP renders it as a dashed magenta area outline, while the plugin falls back to `base` styling.

### DRGARE (Dredged Area)
- **Plugin**:
  - Family: `depth`
  - Type: fill + stroke
  - Fill: dynamic depth-based palette
  - Stroke: `DEPCN` (#7D898C), width `0.5`
  - Priority: `30000`
  - Zoom: purposeRange default
- **Samples/MAP**:
  - Type: fill + line
  - Fill: dynamic depth-based palette
  - Outline: `CHGRF` (#8B999B), width `1`, dashed `[4, 4]`
  - Zoom: starts at zoom `0`
- **Difference**: Samples/MAP renders `DRGARE` with a distinct dashed grey outline (`CHGRF`, width 1), whereas the plugin renders it identically to standard depth areas with a solid `DEPCN` (width 0.5) outline.

### FAIRWY (Fairway)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fallback/generic
- **Difference**: Both treat it as a generic layer.

### FERYRT (Ferry Route)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fallback/generic
- **Difference**: Both treat it as a generic layer.

### FOGSIG (Fog Signal)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fallback/generic
- **Difference**: Both treat it as a generic layer.

### FSHFAC (Fishing Facility)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `DEPCN`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Samples/MAP renders it as a dashed grey line (width 2), while the plugin falls back to `base`.

### HRBFAC (Harbour Facility)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: area outline
  - Color: `DEPCN`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Samples/MAP renders it as a dashed grey outline (width 2), while the plugin falls back to `base`.

### LIGHTS (Lights)
- **Plugin**:
  - Family: `navigation`
  - Type: symbol (custom icon/label via `_light_label`)
  - Priority: `70000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 9)`
- **Samples/MAP**:
  - Type: symbol
  - Label: `_light_label`, color `CHBLK`
  - Zoom: starts at zoom `9`
- **Difference**: Effectively aligned. The plugin handles light rendering dynamically by computing labels and icons.

### LITFLT (Light Float)
- **Plugin**:
  - Family: `navigation`
  - Type: symbol
  - Priority: `70000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 11)`
- **Samples/MAP**:
  - Type: symbol
  - Label: `_light_label` (prefixed with 'LtV '), color `CHBLK`
  - Zoom: starts at zoom `11`
- **Difference**: Aligned. Both start at zoom 11, with Samples/MAP adding a `'LtV '` label prefix.

### LNDARE (Land Area)
- **Plugin**:
  - Family: `land`
  - Type: fill + stroke
  - Fill: `LANDA` (#AB9D68)
  - Stroke: `CSTLN` (#525A5C), width `1`
  - Priority: `20000`
  - Zoom: purposeRange default
- **Samples/MAP**:
  - Type: fill
  - Color: `LANDA`
  - Label: `OBJNAM`, color `LANDF`
  - Zoom: starts at zoom `0`
- **Difference**: The plugin adds a thin coastline outline to land area borders, while Samples/MAP renders land as borderless fills and includes land labels.

### LNDMRK (Landmark)
- **Plugin**:
  - Family: `navigation`
  - Type: symbol (icon symbol + text label `OBJNAM`)
  - Priority: `72000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 10)`
- **Samples/MAP**:
  - Type: line (with labels)
  - Color: `CHBLK`
  - Width: `1`
  - Label: `OBJNAM`, color `CHBLK`
  - Zoom: starts at zoom `9`
- **Difference**: The plugin treats landmark features as symbols starting at zoom 10, whereas Samples/MAP renders landmarks as thin black lines starting at zoom 9 with labels.

### LNDRGN (Land Region)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 5)`
- **Samples/MAP**:
  - Type: area outline
  - Color: `LANDF`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
  - Zoom: starts at zoom `5`
- **Difference**: Samples/MAP renders it as a dashed brown outline (width 1), while the plugin falls back to `base` styling.

### MAGVAR (Magnetic Variation)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `RADHI` (#d3a6e9)
  - Width: `2`
  - Label: `VALMAG` (prefixed with 'var ' and suffixed with '°'), color `CHBLK`
  - Zoom: starts at zoom `7` (inherited default)
- **Difference**: Samples/MAP renders MAGVAR as a solid magenta line (width 2) with variation labels, while the plugin falls back to `base`.

### MIPARE (Military Practice Area)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 7)`
- **Samples/MAP**:
  - Type: area outline
  - Color: `TRFCD`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
  - Zoom: starts at zoom `7`
- **Difference**: Samples/MAP renders it as a dashed magenta outline (width 2), while the plugin falls back to `base`.

### MORFAC (Mooring/Warping Facility)
- **Plugin**:
  - Family: `navigation`
  - Priority: `70000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 11)`
- **Samples/MAP**:
  - Type: fill + line
  - Fill: `CHBRN`
  - Stroke: `CSTLN`, width `2`
  - Label: `OBJNAM`, color `CHBLK`
  - Zoom: starts at zoom `11`
- **Difference**: Samples/MAP renders mooring facilities as brown-filled shapes with coastline borders and name labels. The plugin handles it as a standard navigation symbol layer.

### M_COVR (Coverage)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fallback/generic
- **Difference**: Both fall back.

### M_CSCL (Compilation Scale)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fallback/generic
- **Difference**: Both fall back.

### M_NPUB (Nautical Publication Info)
- **Plugin**:
  - Family: `other`
  - Type: line (no fill)
  - Stroke: `CHGRY` (#a3b4b7), width `1`, dashed `4,4`
  - Priority: `40000`
  - Zoom: purposeRange default
- **Samples/MAP**:
  - Type: area outline
  - Color: `CHGRY`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Aligned. Both render it as a dashed grey outline of width 1.

### M_NSYS (Navigational System of Marks)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `LITYW`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Samples/MAP renders it as a dashed yellow line outline, while the plugin falls back to `base`.

### M_QUAL (Quality of Data)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fallback/generic
- **Difference**: Both fall back.

### OBSTRN (Obstruction)
- **Plugin**:
  - Family: `hazard`
  - Type: symbol (via hazard mapping rules)
  - Priority: `60000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 10)`
- **Samples/MAP**:
  - Type: line
  - Color: `CSTLN`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
  - Label: `OBJNAM`, color `CHBLK`
  - Zoom: starts at zoom `9`
- **Difference**: The plugin renders obstructions as symbol/icons starting at zoom 10. Samples/MAP renders them as dashed grey lines starting at zoom 9 with labels.

### PILPNT (Pilot Boarding Place)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: symbol (labels)
  - Label: `OBJNAM` (prefixed with 'Plt '), color `CHBLK`
  - Zoom: starts at zoom `10`
- **Difference**: Samples/MAP labels pilot boarding places starting at zoom 10, whereas the plugin falls back to `base`.

### PIPSOL (Pipeline Area/Pipeline)
- **Plugin**:
  - Family: `restricted`
  - Priority: `35000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 9)`
- **Samples/MAP**:
  - Type: generic line/area
  - Zoom: starts at zoom `9`
- **Difference**: The plugin groups PIPSOL under restricted styling (pattern fill and outline), while Samples/MAP configures it strictly as a zoom-limited layer without specific style parameters in its configuration maps.

### PONTON (Pontoon)
- **Plugin**:
  - Family: `restricted`
  - Type: pattern fill + outline
  - Priority: `35000`
  - Zoom: purposeRange default
- **Samples/MAP**:
  - Type: fill + line
  - Fill: `CHBRN`
  - Stroke: `CSTLN`, width `2`
  - Zoom: starts at zoom `0`
- **Difference**: The plugin renders pontoons using restricted area patterns and outlines, whereas Samples/MAP renders them as solid brown fills with coastline strokes.

### PYLONS (Pylon/Bridge Support)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fill
  - Color: `CHBRN`
  - Zoom: starts at zoom `0`
- **Difference**: Samples/MAP colors pylons with brown land fill, while the plugin falls back to `base` grey.

### RDOSTA (Radio Station)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: symbol (labels)
  - Label: `OBJNAM`, color `CHBLK`
- **Difference**: Samples/MAP labels radio stations, while the plugin falls back.

### RECTRC (Recommended Track)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 7)`
- **Samples/MAP**:
  - Type: line
  - Color: `DEPCN`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
  - Label: `ORIENT` (suffixed with '°'), color `DEPCN`
  - Zoom: starts at zoom `7`
- **Difference**: Samples/MAP renders `RECTRC` as a dashed contour-grey line (width 1) showing track orientation labels, while the plugin falls back to `base` styling.

### RESARE (Restricted Area)
- **Plugin**:
  - Family: `restricted`
  - Type: pattern fill + outline
  - Pattern: `RESARE_pattern` or specialized prohibited pattern
  - Stroke: `TRFCD` (#c545c3), width `2`, dashed `4,4`
  - Priority: `35000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 7)`
- **Samples/MAP**:
  - Type: area outline
  - Color: `TRFCD`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
  - Label: `OBJNAM`, color `TRFCD`
  - Zoom: starts at zoom `7`
- **Difference**: The plugin applies pattern-filled shading inside restricted area boundaries, whereas Samples/MAP strictly renders restricted area borders with labels.

### RIVERS (River)
- **Plugin**:
  - Family: `depth`
  - Type: fill + outline
  - Fill: dynamic depth shading
  - Stroke: `DEPCN`, width `0.5`
  - Priority: `30000`
  - Zoom: purposeRange default
- **Samples/MAP**:
  - Type: fill + line
  - Fill: `DEPVS` (shallow water blue)
  - Stroke: `CHBLK`, width `1`
  - Label: `OBJNAM`, color `CSTLN`
  - Zoom: starts at zoom `0`
- **Difference**: The plugin renders rivers using general depth-area dynamic colors. Samples/MAP styles rivers with flat shallow water blue, thin black borders, and river labels.

### SBDARE (Seabed Area)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 8)`
- **Samples/MAP**:
  - Type: line
  - Color: `DEPCN`
  - Width: `1`
  - Zoom: starts at zoom `8`
- **Difference**: Samples/MAP outlines seabed areas with a thin solid contour line, while the plugin falls back to `base`.

### SEAARE (Sea Area)
- **Plugin**:
  - Family: `routing`
  - Type: line (no fill)
  - Stroke: `DEPCN`, width `1`
  - Priority: `80000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 4)`
- **Samples/MAP**:
  - Type: area outline
  - Color: `DEPCN`
  - Width: `1`
  - Label: `OBJNAM`, color `DEPCN`
  - Zoom: starts at zoom `4`
- **Difference**: Aligned on outline color and width. Samples/MAP adds sea area labels, while the plugin handles labeling via standard label classes.

### SILTNK (Silo/Tank)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fill
  - Color: `CHBRN`
  - Zoom: starts at zoom `0`
- **Difference**: Samples/MAP colors silo/tanks with brown land fill, while the plugin falls back.

### SLCONS (Shoreline Construction)
- **Plugin**:
  - Family: `contour`
  - Type: line (builds via contour rules)
  - Priority: `50000`
  - Zoom: purposeRange default
- **Samples/MAP**:
  - Type: line
  - Color: `CSTLN`
  - Width: `2`
  - Zoom: starts at zoom `0`
- **Difference**: Samples/MAP renders shoreline constructions as solid coastline-colored lines (width 2), whereas the plugin groups it under the contour family (solid contour styling).

### SLOTOP (Slope Top)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `CHBLK`
  - Width: `1`
  - Zoom: starts at zoom `0`
- **Difference**: Samples/MAP renders slope tops as thin solid black lines, while the plugin falls back.

### SOUNDG / SOUNDG_processed (Sounding)
- **Plugin**:
  - Family: `sounding`
  - Type: circle (point)
  - Color: `CHBLK`
  - Radius: `2`
  - Priority: `85000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 7)`
- **Samples/MAP**:
  - Type: circle (point)
  - Color: `CHBLK` (radius `3`)
  - Zoom: starts at zoom `7`
- **Difference**: Aligned. Samples/MAP uses a slightly larger circle radius (`3` vs `2`).

### UWTROC (Underwater/Awash Rock)
- **Plugin**:
  - Family: `hazard`
  - Type: symbol (via hazard mapping rules)
  - Priority: `60000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 10)`
- **Samples/MAP**:
  - Type: symbol (labels)
  - Label: `OBJNAM`, color `CHBLK`
  - Zoom: starts at zoom `9`
- **Difference**: The plugin renders rocks as symbols starting at zoom 10. Samples/MAP labels them starting at zoom 9.

### WEDKLP (Weed/Kelp)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fallback/generic
- **Difference**: Both fall back.

### WRECKS (Wrecks)
- **Plugin**:
  - Family: `hazard`
  - Type: symbol (via hazard mapping rules)
  - Priority: `60000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 10)`
- **Samples/MAP**:
  - Type: symbol (labels)
  - Label: `OBJNAM`, color `CHBLK`
  - Zoom: starts at zoom `9`
- **Difference**: The plugin renders wreck symbols starting at zoom 10. Samples/MAP labels them starting at zoom 9.

### ACHARE (Anchor Berth / Anchorage Area)
- **Plugin**:
  - Family: `base` (fallback)
  - Type: fill + stroke
  - Fill: `CHGRY` (#a3b4b7), opacity `0.4`
  - Stroke: `DEPCN` (#7D898C), width `1`
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 8)`
- **Samples/MAP**:
  - Type: area outline
  - Color: `RADHI` (#d3a6e9)
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
  - Label: `OBJNAM` attribute, color `CHBLK`
  - Zoom: starts at zoom `8`
- **Difference**: Samples/MAP outlines anchorages in dashed magenta (`RADHI`, width 2) with labels, while the plugin falls back to a filled grey area.

### ARCSLN (Archipelagic Sea Lane)
- **Plugin**:
  - Family: `base` (fallback)
  - Type: fill + stroke
  - Priority: `10000`
- **Samples/MAP**:
  - Type: area outline
  - Color: `DEPCN`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Samples/MAP outlines archipelagic sea lanes with a thin dashed grey line, while the plugin falls back to the generic `base` style.

### ASLXIS (Archipelagic Sea Lane Axis)
- **Plugin**:
  - Family: `base` (fallback)
  - Type: fill + stroke
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `RADHI`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Samples/MAP renders ASLXIS as a dashed magenta line, while the plugin falls back to `base`.

### BCNCAR (Beacon Cardinal)
- **Plugin**:
  - Family: `navigation`
  - Type: symbol (icon mapping)
  - Priority: `70000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 10)`
- **Samples/MAP**:
  - Type: symbol
  - Label: `OBJNAM` attribute, color `CHBLK`
  - Zoom: starts at zoom `10`
- **Difference**: Aligned. Both start at zoom 10.

### BCNISD (Beacon Isolated Danger)
- **Plugin**:
  - Family: `navigation`
  - Type: symbol (icon mapping)
  - Priority: `70000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 10)`
- **Samples/MAP**:
  - Type: symbol
  - Label: `OBJNAM` attribute, color `CHBLK`
  - Zoom: starts at zoom `10`
- **Difference**: Aligned.

### BOYISD (Buoy Isolated Danger)
- **Plugin**:
  - Family: `navigation`
  - Type: symbol
  - Priority: `70000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 10)`
- **Samples/MAP**:
  - Type: symbol
  - Label: `OBJNAM` attribute, color `CHBLK`
  - Zoom: starts at zoom `10`
- **Difference**: Aligned.

### BOYSAW (Buoy Safe Water)
- **Plugin**:
  - Family: `navigation`
  - Type: symbol
  - Priority: `70000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 10)`
- **Samples/MAP**:
  - Type: symbol
  - Label: `OBJNAM` attribute, color `CHBLK`
  - Zoom: starts at zoom `10`
- **Difference**: Aligned.

### CANALS (Canal)
- **Plugin**:
  - Family: `depth`
  - Type: fill + stroke
  - Fill: dynamic depth shading
  - Stroke: `DEPCN`, width `0.5`
  - Priority: `30000`
  - Zoom: purposeRange default
- **Samples/MAP**:
  - Type: fill + line
  - Fill: `DEPVS`
  - Stroke: `CHBLK`, width `1`
  - Zoom: starts at zoom `0`
- **Difference**: The plugin uses dynamic depth coloring, while Samples/MAP uses flat shallow blue (`DEPVS`) with a thin solid black outline (`CHBLK`, width 1).

### CAUSWY (Causeway)
- **Plugin**:
  - Family: `base` (fallback)
  - Type: fill + stroke
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fill + line
  - Fill: `DEPIT` (intertidal green/grey)
  - Stroke: `LANDF` (brown), width `3`, dashed `true`
- **Difference**: Samples/MAP renders causeways with intertidal fill and a dashed brown outline, while the plugin falls back to standard `base` grey.

### CHNWIR (Check / Wire)
- **Plugin**:
  - Family: `base` (fallback)
  - Type: fill + stroke
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `CHBLK`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Samples/MAP renders it as a thin dashed black line, while the plugin falls back.

### CONVYR (Conveyor)
- **Plugin**:
  - Family: `land`
  - Type: fill + stroke
  - Fill: `LANDA`
  - Stroke: `CSTLN`
  - Priority: `20000`
- **Samples/MAP**:
  - Type: line
  - Color: `DEPCN`
  - Width: `4`
  - Dash: `true` -> `[4, 4]`
  - Label: `VERCLR` attribute (prefixed with 'clr ', suffixed with 'm'), color `CHBLK`
- **Difference**: Samples/MAP renders conveyors as dashed grey lines (width 4) with clearance labels, while the plugin treats them as land areas.

### CONZNE (Contiguous Zone)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 7)`
- **Samples/MAP**:
  - Type: line
  - Color: `CHGRY`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
  - Zoom: starts at zoom `7`
- **Difference**: Samples/MAP renders it as a dashed grey line, while the plugin falls back.

### COSARE (Continental Shelf Area)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 7)`
- **Samples/MAP**:
  - Type: line
  - Color: `CHGRY`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
  - Zoom: starts at zoom `7`
- **Difference**: Samples/MAP renders it as a dashed grey line, while the plugin falls back.

### CRANES (Cranes)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 12)`
- **Samples/MAP**:
  - Type: fill
  - Color: `CHBRN`
  - Zoom: starts at zoom `12`
- **Difference**: Samples/MAP renders cranes as brown land fills, while the plugin falls back.

### DAMCON (Dam)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fill + line
  - Fill: `CHBRN`
  - Stroke: `CSTLN`, width `2`
- **Difference**: Samples/MAP renders dams as brown fills with solid coastline outlines, while the plugin falls back.

### DOCARE (Dock Area)
- **Plugin**:
  - Family: `depth`
  - Type: fill + stroke
  - Fill: dynamic depth shading
  - Stroke: `DEPCN`, width `0.5`
  - Priority: `30000`
- **Samples/MAP**:
  - Type: fill
  - Fill: `DEPVS`
- **Difference**: The plugin uses dynamic depth shading, while Samples/MAP uses flat `DEPVS`.

### DRYDOC (Dry Dock)
- **Plugin**:
  - Family: `land`
  - Type: fill + stroke
  - Fill: `LANDA`
  - Stroke: `CSTLN`
  - Priority: `20000`
- **Samples/MAP**:
  - Type: fill
  - Fill: `LANDA`
- **Difference**: Aligned. Both color dry docks as land fill.

### DYKCON (Dyke)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fill + line
  - Fill: `CHBRN`
  - Stroke: `CHBLK`, width `2`
- **Difference**: Samples/MAP renders dykes as brown fills with solid black outlines, while the plugin falls back.

### EXEZNE (Exclusive Economic Zone)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 7)`
- **Samples/MAP**:
  - Type: line
  - Color: `CHGRY`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
  - Zoom: starts at zoom `7`
- **Difference**: Samples/MAP renders EXEZNE as a dashed grey line, while the plugin falls back.

### FLODOC (Floating Dock)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fill + line
  - Fill: `CHBRN`
  - Stroke: `CSTLN`, width `3`
  - Zoom: starts at zoom `0`
- **Difference**: Samples/MAP renders floating docks with brown fill and a solid coastline outline, while the plugin falls back to `base`.

### FNCLNE (Fence/Wall Line)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `CHBLK`
  - Width: `1`
- **Difference**: Samples/MAP renders it as a thin solid black line, while the plugin falls back.

### GATCON (Gate)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fill + line
  - Fill: `CHBRN`
  - Stroke: `CSTLN`, width `2`
- **Difference**: Samples/MAP renders gates as brown fills with solid coastline outlines, while the plugin falls back.

### HULKES (Hulks)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
  - Zoom: purposeRange default
- **Samples/MAP**:
  - Type: fill
  - Color: `CHBRN`
  - Zoom: starts at zoom `0`
- **Difference**: Samples/MAP renders hulks as brown land fills, while the plugin falls back to `base` grey.

### ICEARE (Ice Area)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fill
  - Color: `CHGRY`
- **Difference**: Both use grey (`CHGRY`), but Samples/MAP renders it specifically as a solid fill, while the plugin uses `base` fallback (with outline).

### ISTZNE (Inshore Traffic Zone)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 7)`
- **Samples/MAP**:
  - Type: area outline
  - Color: `TRFCD`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
  - Zoom: starts at zoom `7`
- **Difference**: Samples/MAP outlines ISTZNE in dashed magenta, while the plugin falls back.

### LAKARE (Lake Area)
- **Plugin**:
  - Family: `land`
  - Type: fill + stroke
  - Fill: `LANDA`
  - Stroke: `CSTLN`
  - Priority: `20000`
- **Samples/MAP**:
  - Type: fill
  - Fill: `DEPVS`
  - Label: `OBJNAM`, color `CSTLN`
  - Zoom: starts at zoom `0`
- **Difference**: The plugin colors lakes as land fill (`LANDA`), while Samples/MAP colors them as water fill (`DEPVS`) and includes labels.

### LAKSHR (Lake Shore)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `CSTLN`
  - Width: `1`
- **Difference**: Samples/MAP renders lake shores as solid coastline outlines, while the plugin falls back.

### LNDELV (Land Elevation Contour)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `LANDF` (brown)
  - Width: `1`
- **Difference**: Samples/MAP renders land elevation contours as solid brown lines, while the plugin falls back to `base` grey.

### LOKBSN (Lock Basin)
- **Plugin**:
  - Family: `depth`
  - Type: fill + stroke
  - Fill: dynamic depth shading
  - Stroke: `DEPCN`, width `0.5`
  - Priority: `30000`
- **Samples/MAP**:
  - Type: fill
  - Fill: `DEPVS`
- **Difference**: The plugin uses dynamic depth shading, while Samples/MAP uses flat `DEPVS`.

### MARCUL (Marine Farm/Culture)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `CHGRY`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Samples/MAP renders it as a dashed grey outline, while the plugin falls back.

### M_SREL (Survey Reliability)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: area outline
  - Color: `CHGRY`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Samples/MAP outlines it in dashed grey, while the plugin falls back.

### NAVLNE (Navigation Line)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `DEPCN`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
  - Label: `ORIENT` (suffixed with '°'), color `DEPCN`
- **Difference**: Samples/MAP renders nav lines as dashed grey with orientation labels, while the plugin falls back.

### OFSPLF (Offshore Platform)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fill
  - Fill: `CHBRN`
  - Label: `OBJNAM` (prefixed with 'Prod '), color `CHBLK`
- **Difference**: Samples/MAP renders platforms with brown fill and name labels prefixed with 'Prod ', while the plugin falls back.

### OILBAR (Oil Barrier)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `CHBLK`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Samples/MAP renders it as a thin dashed black line, while the plugin falls back.

### PILBOP (Pilot Boarding Place / Pilotage District)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 12)`
- **Samples/MAP**:
  - Type: symbol (labels)
  - Label: `OBJNAM` (prefixed with 'Plt '), color `CHBLK`
  - Zoom: starts at zoom `10`
- **Difference**: Samples/MAP renders it as labels starting at zoom 10, whereas the plugin falls back starting at zoom 12.

### PIPOHD (Pipeline Overhead)
- **Plugin**:
  - Family: `restricted`
  - Priority: `35000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 10)`
- **Samples/MAP**:
  - Type: line
  - Color: `DEPCN`
  - Width: `3`
  - Label: `VERCLR` (prefixed with 'clr ', suffixed with 'm'), color `CHBLK`
  - Zoom: starts at zoom `10`
- **Difference**: Samples/MAP renders it as a solid grey line (width 3) with clearance labels, while the plugin applies restricted area pattern fills and magenta outlines.

### PRCARE (Precautionary Area)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 7)`
- **Samples/MAP**:
  - Type: area outline
  - Color: `TRFCD`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
  - Zoom: starts at zoom `7`
- **Difference**: Samples/MAP renders it as a dashed magenta outline (width 2), while the plugin falls back.

### PRDARE (Production Area)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: area outline
  - Color: `CHBLK`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Samples/MAP renders it as a dashed black outline, while the plugin falls back.

### RADLNE (Radar Line)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `TRFCD`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Samples/MAP renders radar lines as dashed magenta, while the plugin falls back.

### RAILWY (Railway)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `LANDF`
  - Width: `2`
- **Difference**: Samples/MAP renders railways as solid brown lines, while the plugin falls back.

### RAPIDS (Rapids)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fill + line
  - Fill: `DEPCN`
  - Stroke: `DEPCN`, width `3`
- **Difference**: Samples/MAP renders rapids with grey fill and thick solid grey outline, while the plugin falls back.

### RDOCAL (Radio Calling-in Point)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `TRFCD`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
  - Label: `OBJNAM`, color `CHBLK`
- **Difference**: Samples/MAP renders RDOCAL as a thin dashed magenta line with labels, while the plugin falls back.

### RESTRC (Restricted Area - Custom)
- **Plugin**:
  - Family: `base` (fallback)
- **Samples/MAP**:
  - Type: line
  - Color: `TRFCD`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Samples/MAP renders it as a thin dashed magenta line, while the plugin falls back.

### RUNWAY (Runway)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fill + line
  - Fill: `CHBRN`
  - Stroke: `LANDF`, width `3`
- **Difference**: Samples/MAP renders runways as brown fills with solid brown outlines, while the plugin falls back.

### SLOGRD (Slope / Ground)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fill + line
  - Fill: `DEPCN`
  - Stroke: `CHBLK`, width `1`
- **Difference**: Samples/MAP renders it with grey fill and thin black outline, while the plugin falls back.

### SMCFAC (Small Craft Facility)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fill
  - Color: `CHBRN`
- **Difference**: Samples/MAP renders it with brown land fill, while the plugin falls back.

### SNDWAV (Sandwaves)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `DEPCN`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Samples/MAP renders sandwaves as dashed grey outlines, while the plugin falls back.

### STSLNE (Straight Line)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `CHGRY`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Samples/MAP renders it as a dashed grey line, while the plugin falls back.

### TESARE (Territorial Sea Area)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 7)`
- **Samples/MAP**:
  - Type: line
  - Color: `CHGRY`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
  - Zoom: starts at zoom `7`
- **Difference**: Samples/MAP renders territorial sea borders as dashed grey lines, while the plugin falls back.

### TIDEWY (Tideway)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `CHGRY`
  - Width: `1`
- **Difference**: Samples/MAP renders tideways as thin solid grey lines, while the plugin falls back.

### TOPMAR (Topmark)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 12)`
- **Samples/MAP**:
  - Type: symbol (labels)
  - Label: `OBJNAM`, color `CHBLK`
  - Zoom: starts at zoom `12`
- **Difference**: Samples/MAP labels topmarks at zoom 12+, while the plugin falls back.

### TRFLNE (Traffic Lane)
- **Plugin**:
  - Family: `routing`
  - Type: line (no fill)
  - Stroke: `TRFCD` (#c545c3), width `2`, dashed `6,4`
  - Priority: `80000`
- **Samples/MAP**:
  - Type: line
  - Color: `TRFCD`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Aligned. Both style traffic lanes as dashed magenta outlines.

### TSELNE (Traffic Separation Line)
- **Plugin**:
  - Family: `routing`
  - Type: line
  - Stroke: `TRFCD`, width `2`, dashed `6,4`
  - Priority: `80000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 7)`
- **Samples/MAP**:
  - Type: line
  - Color: `RADHI`
  - Width: `6`
  - Zoom: starts at zoom `7`
- **Difference**: Samples/MAP renders `TSELNE` as a very thick solid magenta line (width 6), while the plugin renders it as a standard dashed magenta routing line.

### TSEZNE (Traffic Separation Zone)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 7)`
- **Samples/MAP**:
  - Type: line
  - Color: `RADHI`
  - Width: `1`
  - Zoom: starts at zoom `7`
- **Difference**: Samples/MAP renders it as a thin solid magenta line, while the plugin falls back.

### TSSBND (Traffic Separation Boundary)
- **Plugin**:
  - Family: `routing`
  - Type: line
  - Stroke: `TRFCD`, width `2`, dashed `6,4`
  - Priority: `80000`
  - Zoom: `minZoom: Math.max(purposeRange.minZoom, 7)`
- **Samples/MAP**:
  - Type: line
  - Color: `TRFCD`
  - Width: `2`
  - Dash: `true` -> `[4, 4]`
  - Zoom: starts at zoom `7`
- **Difference**: Aligned. Both style as dashed magenta.

### TSSRON (Traffic Separation Scheme Roundabout)
- **Plugin**:
  - Family: `routing`
  - Type: line
  - Stroke: `TRFCD`, width `2`, dashed `6,4`
  - Priority: `80000`
- **Samples/MAP**:
  - Type: fallback/generic
- **Difference**: Plugin styles it as routing, while Samples/MAP falls back.

### TUNNEL (Tunnel)
- **Plugin**:
  - Family: `depth`
  - Type: fill + stroke
  - Fill: dynamic depth shading
  - Stroke: `DEPCN`, width `0.5`
  - Priority: `30000`
- **Samples/MAP**:
  - Type: fill + line
  - Fill: `DEPVS`
  - Stroke: `CHBLK`, width `2`, dashed `true`
- **Difference**: Samples/MAP renders tunnels with flat blue fill and dashed black outlines, while the plugin uses dynamic depth styling.

### UNSARE (Unsurveyed Area)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: fill
  - Color: `CHGRY`
  - Zoom: starts at zoom `0`
- **Difference**: Samples/MAP renders unsurveyed areas as grey fills, while the plugin uses general `base` style.

### VEGATN (Vegetation)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `LANDF`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Samples/MAP renders vegetation lines as dashed brown outlines, while the plugin falls back.

### WATFAL (Waterfall)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `DEPDW`
  - Width: `3`
- **Difference**: Samples/MAP renders waterfalls as solid blue lines (`DEPDW`), while the plugin falls back.

### WATTUR (Water Turbulence)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `DEPCN`
  - Width: `1`
  - Dash: `true` -> `[4, 4]`
- **Difference**: Samples/MAP renders water turbulence as dashed grey lines, while the plugin falls back.

### ZEMCNT (Zero Contour / Zero Line)
- **Plugin**:
  - Family: `base` (fallback)
  - Priority: `10000`
- **Samples/MAP**:
  - Type: line
  - Color: `CHBLK`
  - Width: `1`
- **Difference**: Samples/MAP renders zero contours as solid black lines, while the plugin falls back.

---

## Zoom Behavior Comparison
- **Plugin**:
  - Uses a purpose-coded range system identical to S-52 purpose categories (1–6).
  - `minZoom` and `maxZoom` are derived from a purpose range plus class-specific thresholds.
- **Samples/MAP**:
  - Uses explicit `ENC_ZOOM_RANGE` and `LAYER_MIN_ZOOM` mapping values.
  - Certain layers have hard-coded minimum zooms (e.g. `DEPCNT` begins at `5`, `LIGHTS` at `9`).
- **Difference**: The plugin is more declarative about purpose-driven ranges and inherits visibility through the same chart-purpose logic, while Samples/MAP uses explicit per-layer zoom thresholds in its configuration.

## Priority / Rendering Order
- **Plugin**:
  - Uses numeric `priority` values from `10000` to `90000` to order layers from base fills through labels.
  - This ensures consistent layering of land, depth, contours, navigation, and labels.
- **Samples/MAP**:
  - Uses a geometry-order strategy where polygons are added below lines, and lines are added below points/symbols.
  - The configuration also separates fills, outlines, and symbols at runtime.
- **Difference**: Plugin priority is explicit and fine-grained; Samples/MAP relies on layer insertion order and type-based stacking.
