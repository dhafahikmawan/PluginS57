# Zoom visibility summary for S-57 object class layers

This document summarizes when each object-class layer appears or disappears in the current implementation. The current logic uses two separate zoom controls:

- the ENC purpose range (overview, general, coastal, approach, harbour, berthing)
- the layer-specific minimum zoom threshold from the configuration table

The effective visibility for a layer is computed as:

- effective minimum zoom = max(ENC purpose minimum zoom, layer-specific minimum zoom)
- effective maximum zoom = ENC purpose maximum zoom

In practice:

- below the effective minimum zoom, the layer does not appear
- between the effective minimum and maximum zoom, the layer appears
- above the effective maximum zoom, the layer disappears again

## 1. ENC purpose zoom ranges

| Purpose code | Use case | Minimum zoom | Maximum zoom |
| --- | --- | ---: | ---: |
| 1 | Overview | 0 | 9 |
| 2 | General | 7 | 10 |
| 3 | Coastal | 9 | 12 |
| 4 | Approach | 11 | 14 |
| 5 | Harbour | 13 | 17 |
| 6 | Berthing | 16 | 22 |

## 2. Layer groups with the same or similar zoom behavior

### Reference table

| Layer group | Typical layers | Typical zoom behavior | Notes |
| --- | --- | --- | --- |
| Base chart context | LNDARE, DEPARE, DRGARE, COALNE, FLODOC, PONTON, UNSARE, HULKES, LAKARE, BUAARE, RIVERS, CANALS, ROADWY, SLCONS, BRIDGE | Visible from the chart purpose minimum up to the purpose maximum | These are the earliest and most persistent layers |
| Depth and contours | DEPCNT, SOUNDG_processed | Appear once the chart is zoomed in enough for detail | Contours appear earlier; soundings appear later |
| Area and place-name context | SEAARE, LNDRGN, SBDARE | Appear at mid-scale once regional context becomes legible | Their visibility is slightly later than base layers |
| Restricted and regulated areas | RESARE, MIPARE, ISTZNE, PRCARE, COSARE, CONZNE, ADMARE, CTNARE, EXEZNE, RECTRC, TSELNE, TSSBND, TSEZNE | Appear at mid-scale for navigation and route planning | Mostly intended for safety and traffic-related context |
| Infrastructure detail | ACHARE, DMPGRD, CBLSUB, PIPSOL, PIPOHD, CBLOHD | Appear only at higher zoom | These are more specialized detail layers |
| Navigation aids and hazards | BOYLAT, BOYCAR, BOYSPP, BOYISD, BOYSAW, BCNLAT, BCNSPP, BCNCAR, BCNISD, LIGHTS, LITFLT, WRECKS, UWTROC, OBSTRN, LNDMRK, TOPMAR, PILBOP, MORFAC, BERTHS, CRANES | Appear only at close zoom | These are the most detailed and most clutter-prone layers |

### A. Base chart layers: purpose-range driven visibility

These layers are treated as fundamental chart background layers. Their visibility is controlled mainly by the ENC purpose range, because their own minimum zoom is effectively 0.

Layers:
- LNDARE
- DEPARE
- DRGARE
- COALNE
- FLODOC
- PONTON
- UNSARE
- HULKES
- LAKARE
- BUAARE
- RIVERS
- CANALS
- ROADWY
- SLCONS
- BRIDGE

Behavior:
- They appear as soon as the current chart purpose range begins.
- They remain visible until the purpose maximum zoom is reached.
- They do not appear at smaller scales than the purpose minimum because the ENC purpose range is the controlling factor.

Examples:
- Purpose 2 (General): visible from zoom 7 to 10
- Purpose 3 (Coastal): visible from zoom 9 to 12
- Purpose 5 (Harbour): visible from zoom 13 to 17

### B. Depth and sounding layers: medium-scale detail

These layers appear later because they are more detail-oriented and are not useful at very small scales.

Layers:
- DEPCNT
- SOUNDG_processed

Behavior:
- DEPCNT uses a minimum zoom of 5, so it becomes visible once the map is zoomed in enough for contour detail.
- SOUNDG_processed uses a minimum zoom of 7, so it appears later than contours.
- Their effective minimum zoom is the higher of the purpose minimum and the layer threshold.
- They disappear again once the purpose maximum zoom is exceeded.

Examples:
- Purpose 2: DEPCNT appears from zoom 7; SOUNDG_processed also appears from zoom 7
- Purpose 3: both appear from zoom 9
- Purpose 5: both appear from zoom 13

### C. Area and place-name layers: early text and regional context

These layers are meant to show sea/land areas and names once the chart has enough scale to be legible.

Layers:
- SEAARE
- LNDRGN
- SBDARE

Behavior:
- SEAARE starts at zoom 4, but the ENC purpose minimum can increase that floor.
- LNDRGN starts at zoom 5.
- SBDARE starts later at zoom 8.
- These layers do not appear at very small scales because they are mostly context and label layers.

Examples:
- In a Purpose 2 chart, SEAARE and LNDRGN appear from zoom 7, while SBDARE appears from zoom 8
- In a Purpose 3 chart, they appear from zoom 9 or above depending on the purpose minimum

### D. Restricted and regulated area layers: moderate-scale regulatory detail

These layers are relevant once the chart is zoomed in enough to show safety restrictions, traffic zones, and regulated areas.

Layers:
- RESARE
- MIPARE
- ISTZNE
- PRCARE
- COSARE
- CONZNE
- ADMARE
- CTNARE
- EXEZNE
- RECTRC
- TSELNE
- TSSBND
- TSEZNE

Behavior:
- These layers use a minimum zoom of 7.
- If the ENC purpose minimum is higher, that higher purpose minimum becomes the actual visible floor.
- They do not appear at overview scales and are intended for mid-zoom navigation and route planning.

Examples:
- Purpose 2: visible from zoom 7 to 10
- Purpose 4: visible from zoom 11 to 14
- Purpose 6: visible from zoom 16 to 22

Additional detail layers in this group:
- ACHARE uses a minimum zoom of 8
- DMPGRD uses a minimum zoom of 9

### E. Cables and pipelines: detailed infrastructure layers

Layers:
- CBLSUB
- PIPSOL
- PIPOHD
- CBLOHD

Behavior:
- CBLSUB and PIPSOL start at zoom 9
- PIPOHD and CBLOHD start slightly later at zoom 10
- These layers are absent at small scales because they are infrastructure/detail features rather than general chart context.

### F. Navigation aids and hazards: high-detail layers

These layers appear only when the chart is zoomed in close enough for marks, lights, hazards, and nearby structures.

Layers:
- BOYLAT
- BOYCAR
- BOYSPP
- BOYISD
- BOYSAW
- BCNLAT
- BCNSPP
- BCNCAR
- BCNISD
- LIGHTS
- LITFLT
- WRECKS
- UWTROC
- OBSTRN
- LNDMRK
- TOPMAR
- PILBOP
- MORFAC
- BERTHS
- CRANES

Behavior:
- Buoys and beacons begin at zoom 10
- LIGHTS begin at zoom 9
- LITFLT and MORFAC begin at zoom 11
- TOPMAR begins at zoom 12
- BERTHS and CRANES begin at zoom 12
- These layers are intentionally absent at small scales so the chart does not become cluttered.

## 3. Layer-by-layer zoom summary

### Always visible from the purpose range upward

These layers appear as soon as the chart purpose range begins and stay visible until the purpose maximum zoom:
- LNDARE
- DEPARE
- DRGARE
- COALNE
- FLODOC
- PONTON
- UNSARE
- HULKES
- LAKARE
- BUAARE
- RIVERS
- CANALS
- ROADWY
- SLCONS
- BRIDGE

### Appear once the chart is zoomed in for mid-scale detail

These layers become visible after the purpose minimum, or after their own threshold if that threshold is higher:
- DEPCNT
- SOUNDG_processed
- SEAARE
- LNDRGN
- SBDARE
- RESARE
- MIPARE
- ISTZNE
- PRCARE
- COSARE
- CONZNE
- RECTRC
- TSELNE
- TSSBND
- TSEZNE
- CTNARE
- EXEZNE
- ADMARE

### Appear only at higher zoom for detailed infrastructure

These layers do not show up at overview or general scales:
- ACHARE
- DMPGRD
- CBLSUB
- PIPSOL
- PIPOHD
- CBLOHD

### Appear only at close zoom for navigation and hazards

These layers are intentionally late-appearing because they are highly detailed and visually busy:
- LIGHTS
- WRECKS
- UWTROC
- OBSTRN
- LNDMRK
- BOYLAT
- BOYCAR
- BOYSPP
- BOYISD
- BOYSAW
- BCNLAT
- BCNSPP
- BCNCAR
- BCNISD
- LITFLT
- TOPMAR
- PILBOP
- MORFAC
- BERTHS
- CRANES

## 4. Practical interpretation

The zoom behavior is not random; it follows a clear hierarchy:

1. Base chart context appears first
2. Depth and area context appear next
3. Restricted and traffic-related information appears at medium zoom
4. Detailed hazards and navigation aids appear only at close zoom

This is why the chart remains readable at small scales but becomes progressively more detailed as the user zooms in.
