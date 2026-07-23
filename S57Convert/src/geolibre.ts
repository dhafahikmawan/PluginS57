import { createRoot } from 'react-dom/client';
import React from 'react';
import type { GeoLibreAppAPI, GeoLibrePlugin, GeoLibreMapControlPosition } from './lib/geolibre/host-api';
import { PluginControl } from './lib/core/PluginControl';
import { PluginState } from './lib/core/types';
import { S57Uploader } from './lib/components/S57Uploader';
import { S57LayerData } from './lib/utils/s57Converter';
import { generateTSSArrows, type GeneratedArrow } from './lib/utils/tssArrowsGenerator';
import type { ProcessedTSSLPT } from './lib/utils/tsslptProcessor';
import { selectS57LayerStyle, StyleReapplier, StyleTracker, type S57StyleSelection } from './lib/styles/s57StyleRegistry';
import './lib/styles/uploader.css';
import { SPRITE_PNG_BASE64 } from './lib/assets/spritePng';
import { spriteManifest } from './lib/assets/spriteManifest';

let appAPI: GeoLibreAppAPI | null = null;
let styleTracker = new StyleTracker();
let styleReapplier = new StyleReapplier(styleTracker);
let enableDebug = true;
let pendingReapplyTimer: ReturnType<typeof setTimeout> | null = null;
let attachedMap: any = null;
let styleRefreshHandler: (() => void) | null = null;
let styleLoadHandler: (() => void) | null = null;
let layerMutationHandler: (() => void) | null = null;
let control: PluginControl | null = null;
let position: GeoLibreMapControlPosition = "top-right";
let pendingState: Partial<PluginState> | null = null;

const everyloadedlayers : Array<string> = [];
const tsslptCache = new Map<string, ProcessedTSSLPT[]>();
const tssArrowCache = new Map<string, GeneratedArrow[]>();
let nextFileId = 1;
const fileLayerMap = new Map<number, { fileName: string; layerIds: string[]; hidden?: boolean }>();



function createControl(app: GeoLibreAppAPI): PluginControl{
  const nextControl = new PluginControl({
    collapsed : pendingState?.collapsed ?? true,
    panelWidth: pendingState?.panelWidth ?? 500,
    registerNativeLayer: (layer) => app.registerExternalNativeLayer?.(layer),

  });
  if(pendingState){
    nextControl.setState(pendingState);
  }

  return nextControl;
}

function isPluginState(value: unknown): value is Partial<PluginState>{
  if(!value || typeof value !== "object" || Array.isArray(value)){
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if("collapsed" in candidate && typeof candidate.collapsed !== "boolean"){
    return false;
  }
  if("panelWidth" in candidate && typeof candidate.panelWidth !== "number"){
    return false;
  }
  if(
    "data" in candidate &&
    (typeof candidate.data !== "object" ||   
      candidate.data === null ||
      Array.isArray(candidate.data))
  ){
    return false;
  }
  return true;

}


// ---------------------------------------------------------------------------
// Sprite asset helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the base URL for the plugin's bundled sprite assets.
 * Order of attempts:
 *   1. app.resolvePluginAssetUrl() — host-provided canonical path.
 *   2. Relative path inferred from the plugin bundle's own script URL.
 *   3. null (graceful degradation — no icons).
 */
/**
 * Load the embedded sprite manifest and sprite image, then register every icon
 * in the sprite sheet with the MapLibre map via map.addImage(). Safe to call
 * multiple times — skips images already registered.
 */
async function registerSpriteWithMap(map: any): Promise<void> {
  let image: ImageBitmap;

  try {
    const res = await fetch(SPRITE_PNG_BASE64);
    if (!res.ok) {
      writeDebug(`[sprite] Failed to load embedded sprite image: ${res.status}`);
      return;
    }
    const blob = await res.blob();
    image = await createImageBitmap(blob);
    writeDebug(`[sprite] Loaded embedded sprite image (${image.width}×${image.height}px)`);
  } catch (err) {
    writeDebug(`[sprite] Error decoding embedded sprite image: ${err}`);
    return;
  }

  let registered = 0;
  let skipped = 0;

  for (const [key, entry] of Object.entries(spriteManifest)) {
    if (typeof map.hasImage === 'function' && map.hasImage(key)) {
      skipped++;
      continue;
    }
    try {
      const sub = await createImageBitmap(image, entry.x, entry.y, entry.width, entry.height);
      map.addImage(key, sub, { pixelRatio: entry.pixelRatio ?? 1 });
      registered++;
    } catch (err) {
      writeDebug(`[sprite] Could not register icon "${key}": ${err}`);
    }
  }

  writeDebug(`[sprite] Registration complete — registered: ${registered}, skipped (already present): ${skipped}`);
}

/**
 * Resolve sprite URL and register icons with the map.
 * Called on activation and after every style reload.
 */
function ensureSpriteRegistered(_app: GeoLibreAppAPI, map: any) {
  void registerSpriteWithMap(map);
}


function writeDebug(message : any){
    if(!enableDebug) return;
    console.log(message);
}

function isAnyFileLayerHidden(trackedLayerId: string): boolean {
  for (const entry of fileLayerMap.values()) {
    if (entry.hidden && entry.layerIds.includes(trackedLayerId)) {
      return true;
    }
  }
  return false;
}

function queueStyleReapply(map: any) {
  if (!map) {
    return;
  }

  if (pendingReapplyTimer) {
    clearTimeout(pendingReapplyTimer);
  }

  pendingReapplyTimer = setTimeout(() => {
    pendingReapplyTimer = null;
    void styleReapplier.reapplyAllStyles(map, isAnyFileLayerHidden);
  }, 125);
}

function attachStylePersistenceListeners(map: any) {
  if (!map || (attachedMap === map && styleRefreshHandler && styleLoadHandler && layerMutationHandler)) {
    return;
  }

  detachStylePersistenceListeners();

  styleRefreshHandler = () => queueStyleReapply(map);
  styleLoadHandler = () => {
    setTimeout(() => queueStyleReapply(map), 250);
    // Re-register sprites after a style swap — MapLibre clears images on style reload.
    if (appAPI) {
      ensureSpriteRegistered(appAPI, map);
    }
  };
  layerMutationHandler = () => queueStyleReapply(map);

  map.on('data', styleRefreshHandler);
  map.on('style.load', styleLoadHandler);
  map.on('layer', layerMutationHandler);

  attachedMap = map;
}

function detachStylePersistenceListeners() {
  if (!attachedMap) {
    return;
  }

  if (styleRefreshHandler) {
    attachedMap.off?.('data', styleRefreshHandler);
  }
  if (styleLoadHandler) {
    attachedMap.off?.('style.load', styleLoadHandler);
  }
  if (layerMutationHandler) {
    attachedMap.off?.('layer', layerMutationHandler);
  }

  styleRefreshHandler = null;
  styleLoadHandler = null;
  layerMutationHandler = null;
  attachedMap = null;
}

export const s57ReaderPlugin: GeoLibrePlugin = {
  id: "geolibre-s57-reader",
  name: "S-57 Marine Chart Reader",
  version: "1.0.0",

  activate(app: GeoLibreAppAPI) {
    appAPI = app;
    control = control ?? createControl(appAPI);
    const added = app.addMapControl(control, position);
    if(!added){
      control = null;
      return false;
    }
    const map = app.getMap?.();

    if (map) {
      attachStylePersistenceListeners(map);
      // Register sprite icons before any symbol layer is drawn.
      ensureSpriteRegistered(app, map);
    }

    if (app.registerRightPanel) {
      app.registerRightPanel({
        id: "s57-uploader-panel",
        title: "S-57 Loader",
        render: (container: HTMLElement) => {
          const root = createRoot(container);
          root.render(
            React.createElement(S57Uploader, {
              onLayersLoaded: handleLayersLoaded,
              onDeleteFile: handleDeleteFileLayer,
              onToggleFileVisibility: handleToggleFileVisibility,
              onClearLayers: handleClearLayers,
            })
          );
          return () => { root.unmount(); };
        }
      });

      if (app.openRightPanel) {
        app.openRightPanel("s57-uploader-panel");
      }
    }
    return true;
  },

  deactivate(app: GeoLibreAppAPI) {
    //console.log("Every layer IDs:");
    //console.log(everyloadedlayers);
    const map = app.getMap?.();
    handleClearLayers();
    if (app.unregisterRightPanel) {
      app.unregisterRightPanel("s57-uploader-panel");
    }
    detachStylePersistenceListeners();
    styleTracker.resetAll();
    if(!control) return;
    pendingState = control.getState();
    if(map) control.collapse(map);
    app.removeMapControl(control);
    control = null;
    appAPI = null;
    return true;
  },
  getMapControlPosition() {
    return position;
  },
  setMapControlPosition(app, nextPosition){
    position = nextPosition;
    if(!control) return;

    app.removeMapControl(control);
    const added = app.addMapControl(control, position);
    if(!added){
      pendingState = control.getState();
      control = null;
      return false;
    }
  },
  getProjectState(){
    return control?.getState() ?? pendingState ?? undefined;
  },
  applyProjectState(_app, state){
    if(!isPluginState(state)) return false;
    pendingState = state;
    control?.setState(state);
  }
};

async function applyS57Style(map: any, name: string, hostedLayerId: string, styleSelection: S57StyleSelection, attempt = 0) {
  if (!map || typeof map.getStyle !== "function") {
    if (attempt < 4) {
      setTimeout(() => { void applyS57Style(map, name, hostedLayerId, styleSelection, attempt + 1); }, 250 * (attempt + 1));
    }
    else if(enableDebug){
      writeDebug("################################################");
      writeDebug("Layer ID: " + hostedLayerId);
      writeDebug("Attempts: " + attempt);
      writeDebug("Function Timed Out");
      writeDebug("________________________________________________")
    }
    return;
  }

  const applied = await styleReapplier.reapplyStyle(map, hostedLayerId, styleSelection, undefined, {}, name);

  if (!applied && attempt < 4) {
    setTimeout(() => { void applyS57Style(map, name, hostedLayerId, styleSelection, attempt + 1); }, 250 * (attempt + 1));
  }
  else if(enableDebug){
    writeDebug("*************************************************");
    writeDebug("Painting succeeds in " + attempt + " attempts");
    writeDebug("*************************************************");
  }
}
function removeTrackedLayer(layerId: string) {
  const index = everyloadedlayers.indexOf(layerId);
  if (index >= 0) {
    everyloadedlayers.splice(index, 1);
  }
  styleTracker.removeStyle(layerId);
}

/**
 * Toggles or sets the visibility state of all MapLibre layers associated with a file.
 * @param fileId The ID of the loaded file.
 * @param hide Optional explicit boolean (true to hide, false to show). If omitted, toggles current state.
 * @returns boolean The new hidden state (true if hidden, false if visible).
 */
export function handleToggleFileVisibility(fileId: number, hide?: boolean): boolean {
  const entry = fileLayerMap.get(fileId);
  if (!entry || !appAPI) return false;

  const map = appAPI.getMap?.();
  const targetHiddenState = hide !== undefined ? hide : !entry.hidden;
  entry.hidden = targetHiddenState;

  const visibilityValue = targetHiddenState ? 'none' : 'visible';

  if (map) {
    const styleLayers: Array<{ id?: string; source?: string }> = map.getStyle?.()?.layers ?? [];
    const targetCandidateIds = new Set<string>();

    // Seed with direct hosted layer IDs
    entry.layerIds.forEach(id => targetCandidateIds.add(id));

    // Resolve candidate MapLibre layers whose id or source matches any tracked layer ID
    styleLayers.forEach(layer => {
      if (!layer?.id) return;
      const layerMapId = layer.id;
      const sourceName = layer.source ?? '';

      const matchesEntry = entry.layerIds.some(id =>
        layerMapId === id ||
        sourceName === id ||
        layerMapId.startsWith(`${id}-`) ||
        layerMapId.includes(id)
      );

      if (matchesEntry) {
        targetCandidateIds.add(layerMapId);
      }
    });

    targetCandidateIds.forEach((candidateId) => {
      try {
        if (typeof map.setLayoutProperty === 'function') {
          map.setLayoutProperty(candidateId, 'visibility', visibilityValue);
        }
      } catch (error) {
        console.error(`Error updating visibility for layer ${candidateId}:`, error);
      }
    });
  }

  return entry.hidden;
}

export function handleClearLayers() {
  const fileIds = Array.from(fileLayerMap.keys());
  fileIds.forEach((fileId) => {
    handleDeleteFileLayer(fileId);
  });
  everyloadedlayers.length = 0;
  styleTracker.resetAll();
  fileLayerMap.clear();
}

export function handleDeleteFileLayer(fileId: number) {
  const entry = fileLayerMap.get(fileId);
  if (!entry) {
    return;
  }

  entry.layerIds.forEach((layerId) => {
    try {
      appAPI?.unregisterExternalNativeLayer?.(layerId);
    } catch (error) {
      console.error('Error while removing GeoJSON layer', error);
    }
    removeTrackedLayer(layerId);
  });

  fileLayerMap.delete(fileId);
}

/**
 * Registers S-57 layers in GeoLibre's Layers Panel via addGeoJsonLayer,
 * then overrides their styling using getMap() for full MapLibre paint control.
 */
export function handleLayersLoaded(layers: S57LayerData[], purposeCode?: number, fileName?: string) {
  if (!appAPI) return undefined;

  const resolvedPurposeCode = purposeCode ?? 1;
  const map = appAPI.getMap?.();
  const sourceLayers = [...layers].filter((layer) => layer.layerName !== 'M_NPUB');

  if (sourceLayers.length === 0) {
    return undefined;
  }

  const resolvedFileName = fileName ?? sourceLayers[0]?.fileName ?? `uploaded-${nextFileId}`;
  const fileId = nextFileId++;
  const layerIds: string[] = [];

  // Build stable ordering: sort by priority then by original index to preserve
  // the sequence present in the chart index for features within the same band.
  const indexed = sourceLayers.map((layer, idx) => ({ layer, idx }));
  indexed.sort((a, b) => {
    const styleA = selectS57LayerStyle(a.layer.classCode, (a.layer.metadata?.sampleProperties as Record<string, unknown>) ?? {}, purposeCode);
    const styleB = selectS57LayerStyle(b.layer.classCode, (b.layer.metadata?.sampleProperties as Record<string, unknown>) ?? {}, purposeCode);
    if (styleA.priority !== styleB.priority) return styleA.priority - styleB.priority;
    return a.idx - b.idx;
  });

  // Keep a quick lookup of any pre-generated derived layers (for example
  // LIGHT_SECTORS--RED/GRN/YLW produced by the converter) so they can be inserted
  // immediately after their source layer.
  const pendingDerived = new Map<string, S57LayerData[]>();
  for (const l of indexed.map((it) => it.layer)) {
    if (l.classCode === 'LIGHT_SECTORS') {
      // Key by source file so we can match to the originating LIGHTS group.
      const key = `${l.fileName}::LIGHT_SECTORS`;
      if (!pendingDerived.has(key)) pendingDerived.set(key, []);
      pendingDerived.get(key)!.push(l);
    }
  }

  writeDebug('++++++++++++++++++++++++++++++++++++++++++');
  writeDebug('Layer rendering order: ');

  for (const item of indexed) {
    const layer = item.layer;
    // If this layer was consumed as a derived insertion earlier, skip it.
    const consumedKey = `${layer.fileName}::${layer.classCode === 'LIGHT_SECTORS' ? 'LIGHT_SECTORS' : layer.layerName}`;
    if ((layer.classCode === 'LIGHT_SECTORS' || layer.classCode === 'TSS_ARROWS') && pendingDerived.has(consumedKey)) {
      // Will be added when its source layer was processed.
      continue;
    }

    const sampleProperties = (layer.metadata?.sampleProperties as Record<string, unknown>) ?? {};
    const styleSelection = selectS57LayerStyle(layer.classCode, sampleProperties, purposeCode);

    const hostedLayerId = appAPI.addGeoJsonLayer(
      layer.fileName + '--' + layer.layerName,
      layer.geojson as any,
      layer.fileName,
    );
    writeDebug(hostedLayerId + ' : ' + layer.layerName);
    everyloadedlayers.push(hostedLayerId);
    layerIds.push(hostedLayerId);

    styleTracker.trackStyle(hostedLayerId, styleSelection, layer.classCode, sampleProperties);

    if (map) {
      setTimeout(() => { void applyS57Style(map, layer.layerName, hostedLayerId, styleSelection); }, 0);
    }

    // If this layer is a TSSLPT source, generate and insert its arrows immediately
    // after the source so the visual stack matches expectations.
    if (layer.classCode === 'TSSLPT') {
      const processed = (layer.metadata?.processedTSSLPT as ProcessedTSSLPT[] | undefined) ?? [];
      if (processed.length > 0) {
        const sourceFile = layer.fileName ?? 'unknown';
        tsslptCache.set(sourceFile, processed);
        const arrows = generateTSSArrows(processed, { arrowInterval: 5000, arrowType: 'vector' });
        tssArrowCache.set(sourceFile, arrows);

        const arrowGeojson = {
          type: 'FeatureCollection',
          features: arrows.map((arrow) => ({ type: 'Feature', geometry: arrow.geometry, properties: arrow.properties })),
        };

        const arrowLayerId = appAPI.addGeoJsonLayer(`${sourceFile}--TSS_ARROWS`, arrowGeojson as any, sourceFile);
        everyloadedlayers.push(arrowLayerId);
        layerIds.push(arrowLayerId);
        const arrowStyleSelection = selectS57LayerStyle('TSS_ARROWS', {}, purposeCode);
        styleTracker.trackStyle(arrowLayerId, arrowStyleSelection, 'TSS_ARROWS', {});
        if (map) {
          setTimeout(() => { void applyS57Style(map, 'TSS_ARROWS', arrowLayerId, arrowStyleSelection); }, 0);
        }
      }
    }

    // If this layer is a LIGHTS group, and pre-generated LIGHT_SECTORS color layers
    // exist for the same source file, insert them now and mark as consumed.
    if (layer.classCode === 'LIGHTS') {
      const key = `${layer.fileName}::LIGHT_SECTORS`;
      const sectorLayers = pendingDerived.get(key);
      if (sectorLayers && sectorLayers.length > 0) {
        for (const sectors of sectorLayers) {
          const hostedSectorId = appAPI.addGeoJsonLayer(`${sectors.fileName}--${sectors.layerName}`, sectors.geojson as any, sectors.fileName);
          const sectorStyle = selectS57LayerStyle(sectors.layerName, (sectors.metadata?.sampleProperties as Record<string, unknown>) ?? {}, purposeCode);
          styleTracker.trackStyle(hostedSectorId, sectorStyle, sectors.classCode, {});
          everyloadedlayers.push(hostedSectorId);
          layerIds.push(hostedSectorId);
          if (map) {
            setTimeout(() => { void applyS57Style(map, sectors.layerName, hostedSectorId, sectorStyle); }, 0);
          }
        }
        // mark as consumed so color variants won't be added again
        pendingDerived.delete(key);
      }
    }
  }

  fileLayerMap.set(fileId, { fileName: resolvedFileName, layerIds });

  writeDebug('++++++++++++++++++++++++++++++++++++++++++');
  return { id: fileId, name: resolvedFileName, purposeCode: resolvedPurposeCode };
}

// Default export untuk dibaca oleh bundling system GeoLibre
export default s57ReaderPlugin;

