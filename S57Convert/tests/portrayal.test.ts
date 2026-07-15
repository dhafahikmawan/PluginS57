import { describe, it, expect } from 'vitest';
import { buildLightSectorFeature, buildProcessedSoundingFeatures, deriveLightLabel } from '../src/lib/utils/s57Converter';
import { selectS57LayerStyle } from '../src/lib/styles/s57StyleRegistry';

describe('SOUNDG_processed portrayal helpers', () => {
  it('builds processed sounding features from sample SOUNDG attribute values', () => {
    const features = buildProcessedSoundingFeatures({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [104.7352146, -7.5613644],
      },
      properties: {
        OBJL: 129,
        ATTL_133: '1100000',
      },
    });

    expect(features).toHaveLength(1);
    expect(features[0].properties.DEPTH).toBe(11);
    expect(features[0].properties.DEPTH_INT).toBe(11);
    expect(features[0].properties.DEPTH_DEC).toBe('0');
  });
});

describe('LIGHTS portrayal helpers', () => {
  it('derives a readable label from light attributes', () => {
    const label = deriveLightLabel({
      LITCHR: 'Fl',
      SIGGRP: '2',
      COLOUR: '3',
      SIGPER: '5s',
      VALNMR: '15',
      OBJNAM: 'North Beacon',
    });

    expect(label).toBe('Fl(2) R 5s 15M');
  });

  it('falls back to the object name when no light-specific attributes are present', () => {
    const label = deriveLightLabel({ OBJNAM: 'North Beacon' });

    expect(label).toBe('North Beacon');
  });

  it('uses the derived light label for LIGHTS styling metadata', () => {
    const selection = selectS57LayerStyle('LIGHTS', {
      COLOUR: '3',
      _light_label: 'Fl(2) R 5s 15M',
    });

    expect(selection.family).toBe('navigation');
    expect(selection.labelField).toBe('_light_label');
    expect(selection.style.fillColor).toBe('#CD4759');
  });

  it('builds a sector polygon from SECTR1, SECTR2, and range attributes', () => {
    const sectorFeature = buildLightSectorFeature(
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0, 0],
        },
        properties: {
          SECTR1: '300',
          SECTR2: '330',
          VALNMR: '15',
          OBJNAM: 'North Beacon',
        },
      },
      'LIGHTS',
    );

    expect(sectorFeature).toBeDefined();
    expect(sectorFeature?.geometry.type).toBe('Polygon');
    expect(sectorFeature?.properties?._sector_start).toBe(300);
    expect(sectorFeature?.properties?._sector_end).toBe(330);
    expect(sectorFeature?.properties?._sector_range_m).toBe(27780);
  });
});
