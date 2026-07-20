import { describe, expect, it } from 'vitest';
import {
  deduplicateTSSLPTPoints,
  extractOrderingAttributes,
  processTSSLPTBatch,
  reprojectTSSLPTCoordinate,
  validateTSSLPTGeometry,
} from '../src/lib/utils/tsslptProcessor';

describe('tsslptProcessor', () => {
  it('validates point geometries', () => {
    const validFeature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [1, 2] },
      properties: {},
    } as GeoJSON.Feature;
    const invalidFeature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
      properties: {},
    } as GeoJSON.Feature;

    expect(validateTSSLPTGeometry(validFeature)).toBe(true);
    expect(validateTSSLPTGeometry(invalidFeature)).toBe(false);
  });

  it('reprojects coordinates to Web Mercator', () => {
    const [x, y] = reprojectTSSLPTCoordinate([0, 0], 'EPSG:4326', 'EPSG:3857');
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(0, 5);

    const [lon, lat] = reprojectTSSLPTCoordinate([0, 1], 'EPSG:4326', 'EPSG:3857');
    expect(lon).toBeCloseTo(0, 5);
    expect(lat).toBeGreaterThan(0);
  });

  it('extracts ordering metadata from attributes', () => {
    const feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [1, 2] },
      properties: { SEQCCL: 3, ORCCL: 45, OBJNAM: 'lane-a' },
    } as GeoJSON.Feature;

    expect(extractOrderingAttributes(feature)).toEqual({
      order: 3,
      direction: 45,
      groupId: 'lane-a',
    });
  });

  it('deduplicates close points', () => {
    const features = [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { OBJNAM: 'first' },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0.00001, 0] },
        properties: { OBJNAM: 'second' },
      },
    ] as GeoJSON.Feature[];

    const processed = processTSSLPTBatch(features, { deduplicationTolerance: 20 });
    const deduped = deduplicateTSSLPTPoints(processed, 20);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].originalFeature.properties?.OBJNAM).toBe('first');
  });
});
