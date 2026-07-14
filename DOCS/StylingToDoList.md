# StylingToDoList

## Goal

This document captures the gap between the current GeoLibre plugin rendering/styling approach and the S-57 styling guide, then gives an implementation plan for bringing the plugin closer to the guide while staying compatible with the current GeoLibre plugin APIs.

Additional reference:
- Coloring Scheme: ./Colors.md

---

## 1. Current plugin state vs. the styling guide

### 1.1 What the current plugin does

The current plugin is a basic S-57 import utility. It:
- reads an S-57 file,
- groups features by S-57 object class,
- converts them to GeoJSON-like layer data,
- registers them with GeoLibre using a simple native-layer registration call,
- applies a minimal style based only on the class code.

The current implementation is centered around:
- [S57Convert/src/geolibre.ts](S57Convert/src/geolibre.ts)
- [S57Convert/src/lib/utils/s57Converter.ts](S57Convert/src/lib/utils/s57Converter.ts)
- [S57Convert/src/lib/geolibre/host-api.ts](S57Convert/src/lib/geolibre/host-api.ts)

### 1.2 What the guide expects

The guide describes a richer S-57 rendering system with:
- layer families such as land, depth areas, contours, hazards, aids to navigation, routing, soundings, and labels,
- S-52-inspired color tokens and palette handling based on a mode-aware palette (Day/Dusk/Night), using tokens such as `CHBLK`, `CHGRY`, `CHRED`, `LANDA`, `LANDF`, `DEPDW`, `DEPVS`, `DEPMS`, `DEPIT`, `DEPCN`, `TRFCD`, and `LITYW`,
- attribute-driven styling (depth, contour, light characteristics, buoy/beacon type, restriction codes, labels),
- pattern overlays for restricted/prohibited zones,
- symbol selection for buoys, beacons, lights, wrecks, and obstructions,
- explicit layer priority bands and render order,
- zoom/display-category constraints.

### 1.3 Key differences

| Area | Current plugin | Styling guide expectation | Priority |
| --- | --- | --- | --- |
| Styling model | One generic style per object class | Multi-factor styling based on geometry, class, and attributes | High |
| Color system | Hard-coded hex colors | Centralized S-52 token palette with day/dusk/night support | High |
| Depth areas | Very basic fill style | Depth-dependent ramp with safety contour handling | High |
| Restricted areas | Not implemented | Dash outlines plus pattern overlays | High |
| Hazards and aids | Minimal point styling | Attribute-driven symbol selection and emphasis | High |
| Labels | Not implemented | Text labels with halo, offset, and dynamic label fields | High |
| Render order | No explicit stack ordering | Explicit viewing-group priority bands | High |
| Zoom logic | Not implemented | Minimum zoom based on purpose and feature class | Medium |
| Display categories | Not implemented | Category-based visibility and decluttering | Medium |
| Layer grouping | Basic registration | Source-based grouping and layer-family organization | Medium |

---

## 2. Recommended update plan

### Step 1: Replace hard-coded style branching with a style registry

Create a dedicated style registry module that maps S-57 classes to style rules and resolves color tokens from `DOCS/Colors.md`.

Suggested structure:
- create a new module such as [S57Convert/src/lib/styles/s57StyleRegistry.ts](S57Convert/src/lib/styles/s57StyleRegistry.ts)
- centralize color tokens and style defaults there using the S-52 token palette
- make style selection depend on:
  - geometry type,
  - S-57 class,
  - feature attributes.

Recommended style categories with palette references:
- land and landcover (`LANDA`, `LANDF`, `CHBRN`, `CSTLN`)
- depth areas (`DEPDW`, `DEPMD`, `DEPMS`, `DEPVS`, `DEPIT`)
- contours (`DEPCN`, `CSTLN`)
- restricted areas (`TRFCD`, `RADHI`)
- hazards (`CHRED`, `CHBLK`, `DEPCN`)
- navigation aids (`LITYW`, `CHGRN`, `CHRED`, sector colors)
- routing and traffic (`TRFCD`, `RADHI`)
- soundings (`CHBLK`, `DEPCN`)
- labels (`CHBLK`, `CHGRY`)

### Step 2: Preserve S-57 attributes during conversion

The converter should not only group features by class; it should preserve the original properties needed for styling.

Update [S57Convert/src/lib/utils/s57Converter.ts](S57Convert/src/lib/utils/s57Converter.ts) so each feature keeps the original attributes and the layer metadata includes enough context for style selection.

Important fields to preserve:
- depth-related attributes such as DRVAL1, DRVAL2, VALDCO, SAFCON
- contour attributes such as QUAPOS, CONDTN
- navigation aid attributes such as BOYSHP, BCNSHP, TOPSHP, CATLIT, COLOUR
- restriction attributes such as RESTRN
- label fields such as OBJNAM, VERCCL, ORIENT, VALMAG

### Step 3: Add family-specific styling rules

Implement rendering rules aligned with the guide:

1. Sea and land base
- use a light blue sea background under chart content
- render land and landcover as fills early in the stack

2. Depth areas
- apply depth-based fills for DEPARE and DRGARE
- use a safety contour color for critical depth bands
- apply a stipple pattern to DRGARE-like features

3. Contours
- draw DEPCNT as thin line layers
- use dashed lines when QUAPOS indicates uncertainty
- reinforce the safety contour visually

4. Restricted areas
- add dashed boundaries
- apply pattern fills for RESARE and related classes
- use pattern images for anchoring/entry-prohibited features

5. Hazards and obstructions
- use stronger colors and symbolic markers for WRECKS, OBSTRN, UWTROC

6. Aids to navigation
- style buoys, beacons, lights, and sectors using attribute-driven symbol selection
- use semi-transparent sectors for lights

7. Soundings
- render as text labels rather than simple points
- use halo and contrast styling

8. Labels
- use text layers with halos and offsets
- derive labels from the relevant S-57 attributes

### Step 4: Introduce layer priority and render order

The current plugin does not express layer order explicitly. The guide requires a priority model.

Add a priority map such as:
- 10000 for base coverage and masks
- 20000 for land and major structure features
- 30000 for depth areas
- 35000 for restricted areas
- 50000 for contours
- 60000 for hazards
- 70000 for navigation aids
- 80000 for routing features
- 85000 for soundings
- 90000 for labels

Then sort layers by priority before registration.

### Step 5: Add zoom and display constraints

The guide emphasizes zoom-based visibility. Add a minimum zoom value per layer family and compute an effective minimum zoom from:
- the ENC purpose range,
- the class-specific minimum zoom.

Suggested implementation approach:
- define a minimum zoom table per layer family,
- apply it in the style/configuration step,
- avoid rendering dense features at very small scales.


### Step 7: Keep the UI but make it more informative

The existing uploader panel is a good starting point. It can be enhanced so the user can see:
- which S-57 classes were imported,
- which style families were applied,
- the active display category / zoom thresholds.

The plugin can still use the right panel registered through the GeoLibre API.

---

## 3. Concrete implementation checklist

### File updates

- [ ] Add a style registry module for S-57 classes and families
- [ ] Update [S57Convert/src/lib/utils/s57Converter.ts](S57Convert/src/lib/utils/s57Converter.ts) to preserve styling-relevant attributes
- [ ] Update [S57Convert/src/geolibre.ts](S57Convert/src/geolibre.ts) to apply family-based style selection and layer ordering
- [ ] Extend or replace the current simple style function with a richer rule engine
- [ ] Add optional pattern and symbol helpers for restricted areas, hazards, and navigation aids
- [ ] Add minimum zoom and priority metadata per layer family

### Feature checklist

- [ ] Land and depth areas receive visually distinct fills
- [ ] Contours use solid/dashed styles depending on certainty
- [ ] Restricted areas use outlines and patterns
- [ ] Hazards appear visually prominent
- [ ] Buoys/beacons/lights use attribute-driven symbols
- [ ] Soundings are rendered as labels with readable contrast
- [ ] Labels use halos and offset placement
- [ ] Layers render in the proper order from base to overlays

---

## 4. Suggested migration strategy

1. Start with style categories and color tokens.
2. Add one or two layer families first (for example land and depth areas).
3. Add contours and restricted areas next.
4. Then add hazards and navigation aids.
5. Finally add labels, soundings, and zoom constraints.

This keeps the work incremental and reduces the chance of breaking the import flow while the plugin is still being tested.

---

## 5. Notes for future work

The current plugin is a good data import foundation, but the styling guide requires a more semantically aware renderer. The most important move is to stop thinking of each layer as “just a class code with a color” and instead treat it as a chart feature that belongs to a visual family, has a priority, and must behave according to chart scale and maritime intent.
