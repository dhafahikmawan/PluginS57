# Old Plugin Style Snapshot

This note captures the pre-change styling behavior that was being replaced by the layer remap work described in [DOCS/Analysis/LayerAnalysis/LayerToUpdate.md](DOCS/Analysis/LayerAnalysis/LayerToUpdate.md) and [DOCS/Analysis/LayerAnalysis/CompleteLayerAnalysis.md](DOCS/Analysis/LayerAnalysis/CompleteLayerAnalysis.md).

## Summary of the previous plugin baseline

Before the update, the registry defaulted many layer classes to a generic fallback style rather than the sample-style treatment in `Samples/MAP`:

- `base` fallback used `fillColor = CHGRY` with `fillOpacity = 0.4` and `strokeColor = DEPCN`, `strokeWidth = 1`.
- Most area-style classes such as `AIRARE`, `ADMARE`, `FSHFAC`, `HRBFAC`, `LNDRGN`, `RECTRC`, and `SBDARE` were effectively falling through to that generic fallback or a land/depth family that did not match the sample outline behavior.
- Restricted and cable classes such as `CBLOHD`, `CBLSUB`, `DMPGRD`, and `MIPARE` were being rendered through restricted-area pattern logic instead of the sample dashed outline styles.
- Depth and river polygons were using the generic depth fill palette with a thin `DEPCN` outline, while the sample styling expects more specific fill/outline combinations for `DRGARE` and `RIVERS`.
- `BUAARE`, `BUISGL`, `PYLONS`, and `SILTNK` were primarily treated as generic land fills rather than their sample brown fills.
- `PONTON` and `SLOTOP` were not aligned with the sample line/area expectations.

## Notable pre-change patterns

- `ADMARE`, `FSHFAC`, `HRBFAC`, `LNDRGN`, `RECTRC`, `SBDARE` were mostly generic outline/fallback cases.
- `CBLOHD` used restricted-area pattern styling with magenta dashed outlines rather than the sample grey dashed line.
- `CBLSUB` used the restricted palette rather than the sample thin magenta dashed line.
- `DRGARE` used the normal depth style with a thin solid `DEPCN` contour instead of the sample dashed outline.
- `AIRARE`, `LNDARE`, `BUAARE`, `BUISGL`, `PYLONS`, `SILTNK`, and `PONTON` leaned on the generic `land` family defaults rather than the sample brown fill palette.

## Change intent

The updated selector now prioritizes the `Samples/MAP` styling contract for the listed classes, using explicit overrides for:

- land fill and area brown fills,
- dashed outline-only shapes for administrative, navigation, and traffic-area classes,
- depth-family routing for `DEPARE` and `RIVERS`,
- `DRGARE` dashed grey outline behavior,
- `WRECKS` and hazard navigation symbols, and
- the restricted/cable outline styles expected by the samples.

This document serves as the before-state reference so the layer remap can be reviewed against the original plugin behavior.
