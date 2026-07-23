# Style Application Debug Flag

This development-only guide explains how to control the plugin's styling behavior using the debug-only `styleApplicationMode` flag.

## Purpose

The flag controls whether the plugin applies:

- `all` — full S-57 style application, including paint and zoom ranges.
- `zoom-only` — only layer zoom ranges are applied; paint and layout styling are skipped.
- `none` — no plugin-driven styling is applied at all.

This flag is meant for debugging and testing. It is not exposed to end users in the UI.

## Where the flag is defined

The flag is defined in `S57Convert/src/geolibre.ts`:

```ts
let styleApplicationMode: StyleApplicationMode = 'all';
```

The plugin reads this developer-controlled variable when applying styles through `StyleReapplier`.

## How the modes behave

- `all`
  - Applies all styling rules from the S-57 style registry.
  - Sets paint properties, layout symbol properties, and layer zoom ranges.

- `zoom-only`
  - Applies only the zoom range updates for layers.
  - Useful to verify whether layer visibility and rendering thresholds behave correctly without altering colors, icons, or text.

- `none`
  - Skips both paint/layout and zoom-range application.
  - Useful to debug the plugin's layer registration and styling independence from the plugin's own style overrides.

## How to modify the flag

Open `S57Convert/src/geolibre.ts` and update the constant:

```ts
let styleApplicationMode: StyleApplicationMode = 'zoom-only';
```

or:

```ts
let styleApplicationMode: StyleApplicationMode = 'none';
```

Then rebuild or reload the plugin bundle.

## Notes

- Changing the flag only affects style application performed by the plugin after the change is loaded.
- Existing layer styling may remain in the map until a style refresh or layer reapply occurs.
- `none` mode does not prevent the plugin from registering layers or updating file visibility; it only disables plugin-driven style overrides.
