# Right Panel Styling Implementation Plan

This plan is written so either a junior programmer or an AI-assisted developer can implement and fix the styling of the GeoLibre right panel for the S-57 conversion plugin.

## Goal
Make the plugin's right panel look polished, consistent, and visually aligned with the proven reference plugin at:
- References/Panel Styling/geolibre-nasa-opera-0.3.0

The reference plugin is a strong model because it successfully styles a native right-side panel with:
- a clean card-based layout,
- subtle depth and borders,
- readable spacing,
- a consistent accent color,
- good dark/light theme behavior.

## What is already in place
The current plugin already has the right-panel structure and styling hooks:
- S57Convert/src/lib/geolibre/right-panel.ts
- S57Convert/src/lib/styles/plugin-control.css
- S57Convert/src/index.css

The panel body is being rendered, and the stylesheet already contains starter classes such as:
- .geolibre-plugin-right-panel
- .geolibre-panel-hero
- .geolibre-panel-card
- .geolibre-panel-list

## Reference plugin to copy from
Use the NASA OPERA plugin  as the visual reference (..\References\Panel Styling\geolibre-nasa-opera-0.3.0).

Key patterns to adopt:
1. A soft, modern panel surface with rounded corners.
2. A subtle border and shadow so the panel feels anchored to the host UI.
3. Clear heading and content hierarchy.
4. Compact spacing between sections.
5. A consistent accent color for badges, highlights, and bullets.
6. Responsive behavior so the panel still looks good in narrow or wide layouts.

## Implementation steps

### 1. Review and compare the reference styling at a technical level
Do not compare only by appearance. Compare the implementation details that determine whether the styles are actually applied by GeoLibre.

Required comparison points:
- Identify the exact CSS selectors used by the reference plugin and confirm whether the plugin body is styled through:
  - a top-level wrapper class,
  - nested descendant selectors,
  - direct child selectors,
  - element-level selectors such as h2, p, ul, li.
- Compare how the reference plugin attaches styling to the rendered panel body versus how this plugin attaches styling.
- Check whether the reference plugin uses a wrapper class that is present in the actual DOM at render time, and whether the current plugin uses the same pattern.
- Verify whether the current styles are scoped to the correct DOM subtree and whether the panel body is actually inside that subtree when GeoLibre renders it.
- Compare the CSS loading approach:
  - whether the stylesheet is imported at the plugin entry point,
  - whether the bundle includes the CSS,
  - whether the compiled plugin package includes the generated CSS asset,
  - whether the plugin JSON points to the correct stylesheet artifact.
- Compare how the reference plugin ensures its CSS is loaded by the host environment, especially when the host renders the panel outside the normal plugin root.
- Compare how the reference plugin uses CSS custom properties and theme tokens, and whether the current plugin exposes them at the right scope.
- Compare the structure of the DOM in the reference implementation to the current implementation in S57Convert/src/lib/geolibre/right-panel.ts.
  - Are the same wrapper classes present?
  - Are the same semantic sections present?
  - Are the elements created in the same order and with the same class names?
- Compare the specificity of selectors.
  - If the reference plugin works but this one does not, the issue is often caused by selector specificity, missing wrapper classes, or CSS not being applied to the correct generated DOM.
- Compare whether the reference plugin uses global selectors that are intentionally broad enough for the host-rendered panel content, while the current plugin uses selectors that are too narrow or not matching the actual markup.

### 2. Investigate the root cause before changing styles
Before editing CSS, confirm the likely technical cause of the failure.

Checklist:
- Is the right panel body actually rendered and visible?
- Are the expected CSS classes present in the DOM?
- Is the stylesheet loaded in the built plugin artifact?
- Does the CSS appear in the generated bundle or packaged plugin output?
- Is the plugin using the correct entry point or CSS asset path for GeoLibre packaging?
- Are there any selector mismatches caused by the host rendering the panel in a different subtree or wrapping the content differently?
- Is the issue caused by missing import, wrong CSS inclusion, or selector mismatch?

If the current plugin is failing while the reference plugin succeeds, treat the issue as an integration problem first, not just a styling problem.

### 2. Define a styling system for the right panel
Introduce a small consistent design system in the stylesheet:
- background color,
- panel border,
- panel shadow,
- text color,
- muted text color,
- accent color,
- card background,
- card border,
- spacing scale.

These values should be implemented as CSS custom properties so the panel remains easy to maintain and theme-friendly.

### 3. Refine the panel markup structure
If needed, improve the structure in the right-panel renderer so the DOM is easier to style.
Suggested structure:
- outer panel wrapper
- hero/intro section
- badge or status pill
- title and subtitle
- content cards or sections
- list items and supporting text

This makes the panel easier to style and more semantically clear.

### 4. Implement the visual styling in the plugin stylesheet
Update S57Convert/src/lib/styles/plugin-control.css to style the right-panel body using the following priorities:
- Panel container: padding, gap, border radius, background, shadow, overflow behavior.
- Hero section: background gradient or soft tint, border, spacing, and stronger hierarchy.
- Section cards: rounded corners, border, subtle background, consistent padding.
- Headings and subtitles: better contrast and spacing.
- Lists and bullet points: improved readability and accent styling.
- Scroll behavior: ensure long content stays usable.

### 5. Add dark-mode support
Make sure the panel looks correct in both light and dark themes.
- Use the existing theme variables where possible.
- Add dark overrides for panel surfaces, borders, text, and accent states.
- Avoid hardcoded colors that break in dark mode.

### 6. Fix layout issues and polish details
Check for and correct common issues such as:
- cramped spacing,
- inconsistent card widths,
- headings not aligned,
- poor contrast,
- pill or list styling that looks too plain,
- content that feels detached from the host panel chrome.

### 7. Verify the result in the app
After the CSS changes are made, verify that the panel:
- appears correctly when opened,
- has a polished layout,
- remains readable in both themes,
- does not overflow or clip awkwardly,
- matches the overall plugin UI quality.

## Suggested file changes
- S57Convert/src/lib/geolibre/right-panel.ts
  - adjust the DOM structure if needed for better styling control.
- S57Convert/src/lib/styles/plugin-control.css
  - add and refine the right-panel styles.
- S57Convert/src/index.css
  - ensure the stylesheet is imported correctly and remains the entry point for theme styling.

## Acceptance criteria
The task is complete when:
- the right panel looks visually polished and intentional,
- the styling is clearly inspired by the NASA OPERA reference plugin,
- the panel has consistent spacing, borders, shadows, and typography,
- the panel works correctly in light and dark mode,
- the layout remains clean and readable with the host GeoLibre panel chrome.

## Suggested implementation order
1. Copy the visual structure and color ideas from the reference plugin.
2. Add or refine CSS variables.
3. Style the hero section.
4. Style content cards and list sections.
5. Polish spacing and typography.
6. Verify the build and visual result.

## Notes for the executor
This should be treated as a UI polish task, not a structural rewrite. The plugin already has the right-panel infrastructure; the main job is to make it look professional and aligned with the successful reference plugin.
