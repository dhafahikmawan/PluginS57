import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleDeleteFileLayer, handleLayersLoaded, s57ReaderPlugin } from '../src/geolibre';

function createLayer(fileName: string, layerName: string, classCode: string) {
  return {
    fileName,
    layerName,
    classCode,
    geojson: { type: 'FeatureCollection', features: [] },
    metadata: { sampleProperties: {} },
  } as any;
}

describe('group by file handling', () => {
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      addGeoJsonLayer: vi.fn((name: string) => `layer-${name}`),
      unregisterExternalNativeLayer: vi.fn(),
      getMap: () => null,
    };
    s57ReaderPlugin.activate(mockApp);
  });

  afterEach(() => {
    vi.clearAllMocks();
    s57ReaderPlugin.deactivate(mockApp);
  });

  it('assigns a file id and tracks generated layers for a newly uploaded file', () => {
    const result = handleLayersLoaded([createLayer('chart-one.000', 'SOUNDG', 'SOUNDG')], 1);

    expect(result).toEqual({ id: 1, name: 'chart-one.000' });
    expect(mockApp.addGeoJsonLayer).toHaveBeenCalledTimes(1);
    expect(mockApp.unregisterExternalNativeLayer).not.toHaveBeenCalled();
  });

  it('unregisters every layer tied to a specific file id when that file is deleted', () => {
    const firstFile = handleLayersLoaded([
      createLayer('chart-one.000', 'SOUNDG', 'SOUNDG'),
      createLayer('chart-one.000', 'NAVMARE', 'NAVMARE'),
    ], 1);

    handleLayersLoaded([createLayer('chart-two.000', 'LIGHTS', 'LIGHTS')], 1);

    expect(firstFile).not.toBeUndefined();
    if (!firstFile) return;

    handleDeleteFileLayer(firstFile.id);

    expect(mockApp.unregisterExternalNativeLayer).toHaveBeenCalledTimes(2);
    expect(mockApp.unregisterExternalNativeLayer).toHaveBeenCalledWith('layer-chart-one.000--SOUNDG');
    expect(mockApp.unregisterExternalNativeLayer).toHaveBeenCalledWith('layer-chart-one.000--NAVMARE');
    expect(mockApp.unregisterExternalNativeLayer).not.toHaveBeenCalledWith('layer-chart-two.000--LIGHTS');
  });

  it('removes all LIGHT_SECTORS color variant layers when the owning file is deleted', () => {
    // Simulate a file that produced red, green, and yellow sector layers + a LIGHTS layer
    const redSectorLayer = createLayer('chart-one.000', 'LIGHT_SECTORS--RED', 'LIGHT_SECTORS');
    const grnSectorLayer = createLayer('chart-one.000', 'LIGHT_SECTORS--GRN', 'LIGHT_SECTORS');
    const ylwSectorLayer = createLayer('chart-one.000', 'LIGHT_SECTORS--YLW', 'LIGHT_SECTORS');
    const lightsLayer    = createLayer('chart-one.000', 'LIGHTS--RED',         'LIGHTS');

    // The LIGHTS layer must come after the sector layers in the list so the
    // pending-derived logic can consume them when LIGHTS is processed.
    const file = handleLayersLoaded([redSectorLayer, grnSectorLayer, ylwSectorLayer, lightsLayer], 1);

    expect(file).not.toBeUndefined();
    if (!file) return;

    // Four addGeoJsonLayer calls expected: 3 sector variants consumed by LIGHTS + 1 LIGHTS itself
    expect(mockApp.addGeoJsonLayer).toHaveBeenCalledTimes(4);

    handleDeleteFileLayer(file.id);

    // All four layers should be unregistered
    expect(mockApp.unregisterExternalNativeLayer).toHaveBeenCalledTimes(4);
    expect(mockApp.unregisterExternalNativeLayer).toHaveBeenCalledWith(
      expect.stringContaining('LIGHT_SECTORS--RED')
    );
    expect(mockApp.unregisterExternalNativeLayer).toHaveBeenCalledWith(
      expect.stringContaining('LIGHT_SECTORS--GRN')
    );
    expect(mockApp.unregisterExternalNativeLayer).toHaveBeenCalledWith(
      expect.stringContaining('LIGHT_SECTORS--YLW')
    );
  });
});
