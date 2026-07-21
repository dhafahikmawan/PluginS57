/**
 * Utility functions for S-57 LIGHTS and LITFLT features.
 *
 * Covers:
 *   - formatLightLabel   – builds a human-readable label from light attributes
 *   - calculateDestinationPoint – geodesic projection from a point
 *   - generateSectorCoordinates – arc interpolation for a sector fan polygon
 *   - generateSectorsForFeature – generates GeoJSON Polygon sector feature(s) for a LIGHTS feature
 */

// ---------------------------------------------------------------------------
// 1. LITCHR code → abbreviation mapping
// ---------------------------------------------------------------------------
const LITCHR_ABBR: Record<number, string> = {
  1: 'F',
  2: 'Fl',
  3: 'LFl',
  4: 'Q',
  5: 'VQ',
  6: 'UQ',
  7: 'Iso',
  8: 'Oc',
  9: 'IQ',
  10: 'IVQ',
  11: 'IUQ',
  12: 'Mo',
  13: 'FFl',
  14: 'FlLFl',
  15: 'OcFl',
  16: 'FLFl',
  17: 'Al',
  18: 'AlOc',
  19: 'AlLFl',
  20: 'AlFl',
  21: 'AlGp',
  25: 'Q+LFl',
  26: 'VQ+LFl',
  27: 'UQ+LFl',
  28: 'Al',
  29: 'AlFl',
};

// ---------------------------------------------------------------------------
// 2. COLOUR code → letter mapping (S-57 attribute list values)
// ---------------------------------------------------------------------------
const COLOUR_LETTER: Record<number, string> = {
  1: 'W',
  2: 'B',
  3: 'R',
  4: 'G',
  5: 'Bu',
  6: 'Y',
  7: 'Or',
  8: 'Vi',
};

// ---------------------------------------------------------------------------
// 3. formatLightLabel
// ---------------------------------------------------------------------------

/**
 * Builds a human-readable light label from S-57 feature properties.
 *
 * Output format: `<LITCHR><SIGGRP> <COLOUR> <SIGPER>s <VALNMR>M`
 * e.g. `Fl(2) WR 5s 15M`
 *
 * Falls back to OBJNAM → NOBJNM → empty string when structured attributes
 * are insufficient to produce a meaningful result.
 */
export function formatLightLabel(properties: Record<string, any>): string {
  const litchr = parseIntProp(properties.LITCHR);
  const sigper = parseFloatProp(properties.SIGPER);
  const valnmr = parseFloatProp(properties.VALNMR);
  const siggrpRaw = properties.SIGGRP;
  const colourRaw = properties.COLOUR;

  // We need at least a characteristic code to build a structured label.
  if (litchr === undefined) {
    return String(properties.OBJNAM ?? properties.NOBJNM ?? '');
  }

  const charAbbr = LITCHR_ABBR[litchr] ?? `Char${litchr}`;

  // Signal group: strip parentheses if already present, then re-wrap.
  // Omit the group part when the value is singular (1, (1), etc.).
  const siggrpStr = formatSigGrp(siggrpRaw);

  // Colour letters
  const colourStr = formatColours(colourRaw);

  // Assemble parts
  const parts: string[] = [];
  parts.push(charAbbr + siggrpStr);
  if (colourStr) parts.push(colourStr);
  if (sigper !== undefined) parts.push(`${sigper}s`);
  if (valnmr !== undefined) parts.push(`${valnmr}M`);

  const label = parts.join(' ');

  // If the result is only the char abbreviation with no useful extra info, fall
  // back to the name field if one exists so the label is still informative.
  if (label === charAbbr && (properties.OBJNAM || properties.NOBJNM)) {
    return String(properties.OBJNAM ?? properties.NOBJNM);
  }

  return label;
}

function formatSigGrp(raw: any): string {
  if (raw === undefined || raw === null) return '';
  const str = String(raw).trim().replace(/^\(|\)$/g, ''); // strip wrapping parens
  const num = Number(str);
  if (!Number.isFinite(num) || num <= 1) return '';
  return `(${num})`;
}

function formatColours(raw: any): string {
  if (raw === undefined || raw === null) return '';
  const codes = String(raw)
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));

  return codes
    .map((c) => COLOUR_LETTER[c] ?? '')
    .filter(Boolean)
    .join('');
}

function parseIntProp(value: any): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string') {
    const n = parseInt(value.trim(), 10);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function parseFloatProp(value: any): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value.trim());
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// 4. calculateDestinationPoint
// ---------------------------------------------------------------------------

const EARTH_RADIUS_M = 6_371_000;
const NM_TO_METERS = 1_852;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Calculates the destination point given a start point, distance, and bearing.
 * Uses the spherical-earth (Haversine) destination formula.
 *
 * @param lng  Longitude of origin in decimal degrees
 * @param lat  Latitude of origin in decimal degrees
 * @param distanceMeters  Distance to project in metres
 * @param bearingDegrees  True bearing in degrees clockwise from north
 * @returns  [longitude, latitude] of the destination point
 */
export function calculateDestinationPoint(
  lng: number,
  lat: number,
  distanceMeters: number,
  bearingDegrees: number,
): [number, number] {
  const phi1 = lat * DEG_TO_RAD;
  const lambda1 = lng * DEG_TO_RAD;
  const theta = bearingDegrees * DEG_TO_RAD;
  const delta = distanceMeters / EARTH_RADIUS_M;

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const sinDelta = Math.sin(delta);
  const cosDelta = Math.cos(delta);

  const sinPhi2 = sinPhi1 * cosDelta + cosPhi1 * sinDelta * Math.cos(theta);
  const phi2 = Math.asin(Math.max(-1, Math.min(1, sinPhi2)));

  const y = Math.sin(theta) * sinDelta * cosPhi1;
  const x = cosDelta - sinPhi1 * sinPhi2;
  const lambda2 = lambda1 + Math.atan2(y, x);

  return [(lambda2 / DEG_TO_RAD + 540) % 360 - 180, phi2 / DEG_TO_RAD];
}

// ---------------------------------------------------------------------------
// 5. generateSectorCoordinates
// ---------------------------------------------------------------------------

/**
 * Generates the coordinate ring for a light sector polygon fan.
 *
 * The polygon starts at the center, fans out from sector1 to sector2 in
 * ARC_STEP_DEG increments (clockwise), then closes back to the center.
 *
 * @param center     [lng, lat] of the light position
 * @param rangeNm    Nominal range in nautical miles
 * @param sector1    Start bearing in degrees (clockwise from north)
 * @param sector2    End bearing in degrees (clockwise from north)
 * @returns          Array of [lng, lat] coordinate pairs (closed polygon ring)
 */
export function generateSectorCoordinates(
  center: [number, number],
  rangeNm: number,
  sector1: number,
  sector2: number,
): Array<[number, number]> {
  const ARC_STEP_DEG = 5;
  const rangeM = rangeNm * NM_TO_METERS;

  const [lng, lat] = center;

  const coords: Array<[number, number]> = [];

  // Start at center
  coords.push([lng, lat]);

  // Arc: normalize sector2 so it is always > sector1 when going clockwise
  let end = sector2;
  if (end <= sector1) {
    end += 360;
  }

  for (let bearing = sector1; bearing <= end; bearing += ARC_STEP_DEG) {
    coords.push(calculateDestinationPoint(lng, lat, rangeM, bearing % 360));
  }

  // Ensure the arc end point is always included (handles step not landing exactly on it)
  coords.push(calculateDestinationPoint(lng, lat, rangeM, end % 360));

  // Close back to center
  coords.push([lng, lat]);

  return coords;
}

// ---------------------------------------------------------------------------
// 6. generateSectorsForFeature
// ---------------------------------------------------------------------------

/**
 * Generates GeoJSON Polygon sector feature(s) for a single LIGHTS/LITFLT feature.
 *
 * Handles:
 *  - Defined sectors (SECTR1 / SECTR2 present) → fan polygon
 *  - All-around lights (SECTR1/SECTR2 absent but VALNMR present) → full 360° circle polygon
 *  - No range → returns empty array
 */
export function generateSectorsForFeature(feature: Record<string, unknown> | null | undefined): Array<Record<string, unknown>> {
  const geometry = (feature as { geometry?: { type?: string; coordinates?: unknown } } | null | undefined)?.geometry;
  const props: Record<string, unknown> = (feature as { properties?: Record<string, unknown> } | null | undefined)?.properties ?? {};

  // Must be a point geometry
  if (!geometry || geometry.type !== 'Point') {
    return [];
  }

  const coords = geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) {
    return [];
  }

  const center: [number, number] = [Number(coords[0]), Number(coords[1])];

  const rawValnmr = parseFloatProp(props.VALNMR);
  const sectr1 = parseFloatProp(props.SECTR1);
  const sectr2 = parseFloatProp(props.SECTR2);
  const hasSectorBounds = sectr1 !== undefined && sectr2 !== undefined;

  if (!hasSectorBounds) {
    return [];
  }

  // Use 9 NM as a fallback when sector bounds are defined but range is missing.
  const rangeNm = rawValnmr && rawValnmr > 0 ? rawValnmr : 9;

  if (rangeNm <= 0) {
    return [];
  }

  // S-57 sector bearings are reported from seaward towards the light,
  // so the visible sector fan is the opposite direction.
  const sectorStart = (sectr1 + 180) % 360;
  const sectorEnd = (sectr2 + 180) % 360;
  const ring = generateSectorCoordinates(center, rangeNm, sectorStart, sectorEnd);

  if (ring.length < 4) {
    return [];
  }

  return [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
      properties: { ...props },
    },
  ];
}
