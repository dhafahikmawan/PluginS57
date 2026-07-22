# Gap Analysis: Symbology and Drawing Instructions (S57Convert vs. SMAC-M)

This analysis details the difference in colors, patterns, and symbols used **per S-57 object class** between the **S57Convert Plugin** and the **SMAC-M Sample**. 

Since the plugin’s software environment is restrictive, we focus strictly on the visual design gaps (color choices, contour thresholds, symbol keys, and line styles) so that they can be adapted within the existing TypeScript style registry and icon mapping logic.

---

## 1. Depth Areas (`DEPARE`, `DRGARE`, `CANALS`, `DOCARE`, etc.)

### Gap Summary
* **Attribute Basis**: S57Convert classifies depths based on the minimum depth value (`DRVAL1`), whereas SMAC-M uses the maximum depth value (`DRVAL2`).
* **Depth Ranges**: SMAC-M includes five distinct styling classes, including a medium depth band (`DEPMD` 20–30 m) that is completely omitted in S57Convert.
* **Outlines**: S57Convert applies a continuous thin stroke around depth boundaries; SMAC-M templates do not draw boundaries for depth area fills.

### Detailed Class Differences

| Object Class / Criteria | S57Convert Plugin Style | SMAC-M Template Style |
| :--- | :--- | :--- |
| **Depth <= 0 m** | Fill: `COLORS.DEPIT` (`#83B295` - Green/Blue)<br>Outline: `#7D898C`, 0.5px (if `DRVAL1 < 0`) | Fill: `COLORS.DEPIT` (`#83B295`) (if `DRVAL2 <= 0`) |
| **Depth 0 - 2 m** | Fill: `COLORS.DEPVS` (`#73B6EF` - Very Shallow)<br>Outline: `#7D898C`, 0.5px (if `DRVAL1 < 2.0`) | Fill: `COLORS.DEPVS` (`#73B6EF`) (if `DRVAL2 > 0` and `< 10`) |
| **Depth 2 - 10 m** | Fill: `COLORS.DEPMS` (`#98C5F2` - Medium Shallow)<br>Outline: `#7D898C`, 0.5px | Fill: `COLORS.DEPVS` (`#73B6EF`) (if `DRVAL2 > 0` and `< 10`) |
| **Depth 10 - 20 m** | Fill: `COLORS.DEPMS` (`#98C5F2` - Medium Shallow)<br>Outline: `#7D898C`, 0.5px | Fill: `COLORS.DEPMS` (`#98C5F2`) (if `DRVAL2 >= 10` and `< 20`) |
| **Depth 20 - 30 m** | Fill: `COLORS.DEPMS` (`#98C5F2` - Medium Shallow)<br>Outline: `#7D898C`, 0.5px | Fill: `COLORS.DEPMD` (`#BAD5E1` - Medium Depth)<br>*Note: Missing color category in S57Convert.* |
| **Depth >= 30 m** | Fill: `COLORS.DEPDW` (`#D4EAEE` - Deep Water)<br>Outline: `#7D898C`, 0.5px | Fill: `COLORS.DEPDW` (`#D4EAEE`) (if `DRVAL2 >= 30`) |

---

## 2. Depth Contours (`DEPCNT`, `SLCONS`)

### Gap Summary
* **Safety Contour Distinction**: SMAC-M draws a distinct style (thicker line) for the Safety Contour where `VALDCO == 10`. S57Convert renders all contours with identical stroke weights and styles, only checking for uncertainty.
* **Labels**: SMAC-M generates inline text labels displaying the contour value rounded to the nearest decimal. S57Convert does not include inline labeling for contour lines.

### Detailed Class Differences

| Object Class / Criteria | S57Convert Plugin Style | SMAC-M Template Style |
| :--- | :--- | :--- |
| **Contour Line (`VALDCO == 10`)** | Color: `COLORS.DEPCN` (`#7D898C`) <br>Stroke Width: 1.0px | Color: `COLORS.DEPSC` (`#7D898C`) <br>Stroke Width: 0.9px (Conspicuous Safety Contour) |
| **Contour Line (`VALDCO != 10`)** | Color: `COLORS.DEPCN` (`#7D898C`) <br>Stroke Width: 1.0px | Color: `COLORS.DEPSC` (`#7D898C`) <br>Stroke Width: 0.6px (Standard Contour) |
| **Uncertain Contour** | Stroke Dasharray: `'4,4'` (if `QUAPOS === '2'` or `CONDTN === '2'`) | Rendered as solid. |
| **Contour Label** | None | Text Label: `round([VALDCO], 0.1)`<br>Color: `CHBLK` (`#070707`) <br>Font Size: 7 |

---

## 3. Lateral Buoys (`BOYLAT`)

### Gap Summary
* **Buoy Shapes**: SMAC-M maps buoys to detailed vector shapes depending on shape code `BOYSHP` (conical, can, spherical, pillar). S57Convert matches lateral buoys primarily by color, falling back to a single generic buoy icon shape.
* **Beacons & Dots**: SMAC-M adds sub-styles (such as a black beacon dot symbol) under spherical/pillar buoys for visual reference; S57Convert only draws a single sprite icon.

### Detailed Class Differences

| Object Class / Criteria | S57Convert Plugin Style | SMAC-M Template Style |
| :--- | :--- | :--- |
| **Conical Red (`BOYSHP == 1` & `COLOUR == 3`)** | Sprite Key: `BOYLAT_RED` (lateral red)<br>Size: 24 | Symbol: `BOYLAT14_MS`<br>Color: `CHRED` (`#CD4759`) <br>Outline: `OUTLW` (`#ffffff`), 0.3px |
| **Conical Green (`BOYSHP == 1` & `COLOUR == 4`)** | Sprite Key: `BOYLAT_GREEN` (lateral green)<br>Size: 24 | Symbol: `BOYLAT13_MS`<br>Color: `CHGRN` (`#59C249`) <br>Outline: `OUTLW` (`#ffffff`), 0.3px |
| **Can Red (`BOYSHP == 2` & `COLOUR == 3`)** | Sprite Key: `BOYLAT_RED` (lateral red)<br>Size: 24 | Symbol: `BOYLAT24_MS`<br>Color: `CHRED` (`#CD4759`) <br>Outline: `OUTLW` (`#ffffff`), 0.3px |
| **Can Green (`BOYSHP == 2` & `COLOUR == 4`)** | Sprite Key: `BOYLAT_GREEN` (lateral green)<br>Size: 24 | Symbol: `BOYLAT23_MS`<br>Color: `CHGRN` (`#59C249`) <br>Outline: `OUTLW` (`#ffffff`), 0.3px |
| **Spherical Buoy (`BOYSHP == 3`)** | Sprite Key: `BUOY_PREFERRED_PORT` (`BOYSPP`) | Symbol: `BOYSPP11_MS`<br>Color: `CHYLW` (`#D0BA3D`) + Secondary `beacon_dot` |
| **Pillar Buoy (`BOYSHP == 4`)** | Sprite Key: `BUOY_PREFERRED_PORT` (`BOYSPP`) | Symbol: `BOYSPP35_MS`<br>Color: `CHRED` or `CHGRN`<br>Outline: `OUTLW` (`#ffffff`), 0.2px |

---

## 4. Navigational Lights (`LIGHTS`)

### Gap Summary
* **Aero & Obstruction Classification**: SMAC-M defines custom rendering rules for aero lights (`CATLIT == 5`) and air obstruction lights (`CATLIT == 6`). S57Convert styles all lights with a single star shape and color-coded sprite options.
* **Rotation**: SMAC-M applies an explicit orientation angle of 225 degrees to the light star symbols. S57Convert uses un-rotated sprites.

### Detailed Class Differences

| Object Class / Criteria | S57Convert Plugin Style | SMAC-M Template Style |
| :--- | :--- | :--- |
| **Light - White (`COLOUR == 1`)** | Sprite Key: `LIGHTS`<br>Size: 20 | Symbol: `MS_LIGHTSxx`<br>Color: `CHYLW` (`#FFCE00`) <br>Outline: `OUTLW` (`#ffffff`), 0.6px <br>Angle: 225 |
| **Light - Red (`COLOUR == 3`)** | Sprite Key: `LIGHTS_RED`<br>Size: 20 | Symbol: `MS_LIGHTSxx`<br>Color: `CHRED` (`#CD4759`) <br>Outline: `OUTLW` (`#ffffff`), 0.6px <br>Angle: 225 |
| **Light - Green (`COLOUR == 4`)** | Sprite Key: `LIGHTS_GREEN`<br>Size: 20 | Symbol: `MS_LIGHTSxx`<br>Color: `CHGRN` (`#00A04D`) <br>Outline: `OUTLW` (`#ffffff`), 0.6px <br>Angle: 225 |
| **Light - Yellow (`COLOUR == 11` or `6`)** | Sprite Key: `LIGHTS_YELLOW`<br>Size: 20 | Symbol: `MS_LIGHTSxx`<br>Color: `CHYLW` (`#FFCE00`) <br>Outline: `OUTLW` (`#ffffff`), 0.6px <br>Angle: 225 |

---

## 5. Landmark Symbols (`LNDMRK`)

### Gap Summary
* **Categorization**: SMAC-M features comprehensive mapping patterns for buildings, towers, and chimneys using unique vector symbol graphics. S57Convert maps all landmark instances to a single fallback landmark sprite (`LNDMRK`).

---

## Recommendations for Adapting to the S57Convert Plugin

To reconcile these differences within the plugin's existing design constraints:
1. **Update `buildDepthStyle`**:
   * Change depth evaluation from `DRVAL1` to `DRVAL2`.
   * Add the missing `DEPMD` color band for depth ranges between `20` and `30` meters.
2. **Refine `buildContourStyle`**:
   * Add a conditional statement to check if `VALDCO === 10` (or another safety contour threshold) to assign a thicker `strokeWidth` (e.g., `1.8` vs `1.0`).
3. **Enhance `selectBuoySprite`**:
   * Update the buoy selection logic to pair shape (`BOYSHP`) with colors when choosing the sprite key, instead of overriding buoy shape checks with a generic class match.
