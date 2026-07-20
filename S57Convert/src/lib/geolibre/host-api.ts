/**
 * Canonical GeoLibre host-plugin contract.
 *
 * This module is the single source of truth for the interface between a plugin
 * and the GeoLibre host application. The GeoLibre wrapper in `src/geolibre.ts`
 * imports these types instead of redeclaring them, and downstream plugins built
 * from this template should do the same.
 *
 * The contract is intentionally free of MapLibre and React imports: a map
 * control is referenced only through the structural {@link GeoLibreControl}
 * type, so the same definitions describe both vanilla and React plugins. The
 * concrete control type is supplied as a generic parameter where it matters.
 */

/** Corner of the map a control can be docked to. */
export type GeoLibreMapControlPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

/**
 * Minimal GeoJSON `FeatureCollection` shape used when a plugin hands the host a
 * dataset to render as a native (MapLibre) layer. Kept structural so this
 * module does not depend on `geojson` types.
 */
export interface GeoLibreFeatureCollection {
  type: "FeatureCollection";
  features: unknown[];
}

/**
 * Visual styling hints for a native layer the host renders on the plugin's
 * behalf. Every field is optional; the host applies sensible defaults for any
 * value the plugin omits.
 */
export interface GeoLibreNativeLayerStyle {
  minZoom?: number;
  maxZoom?: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fillOpacity?: number;
  circleRadius?: number;
  strokeDasharray?: string;
  // Icon and symbol properties for point layers
  iconImage?: string;
  iconSize?: number;
  iconAllowOverlap?: boolean;
  iconIgnorePlacement?: boolean;
  textField?: string;
  textSize?: number;
  textOffset?: [number, number];
  textAnchor?: string;
}

/**
 * Registration payload a plugin passes to
 * {@link GeoLibreAppAPI.registerExternalNativeLayer}. It lets GeoLibre own the
 * MapLibre sources and layers (so they appear in the host's layer panel and
 * respect its theme) while the plugin supplies the data and styling.
 */
export interface GeoLibreNativeLayerRegistration {
  /** Stable, plugin-unique id used later to unregister the layer. */
  id: string;
  /** Human-readable name shown in the host's layer list. */
  name: string;
  /** Optional inline data; omit when the host already has the source. */
  geojson?: GeoLibreFeatureCollection;
  /** MapLibre layer ids the host should create or adopt. */
  nativeLayerIds: string[];
  /** MapLibre source ids backing the layers above. */
  sourceIds: string[];
  /** Initial layer opacity in the range 0..1. */
  opacity: number;
  /** Styling hints applied to the rendered layer. */
  style: GeoLibreNativeLayerStyle;
  /** Arbitrary extra data the host may persist or display. */
  metadata?: Record<string, unknown>;
}

/**
 * Registration payload a plugin passes to
 * {@link GeoLibreAppAPI.registerRightPanel}. The host renders a native
 * right-sidebar panel (header with collapse/close buttons, a collapsible rail,
 * and a resize handle) and the plugin owns only the body via {@link render}.
 * While a plugin right panel is the active right-side workspace the host
 * collapses its built-in Style panel and restores it when the plugin panel
 * closes, so the two never compete for space.
 */
export interface GeoLibreRightPanelRegistration {
  /** Stable, plugin-unique id used to open/collapse/close the panel. */
  id: string;
  /** Title shown in the panel header and the collapsed rail. */
  title: string;
  /** Optional rail icon: a URL or `data:` URI rendered as an image. */
  icon?: string;
  /** Preferred expanded width in px (desktop only; the host clamps it). */
  defaultWidth?: number;
  /**
   * Populate the panel body. Called once with an empty container the plugin
   * fills with its own DOM (the contract is plain DOM, not a framework node, so
   * a plugin never has to share the host's UI framework). The container stays
   * mounted across collapse, so plugin DOM state persists. May return a cleanup
   * function the host runs when the panel closes or is unregistered.
   */
  render: (container: HTMLElement) => void | (() => void);
  /** Called after the panel opens (becomes the active workspace). */
  onOpen?: () => void;
  /** Called after the panel collapses to its rail. */
  onCollapse?: () => void;
  /** Called after the panel closes (releases the workspace). */
  onClose?: () => void;
}

/**
 * Structural type for a MapLibre control instance. Using a marker interface
 * keeps this contract independent of the concrete control implementation while
 * still giving the host API a nominal-feeling handle to pass around.
 */
export interface GeoLibreControl {
  onAdd(...args: never[]): HTMLElement;
  onRemove(...args: never[]): void;
}

/**
 * The surface GeoLibre exposes to an active plugin.
 *
 * Only {@link addMapControl} and {@link removeMapControl} are guaranteed. The
 * remaining members are optional host capabilities: always call them with
 * optional chaining (`app.pickLocalDirectoryFiles?.()`) and degrade gracefully
 * when a host build does not provide them.
 *
 * @typeParam TControl - The plugin's concrete control type.
 */
export interface GeoLibreAppAPI<TControl extends GeoLibreControl = GeoLibreControl> {
  addMapControl: (
    control: TControl,
    position?: GeoLibreMapControlPosition,
  ) => boolean;
  removeMapControl: (control: TControl) => void;
  /**
   * Add a GeoJSON FeatureCollection to the map as a named layer.
   * The layer appears in the host's Layers panel and persists with the project.
   * Layers with the same `sourcePath` are grouped together.
   * Returns the generated layer id.
   */
  addGeoJsonLayer: (
    name: string,
    data: GeoLibreFeatureCollection,
    sourcePath?: string,
  ) => string;
  /**
   * Returns the underlying MapLibre Map instance.
   * Use this to add custom sources and layers with full MapLibre paint control.
   * Always call with optional chaining — some host variants may not expose it.
   */
  getMap?: () => import('maplibre-gl').Map | null;
  pickLocalDirectoryFiles?: () => Promise<File[] | null>;
  resolvePluginAssetUrl?: (
    pluginId: string,
    relativePath: string,
  ) => string | null;
  /** @deprecated Use getMap() + MapLibre directly for full style control. */
  registerExternalNativeLayer?: (
    layer: GeoLibreNativeLayerRegistration,
  ) => void;
  /** @deprecated */
  unregisterExternalNativeLayer?: (id: string) => void;
  registerRightPanel?: (panel: GeoLibreRightPanelRegistration) => () => void;
  unregisterRightPanel?: (id: string) => void;
  openRightPanel?: (id: string) => boolean;
  collapseRightPanel?: (id: string) => void;
  closeRightPanel?: (id: string) => void;
  getActiveRightPanel?: () => string | null;
  registerToolbarMenu?: (menu: GeoLibreToolbarMenu) => () => void;
  unregisterToolbarMenu?: (id: string) => void;
  registerFloatingPanel?: (
    panel: GeoLibreFloatingPanelRegistration,
  ) => () => void;
  unregisterFloatingPanel?: (id: string) => void;
  openFloatingPanel?: (id: string) => boolean;
  closeFloatingPanel?: (id: string) => void;
  getOpenFloatingPanels?: () => string[];
}

/**
 * An action item in a plugin {@link GeoLibreToolbarMenu}. Selecting it runs
 * {@link onSelect} (for example, to open a right panel or floating panel).
 */
export interface GeoLibreToolbarMenuAction {
  /** Discriminator; defaults to "action" when omitted. */
  type?: "action";
  /** Stable id, unique within the menu. */
  id: string;
  /** Label shown in the menu. */
  label: string;
  /** Optional icon: a URL or `data:` URI rendered as an image. */
  icon?: string;
  /** When true, the item is shown disabled and cannot be selected. */
  disabled?: boolean;
  /** Invoked when the user selects the item. */
  onSelect: () => void;
}

/** A nested submenu in a plugin {@link GeoLibreToolbarMenu}. */
export interface GeoLibreToolbarSubmenu {
  type: "submenu";
  id: string;
  label: string;
  icon?: string;
  items: GeoLibreToolbarMenuItem[];
}

/** A divider between groups of items in a plugin toolbar menu. */
export interface GeoLibreToolbarSeparator {
  type: "separator";
  id?: string;
}

/** One entry in a plugin toolbar menu: an action, a submenu, or a separator. */
export type GeoLibreToolbarMenuItem =
  | GeoLibreToolbarMenuAction
  | GeoLibreToolbarSubmenu
  | GeoLibreToolbarSeparator;

/**
 * A plugin-owned top-level toolbar menu. The host renders it as a dropdown
 * button in the banner beside the built-in menus.
 */
export interface GeoLibreToolbarMenu {
  id: string;
  label: string;
  icon?: string;
  items: GeoLibreToolbarMenuItem[];
}

/**
 * A plugin-owned floating panel: a draggable, closeable card the host overlays
 * on the map's top-left corner. The plugin owns only the body via {@link render}
 * (plain DOM); the host provides the card chrome (a draggable title bar with a
 * close button).
 */
export interface GeoLibreFloatingPanelRegistration {
  id: string;
  title: string;
  icon?: string;
  /** Preferred card width in px (the host clamps it). */
  defaultWidth?: number;
  /**
   * Populate the card body. Called once with an empty container the plugin
   * fills with its own DOM. The container stays mounted while the card is open,
   * so plugin state persists. May return a cleanup function the host runs when
   * the panel closes or is unregistered.
   */
  render: (container: HTMLElement) => void | (() => void);
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * The object a plugin's GeoLibre entry point must export. GeoLibre calls these
 * members across the plugin lifecycle; everything beyond `id`, `name`,
 * `version`, `activate`, and `deactivate` is optional and only invoked when the
 * plugin declares it.
 *
 * @typeParam TControl - The plugin's concrete control type.
 */
export interface GeoLibrePlugin<TControl extends GeoLibreControl = GeoLibreControl> {
  /** Stable plugin id; must match `plugin.json`'s `id`. */
  id: string;
  /** Display name; must match `plugin.json`'s `name`. */
  name: string;
  /** Semantic version; must match `plugin.json`'s `version`. */
  version: string;
  /**
   * Query-parameter names this plugin owns. When the host opens a URL carrying
   * one of these, it auto-activates the plugin and routes the parameters to
   * {@link handleUrlParameters}.
   */
  urlParameterNames?: string[];
  /**
   * Activate the plugin: create and add the control. Return `false` (or remain
   * unactivated) if the control could not be added.
   */
  activate: (app: GeoLibreAppAPI<TControl>) => boolean | void;
  /**
   * Deactivate the plugin: capture any state to restore later, then remove the
   * control.
   */
  deactivate: (app: GeoLibreAppAPI<TControl>) => void;
  /**
   * Handle deep-link query parameters declared in {@link urlParameterNames}.
   * Dispatched by the host once the plugin is active. May be async.
   */
  handleUrlParameters?: (
    app: GeoLibreAppAPI<TControl>,
    params: URLSearchParams,
  ) => void | Promise<void>;
  /** Report the control's current dock position (for persistence). */
  getMapControlPosition?: () => GeoLibreMapControlPosition;
  /** Move the control to a new dock position. */
  setMapControlPosition?: (
    app: GeoLibreAppAPI<TControl>,
    position: GeoLibreMapControlPosition,
  ) => boolean | void;
  /** Serialize plugin state so the host can save it with the project. */
  getProjectState?: () => unknown;
  /** Restore plugin state previously produced by {@link getProjectState}. */
  applyProjectState?: (
    app: GeoLibreAppAPI<TControl>,
    state: unknown,
  ) => boolean | void;
}
