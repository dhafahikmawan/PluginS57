import { describe, it, expect } from 'vitest';
import {
  formatLightLabel,
  calculateDestinationPoint,
  generateSectorCoordinates,
  generateSectorsForFeature,
} from '../src/lib/utils/lights';
import { selectS57LayerStyle } from '../src/lib/styles/s57StyleRegistry';

// ---------------------------------------------------------------------------
// 1. Label generation tests
// ---------------------------------------------------------------------------

describe('formatLightLabel', () => {
  it('builds a full structured label from complete light attributes', () => {
    const label = formatLightLabel({
      LITCHR: 2,    // Fl
      SIGGRP: '(2)',
      COLOUR: '1,3', // W, R → WR
      SIGPER: 5,
      VALNMR: 15,
    });

    expect(label).toBe('Fl(2) WR 5s 15M');
  });

  it('omits the group part when SIGGRP is singular (1)', () => {
    const label = formatLightLabel({
      LITCHR: 2,
      SIGGRP: '1',
      COLOUR: '4',  // G
      SIGPER: 3,
    });

    expect(label).toBe('Fl G 3s');
  });

  it('wraps a raw numeric SIGGRP in parentheses', () => {
    const label = formatLightLabel({
      LITCHR: 2,
      SIGGRP: '3',
      COLOUR: '3', // R
    });

    expect(label).toBe('Fl(3) R');
  });

  it('falls back to OBJNAM when LITCHR is missing', () => {
    const label = formatLightLabel({
      OBJNAM: 'North Beacon',
      COLOUR: '3',
      SIGPER: 5,
    });

    expect(label).toBe('North Beacon');
  });

  it('falls back to NOBJNM when OBJNAM is also missing', () => {
    const label = formatLightLabel({
      NOBJNM: 'Utara',
    });

    expect(label).toBe('Utara');
  });

  it('returns empty string when no useful attributes are present', () => {
    const label = formatLightLabel({});
    expect(label).toBe('');
  });

  it('maps LITCHR=7 to Iso', () => {
    const label = formatLightLabel({ LITCHR: 7, COLOUR: '1' });
    expect(label).toBe('Iso W');
  });

  it('maps LITCHR=8 to Oc', () => {
    const label = formatLightLabel({ LITCHR: 8, SIGPER: 10 });
    expect(label).toBe('Oc 10s');
  });
});

// ---------------------------------------------------------------------------
// 2. Sector generation geometry tests
// ---------------------------------------------------------------------------

describe('calculateDestinationPoint', () => {
  it('returns a point approximately 1 NM north of the origin', () => {
    const NM_TO_M = 1852;
    const [lng, lat] = calculateDestinationPoint(106.8, -6.2, NM_TO_M, 0);

    // Bearing 0° → moving north: latitude increases, longitude stays close
    expect(lat).toBeGreaterThan(-6.2);
    expect(Math.abs(lng - 106.8)).toBeLessThan(0.001);
  });

  it('returns a point approximately 1 NM east of the origin', () => {
    const NM_TO_M = 1852;
    const [lng, lat] = calculateDestinationPoint(106.8, 0, NM_TO_M, 90);

    // Bearing 90° → moving east: longitude increases, latitude stays close
    expect(lng).toBeGreaterThan(106.8);
    expect(Math.abs(lat)).toBeLessThan(0.01);
  });
});

describe('generateSectorCoordinates', () => {
  it('starts and ends at the center point', () => {
    const center: [number, number] = [106.8, -6.2];
    const ring = generateSectorCoordinates(center, 5, 45, 135);

    // First and last coordinate must both be the center
    expect(ring[0]).toEqual(center);
    expect(ring[ring.length - 1]).toEqual(center);
  });

  it('has at least 4 coordinates to form a valid polygon ring', () => {
    const ring = generateSectorCoordinates([106.8, -6.2], 5, 0, 30);
    expect(ring.length).toBeGreaterThanOrEqual(4);
  });

  it('generates a full 360° ring when sector1=0 and sector2=360', () => {
    const ring = generateSectorCoordinates([106.8, -6.2], 5, 0, 360);

    // Should have enough points to approximate a circle (72 × 5° = 360°)
    expect(ring.length).toBeGreaterThan(10);
    // First and last are center
    expect(ring[0]).toEqual([106.8, -6.2]);
    expect(ring[ring.length - 1]).toEqual([106.8, -6.2]);
  });

  it('handles wrap-around sectors where sector2 < sector1', () => {
    // e.g. 270° → 90° should still generate a valid ring
    const ring = generateSectorCoordinates([106.8, -6.2], 3, 270, 90);
    expect(ring.length).toBeGreaterThanOrEqual(4);
    expect(ring[0]).toEqual([106.8, -6.2]);
    expect(ring[ring.length - 1]).toEqual([106.8, -6.2]);
  });
});

describe('generateSectorsForFeature', () => {
  const makeLight = (overrides: Record<string, any> = {}) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [106.8, -6.2] },
    properties: {
      LITCHR: 2,
      COLOUR: '3',
      VALNMR: 10,
      ...overrides,
    },
  });

  it('generates a sector polygon when SECTR1 and SECTR2 are defined', () => {
    const sectors = generateSectorsForFeature(
      makeLight({ SECTR1: 45, SECTR2: 135 }),
    );

    expect(sectors).toHaveLength(1);
    expect(sectors[0].type).toBe('Feature');
    expect(sectors[0].geometry.type).toBe('Polygon');
    // Properties should be copied from the light feature
    expect(sectors[0].properties.COLOUR).toBe('3');
  });

  it('does not generate a sector when SECTR1/SECTR2 are absent', () => {
    const sectors = generateSectorsForFeature(makeLight());
    expect(sectors).toHaveLength(0);
  });

  it('defaults to 9 NM when SECTR1/SECTR2 are present but VALNMR is missing', () => {
    const sectors = generateSectorsForFeature(makeLight({ SECTR1: 45, SECTR2: 135, VALNMR: undefined }));
    expect(sectors).toHaveLength(1);
    expect(sectors[0].geometry.type).toBe('Polygon');
    expect(sectors[0].geometry.coordinates[0].length).toBeGreaterThan(4);
  });

  it('generates a sector fan in the opposite direction of S-57 SECTR bearings', () => {
    const sectors = generateSectorsForFeature(makeLight({ SECTR1: 45, SECTR2: 135 }));
    const ring = sectors[0].geometry.coordinates[0];
    const center = ring[0] as [number, number];
    const firstArc = ring[1] as [number, number];

    const deltaLng = (firstArc[0] - center[0]) * Math.cos(center[1] * Math.PI / 180);
    const deltaLat = firstArc[1] - center[1];
    const bearing = (Math.atan2(deltaLng, deltaLat) * 180 / Math.PI + 360) % 360;

    expect(bearing).toBeGreaterThan(220);
    expect(bearing).toBeLessThan(230);
  });

  it('returns an empty array when VALNMR is missing', () => {
    const feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [106.8, -6.2] },
      properties: { LITCHR: 2, COLOUR: '3' }, // no VALNMR
    };

    expect(generateSectorsForFeature(feature)).toHaveLength(0);
  });

  it('returns an empty array for non-point geometries', () => {
    const feature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[106.8, -6.2], [107.0, -6.0]] },
      properties: { VALNMR: 5 },
    };

    expect(generateSectorsForFeature(feature)).toHaveLength(0);
  });

  it('returns an empty array for a null feature', () => {
    expect(generateSectorsForFeature(null)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Style selection tests for LIGHT_SECTORS
// ---------------------------------------------------------------------------

describe('LIGHT_SECTORS style selection', () => {
  it('resolves to the navigation family', () => {
    const style = selectS57LayerStyle('LIGHT_SECTORS', { COLOUR: '1' });
    expect(style.family).toBe('navigation');
  });

  it('has priority 69000, lower than LIGHTS (70000)', () => {
    const sectorStyle = selectS57LayerStyle('LIGHT_SECTORS', {});
    const lightsStyle = selectS57LayerStyle('LIGHTS', {});
    expect(sectorStyle.priority).toBe(69000);
    expect(sectorStyle.priority).toBeLessThan(lightsStyle.priority);
  });

  it('uses fillOpacity 0.25 for transparency', () => {
    const style = selectS57LayerStyle('LIGHT_SECTORS', {});
    expect(style.style.fillOpacity).toBe(0.25);
  });

  it('maps COLOUR=3 to red (#FF0000)', () => {
    const style = selectS57LayerStyle('LIGHT_SECTORS', { COLOUR: '3' });
    expect(style.style.fillColor).toBe('#FF0000');
    expect(style.style.strokeColor).toBe('#FF0000');
  });

  it('maps COLOUR=4 to green (#00FF00)', () => {
    const style = selectS57LayerStyle('LIGHT_SECTORS', { COLOUR: '4' });
    expect(style.style.fillColor).toBe('#00FF00');
    expect(style.style.strokeColor).toBe('#00FF00');
  });

  it('falls back to white/yellow (#F2E959) for unrecognised COLOUR', () => {
    const style = selectS57LayerStyle('LIGHT_SECTORS', { COLOUR: '1' });
    expect(style.style.fillColor).toBe('#F2E959');
    expect(style.style.strokeColor).toBe('#F2E959');
  });

  it('uses minZoom capped at 9 for high-purpose charts, but 0 for overview (purpose 1)', () => {
    // Purpose 1 → base minZoom 0, Math.min(0, 9) = 0 → sectors visible from zoom 0 in overview
    const overviewStyle = selectS57LayerStyle('LIGHT_SECTORS', {}, 1);
    expect(overviewStyle.minZoom).toBe(0);
    // Purpose 5 → base minZoom 13, Math.min(13, 9) = 9 → sectors visible from zoom 9
    const detailStyle = selectS57LayerStyle('LIGHT_SECTORS', {}, 5);
    expect(detailStyle.minZoom).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// 4. Color-split LIGHT_SECTORS layer generation from buildConversionBundleFromGeoJSON
// ---------------------------------------------------------------------------

import { buildConversionBundleFromGeoJSON } from '../src/lib/utils/s57Converter';
import { getS57Acronym } from '../src/lib/utils/s57ObjectClasses';

const LIGHTS_OBJL = Object.entries(
  // find numeric OBJL that maps to 'LIGHTS'
  Object.fromEntries(
    Array.from({ length: 500 }, (_, i) => [String(i), getS57Acronym(String(i))])
      .filter(([, v]) => v === 'LIGHTS')
  )
)[0]?.[0] ?? '75'; // 75 is the standard S-57 OBJL for LIGHTS

function makeLightFeature(colour: string, sectr1: number, sectr2: number, valnmr = 5) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [106.8, -6.2] },
    properties: { OBJL: Number(LIGHTS_OBJL), COLOUR: colour, SECTR1: sectr1, SECTR2: sectr2, VALNMR: valnmr },
  };
}

describe('buildConversionBundleFromGeoJSON – LIGHT_SECTORS color splitting', () => {
  it('produces LIGHT_SECTORS--RED layer for a red light (COLOUR contains 3)', () => {
    const geoJson = { type: 'FeatureCollection', features: [makeLightFeature('3', 45, 135)] };
    const bundle = buildConversionBundleFromGeoJSON(geoJson as any, 'test.000');
    const redLayer = bundle.processedLayers.find((l) => l.layerName === 'LIGHT_SECTORS--RED');
    expect(redLayer).toBeDefined();
    expect(redLayer!.classCode).toBe('LIGHT_SECTORS');
    expect(redLayer!.geojson.features.length).toBeGreaterThan(0);
  });

  it('produces LIGHT_SECTORS--GRN layer for a green light (COLOUR contains 4)', () => {
    const geoJson = { type: 'FeatureCollection', features: [makeLightFeature('4', 45, 135)] };
    const bundle = buildConversionBundleFromGeoJSON(geoJson as any, 'test.000');
    const grnLayer = bundle.processedLayers.find((l) => l.layerName === 'LIGHT_SECTORS--GRN');
    expect(grnLayer).toBeDefined();
    expect(grnLayer!.geojson.features.length).toBeGreaterThan(0);
  });

  it('produces LIGHT_SECTORS--YLW layer for an unrecognised colour (fallback)', () => {
    const geoJson = { type: 'FeatureCollection', features: [makeLightFeature('1', 45, 135)] };
    const bundle = buildConversionBundleFromGeoJSON(geoJson as any, 'test.000');
    const ylwLayer = bundle.processedLayers.find((l) => l.layerName === 'LIGHT_SECTORS--YLW');
    expect(ylwLayer).toBeDefined();
    expect(ylwLayer!.geojson.features.length).toBeGreaterThan(0);
  });

  it('produces separate color layers from a mixed-colour chart', () => {
    const geoJson = {
      type: 'FeatureCollection',
      features: [
        makeLightFeature('3', 45, 135),   // red
        makeLightFeature('4', 135, 225),  // green
        makeLightFeature('1', 225, 315),  // yellow fallback
      ],
    };
    const bundle = buildConversionBundleFromGeoJSON(geoJson as any, 'test.000');
    const layerNames = bundle.processedLayers.map((l) => l.layerName);
    expect(layerNames).toContain('LIGHT_SECTORS--RED');
    expect(layerNames).toContain('LIGHT_SECTORS--GRN');
    expect(layerNames).toContain('LIGHT_SECTORS--YLW');
    // No bare LIGHT_SECTORS layer should be emitted
    expect(layerNames).not.toContain('LIGHT_SECTORS');
  });

  it('does not emit a LIGHT_SECTORS layer when there are no sectors', () => {
    // Light with no SECTR1/SECTR2 → no sectors generated
    const geoJson = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [106.8, -6.2] },
        properties: { OBJL: Number(LIGHTS_OBJL), COLOUR: '3', VALNMR: 5 },
      }],
    };
    const bundle = buildConversionBundleFromGeoJSON(geoJson as any, 'test.000');
    const sectorLayers = bundle.processedLayers.filter((l) => l.classCode === 'LIGHT_SECTORS');
    expect(sectorLayers).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Color-suffixed LIGHT_SECTORS style resolution
// ---------------------------------------------------------------------------

describe('LIGHT_SECTORS--* color-suffixed style selection', () => {
  it('LIGHT_SECTORS--RED resolves to #FF0000 with priority 69000', () => {
    const style = selectS57LayerStyle('LIGHT_SECTORS--RED', {});
    expect(style.family).toBe('navigation');
    expect(style.priority).toBe(69000);
    expect(style.style.fillColor).toBe('#FF0000');
    expect(style.style.strokeColor).toBe('#FF0000');
    expect(style.style.fillOpacity).toBe(0.25);
  });

  it('LIGHT_SECTORS--GRN resolves to #00FF00 with priority 69000', () => {
    const style = selectS57LayerStyle('LIGHT_SECTORS--GRN', {});
    expect(style.priority).toBe(69000);
    expect(style.style.fillColor).toBe('#00FF00');
    expect(style.style.strokeColor).toBe('#00FF00');
  });

  it('LIGHT_SECTORS--YLW resolves to #F2E959 with priority 69000', () => {
    const style = selectS57LayerStyle('LIGHT_SECTORS--YLW', {});
    expect(style.priority).toBe(69000);
    expect(style.style.fillColor).toBe('#F2E959');
    expect(style.style.strokeColor).toBe('#F2E959');
  });

  it('color-suffixed layers use Math.min(purposeMinZoom, 9) for minZoom', () => {
    // Purpose 1 → base minZoom 0, Math.min(0, 9) = 0 (visible in overview)
    expect(selectS57LayerStyle('LIGHT_SECTORS--RED', {}, 1).minZoom).toBe(0);
    expect(selectS57LayerStyle('LIGHT_SECTORS--GRN', {}, 1).minZoom).toBe(0);
    expect(selectS57LayerStyle('LIGHT_SECTORS--YLW', {}, 1).minZoom).toBe(0);
    // Purpose 5 → base minZoom 13, Math.min(13, 9) = 9
    expect(selectS57LayerStyle('LIGHT_SECTORS--RED', {}, 5).minZoom).toBe(9);
  });

  it('layer name suffix takes precedence over COLOUR attribute for red', () => {
    // Even if attributes say green (COLOUR 4), the layer name suffix wins
    const style = selectS57LayerStyle('LIGHT_SECTORS--RED', { COLOUR: '4' });
    expect(style.style.fillColor).toBe('#FF0000');
  });
});
