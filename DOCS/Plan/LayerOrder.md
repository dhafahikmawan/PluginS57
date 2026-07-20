## Implementation Plan: Layer Order

Purpose
- Ensure the plugin renders map layers in the correct visual stacking order using the canonical sequence in [DOCS/LayerSequence.md](DOCS/LayerSequence.md).

Scope
- Code: layer rendering and registration points in the plugin (ordering, z-index, group insertion).
- Tests: unit tests and visual verification pages in `examples/` and `Samples/`.
- Docs: update runtime notes and the plan file itself.

High-level Steps
1. Review current rendering code and layer registration locations:
   - [src/lib/styles/s57StyleRegistry.ts](src/lib/styles/s57StyleRegistry.ts)
   - [src/lib/core/PluginControl.ts](src/lib/core/PluginControl.ts)
   - [src/lib/geolibre/right-panel.ts](src/lib/geolibre/right-panel.ts)
   - [src/lib/geolibre/floating-panel.ts](src/lib/geolibre/floating-panel.ts)
   - [src/lib/utils/s57Converter.ts](src/lib/utils/s57Converter.ts)
2. Produce a mapping between the canonical sequence in [DOCS/LayerSequence.md](DOCS/LayerSequence.md) and the plugin's layer IDs/groups.
3. Implement a single ordering function / registry that enforces the sequence at layer registration or just before render.
   - Prefer: central ordering in `PluginControl` or `s57StyleRegistry` where layers are created/registered.
   - Approach: assign numeric order keys or z-index values derived from the canonical list, apply consistently when creating map layers or layer groups.
4. Add configuration to allow overrides (optional): expose `layerOrder` in plugin config (`plugin.json` / runtime options).
5. Add unit tests and integration tests to assert ordering behaviour:
   - Tests: verify order keys assigned, verify DOM / canvas render order in example pages.
   - Files to update/add tests near `tests/` e.g. `portrayal.test.ts`, `right-panel.test.ts`.
6. Run visual verification using `examples/basic` and any sample datasets (e.g. `Samples/Outside/LIGHTS.geojson`).
7. Update documentation: note the enforced ordering and how to configure overrides.

Acceptance Criteria
- Map layers render in the same stacking order described in [DOCS/LayerSequence.md](DOCS/LayerSequence.md).
- Automated tests cover the ordering logic and pass in CI (`npm test`).
- A short how-to added to `DOCS/LayerSequence.md` or a new section in this plan describing overrides.

Testing & Verification
- Run `npm test` in the `S57Convert` root and confirm no regressions.
- Open `examples/basic/index.html` (or use local dev server) and visually confirm ordering with `Samples/Outside/LIGHTS.geojson`.
- Run `npm run build` in the `S57Convert` root and confirm errors.


Rollout Notes
- Implement behind a feature-flag or config entry when possible.
- Merge to main only after tests and visual checks pass.

Risks & Mitigations
- Risk: Other parts of the app reorder layers at runtime (e.g., user panel actions). Mitigation: ensure the ordering function runs after any dynamic re-order events or centralize re-order calls.
- Risk: Third-party map libraries manage z-order differently. Mitigation: map ordering to the library's API (z-index, insertBefore/insertAfter) rather than relying on DOM order.

Next Steps (developer)
- Start implementing step 1 (code audit) and update the TODOs as you progress.
