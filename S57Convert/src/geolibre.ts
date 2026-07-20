import { createRoot } from 'react-dom/client';
import React from 'react';
import type { GeoLibreAppAPI, GeoLibrePlugin } from './lib/geolibre/host-api';
import { S57Uploader } from './lib/components/S57Uploader';
import { S57LayerData } from './lib/utils/s57Converter';
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
function handleLayersLoaded(layers: S57LayerData[], purposeCode?: number) {
  if (!appAPI) return;

  const map = appAPI.getMap?.();

  // Sort by priority: base layers first, labels last
  const orderedLayers = [...layers].sort((a, b) => {
    const styleA = selectS57LayerStyle(a.classCode, (a.metadata?.sampleProperties as Record<string, unknown>) ?? {}, purposeCode);
    const styleB = selectS57LayerStyle(b.classCode, (b.metadata?.sampleProperties as Record<string, unknown>) ?? {}, purposeCode);
    return styleA.priority - styleB.priority;
  });
  

  writeDebug("++++++++++++++++++++++++++++++++++++++++++");
  writeDebug("Layer rendering order: ")
  for (const layer of orderedLayers) {
    const sampleProperties = (layer.metadata?.sampleProperties as Record<string, unknown>) ?? {};
    const styleSelection = selectS57LayerStyle(layer.classCode, sampleProperties, purposeCode);

    // Register in GeoLibre's Layers Panel
    if(layer.layerName == "M_NPUB"){
      continue;
    }
    const hostedLayerId = appAPI.addGeoJsonLayer(
      layer.fileName + "--" + layer.layerName,
      layer.geojson as any,
      layer.fileName, // groups layers under the filename in the panel
    );
    writeDebug(hostedLayerId + " : " + layer.layerName);

    styleTracker.trackStyle(hostedLayerId, styleSelection, layer.classCode, sampleProperties);

    if (map) {
      setTimeout(() => { void applyS57Style(map, layer.layerName, hostedLayerId, styleSelection); }, 0);
    }
  }
  writeDebug("++++++++++++++++++++++++++++++++++++++++++");
}

// Default export untuk dibaca oleh bundling system GeoLibre
export default s57ReaderPlugin;

