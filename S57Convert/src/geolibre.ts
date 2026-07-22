import { createRoot } from 'react-dom/client';
import React from 'react';
import type { GeoLibreAppAPI, GeoLibrePlugin } from './lib/geolibre/host-api';
import { S57Uploader } from './lib/components/S57Uploader';
import { S57LayerData } from './lib/utils/s57Converter';
import { generateTSSArrows, type GeneratedArrow } from './lib/utils/tssArrowsGenerator';
import type { ProcessedTSSLPT } from './lib/utils/tsslptProcessor';
import { selectS57LayerStyle, StyleReapplier, StyleTracker, type S57StyleSelection } from './lib/styles/s57StyleRegistry';
import './lib/styles/uploader.css';

const PLUGIN_ID = 'geolibre-s57-reader';

let appAPI: GeoLibreAppAPI | null = null;
let styleTracker = new StyleTracker();
let styleReapplier = new StyleReapplier(styleTracker);
let enableDebug = true;
let pendingReapplyTimer: ReturnType<typeof setTimeout> | null = null;
let attachedMap: any = null;
let styleRefreshHandler: (() => void) | null = null;
let styleLoadHandler: (() => void) | null = null;
let layerMutationHandler: (() => void) | null = null;

const everyloadedlayers : Array<string> = [];
const tsslptCache = new Map<string, ProcessedTSSLPT[]>();
const tssArrowCache = new Map<string, GeneratedArrow[]>();
let nextFileId = 1;
const fileLayerMap = new Map<number, { fileName: string; layerIds: string[] }>();

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
function resolveSpriteBaseUrl(app: GeoLibreAppAPI): string | null {
  // Attempt 1 — host API
  if (typeof app.resolvePluginAssetUrl === 'function') {
    const url = app.resolvePluginAssetUrl(PLUGIN_ID, 'icons/sprite.json');
    if (url) {
      const base = url.replace(/\/sprite\.json$/, '');
      writeDebug(`[sprite] Resolved via host API: ${base}`);
      return base;
    }
    writeDebug('[sprite] resolvePluginAssetUrl returned null — trying fallback.');
  } else {
    writeDebug('[sprite] Host does not expose resolvePluginAssetUrl — trying fallback.');
  }

  // Attempt 2 — derive from the current script URL (works when plugin is served
  // from a URL, not a local file:// path).
  try {
    // import.meta.url is the URL of this compiled bundle (dist/index.js).
    const scriptUrl = new URL(import.meta.url);
    const base = scriptUrl.href.replace(/\/index\.js$/, '/icons');
    if (!base.startsWith('file://')) {
      writeDebug(`[sprite] Resolved via script URL fallback: ${base}`);
      return base;
    }
    writeDebug('[sprite] Script URL is a file:// path — cannot serve sprites over HTTP.');
  } catch {
    writeDebug('[sprite] Could not determine script URL.');
  }

  writeDebug('[sprite] No sprite base URL could be resolved. Icons will be absent.');
  return null;
}

/**
 * Load sprite.json + sprite.png from baseUrl, then register every icon in the
 * sprite sheet with the MapLibre map via map.addImage().
 * Safe to call multiple times — skips images already registered.
 */
async function registerSpriteWithMap(map: any, baseUrl: string): Promise<void> {
  const jsonUrl = `${baseUrl}/sprite.json`;
  const pngUrl  = `${baseUrl}/sprite.png`;

  let manifest: Record<string, { x: number; y: number; width: number; height: number; pixelRatio?: number }>;
  let image: ImageBitmap;

  try {
    const jsonRes = await fetch(jsonUrl);
    if (!jsonRes.ok) {
      writeDebug(`[sprite] Failed to fetch sprite.json (${jsonRes.status}): ${jsonUrl}`);
      return;
    }
    manifest = await jsonRes.json();
    writeDebug(`[sprite] Loaded sprite manifest — ${Object.keys(manifest).length} icons from ${jsonUrl}`);
  } catch (err) {
    writeDebug(`[sprite] Error fetching sprite.json: ${err}`);
    return;
  }

  try {
    const pngRes = await fetch(pngUrl);
    if (!pngRes.ok) {
      writeDebug(`[sprite] Failed to fetch sprite.png (${pngRes.status}): ${pngUrl}`);
      return;
    }
    const blob = await pngRes.blob();
    image = await createImageBitmap(blob);
    writeDebug(`[sprite] Loaded sprite image (${image.width}×${image.height}px) from ${pngUrl}`);
  } catch (err) {
    writeDebug(`[sprite] Error fetching/decoding sprite.png: ${err}`);
    return;
  }

  let registered = 0;
  let skipped = 0;

  for (const [key, entry] of Object.entries(manifest)) {
    if (typeof map.hasImage === 'function' && map.hasImage(key)) {
      skipped++;
      continue;
    }
    try {
      // Crop the icon's sub-image from the sprite sheet.
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
function ensureSpriteRegistered(app: GeoLibreAppAPI, map: any) {
  const baseUrl = resolveSpriteBaseUrl(app);
  if (!baseUrl) return;
  void registerSpriteWithMap(map, baseUrl);
}


function writeDebug(message : any){
    if(!enableDebug) return;
    console.log(message);
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
    void styleReapplier.reapplyAllStyles(map);
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
    console.log("Every layer IDs:");
    console.log(everyloadedlayers);
    handleClearLayers();
    if (app.unregisterRightPanel) {
      app.unregisterRightPanel("s57-uploader-panel");
    }
    detachStylePersistenceListeners();
    styleTracker.resetAll();
    appAPI = null;
    return true;
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
  return { id: fileId, name: resolvedFileName };
}

// Default export untuk dibaca oleh bundling system GeoLibre
export default s57ReaderPlugin;

