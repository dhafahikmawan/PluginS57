# SOUNDG_processed layer

## What it is

The `SOUNDG_processed` layer is a derived display layer created from the raw S-57 `SOUNDG` soundings layer. It is not a separate original ENC object class; instead, it is a preprocessing step used to make soundings easier to render as labeled depth values in a map-based application.

In practice, the raw `SOUNDG` data from the chart contains sounding points with depth values, but those values are not yet formatted in a way that the map UI can use directly for clean label rendering. The processed layer converts each sounding into a simpler feature set that carries explicit depth fields:

- `DEPTH`: the original numeric depth value
- `DEPTH_INT`: the integer part of the depth
- `DEPTH_DEC`: the decimal part, formatted for display

This makes it possible to draw sounding labels using styling logic that is consistent with nautical chart display conventions.

## Why this layer exists

A map application often needs a more presentation-friendly version of soundings because the raw `SOUNDG` features are not ideal for direct rendering in a browser or map view. The processed layer solves several issues:

1. It separates the depth into integer and decimal components so the UI can render them in a visually similar way to nautical charts.
2. It converts the geometry into a more uniform format that is easier to consume by the map renderer.
3. It provides a dedicated layer that the application can load instead of the original raw `SOUNDG` layer.
4. It enables the viewer to use the processed soundings for labeling and styling while keeping the original unprocessed layer available separately if needed.

## How it is generated

A typical generation workflow has two main stages:

1. Convert the ENC data into a more accessible geospatial format such as GeoJSON.
2. Post-process the extracted soundings into a display-oriented layer.

### 1. Convert the ENC into GeoJSON

In a standard workflow, the process begins by:

1. Taking an S-57 chart file as input.
2. Inspecting the available layers inside the ENC.
3. Exporting each layer to separate GeoJSON files for downstream use.
4. Including the raw `SOUNDG` layer as one of the extracted outputs.

At this stage, the chart data is available as a set of GeoJSON layers, including the raw sounding layer.

### 2. Process the raw soundings

Once the raw `SOUNDG` GeoJSON has been produced, a preprocessing step reads that data and creates a derived `SOUNDG_processed` layer.

For each sounding feature, it performs the following logic:

- Reads the feature geometry and properties.
- Extracts the depth value from the geometry coordinates.
- Splits the depth into:
  - integer part
  - decimal part, rounded to at most two decimal places
- Formats the decimal part using a decimal separator appropriate for the target display style.
- Adds or updates the feature properties with `DEPTH`, `DEPTH_INT`, and `DEPTH_DEC`.

### 3. Geometry handling

The processing script handles two geometry cases:

- If the feature geometry is a `Point`, the feature is kept as a point and its coordinates are reduced to the X/Y location while preserving the depth metadata.
- If the feature geometry is a `MultiPoint`, each member coordinate is converted into a separate `Point` feature. This is useful because each sounding point is effectively an individual label candidate in the renderer.

This produces a cleaned, feature-by-feature sounding dataset that is easier for the app to consume.

## How it is used in a map application

Once the processed GeoJSON is generated, the map application can load it instead of the raw `SOUNDG` layer.

In a typical integration:

- the original `SOUNDG` layer is skipped in favor of the processed version
- the derived layer is loaded as a display layer for sounding labels and styling
- the processed features are used when rendering depth values in the map view

## Summary

The `SOUNDG_processed` layer is a custom, workflow-generated representation of nautical sounding data. It is created from the raw S-57 `SOUNDG` layer by splitting each depth into integer and decimal parts and packaging them as explicit properties for rendering. This derived layer is then used as the preferred sounding layer for display and styling in a map-based workflow.
