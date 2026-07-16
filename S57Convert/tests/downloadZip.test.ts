import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { createGeoJsonZip } from '../src/lib/utils/downloadZip';

describe('createGeoJsonZip', () => {
  it('creates a zip archive with raw GeoJSON files and a manifest', async () => {
    const bundle = {
      sourceFileName: 'sample.000',
      rawGeojsonByClass: {
        LIGHTS: {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', properties: { OBJNAM: 'Light 1' } }],
        },
        SOUNDG: {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', properties: { DEPTH: 15 } }],
        },
      },
      processedLayers: [],
    };

    const blob = await createGeoJsonZip(bundle);

    expect(blob).toBeInstanceOf(Blob);

    const zip = await JSZip.loadAsync(blob);
    const lightsContent = await zip.file('raw/LIGHTS.geojson')?.async('string');
    const soundgContent = await zip.file('raw/SOUNDG.geojson')?.async('string');
    const manifestContent = await zip.file('raw/manifest.json')?.async('string');

    expect(lightsContent).toContain('"OBJNAM": "Light 1"');
    expect(soundgContent).toContain('"DEPTH": 15');
    expect(manifestContent).toContain('"sourceFileName": "sample.000"');
  });
});
