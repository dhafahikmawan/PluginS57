# Processing TSSLPT and TSS_ARROWS

This document explains, in general terms, how an ENC-style loader can process a `TSSLPT` point layer (traffic-separation-scheme limit/marker points) and synthesize a derived `TSS_ARROWS` layer used to indicate traffic flow direction. No project-specific filenames or code references are used; the guidance is implementation-agnostic.

## TSSLPT — input layer (points)

Overview: `TSSLPT` features are point geometries that mark key locations for traffic separation schemes (e.g., limit points, turning points, or arrow anchor points). Processing these features converts raw input into a map-ready layer with appropriate visibility, styling, and attribute interpretation.

Typical processing steps:

- Load & validate: read the GeoJSON/feature source and validate geometries and required attributes. Skip invalid geometries.
- Reproject: transform coordinates to the map projection used by the client (commonly Web Mercator) as early as possible.
- Attribute parsing: extract any attributes that indicate ordering, direction, or grouping. If the source contains explicit direction or sequence fields, preserve them for arrow synthesis.
- Visibility rules: apply scale and view filters (min/max scale or zoom ranges) and any feature-level visibility attributes so only relevant points are considered for rendering or derivation.
- Deduplication & filtering: collapse near-duplicate points and optionally filter points by confidence or completeness to avoid noisy arrow generation.
- Placement adjustments: apply small offsetting or anchor-point rules when symbols/labels would collide with other layers.
- Styling: prepare symbol style properties (icon, size, rotation anchor) and label text derived from attributes where applicable.
- Cache/packaging: group processed points into a temporary in-memory structure (e.g., `loadedLayers`) for subsequent sorting and rendering.

## TSS_ARROWS — derived layer (directional arrows)

Overview: `TSS_ARROWS` is a synthesized layer of linear or polygonal arrow features that visually indicate the intended traffic-flow direction for a traffic-separation scheme. It is not typically present in the raw ENC; it is generated from `TSSLPT` and/or related route/line features.

Derivation algorithm (general):

1. Source identification: identify the source features to use — usually ordered `TSSLPT` points, optionally combined with line features (boundaries) if available.
2. Ordering: sort points into logical sequences for each traffic lane or flow direction. Use explicit order attributes when present; otherwise infer order by proximity and directional consistency.
3. Segment construction: connect ordered points to form center-line segments. For each segment compute direction vectors and segment lengths.
4. Arrow placement: along each center-line place arrow geometries at regular intervals or at user-configurable positions. Arrows can be rendered as:
	- simple rotated point symbols (icon with rotation), or
	- short LineString/Polygon arrowheads constructed programmatically from the center-line and direction vector.
5. Geometry refinement: smooth long center-lines (optional), apply offsets from the center-line to avoid overlap with other features (e.g., separation boundaries), and clip arrows to tile or viewport bounds for performance.
6. Attribute assignment: attach properties describing the flow direction, source IDs, and any styling hints so the renderer or style engine can select appropriate paint rules.
7. Visibility & scale: apply the same or stricter visibility rules as the source points (for example, hide arrows at small scales or when zoomed out) to avoid clutter.

Implementation notes and best practices:

- Preserve source traceability: include references to the original `TSSLPT` feature IDs in derived arrow properties for debugging and updates.
- Performance: generate arrow geometries lazily (on first render or when needed) and cache results per-chart or per-tile to avoid repeated expensive geometry work.
- Styling separation: keep `TSS_ARROWS` as its own logical layer so styling (color, width, arrow size) can be tuned independently and so rendering order can be controlled by priority.
- Ordering and priority: insert `TSS_ARROWS` immediately after the layer(s) that produced them in the temporary layer list, and ensure priority sorting places arrows in the expected viewing-group band so they are visible above or below related features as required.
- Accessibility: ensure arrow symbols or alternate labels convey direction meaningfully for users relying on non-visual cues (e.g., tooltips or attribute fields).
- Testing: validate arrow direction against known samples and include automated checks for consistent arrow spacing and correct orientation when source attributes indicate direction.

## Example decisions to expose in an implementation

- `arrowInterval`: distance between repeated arrows along a lane.
- `arrowType`: `icon` (rotated symbol) vs `vector` (programmatic polygon).
- `minZoom` / `maxZoom`: zoom levels where arrows are rendered.
- `offsetMeters`: lateral offset from the center-line to place arrows outside separation boundaries.

These choices let integrators trade visual clarity, performance, and fidelity according to their users' needs.

