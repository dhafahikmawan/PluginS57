# LIGHTS Object Class Workflow

## Overview
The S-57 object class LIGHTS is commonly handled as a dynamic point-symbol layer in web map viewers. Typical implementations do not rely on a prebuilt mapfile; instead, the client loads vector features (for example GeoJSON converted from ENC or another source), derives display properties from their attributes, and creates map layers at runtime using the chosen map library (MapLibre GL, Mapbox GL JS, Leaflet with plugins, etc.).

## 1. Where the LIGHTS data comes from
Source data for LIGHTS is typically provided as vector files (GeoJSON, TopoJSON, or similar) or exposed via vector tile services. Common layouts include dataset-level files or per-chart directories, for example:

- data/<dataset>/LIGHTS.geojson
- data/<dataset>/LITFLT.geojson
- data/<dataset>/<chart-id>/layers.json (an index of available layers)

When a chart or dataset is selected, the application reads an index manifest (if present) and fetches the listed vector files or endpoints. The LIGHTS layer is discovered via that manifest or explicit configuration and loaded as a FeatureCollection or equivalent runtime vector source.

## 2. How LIGHTS is loaded by the application
The loading flow is implemented in the application's map loader or data ingestion module.

### Load sequence (typical)
1. Initialize the map using the chosen map library.
2. When a dataset or chart is selected, run the map loader (e.g., `loadMap(chartId)` or equivalent).
3. Retrieve the manifest or layer index for the dataset (if used).
4. Iterate through listed layers and request each vector source or file.
5. When the LIGHTS or LITFLT layer is encountered, enrich features with derived metadata such as a computed label field (commonly named `_light_label` or similar).
6. Optionally generate an additional polygon layer representing light sectors from bearing/range attributes.

### Important attributes used from the GeoJSON feature properties
The LIGHTS features are expected to contain properties such as:

- CATLIT: category of light
- COLOUR: light color code(s)
- LITCHR: light character
- SIGGRP: signal grouping
- SIGPER: signal period
- VALNMR: nominal range
- SECTR1 and SECTR2: light sector bearings
- OBJNAM: object name

These values are what drive rendering and label creation.

## 3. How the label is derived
A utility function (for example `formatLightLabel()` or similar) should build a human-readable label from available light attributes.

Common components combined into the label include:

- a light characteristic such as F, Fl, Oc, Iso, etc.
- a signal group like (2)
- color codes such as W, R, G, Y
- a signal period like 5s
- nominal range like 15M

If key characteristic fields are missing, implementations typically fall back to a name field (OBJNAM or equivalent). The resulting label is stored on each feature (e.g., `_light_label`) and used by the text rendering layer.

## 4. How the symbol is rendered
After vector features are available, the application creates a symbol (icon) layer to render LIGHTS points.

Rendering logic maps feature properties to visual assets:

- `CATLIT` (category) values map to icon variants (directional, fog, leading-light, etc.).
- `COLOUR` values influence colorized assets or tinting rules (red, green, white, yellow, etc.).

Sprite or icon names are taken from the project's sprite atlas or an icon set; implementations should avoid hard-coded names and instead use a mapping table that associates attribute combinations with sprite identifiers. This keeps the rendering path adaptable to different sprite atlases or icon libraries.

## 5. How light sectors are rendered
When features include sector bearings (SECTR1/SECTR2) and a range, implementations often generate polygon sectors to visualize coverage.

A sector-generation utility typically:

1. Reads the point geometry for the light position.
2. Parses sector bearings and nominal range.
3. Converts bearings to the map library's angular convention.
4. Projects boundary points around the source location (using geodesic or planar approximations appropriate for the map projection).
5. Constructs polygon features and exposes them as a separate vector layer (commonly named something like `LIGHT_SECTORS`).

Render the sectors as a semi-transparent fill plus an outline. Color choices may follow the light's color attribute or a configurable style mapping. Keep generation code configurable so it can use precise geodesic math for large ranges or a simplified trigonometric approach for small-scale displays.

## 6. Label rendering
Label behavior is driven by application configuration (a style/config table or JSON). Typical mappings:

- LIGHTS -> uses the derived label field (e.g., `_light_label`).
- LITFLT -> uses the derived label with an optional prefix (e.g., `LtV`).

Create a dedicated symbol/text layer for labels configured with:

- `text-field` set to the derived label
- readable text size and scaling with zoom
- anchor and offset rules to avoid collisions
- halo or outline for legibility against map backgrounds

## 7. Styling and filtering rules
LIGHTS appearance is governed by styling and filtering systems that should be configurable:

- Zoom constraints: define min/max zoom ranges per layer or per dataset.
- Purpose or context-based zoom adjustments: allow charts/datasets to tweak effective visibility ranges.
- Display categories or layersets: control whether LIGHTS appear in different view modes (Base/Standard/All or custom modes).
- Color modes (day/dusk/night): adjust palette, contrast, and halo strengths; icons may be tinted or swapped for better visibility.

Keep these rules declarative in a configuration file or style object so different projects can adapt them without code changes.

## 8. Summary
A portable workflow for LIGHTS in web mapping applications includes:

- loading vector features (GeoJSON or vector tiles)
- enriching features with derived metadata (labels, computed fields)
- selecting symbols via attribute-driven mappings to an icon/sprite set
- optionally generating sector polygons from bearing and range attributes

Design the system so data sources, icon atlases, and style rules are configurable. This enables reuse across projects and allows teams to adapt the workflow to different datasets and rendering engines.
