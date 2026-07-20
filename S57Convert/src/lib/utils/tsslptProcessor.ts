export interface TSSLPTFeatureLike {
  type: string;
  id?: string | number;
  geometry?: { type?: string; coordinates?: unknown };
  properties?: Record<string, unknown>;
}

export interface TSSLPTFeature {
  id?: string;
  geometry: { type: string; coordinates: [number, number] | [number, number][] | [number, number][][]; };
  properties: {
    OBJL?: number;
    OBJNAM?: string;
    SEQCCL?: number;
    ORCCL?: number;
    RESTRN?: string[];
    [key: string]: unknown;
  };
}

export interface ProcessedTSSLPT {
  originalFeature: TSSLPTFeatureLike;
  validated: boolean;
  reprojected: [number, number];
  order?: number;
  direction?: number;
  groupId?: string;
  isDuplicate?: boolean;
  style?: TSSLPTStyle;
}

export interface TSSLPTStyle {
  symbolSize: number;
  color: string;
  opacity: number;
  rotationAngle?: number;
  labelText?: string;
  labelOffset?: [number, number];
}

export interface TSSLPTProcessOptions {
  sourceProjection?: string;
  targetProjection?: string;
  deduplicationTolerance?: number;
  minZoom?: number;
  maxZoom?: number;
  preserveSourceId?: boolean;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toCoordinate(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length < 2) {
    return undefined;
  }

  const x = Number(value[0]);
  const y = Number(value[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return undefined;
  }

  return [x, y];
}

function toWebMercator(coord: [number, number]): [number, number] {
  const [lon, lat] = coord;
  const x = lon * 20037508.34 / 180;
  const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  const mercatorY = y * 20037508.34 / 180;
  return [x, mercatorY];
}

function fromWebMercator(coord: [number, number]): [number, number] {
  const [x, y] = coord;
  const lon = (x / 20037508.34) * 180;
  const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI / 180)) * 360 / Math.PI) - 90;
  return [lon, lat];
}

export function validateTSSLPTGeometry(feature: TSSLPTFeatureLike): boolean {
  if (!feature || feature.geometry?.type !== 'Point') {
    return false;
  }

  const coordinates = toCoordinate((feature.geometry as { coordinates?: unknown }).coordinates);
  return coordinates !== undefined;
}

export function reprojectTSSLPTCoordinate(
  coord: [number, number],
  sourceProjection = 'EPSG:4326',
  targetProjection = 'EPSG:3857',
): [number, number] {
  const normalizedSource = String(sourceProjection || '').toUpperCase();
  const normalizedTarget = String(targetProjection || '').toUpperCase();

  if (normalizedSource === normalizedTarget) {
    return coord;
  }

  if (normalizedSource === 'EPSG:4326' && normalizedTarget === 'EPSG:3857') {
    return toWebMercator(coord);
  }

  if (normalizedSource === 'EPSG:3857' && normalizedTarget === 'EPSG:4326') {
    return fromWebMercator(coord);
  }

  return coord;
}

export function extractOrderingAttributes(feature: TSSLPTFeatureLike): { order?: number; direction?: number; groupId?: string } {
  const properties = (feature.properties ?? {}) as Record<string, unknown>;
  const order = asNumber(properties.SEQCCL ?? properties._tsslpt_order);
  const direction = asNumber(properties.ORCCL ?? properties._tsslpt_direction);
  const groupId = asString(properties.OBJNAM ?? properties._tsslpt_group);

  return {
    order,
    direction,
    groupId,
  };
}

export function deduplicateTSSLPTPoints(features: ProcessedTSSLPT[], toleranceMeters = 10): ProcessedTSSLPT[] {
  const deduped: ProcessedTSSLPT[] = [];

  for (const candidate of features) {
    const isDuplicate = deduped.some((existing) => {
      const distance = Math.hypot(
        candidate.reprojected[0] - existing.reprojected[0],
        candidate.reprojected[1] - existing.reprojected[1],
      );
      return distance <= toleranceMeters;
    });

    const processed = { ...candidate, isDuplicate };
    if (!isDuplicate) {
      deduped.push(processed);
    }
  }

  return deduped;
}

export function applyVisibilityRules(feature: ProcessedTSSLPT, zoomLevel: number): boolean {
  if (!feature.validated) {
    return false;
  }

  const minZoom = feature.style?.symbolSize ? 8 : 8;
  return zoomLevel >= minZoom;
}

export function resolveTSSLPTStyle(attributes: Record<string, unknown>): TSSLPTStyle {
  const direction = asNumber(attributes.ORCCL ?? attributes._tsslpt_direction) ?? 0;
  const labelText = asString(attributes.OBJNAM) ?? 'TSSLPT';

  return {
    symbolSize: 6,
    color: '#c545c3',
    opacity: 0.9,
    rotationAngle: direction,
    labelText,
    labelOffset: [0, 1.2],
  };
}

export function processTSSLPTBatch(
  rawFeatures: TSSLPTFeatureLike[],
  options: TSSLPTProcessOptions = {},
): ProcessedTSSLPT[] {
  const sourceProjection = options.sourceProjection ?? 'EPSG:4326';
  const targetProjection = options.targetProjection ?? 'EPSG:3857';
  const deduplicationTolerance = options.deduplicationTolerance ?? 10;
  const preserveSourceId = options.preserveSourceId ?? true;

  const processed: ProcessedTSSLPT[] = [];

  for (const feature of rawFeatures) {
    if (!validateTSSLPTGeometry(feature)) {
      continue;
    }

    const geometryCoordinates = toCoordinate((feature.geometry as { coordinates?: unknown }).coordinates);
    if (!geometryCoordinates) {
      continue;
    }

    const reprojected = reprojectTSSLPTCoordinate(geometryCoordinates, sourceProjection, targetProjection);
    const ordering = extractOrderingAttributes(feature);
    const originalFeature = preserveSourceId && feature.id !== undefined
      ? { ...feature, id: feature.id }
      : { ...feature };

    const styledFeature: TSSLPTFeatureLike = {
      ...originalFeature,
      type: 'Feature',
      properties: {
        ...(originalFeature.properties ?? {}),
        _tsslpt_order: ordering.order,
        _tsslpt_direction: ordering.direction,
        _tsslpt_group: ordering.groupId,
      },
    };

    processed.push({
      originalFeature: styledFeature,
      validated: true,
      reprojected,
      order: ordering.order,
      direction: ordering.direction,
      groupId: ordering.groupId,
      style: resolveTSSLPTStyle(styledFeature.properties ?? {}),
    });
  }

  const deduped = deduplicateTSSLPTPoints(processed, deduplicationTolerance);
  return deduped;
}
