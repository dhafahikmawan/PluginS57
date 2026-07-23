import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { createGeoJsonZip, createNestedGeoJsonZip } from '../src/lib/utils/downloadZip';

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
      processedLayers: [
        {
          classCode: 'SOUNDG',
          layerName: 'SOUNDG--DEPARE',
          geojson: {
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: { DEPTH: 15, DRVAL1: 10, DRVAL2: 20 } }],
          },
        },
      ],
    };

    const blob = await createGeoJsonZip(bundle);

    expect(blob).toBeInstanceOf(Blob);

    const zip = await JSZip.loadAsync(blob);
    const lightsContent = await zip.file('raw/LIGHTS.geojson')?.async('string');
    const soundgContent = await zip.file('raw/SOUNDG.geojson')?.async('string');
    const processedContent = await zip.file('processed/SOUNDG--DEPARE.geojson')?.async('string');
    const manifestContent = await zip.file('manifest.json')?.async('string');

    expect(lightsContent).toContain('"OBJNAM": "Light 1"');
    expect(soundgContent).toContain('"DEPTH": 15');
    expect(processedContent).toContain('"DRVAL1": 10');
    expect(manifestContent).toContain('"sourceFileName": "sample.000"');
    expect(manifestContent).toContain('"SOUNDG--DEPARE"');
  });
});

describe('createNestedGeoJsonZip', () => {
  it('creates an outer zip containing nested zip files for multiple bundles', async () => {
    const bundleA = {
      sourceFileName: 'sampleA.000',
      rawGeojsonByClass: {
        LIGHTS: { type: 'FeatureCollection', features: [] },
      },
      processedLayers: [],
    };
    const bundleB = {
      sourceFileName: 'sampleB.000',
      rawGeojsonByClass: {
        SOUNDG: { type: 'FeatureCollection', features: [] },
      },
      processedLayers: [],
    };

    const blob = await createNestedGeoJsonZip([bundleA, bundleB], 'all-converted-files');
    const outerZip = await JSZip.loadAsync(blob);

    const innerA = await outerZip.file('sampleA.zip')?.async('blob');
    const innerB = await outerZip.file('sampleB.zip')?.async('blob');
    const manifestContent = await outerZip.file('manifest.json')?.async('string');

    expect(innerA).toBeInstanceOf(Blob);
    expect(innerB).toBeInstanceOf(Blob);
    expect(manifestContent).toContain('"sourceFileName": "sampleA.000"');
    expect(manifestContent).toContain('"sourceFileName": "sampleB.000"');
  });
});
