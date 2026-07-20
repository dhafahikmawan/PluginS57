# Layer loading sequence (general guide)

This note documents the order used by a typical ENC loader for a chart index.

## 1. Derived classes added by the loader

The loader does not only follow the chart index. It also synthesizes additional layers during the same pass:

- `TSS_ARROWS` is generated from `TSSLPT`.
- `LIGHT_SECTORS` is generated from `LIGHTS`.

These are appended to the temporary layer list immediately after their source layer is processed.

## 2. Final render order after priority sorting

After collection, the loader sorts all layers by viewing-group priority (for example, from a `getViewingGroup()` lookup or equivalent). The effective drawing order is therefore:

1. `M_COVR` — priority `10000`
2. `LNDARE`, `SLCONS` — priority `20000`
3. `DEPARE`, `DRGARE` — priority `30000`
4. `RESARE` — priority `35000`
5. General polygon area classes such as `ACHARE`, `ARCSLN`, `DMPGRD`, `MIPARE`, `SEAARE`, `LNDRGN`, `PRCARE`, `TESARE`, `ISTZNE`, `CONZNE`, `COSARE`, `EXEZNE`, `ADMARE`, `CTNARE`, `TSEZNE`, `SBDARE` — priority `39000`
6. `DEPCNT` — priority `50000`
7. `UWTROC`, `OBSTRN`, `WRECKS` — priority `60000`
8. `BOYLAT`, `BOYCAR`, `BOYSPP`, `BOYISD`, `BOYSAW`, `BCNLAT`, `BCNCAR`, `BCNSPP`, `BCNISD`, `LIGHTS`, `LIGHT_SECTORS` — priority `70000`
9. `TSELNE`, `TSSBND`, `TSSLPT`, `TSS_ARROWS`, `NAVLNE`-style layers — priority `80000`
10. `SOUNDG`, `SOUNDG_processed` — priority `85000`
11. Label layers such as features ending in `_label` — priority `90000`

## 5. Important implementation detail

Within the same priority band, the loader preserves the order already present in the chart index. In practice, that means the final stack is:

- first the base sea/land/background classes,
- then contours and area outlines,
- then hazards and aids to navigation,
- then traffic and routing layers,
- then soundings,
- and finally labels.

This ordering is what gives the chart its layered visual hierarchy in the browser.
