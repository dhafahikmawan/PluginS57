# S-57 Conversion Analysis: Recovering Full Feature Attributes

## Problem Summary

The current conversion flow is functional, but it is still losing important S-57 information for a subset of object classes:

- LIGHTS features are missing sector-related attributes such as `SECTR1`, `SECTR2`, and related signal metadata.
- DEPARE / DRGARE features may be simplified too aggressively, losing some geometry detail or the full vertex structure needed for faithful rendering.

This is not necessarily a parser bug in the strict sense; it is more likely a combination of:

1. the current parser returning a simplified GeoJSON view,
2. the downstream transformation layer only preserving a subset of properties,
3. some S-57 features being represented in a way that requires richer access to the raw object model rather than the normalized output.

The goal should be to preserve the current S-57 parser as the baseline path, while adding one or more enrichment strategies for the classes that matter most.

---

## Proposed Solutions

### 1. Keep the existing parser and enrich the output post-conversion

Approach
- Keep the current parser as the default path.
- After parsing, inspect the feature properties and reconstruct missing values where possible.
- For LIGHTS, derive sector behavior from available attributes such as `VALNMR`, `COLOUR`, `SIGPER`, `LITCHR`, `SIGGRP`, and any available sector-related fields if present.
- For DEPARE, preserve the full ring geometry and enrich the feature with depth-related properties from the raw object model if they are available.

Why this helps
- It is the least disruptive option.
- It avoids removing the current parser and keeps the plugin behavior stable.
- It is the fastest way to improve output quality without rewriting the whole pipeline.

Pros
- Low implementation risk.
- Easy to test incrementally.
- Preserves current architecture.

Cons
- Some fields may still be unavailable if the parser does not expose them in its normalized output.
- Complex S-57 features may still be partially flattened.

Recommended use
- Use this as the first improvement layer for all feature classes.
- Good for immediate gains on labels, styling, and light-sector heuristics.

---

### 2. Hybrid pipeline: current parser for general support + GDAL/ogr2ogr for rich extraction

Approach
- Keep the current parser for compatibility and fallback.
- Add a richer path using GDAL/ogr2ogr or another standards-based S-57 reader where available.
- Prefer the richer path for object classes that need full attribute fidelity such as LIGHTS and DEPARE.
- Compare the two outputs and merge the richer attributes into the feature set produced by the current parser.

Why this helps
- GDAL is designed to work with maritime vector formats and is much more likely to preserve standard S-57 semantics.
- The richer path can expose full feature properties and geometry structures that the lightweight parser may simplify.

Pros
- Highest chance of recovering full or near-full feature detail.
- More standards-based and robust for real-world ENC datasets.
- Can be reused for future S-57 compatibility work.

Cons
- Heavier runtime dependency and more configuration complexity.
- Web/WASM integration can be more fragile than the current parser.
- May require careful mapping from GDAL output to the plugin’s expected schema.

Recommended use
- Best long-term solution.
- Best target for recovering the missing LIGHTS and DEPARE details without abandoning the existing parser.

---

### 3. Raw S-57 object inspection before GeoJSON conversion

Approach
- Instead of relying only on the normalized GeoJSON output, inspect the raw parsed S-57 objects and extract features from the underlying object records directly.
- For LIGHTS, inspect the complete object attributes and preserve all directly available sector-related values.
- For DEPARE, inspect the underlying geometry record and retain the full coordinate sequence rather than letting the conversion layer collapse it.

Why this helps
- Some important values may exist in the raw record model even when the simplified parser output drops them.
- This approach gives access to the full object structure before normalization.

Pros
- Maximizes fidelity.
- Enables custom mapping for object classes that are important to the plugin.

Cons
- Requires deeper knowledge of the S-57 object model.
- More implementation effort than simple property enrichment.
- Can be difficult to maintain if the parser’s internal structure changes.

Recommended use
- Use this when the richer parser path is not sufficient or when we need very specific control over a small number of object classes.

---

### 4. Custom object-class-specific enrichment rules

Approach
- Create object-specific logic for the classes that matter most rather than trying to make one generic conversion path solve everything.
- For LIGHTS, build a dedicated enrichment step that prioritizes sector and signal attributes.
- For DEPARE, build a dedicated geometry preservation step that ensures full polygon ring coordinates remain intact.

Why this helps
- S-57 is highly object-specific; a generic conversion usually loses fidelity.
- A class-focused approach is more maintainable than trying to preserve everything globally.

Pros
- Focused and practical.
- Easier to debug than a fully generic solution.
- Aligns well with the plugin’s current styling and layer logic.

Cons
- Requires manual rules and ongoing tuning.
- Some features will still be incomplete if the source data is not rich enough.

Recommended use
- This should be the implementation strategy for the plugin’s near-term improvements.

---

## Recommended Direction

The best path is a hybrid strategy:

1. Keep the current parser as the default conversion path.
2. Add object-specific enrichment logic for the most important classes:
   - LIGHTS: recover sector and signal metadata where available.
   - DEPARE / DRGARE: preserve full geometry and depth-related information.
3. Add a richer GDAL-based extraction path as a secondary source for those classes when the current parser output is incomplete.
4. Merge the richer values into the existing GeoJSON output rather than replacing the parser entirely.

This gives the plugin the best balance of:
- stability,
- compatibility,
- and feature fidelity.

---

## Suggested Implementation Plan

### Phase 1: Immediate improvements
- Preserve all available properties from the parser output.
- Add custom enrichment for LIGHTS and DEPARE.
- Introduce a simple feature-quality audit to compare:
  - number of features parsed,
  - number of properties preserved,
  - presence of sector/depth-related attributes.

### Phase 2: Richer fallback path
- Integrate GDAL/ogr2ogr as a secondary conversion route.
- For selected object classes, use GDAL output as the authoritative source when available.
- Merge the richer attributes into the plugin’s internal feature model.

### Phase 3: Validation and tuning
- Test against sample ENC files.
- Compare the parser output and the richer output side by side.
- Tune the merge logic until the important fields are preserved consistently.

---

## Conclusion

The main issue is not that the parser must be removed. The issue is that the plugin needs a richer feature-preservation strategy for specific S-57 objects.

The most practical solution is to keep the current parser, but layer on:
- object-specific enrichment,
- richer fallback extraction where possible,
- and a merge strategy that preserves the most valuable attributes instead of flattening them away.

That approach offers the best chance of recovering the missing LIGHTS sector information and the fuller DEPARE geometry without sacrificing the current pipeline.
