import { describe, expect, it } from 'vitest';
import { generateTSSArrows, identifyTSSLanes, orderPointsWithinLane } from '../src/lib/utils/tssArrowsGenerator';
import type { ProcessedTSSLPT } from '../src/lib/utils/tsslptProcessor';

function createProcessedPoint(coords: [number, number], id: string): ProcessedTSSLPT {
  return {
    originalFeature: {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coords },
      properties: { OBJNAM: id },
    },
    validated: true,
    reprojected: coords,
    order: 1,
    groupId: 'lane-1',
  } as ProcessedTSSLPT;
}

describe('tssArrowsGenerator', () => {
  it('identifies lanes from nearby points', () => {
    const points = [
      createProcessedPoint([0, 0], 'a'),
      createProcessedPoint([1000, 0], 'b'),
      createProcessedPoint([2000, 0], 'c'),
    ];

    const lanes = identifyTSSLanes(points);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].points).toHaveLength(3);
  });

  it('orders points within a lane', () => {
    const points = [
      createProcessedPoint([2000, 0], 'c'),
      createProcessedPoint([0, 0], 'a'),
      createProcessedPoint([1000, 0], 'b'),
    ];

    const ordered = orderPointsWithinLane(points);
    expect(ordered.map((point) => point.originalFeature.properties?.OBJNAM)).toEqual(['a', 'b', 'c']);
  });

  it('generates arrows for a lane', () => {
    const points = [
      createProcessedPoint([0, 0], 'a'),
      createProcessedPoint([1000, 0], 'b'),
      createProcessedPoint([2000, 0], 'c'),
    ];

    const arrows = generateTSSArrows(points, { arrowInterval: 1000, arrowType: 'vector' });
    expect(arrows.length).toBeGreaterThan(0);
    expect(arrows[0].properties.arrowType).toBe('vector');
  });
});
