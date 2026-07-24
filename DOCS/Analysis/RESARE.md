# RESARE (Restricted Area) Layer Styling Guide

The `RESARE` (Restricted Area) layer is styled using a combination of line strokes for the boundary, patterned fills for the area, and text labels for identification. The styling adapts based on the specific restriction types defined in the data attributes.

## 1. Line Styling (Boundary)
The boundary of the restricted area is depicted using a dashed line to indicate that it is a demarcated zone rather than a physical barrier.
* **Color**: Magenta (`#c545c3` or `TRFCD` color token)
* **Width**: 2 pixels
* **Dash Pattern**: `[4, 4]` (4 pixels dashed, 4 pixels gap)

## 2. Fill Styling (Area Pattern)
The interior of the restricted area is styled with a fill pattern that varies depending on the `RESTRN` (Restriction) attribute. This attribute often contains comma-separated values or arrays indicating multiple restriction rules.

* **Default / Base Pattern**: A magenta hash pattern generated dynamically (e.g., using a 16x16 canvas with a stroke color of `rgba(197, 69, 195, 0.4)`).
* **Opacity**: 1.0 (The transparency is typically handled within the pattern graphic itself).
* **Conditional Patterns**:
  * **Anchoring Prohibited**: If the `RESTRN` attribute contains the value `'1'`, the fill uses a specific "No Anchoring" pattern (`NOANCHR_pattern`).
  * **Entry Prohibited**: If the `RESTRN` attribute contains the value `'14'`, the fill uses an "Entry Prohibited" pattern (`ENTPRO_pattern`).

## 3. Labels (Text)
Text annotations for the restricted area use the object name attribute to display relevant information to the user.
* **Text Field**: Driven by the `OBJNAM` (Object Name) attribute.
* **Text Color**: Magenta (`#c545c3` or `TRFCD` color token), matching the boundary color for visual consistency.
* **Prefix / Suffix**: None.

## 4. Layer Ordering / Z-Index
In a stacked map environment, the `RESARE` polygons are typically assigned a specific sorting index (e.g., `35000`) to ensure they render above generic sea or land areas but below navigational markers, cables, and text labels.
