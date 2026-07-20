import type { ProcessedTSSLPT } from './tsslptProcessor';

export interface TSSLane {
  id: string;
  points: ProcessedTSSLPT[];
  direction: number;
  startPoint: [number, number];
  endPoint: [number, number];
}

export interface GeneratedArrow {
  id: string;
  geometry: { type: string; coordinates: unknown };
  properties: {
    sourceFeatureIds?: string[];
    direction: number;
    laneId: string;
    positionAlong?: number;
    arrowType: 'icon' | 'vector';
    [key: string]: unknown;
  };
}

export interface TSSArrowsOptions {
  arrowInterval?: number;
  arrowType?: 'icon' | 'vector';
  arrowSize?: number;
  offsetMeters?: number;
  minZoom?: number;
  maxZoom?: number;
  preserveSourceTraceability?: boolean;
  enableCaching?: boolean;
}

function distance(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function identifyTSSLanes(tsslptFeatures: ProcessedTSSLPT[]): TSSLane[] {
  const groups = new Map<string, ProcessedTSSLPT[]>();

  for (const feature of tsslptFeatures) {
    const groupId = feature.groupId ?? `lane-${feature.originalFeature.properties?.OBJNAM ?? feature.originalFeature.id ?? 'default'}`;
    const existing = groups.get(groupId) ?? [];
    existing.push(feature);
    groups.set(groupId, existing);
  }

  return Array.from(groups.entries()).map(([id, points]) => {
    const ordered = orderPointsWithinLane(points);
    const first = ordered[0]?.reprojected ?? [0, 0];
    const last = ordered[ordered.length - 1]?.reprojected ?? [0, 0];
    const direction = Math.atan2(last[1] - first[1], last[0] - first[0]) * 180 / Math.PI;

    return {
      id,
      points: ordered,
      direction,
      startPoint: first,
      endPoint: last,
    };
  });
}

export function orderPointsWithinLane(points: ProcessedTSSLPT[]): ProcessedTSSLPT[] {
  return [...points].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const aCoord = a.reprojected;
    const bCoord = b.reprojected;
    return aCoord[0] - bCoord[0] || aCoord[1] - bCoord[1];
  });
}

function constructCenterlineSegments(orderedPoints: [number, number][]): Array<{ type: string; coordinates: [number, number][] }> {
  if (orderedPoints.length < 2) {
    return [];
  }

  return orderedPoints.slice(1).map((point, index) => ({
    type: 'LineString',
    coordinates: [orderedPoints[index], point],
  }));
}

export function computeDirectionVectors(segments: Array<{ type: string; coordinates: [number, number][] }>): Array<{ angle: number; length: number }> {
  return segments.map((segment) => {
    const [start, end] = segment.coordinates;
    const angle = Math.atan2(end[1] - start[1], end[0] - start[0]) * 180 / Math.PI;
    const length = distance(start as [number, number], end as [number, number]);
    return { angle, length };
  });
}

function buildVectorArrowhead(centerPoint: [number, number], direction: number, size = 50): { type: string; coordinates: [number, number][][] } {
  const radians = direction * Math.PI / 180;
  const half = size / 2;
  const tip: [number, number] = [centerPoint[0] + Math.cos(radians) * size, centerPoint[1] + Math.sin(radians) * size];
  const left: [number, number] = [centerPoint[0] + Math.cos(radians + Math.PI / 3) * half, centerPoint[1] + Math.sin(radians + Math.PI / 3) * half];
  const right: [number, number] = [centerPoint[0] + Math.cos(radians - Math.PI / 3) * half, centerPoint[1] + Math.sin(radians - Math.PI / 3) * half];

  return {
    type: 'Polygon',
    coordinates: [[centerPoint, left, tip, right, centerPoint]],
  };
}

function buildIconArrow(position: [number, number], _direction: number): { type: string; coordinates: [number, number] } {
  return {
    type: 'Point',
    coordinates: position,
  };
}

export function placeArrowsAlongLane(lane: TSSLane, interval = 5000, arrowType: 'icon' | 'vector' = 'vector'): GeneratedArrow[] {
  const orderedPoints = lane.points.map((point) => point.reprojected);
  const segments = constructCenterlineSegments(orderedPoints);
  const vectors = computeDirectionVectors(segments);
  const arrows: GeneratedArrow[] = [];

  vectors.forEach((vector, index) => {
    const segment = segments[index];
    const [start] = segment.coordinates as [number, number][];
    const step = Math.max(1, Math.round(interval / Math.max(vector.length, 1)));
    const position = [start[0] + Math.cos(vector.angle * Math.PI / 180) * (step * 100), start[1] + Math.sin(vector.angle * Math.PI / 180) * (step * 100)] as [number, number];
    const geometry = arrowType === 'icon'
      ? buildIconArrow(position, vector.angle)
      : buildVectorArrowhead(position, vector.angle, 50);

    arrows.push({
      id: `${lane.id}-arrow-${index}`,
      geometry,
      properties: {
        sourceFeatureIds: lane.points.map((point) => point.originalFeature.id?.toString() ?? 'unknown'),
        direction: vector.angle,
        laneId: lane.id,
        positionAlong: index / Math.max(1, vectors.length),
        arrowType,
      },
    });
  });

  return arrows;
}

export function applyOffsetToArrows(arrows: GeneratedArrow[], offsetMeters = 0): GeneratedArrow[] {
  if (offsetMeters === 0) {
    return arrows;
  }

  return arrows.map((arrow) => ({
    ...arrow,
    geometry: {
      ...arrow.geometry,
      coordinates: (arrow.geometry as { coordinates?: [number, number] | [number, number][] | [number, number][][] }).coordinates
        ? [(((arrow.geometry as { coordinates?: [number, number] | [number, number][] | [number, number][][] }).coordinates as [number, number])[0] + offsetMeters), (((arrow.geometry as { coordinates?: [number, number] | [number, number][] | [number, number][][] }).coordinates as [number, number])[1] + offsetMeters)]
        : (arrow.geometry as { coordinates?: [number, number] | [number, number][] | [number, number][][] }).coordinates,
    },
  }));
}

export function clipArrowsToViewport(arrows: GeneratedArrow[], bounds: [number, number, number, number]): GeneratedArrow[] {
  return arrows.filter((arrow) => {
    const coords = (arrow.geometry as { coordinates?: [number, number] | [number, number][] | [number, number][][] }).coordinates ?? [];
    const point = Array.isArray(coords) && coords.length >= 2 ? coords : [0, 0];
    const x = typeof point[0] === 'number' ? point[0] : 0;
    const y = typeof point[1] === 'number' ? point[1] : 0;
    return x >= bounds[0] && x <= bounds[2] && y >= bounds[1] && y <= bounds[3];
  });
}

export function generateTSSArrows(tsslptFeatures: ProcessedTSSLPT[], options: TSSArrowsOptions = {}): GeneratedArrow[] {
  const arrowInterval = options.arrowInterval ?? 5000;
  const arrowType = options.arrowType ?? 'vector';
  const offsetMeters = options.offsetMeters ?? 0;

  const lanes = identifyTSSLanes(tsslptFeatures);
  const arrows = lanes.flatMap((lane) => placeArrowsAlongLane(lane, arrowInterval, arrowType));
  return applyOffsetToArrows(arrows, offsetMeters);
}
