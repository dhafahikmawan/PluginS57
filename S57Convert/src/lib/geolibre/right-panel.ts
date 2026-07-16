import type { GeoLibreAppAPI, GeoLibreControl } from "./host-api";

/**
 * Demonstration of the GeoLibre right-sidebar panel host API.
 *
 * A plugin can register a native right-sidebar panel that docks beside
 * GeoLibre's built-in Style panel and behaves like a first-class part of the
 * workspace, instead of emulating one with a fixed overlay. The host renders
 * the panel chrome (header, collapse/close buttons, a collapsible rail, and a
 * resize handle); the plugin owns only the body via `render(container)`, using
 * plain DOM so it never has to share the host's UI framework.
 *
 * This module is intentionally self-contained so it is easy to copy, adapt, or
 * delete. Wire it from the plugin's `activate`/`deactivate` hooks (see
 * `src/geolibre.ts`).
 */

/** Stable id for this plugin's right panel. Replace with your own. */
export const RIGHT_PANEL_ID = "geolibre-plugin-template-workbench";

/**
 * Register and open the template's right-sidebar panel.
 *
 * @param app - The GeoLibre host API passed to the plugin's `activate` hook.
 * @returns A disposer that closes and unregisters the panel, or `null` when the
 *   host does not provide a right sidebar (so the caller can skip cleanup).
 */
export function registerTemplateRightPanel<TControl extends GeoLibreControl>(
  app: GeoLibreAppAPI<TControl>,
): (() => void) | null {
  // Right panels are an optional host capability; degrade gracefully when the
  // host (or standalone usage) does not provide them.
  if (!app.registerRightPanel) return null;

  const unregister = app.registerRightPanel({
    id: RIGHT_PANEL_ID,
    title: "Workbench",
    defaultWidth: 320,
    render(container) {
      const wrap = document.createElement("div");
      wrap.className = "geolibre-plugin-right-panel";

      const hero = document.createElement("section");
      hero.className = "geolibre-panel-hero";

      const badge = document.createElement("span");
      badge.className = "geolibre-panel-pill";
      badge.textContent = "Ready";

      const heading = document.createElement("h2");
      heading.textContent = "S-57 Conversion Workspace";

      const subtitle = document.createElement("p");
      subtitle.className = "geolibre-panel-subtitle";
      subtitle.textContent =
        "Upload charts, review conversion settings, and keep your workflow visible in one place.";

      const body = document.createElement("div");
      body.className = "geolibre-panel-body";

      const overviewCard = document.createElement("div");
      overviewCard.className = "geolibre-panel-card";

      const overviewTitle = document.createElement("h3");
      overviewTitle.className = "geolibre-panel-card-title";
      overviewTitle.textContent = "Workflow";

      const overviewText = document.createElement("p");
      overviewText.className = "geolibre-panel-card-text";
      overviewText.textContent =
        "Move from upload to review without losing context in the chart workspace.";

      const list = document.createElement("ul");
      list.className = "geolibre-panel-list";

      [
        "Upload S-57 data and inspect the result",
        "Track styling and portrayal updates",
        "Keep conversion tasks grouped for review",
      ].forEach((itemText) => {
        const item = document.createElement("li");
        item.textContent = itemText;
        list.appendChild(item);
      });

      const statusCard = document.createElement("div");
      statusCard.className = "geolibre-panel-card geolibre-panel-card-muted";

      const statusTitle = document.createElement("h3");
      statusTitle.className = "geolibre-panel-card-title";
      statusTitle.textContent = "Current focus";

      const statusText = document.createElement("p");
      statusText.className = "geolibre-panel-card-text";
      statusText.textContent = "Monitor the active conversion state and keep the next review step in view.";

      statusCard.append(statusTitle, statusText);
      overviewCard.append(overviewTitle, overviewText, list);
      body.append(overviewCard, statusCard);
      hero.append(badge, heading, subtitle);
      wrap.append(hero, body);
      container.appendChild(wrap);

      // Optional cleanup, run when the panel closes or is unregistered.
      return () => {
        wrap.remove();
      };
    },
  });

  // Open it right away so the example is visible on activation. Remove this call
  // (or gate it behind a button in your control) if you would rather open the
  // panel on demand instead of every time the plugin activates.
  app.openRightPanel?.(RIGHT_PANEL_ID);

  return () => {
    app.closeRightPanel?.(RIGHT_PANEL_ID);
    unregister();
  };
}
