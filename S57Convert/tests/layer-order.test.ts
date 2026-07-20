import { s57ReaderPlugin, handleLayersLoaded } from '../src/geolibre';

// Mocks for appAPI and map to capture addGeoJsonLayer calls and style app.

function makeAppApiRecorder() {
  const calls: Array<{ id: string; geojson: any; group: string }> = [];
  return {
    calls,
    addGeoJsonLayer(id: string, geojson: any, group: string) {
      calls.push({ id, geojson, group });
      return id + '-hosted';
    },
    getMap() {
      return {
        getStyle: () => ({ layers: [] }),
        setPaintProperty: () => {},
        getPaintProperty: () => undefined,
        setLayerZoomRange: () => {},
        on: () => {},
        off: () => {},
      };
    },
  } as any;
}

// Minimal S57LayerData fixture builder
function mkLayer(classCode: string, layerName: string, fileName = 'file.000', extra?: any) {
  return {
    classCode,
    layerName,
    fileName,
    geojson: { type: 'FeatureCollection', features: [] },
    metadata: extra ?? {},
  } as any;
}

describe('layer ordering', () => {
  test('priority preserves original index and inserts derived layers', async () => {
    const app = makeAppApiRecorder();
    (s57ReaderPlugin as any).activate(app);


    // Construct layers out of order to test stable sort
    const layers = [
      mkLayer('DEPARE', 'DEPARE'),
      mkLayer('LNDARE', 'LNDARE'),
      mkLayer('LIGHTS', 'LIGHTS'),
    ];

    // Add a pre-generated LIGHT_SECTORS derived layer in the bundle
    layers.push(mkLayer('LIGHT_SECTORS', 'LIGHT_SECTORS'));

    // Call the exported internal handler directly
    handleLayersLoaded(layers, 1);

    // Expect that LIGHTS is added, then LIGHT_SECTORS follows it
    const ids = app.calls.map((c) => c.id);
    const lightsIndex = ids.findIndex((id) => id.includes('LIGHTS'));
    const sectorsIndex = ids.findIndex((id) => id.includes('LIGHT_SECTORS'));

    expect(lightsIndex).toBeGreaterThanOrEqual(0);
    expect(sectorsIndex).toBeGreaterThanOrEqual(0);
    expect(sectorsIndex).toBeGreaterThan(lightsIndex);
  });
});
