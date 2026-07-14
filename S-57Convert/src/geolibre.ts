import { createRoot } from 'react-dom/client';
import React from 'react';
import type { GeoLibreAppAPI, GeoLibrePlugin, GeoLibreNativeLayerStyle } from './lib/geolibre/host-api';
import { S57Uploader } from './lib/components/S57Uploader';
import { S57LayerData } from './lib/utils/s57Converter';
import { selectS57LayerStyle } from './lib/styles/s57StyleRegistry';
import './lib/styles/uploader.css';

let appAPI: GeoLibreAppAPI | null = null;

export const s57ReaderPlugin: GeoLibrePlugin = {
  id: "geolibre-s57-reader",
  name: "S-57 Marine Chart Reader",
  version: "1.0.0",

  activate(app: GeoLibreAppAPI) {
    appAPI = app;

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
    appAPI = null;
    return true;
  }
};

function applyS57Style(map: any, name: string, hostedLayerId: string, s: GeoLibreNativeLayerStyle, attempt = 0) {
  if (!map || typeof map.getStyle !== "function") {
    if (attempt < 4) {
      setTimeout(() => applyS57Style(map, name, hostedLayerId, s, attempt + 1), 250);
    }
    return;
  }
  
  const styleLayers = map.getStyle().layers || [];
  const candidates = [name, hostedLayerId, `${name}-layer`, `${hostedLayerId}-layer`, `source-${name}`, `source-${hostedLayerId}`];
  
  styleLayers.forEach((layer: any) => {
    if (!layer?.id) return;
    const id = layer.id;
    if (id.includes(name) || id.includes(hostedLayerId) || id.includes("geojson") || id.includes("layer")) {
      candidates.push(id);
    }
  });
  
  const uniqueIds = [...new Set(candidates.filter(Boolean))];
  
  const paintOps: [string, any][] = [];
  if (s.fillColor) {
    paintOps.push(['fill-color', s.fillColor]);
    paintOps.push(['circle-color', s.fillColor]);
  }
  if (s.fillOpacity !== undefined) {
    paintOps.push(['fill-opacity', s.fillOpacity]);
    paintOps.push(['circle-opacity', s.fillOpacity]);
  }
  if (s.strokeColor) {
    paintOps.push(['line-color', s.strokeColor]);
    paintOps.push(['circle-stroke-color', s.strokeColor]);
  }
  if (s.strokeWidth !== undefined) {
    paintOps.push(['line-width', s.strokeWidth]);
    paintOps.push(['circle-stroke-width', s.strokeWidth]);
  }
  if (s.strokeDasharray && s.strokeDasharray !== 'none') {
    paintOps.push(['line-dasharray', s.strokeDasharray.split(',').map(Number)]);
  }
  if (s.circleRadius !== undefined) {
    paintOps.push(['circle-radius', s.circleRadius]);
  }

  uniqueIds.forEach(layerId => {
    paintOps.forEach(([property, value]) => {
      try {
        map.setPaintProperty(layerId, property, value);
      } catch (err) {}
    });
  });
  
  if (uniqueIds.length === 0 && attempt < 4) {
    setTimeout(() => applyS57Style(map, name, hostedLayerId, s, attempt + 1), 250);
  }
}

/**
 * Registers S-57 layers in GeoLibre's Layers Panel via addGeoJsonLayer,
 * then overrides their styling using getMap() for full MapLibre paint control.
 */
function handleLayersLoaded(layers: S57LayerData[]) {
  if (!appAPI) return;

  const map = appAPI.getMap?.();

  // Sort by priority: base layers first, labels last
  const orderedLayers = [...layers].sort((a, b) => {
    const styleA = selectS57LayerStyle(a.classCode, (a.metadata?.sampleProperties as Record<string, unknown>) ?? {});
    const styleB = selectS57LayerStyle(b.classCode, (b.metadata?.sampleProperties as Record<string, unknown>) ?? {});
    return styleA.priority - styleB.priority;
  });

  for (const layer of orderedLayers) {
    const sampleProperties = (layer.metadata?.sampleProperties as Record<string, unknown>) ?? {};
    const styleSelection = selectS57LayerStyle(layer.classCode, sampleProperties);
    const s = styleSelection.style;

    // Register in GeoLibre's Layers Panel
    const hostedLayerId = appAPI.addGeoJsonLayer(
      layer.layerName,
      layer.geojson as any,
      layer.fileName, // groups layers under the filename in the panel
    );

    if (map) {
      setTimeout(() => applyS57Style(map, layer.layerName, hostedLayerId, s), 0);
    }
  }
}

// Default export untuk dibaca oleh bundling system GeoLibre
export default s57ReaderPlugin;

