import { createRoot } from 'react-dom/client';
import React from 'react';
import type { GeoLibreAppAPI, GeoLibrePlugin } from './lib/geolibre/host-api';
import { S57Uploader } from './lib/components/S57Uploader';
import { S57LayerData } from './lib/utils/s57Converter';
import { generateTSSArrows, type GeneratedArrow } from './lib/utils/tssArrowsGenerator';
import type { ProcessedTSSLPT } from './lib/utils/tsslptProcessor';
import { selectS57LayerStyle, StyleReapplier, StyleTracker, type S57StyleSelection } from './lib/styles/s57StyleRegistry';
import './lib/styles/uploader.css';

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
  styleLoadHandler = () => setTimeout(() => queueStyleReapply(map), 250);
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
              onClearLayers: () => {}
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
    everyloadedlayers.forEach((layer_id)=>{
      try {
        const unregister = app?.unregisterExternalNativeLayer;
        if (typeof unregister === "function") {
          unregister(layer_id);
        }
      } catch (e) {
        console.error("Error while removing GeoJSON layer", e);
      }
    })
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
/**
 * Registers S-57 layers in GeoLibre's Layers Panel via addGeoJsonLayer,
 * then overrides their styling using getMap() for full MapLibre paint control.
 */
export function handleLayersLoaded(layers: S57LayerData[], purposeCode?: number) {
  if (!appAPI) return;

  const map = appAPI.getMap?.();
  const sourceLayers = [...layers].filter((layer) => layer.layerName !== 'M_NPUB');

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
  // LIGHT_SECTORS produced by the converter) so they can be inserted
  // immediately after their source layer.
  const pendingDerived = new Map<string, any>();
  for (const l of indexed.map((it) => it.layer)) {
    if (l.classCode === 'LIGHT_SECTORS') {
      // Key by source file so we can match to the originating LIGHTS group.
      pendingDerived.set(`${l.fileName}::LIGHT_SECTORS`, l);
    }
  }

  writeDebug('++++++++++++++++++++++++++++++++++++++++++');
  writeDebug('Layer rendering order: ');

  for (const item of indexed) {
    const layer = item.layer;
    // If this layer was consumed as a derived insertion earlier, skip it.
    const consumedKey = `${layer.fileName}::${layer.layerName}`;
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
        const arrowStyleSelection = selectS57LayerStyle('TSS_ARROWS', {}, purposeCode);
        styleTracker.trackStyle(arrowLayerId, arrowStyleSelection, 'TSS_ARROWS', {});
        if (map) {
          setTimeout(() => { void applyS57Style(map, 'TSS_ARROWS', arrowLayerId, arrowStyleSelection); }, 0);
        }
      }
    }

    // If this layer is a LIGHTS group, and a pre-generated LIGHT_SECTORS layer
    // exists for the same source file, insert it now and mark it consumed.
    if (layer.classCode === 'LIGHTS') {
      const key = `${layer.fileName}::LIGHT_SECTORS`;
      const sectors = pendingDerived.get(key);
      if (sectors) {
        const hostedSectorId = appAPI.addGeoJsonLayer(`${sectors.fileName}--${sectors.layerName}`, sectors.geojson as any, sectors.fileName);
        const sectorStyle = selectS57LayerStyle('LIGHT_SECTORS', (sectors.metadata?.sampleProperties as Record<string, unknown>) ?? {}, purposeCode);
        styleTracker.trackStyle(hostedSectorId, sectorStyle, 'LIGHT_SECTORS', {});
        everyloadedlayers.push(hostedSectorId);
        if (map) {
          setTimeout(() => { void applyS57Style(map, 'LIGHT_SECTORS', hostedSectorId, sectorStyle); }, 0);
        }
        // mark as consumed so it won't be added later
        pendingDerived.delete(key);
      }
    }
  }

  writeDebug('++++++++++++++++++++++++++++++++++++++++++');
}

// Default export untuk dibaca oleh bundling system GeoLibre
export default s57ReaderPlugin;

