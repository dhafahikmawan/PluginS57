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

  it('generates a full 360° sector when SECTR1/SECTR2 are absent but VALNMR is present', () => {
    const sectors = generateSectorsForFeature(makeLight());
    expect(sectors).toHaveLength(1);
    expect(sectors[0].geometry.type).toBe('Polygon');
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

  it('uses minZoom 9 (aligned with LIGHTS) regardless of purpose', () => {
    // Purpose 1 → base minZoom 0, but LIGHT_SECTORS clamps to 9
    const style = selectS57LayerStyle('LIGHT_SECTORS', {}, 1);
    expect(style.minZoom).toBe(9);
  });
});
