# M_NPUB (Nautical Publication Information) Layer

This document describes the `M_NPUB` layer, its purpose in S-57 charts, and how it is loaded, styled, and queried in the map application.

---

## 1. What is the `M_NPUB` Layer?

In S-57 electronic navigational charts (ENCs), **`M_NPUB`** stands for **Nautical Publication Information**. It is a meta-object class (indicated by the `M_` prefix) rather than a physical geographical feature. 

A meta-object class defines attributes for an entire area rather than a specific physical object. For `M_NPUB`, the area represents a region to which a specific nautical publication applies (such as *Sailing Directions*, *Coast Pilots*, *Tide Tables*, or *List of Lights*).

### Why this layer exists
Navigational charts cannot possibly show all the textual details, rules, warnings, and sailing advice described in extensive printed or digital nautical books. Instead of cluttering the chart with text blocks, cartographers draw `M_NPUB` polygons to demarcate areas covered by these documents. A mariner can query the area to find exactly which chapter, page, or publication reference holds relevant information.

---

## 2. Key S-57 Attributes for `M_NPUB`

The `M_NPUB` layer carries several standard attributes containing references to nautical publications:

| Attribute Acronym | Attribute Name | Description & Usage |
| :--- | :--- | :--- |
| **`PUBREF`** | Publication reference | Identifies the specific book, chapter, section, or page number (e.g., *Sailing Directions Pub 123, Chapter 4*). |
| **`INFORM`** | Information | Free text carrying general remarks, descriptions, or short instructions. |
| **`TXTDSC`** | Textual description | The file name of an external text file containing more extensive descriptions or rules. |
| **`PICREP`** | Pictorial representation | The file name of a related picture, diagram, or diagrammatic map. |
| **`SCAMIN`** | Scale minimum | The minimum display scale at which the meta-object should remain visible. |

---

## 3. How the Layer is Styled in the App

To avoid obscuring the primary hydrographic data (such as depth contours, sounding values, and coastline elements), `M_NPUB` is styled as an **outline-only** layer without any filled color.

The rendering pipeline is defined in [config.js](../../config.js) and implemented in [app.js](../../app.js) and [s52_utils.js](../../s52_utils.js):

### 3.1 Style Definition
In the S-52 styling configuration (`config.js`), `M_NPUB` is defined under `areaOutlines`:

```javascript
"areaOutlines": {
    ...
    "M_NPUB": { "color": "CHGRY", "width": 1, "dash": true },
    ...
}
```

This specifies that the layer outline uses:
* **Color Token**: `CHGRY` (Grey)
* **Line Width**: `1` pixel
* **Line Pattern**: Dashed (since `dash: true`)

### 3.2 Dynamic Color Mode Resolution
The `CHGRY` color token is resolved dynamically at runtime using the active display mode. The hex colors used are defined in the S-52 color system (`Colors.md`):

| Display Mode | Token | Hex Color | Visual Appearance |
| :--- | :--- | :--- | :--- |
| **Day** | `CHGRY` | `#a3b4b7` | Light grey (unobtrusive border) |
| **Dusk** | `CHGRY` | `#5A6365` | Medium grey (dimmed border) |
| **Night** | `CHGRY` | `#1A1C1D` | Very dark charcoal grey (preserves night vision) |

### 3.3 MapLibre GL Layer Configuration
When the layer is loaded, [app.js](../../app.js) adds a `line` type layer to the MapLibre instance with the following layout and paint settings:

* **Layer ID**: `${sourceId}-layer` (e.g., `US5CA16M-M_NPUB-layer`)
* **Layer Type**: `'line'`
* **Paint Properties**:
  * `'line-color'`: resolved color for `CHGRY` based on the color mode (e.g., `#a3b4b7` in day mode).
  * `'line-width'`: `1`
  * `'line-dasharray'`: `[4, 4]` (since `dash` is `true`).

---

## 4. Layer Loading and Ordering

### 4.1 ECDIS Display Category
In S-52, chart features are grouped into display categories to help mariners declutter the screen. In [s52_utils.js](../../s52_utils.js), `M_NPUB` is grouped into the `otherFeatures` set:

```javascript
const otherFeatures = new Set([
    'SOUNDG', 'SOUNDG_processed', 'MAGVAR', 'LOCMAG', 'SEAARE', 
    'BUAARE', 'RIVERS', 'LAKARE', 'VEGATN', 'M_NPUB', 'M_NSYS', 
    'M_SREL', 'ADMARE', 'CONZNE', 'EXEZNE', 'TESARE', 'TIDEWY'
]);
```

* **Display Category Code**: `3` ("Other" / "Display All")
* **Behavior**: `M_NPUB` is **hidden** in "Base" (Category 1) and "Standard" (Category 2) views. It is only rendered when the display category is set to "Other" or "Display All" (Category 3 or 4 in the app UI).

### 4.2 Z-Order / Rendering Rank
The layers are sorted so that polygons render beneath lines, which render beneath points and labels.
* **Geometry Rank**: Because the source data is a Polygon outlining the publication boundary, its geometry type places it in **Rank 4** (Polygons) during sorting (`getRank` in `app_clean.js`) or priority **`39000`** in `getViewingGroup()`.
* **Visual Stack**: This ensures the dashed grey boundary line renders on top of solid background fills (such as land `LNDARE` and depth areas `DEPARE`), but underneath physical line features (like depth contours `DEPCNT`), point features (such as buoys, beacons, and lights), and text labels.

### 4.3 Zoom Level Constraints
* **Min/Max Zoom**: `M_NPUB` is not listed in `LAYER_MIN_ZOOM` inside `app_clean.js`. Thus, its group minimum zoom defaults to `0`.
* **Cell Zoom limits**: The effective visibility range is determined solely by the navigational purpose of the parent chart. For example, for a Harbour cell (Purpose 5), the cell's zoom range is `13` to `17`. Consequently, the `M_NPUB` boundary will render as soon as the cell itself is displayed (starting at zoom level 13).

---

## 5. Interaction & Pick Report

Since `M_NPUB` outlines define interactive metadata boundaries, they are responsive to user clicks:

1. **Map Cursor**: Hovering the cursor over an `M_NPUB` line changes the pointer style to `pointer`, indicating the feature is clickable.
2. **Object Query (Pick Report)**: Clicking inside the `M_NPUB` boundary queries the map's rendered features.
3. **Sidebar Display**: The sidebar panel (`#pick-report`) opens on the right side of the screen displaying:
   * **Header**: `M_NPUB`
   * **Properties Table**: Shows the raw key-value pairs stored in the feature's attributes (e.g. `PUBREF`, `INFORM`, `TXTDSC`).
