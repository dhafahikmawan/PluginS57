# S-57 Object Class to Sprite Icon Index

This document maps S-57 object classes and their associated attributes to the corresponding symbol keys in `sprite.json` (based on the SMAC-M chart symbol system).

The mapping is dynamically resolved at runtime in the plugin by [iconHelper.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/utils/iconHelper.ts).

---

## 1. Summary of Sprite Keys

The table below lists all sprite keys defined in `sprite.json` that are utilized by the S-57 plugin converter.

| Sprite Key | Symbol Designator | Description |
| :--- | :--- | :--- |
| `LIGHTS11` | Yellow/White Light | Generic or white/yellow light symbol |
| `LIGHTS12` | Red Light | Red light symbol |
| `LIGHTS13` | Green Light | Green light symbol |
| `LITFLT01` | Light Float / Vessel | Light float or light vessel generic symbol |
| `BOYLAT13` | Port Lateral Buoy | Port-hand (red) lateral buoy |
| `BOYLAT14` | Starboard Lateral Buoy | Starboard-hand (green) lateral buoy |
| `BOYCAR01` | North Cardinal Buoy | North cardinal buoy symbol |
| `BOYCAR02` | East Cardinal Buoy | East cardinal buoy symbol |
| `BOYCAR03` | South Cardinal Buoy | South cardinal buoy symbol |
| `BOYCAR04` | West Cardinal Buoy | West cardinal buoy symbol |
| `BOYISD12` | Isolated Danger Buoy | Isolated danger buoy symbol |
| `BOYSAW12` | Safe Water Buoy | Safe water buoy symbol |
| `BOYSPP11` | Special Purpose Buoy | Special purpose buoy symbol |
| `BOYSPP15` | Preferred Port Buoy | Preferred channel to port (red over green) buoy |
| `BOYSPP25` | Preferred Starboard Buoy| Preferred channel to starboard (green over red) buoy |
| `BCNLAT15` | Port Lateral Beacon | Port-hand (red) lateral beacon |
| `BCNLAT16` | Starboard Lateral Beacon | Starboard-hand (green) lateral beacon |
| `BCNLAT21` | Generic Lateral Beacon | Generic lateral beacon (stick shape) |
| `BCNCAR01` | North Cardinal Beacon | North cardinal beacon symbol |
| `BCNCAR02` | East Cardinal Beacon | East cardinal beacon symbol |
| `BCNCAR03` | South Cardinal Beacon | South cardinal beacon symbol |
| `BCNCAR04` | West Cardinal Beacon | West cardinal beacon symbol |
| `BCNISD21` | Isolated Danger Beacon | Isolated danger beacon symbol |
| `BCNSPP21` | Special Purpose Beacon | Special purpose beacon symbol |
| `WRECKS01` | Generic Wreck | Wreck (generic or submerged) |
| `WRECKS04` | Dangerous Wreck | Dangerous wreck, depth uncertain |
| `WRECKS05` | Visible Wreck | Wreck with mast/funnel visible above water |
| `UWTROC03` | Uncovering Rock | Underwater rock that covers and uncovers |
| `UWTROC04` | Submerged Rock | Underwater rock that is always submerged |
| `OBSTRN01` | Obstruction | Generic obstruction or foul ground |
| `OBSTRN11` | Rock Awash | Obstruction/rock awash at low water |
| `TOWERS01` | Tower | Generic tower landmark |
| `CHIMNY01` | Chimney | Chimney landmark |
| `FLGSTF01` | Flagstaff | Flagstaff/flagpole landmark |
| `MSTCON04` | Mast | Mast landmark |
| `MONUMT02` | Monument | Monument landmark |
| `DANGER01` | Generic Danger | Fallback icon for unknown point classes |

---

## 2. Object Class Mapping Rules

### Navigational Lights (`LIGHTS`)
Determined by the `COLOUR` attribute:
*   `COLOUR` contains `3` (Red) $\rightarrow$ `LIGHTS12`
*   `COLOUR` contains `4` (Green) $\rightarrow$ `LIGHTS13`
*   `COLOUR` contains `6` (Yellow) or `2` (Black) or `1` (White) or missing $\rightarrow$ `LIGHTS11`

### Light Vessels & Light Floats (`LITFLT`)
*   Always maps to $\rightarrow$ `LITFLT01`

### Buoys (`BOYLAT`, `BOYCAR`, `BOYSPP`, `BOYISD`, `BOYSAW`)
Resolved hierarchically by class default, shape, category, and cardinal direction.

1.  **Class Default Resolution (based on `COLOUR`):**
    *   `BOYLAT`: `COLOUR` contains `3` (Red) $\rightarrow$ `BOYLAT13`, otherwise `BOYLAT14` (Green)
    *   `BOYCAR`: Defaults to `BOYCAR01` (North cardinal)
    *   `BOYISD`: Defaults to `BOYISD12` (Isolated danger)
    *   `BOYSAW`: Defaults to `BOYSAW12` (Safe water)
    *   `BOYSPP`: Defaults to `BOYSPP11` (Special purpose)
    *   Other: Defaults to `BOYCAR01`

2.  **Buoy Shape Override (`BOYSHP`):**
    *   `1` (Conical) $\rightarrow$ `BOYLAT13` (Port hand/red)
    *   `2` (Can), `3` (Spherical), `4` (Pillar), `5` (Spar) $\rightarrow$ `BOYLAT14` (Starboard hand/green)
    *   `6` (Tower), `7` (T-shaped), `8` (Cross), `9` (X-shaped) $\rightarrow$ `BOYCAR01` (Generic cardinal shape)

3.  **Buoy Category Override (`CATBOY` or `CATBUA` - High Priority):**
    *   `1` (Port hand) $\rightarrow$ `BOYLAT13`
    *   `2` (Starboard hand) $\rightarrow$ `BOYLAT14`
    *   `3` (Preferred channel to port) $\rightarrow$ `BOYSPP15`
    *   `4` (Preferred channel to starboard) $\rightarrow$ `BOYSPP25`
    *   `5` (Isolated danger) $\rightarrow$ `BOYISD12`
    *   `6` (Safe water) $\rightarrow$ `BOYSAW12`
    *   `7` (Special mark) $\rightarrow$ `BOYSPP11`
    *   `8` (Light vessel / LANBY), `9` (LANBY) $\rightarrow$ `BOYCAR01` (Generic)

4.  **Cardinal Direction Override (`CATCRD` for `BOYCAR` only):**
    *   `1` (North) $\rightarrow$ `BOYCAR01`
    *   `2` (East) $\rightarrow$ `BOYCAR02`
    *   `3` (South) $\rightarrow$ `BOYCAR03`
    *   `4` (West) $\rightarrow$ `BOYCAR04`

### Beacons (`BCNLAT`, `BCNCAR`, `BCNSPP`, `BCNISD`)
Resolved hierarchically by class default, shape, and cardinal direction.

1.  **Class Default Resolution (based on `COLOUR`):**
    *   `BCNLAT`: `COLOUR` contains `3` (Red) $\rightarrow$ `BCNLAT15`, otherwise `BCNLAT16` (Green)
    *   `BCNCAR`: Defaults to `BCNCAR01` (North cardinal)
    *   `BCNISD`: Defaults to `BCNISD21` (Isolated danger)
    *   `BCNSPP`: Defaults to `BCNSPP21` (Special purpose)
    *   Other: Defaults to `BCNLAT21` (Generic stick beacon)

2.  **Beacon Shape Override (`BCNSHP` or `CATBCN`):**
    *   `1` (Stake), `2` (Pole), `3` (Towers), `4` (Lattice) $\rightarrow$ `BCNLAT21` (Generic stick beacon)

3.  **Cardinal Direction Override (`CATCRD` for `BCNCAR` only):**
    *   `1` (North) $\rightarrow$ `BCNCAR01`
    *   `2` (East) $\rightarrow$ `BCNCAR02`
    *   `3` (South) $\rightarrow$ `BCNCAR03`
    *   `4` (West) $\rightarrow$ `BCNCAR04`

### Wrecks (`WRECKS`)
Resolved by category of wreck (`CATWRK`):
*   `1` (Non-dangerous, but mapped as dangerous fallback) $\rightarrow$ `WRECKS04`
*   `2` (Dangerous wreck) $\rightarrow$ `WRECKS04`
*   `3` (Distributed remains) $\rightarrow$ `WRECKS01`
*   `4` (Mast/funnel visible) or `5` (Hull visible) $\rightarrow$ `WRECKS05`
*   Missing / other $\rightarrow$ `WRECKS01` (Generic/submerged wreck)

### Underwater Rocks (`UWTROC`)
Resolved by water level effect (`WATLEV`):
*   `3` (Always submerged) $\rightarrow$ `UWTROC04`
*   Otherwise (covers/uncovers, awash, etc.) $\rightarrow$ `UWTROC03`

### Obstructions (`OBSTRN`)
Resolved by water level effect (`WATLEV`):
*   `5` (Awash) $\rightarrow$ `OBSTRN11`
*   Otherwise $\rightarrow$ `OBSTRN01`

### Landmarks (`LNDMRK`)
Resolved by category of landmark (`CATLMK`):
*   `3` (Chimney) $\rightarrow$ `CHIMNY01`
*   `5` (Flagstaff) $\rightarrow$ `FLGSTF01`
*   `7` (Mast) $\rightarrow$ `MSTCON04`
*   `9` (Monument) $\rightarrow$ `MONUMT02`
*   `17` (Tower) $\rightarrow$ `TOWERS01`
*   Missing / other $\rightarrow$ `TOWERS01` (Generic tower fallback)

### Unknown Point Classes
Any other unmapped classes default to $\rightarrow$ `DANGER01` (Generic danger / unknown point).
