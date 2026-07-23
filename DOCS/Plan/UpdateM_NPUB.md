# Update M_NPUB Layer Behavior

## Goal
Implement `M_NPUB` layer behavior so it matches the project analysis in `/DOCS/Analysis/m_npub.md`.

## Scope
Focus on S-57 chart rendering and interaction behavior for the `M_NPUB` meta-object layer.

## Objectives
- Render `M_NPUB` as an outline-only line layer with dashed grey styling.
- Ensure visibility follows the application display category rules: hidden in Base/Standard, visible in "Other"/"Display All".
- Keep `M_NPUB` in the correct rendering order: above polygon fills, below physical line and point features.
- Preserve interactive query behavior so `M_NPUB` click/pick reports show its attributes.

## Relevant Files
- `S57Convert/src/lib/styles/s57StyleRegistry.ts`
- `S57Convert/src/lib/utils/s57ObjectClasses.ts`
- Possibly UI or layer-grouping files that define display categories or label classes

## Requirements
1. `M_NPUB` should use `CHGRY` stroke color.
2. Line width should be `1` pixel.
3. Line style should be dashed; use a dash pattern such as `[4, 4]`.
4. The layer should be assigned to the `otherFeatures` display category / "Other" display group.
5. It should not appear in Base/Standard category views.
6. Rendering order must place `M_NPUB` after fill layers and before line/point detail layers.
7. The layer should remain interactive and return the raw `M_NPUB` attributes (`PUBREF`, `INFORM`, `TXTDSC`, `PICREP`, `SCAMIN`, etc.) in a pick report.

## Implementation Tasks
1. Review `s57StyleRegistry.ts` for how layer styles are selected and applied.
   - Confirm `CHGRY` is resolved correctly from the color palette.
   - Add or update an `M_NPUB` style entry with:
     - `family`: appropriate family (likely `other` or `navigation`)
     - `strokeColor`: `CHGRY`
     - `strokeWidth`: `1`
     - `strokeDasharray`: `'4,4'`

2. Verify `M_NPUB` is grouped correctly in feature category sets.
   - If the app uses sets such as `otherFeatures`, ensure `M_NPUB` is included and not removed.
   - Check if `M_NPUB` is currently treated as a label class; if so, confirm it does not prevent line rendering.

3. Confirm display category visibility behavior.
   - Locate the code that maps S-57 classes to display categories.
   - Ensure `M_NPUB` is only enabled for category 3/4 and disabled for category 1/2.

4. Validate rendering order.
   - Confirm `M_NPUB` is classified as polygon outline geometry in the rendering pipeline.
   - If the app sorts layers by rank or priority, ensure `M_NPUB` sits between polygon fills and line/point features.

5. Preserve or add interaction support.
   - Confirm that the layer is queryable when clicked.
   - Ensure the pick report includes `M_NPUB` attributes and uses the correct feature type label.

## Testing
- Unit test style selection for `M_NPUB` if style registry has automated tests.
- Manual test in the UI:
  1. Load a chart containing `M_NPUB`.
  2. Switch display categories to Base/Standard and verify `M_NPUB` is hidden.
  3. Switch to Other/Display All and verify `M_NPUB` is visible.
  4. Confirm the line is dashed grey with width 1.
  5. Click or query `M_NPUB` and verify the sidebar shows raw layer properties.

## Notes for a Junior Developer
- Use `/DOCS/Analysis/m_npub.md` as the behavior specification.
- Keep changes small and focused in the styling and layer grouping code.
- Avoid broad refactors; the goal is to align existing behavior with the documented `M_NPUB` rules.
- If uncertain where display categories are assigned, search for `otherFeatures`, `display category`, and `M_NPUB` in the source.
