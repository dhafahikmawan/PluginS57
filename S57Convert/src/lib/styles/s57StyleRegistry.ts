import type { GeoLibreNativeLayerStyle } from '../geolibre/host-api';

export type S57LayerFamily =
  | 'base'
  | 'land'
  | 'depth'
  | 'contour'
  | 'restricted'
  | 'hazard'
  | 'navigation'
  | 'routing'
  | 'sounding'
  | 'label';

export interface S57StyleSelection {
  family: S57LayerFamily;
  priority: number;
  minZoom: number;
  style: GeoLibreNativeLayerStyle;
  labelField?: string;
}

const COLORS = {
  CHBLK: '#070707',
  CHGRY: '#a3b4b7',
  CHRED: '#CD4759',
  CHGRN: '#59C249',
  CHYLW: '#D0BA3D',
  LANDA: '#AB9D68',
  LANDF: '#8b661f',
  CHBRN: '#b19139',
  DEPDW: '#D4EAEE',
  DEPMD: '#BAD5E1',
  DEPMS: '#98C5F2',
  DEPVS: '#73B6EF',
  DEPIT: '#83B295',
  DEPCN: '#7D898C',
  CSTLN: '#525A5C',
  TRFCD: '#c545c3',
  RADHI: '#d3a6e9',
  LITYW: '#f4da48',
};

const LAND_CLASSES = new Set(['LNDARE', 'LAKARE', 'COALNE', 'CONVYR', 'BUAARE', 'BUISGL', 'DRYDOC', 'ROADWY']);
const DEPTH_CLASSES = new Set(['DEPARE', 'DRGARE', 'CANALS', 'DOCARE', 'LOKBSN', 'RIVERS', 'TUNNEL']);
const CONTOUR_CLASSES = new Set(['DEPCNT', 'SLCONS']);
const RESTRICTED_CLASSES = new Set(['RESARE', 'PONTON', 'PIPARE', 'CBLSUB', 'CBLOHD', 'PIPOHD']);
const HAZARD_CLASSES = new Set(['WRECKS', 'OBSTRN', 'UWTROC', 'CBLARE']);
const NAVIGATION_CLASSES = new Set(['LIGHTS', 'BOYINB', 'BOYISD', 'BCNARE', 'BCNLAT', 'BOYLAT', 'BOYCAR', 'BOYSPP', 'BOYSAW', 'BCNCAR', 'BCNSPP', 'BCNISD', 'LITFLT']);
const ROUTING_CLASSES = new Set(['SEAARE', 'TSSRON', 'TSELNE', 'TSSBND', 'TRFLNE']);
const SOUNDING_CLASSES = new Set(['SOUNDG']);
const LABEL_CLASSES = new Set(['TEXT', 'M_ACCY', 'M_NPUB']);

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

function buildDepthStyle(attributes: Record<string, unknown>): GeoLibreNativeLayerStyle {
  const drval1 = asNumber(attributes.DRVAL1) ?? 0;
  
  let fillColor = COLORS.DEPDW;
  if (drval1 < 0) fillColor = COLORS.DEPIT;
  else if (drval1 < 2.0) fillColor = COLORS.DEPVS;
  else if (drval1 < 30.0) fillColor = COLORS.DEPMS;
  else fillColor = COLORS.DEPDW;

  return {
    fillColor,
    fillOpacity: 1.0,
    strokeColor: COLORS.DEPCN,
    strokeWidth: 0.5,
  };
}

function buildContourStyle(attributes: Record<string, unknown>): GeoLibreNativeLayerStyle {
  const uncertain = asString(attributes.QUAPOS) === '2' || asString(attributes.CONDTN) === '2';

  return {
    strokeColor: COLORS.DEPCN,
    strokeWidth: 1.0,
    strokeDasharray: uncertain ? '4,4' : 'none',
  };
}

function buildRestrictedStyle(): GeoLibreNativeLayerStyle {
  return {
    fillColor: COLORS.TRFCD,
    fillOpacity: 0.2,
    strokeColor: COLORS.TRFCD,
    strokeWidth: 1.5,
    strokeDasharray: '6,4',
  };
}

function buildHazardStyle(): GeoLibreNativeLayerStyle {
  return {
    fillColor: COLORS.CHRED,
    fillOpacity: 0.8,
    strokeColor: COLORS.CHBLK,
    strokeWidth: 1.0,
    circleRadius: 4,
  };
}

function buildNavigationStyle(attributes: Record<string, unknown>): GeoLibreNativeLayerStyle {
  const colString = asString(attributes.COLOUR) ?? '';
  let color = COLORS.CHYLW;
  if (colString.includes('3')) color = COLORS.CHRED;
  else if (colString.includes('4')) color = COLORS.CHGRN;
  
  return {
    fillColor: color,
    fillOpacity: 0.9,
    strokeColor: COLORS.CHBLK,
    strokeWidth: 1.0,
    circleRadius: 5,
  };
}

function buildRoutingStyle(): GeoLibreNativeLayerStyle {
  return {
    strokeColor: COLORS.TRFCD,
    strokeWidth: 2,
    strokeDasharray: '6,4',
    fillOpacity: 0,
  };
}

function buildSoundingStyle(): GeoLibreNativeLayerStyle {
  return {
    fillColor: COLORS.CHBLK,
    fillOpacity: 0.95,
    circleRadius: 2,
  };
}

function buildLabelStyle(): GeoLibreNativeLayerStyle {
  return {
    fillColor: COLORS.CHBLK,
    fillOpacity: 0.95,
    strokeColor: '#ffffff',
    strokeWidth: 0.5,
  };
}

export function selectS57LayerStyle(
  classCode: string,
  attributes: Record<string, unknown> = {},
): S57StyleSelection {
  const normalizedCode = String(classCode || '').toUpperCase();
  const normalizedAttributes = attributes ?? {};

  if (LAND_CLASSES.has(normalizedCode)) {
    return {
      family: 'land',
      priority: 20000,
      minZoom: 1,
      style: {
        fillColor: COLORS.LANDA,
        fillOpacity: 1.0,
        strokeColor: COLORS.CSTLN,
        strokeWidth: 1,
      },
    };
  }

  if (DEPTH_CLASSES.has(normalizedCode)) {
    return {
      family: 'depth',
      priority: 30000,
      minZoom: 2,
      style: buildDepthStyle(normalizedAttributes),
    };
  }

  if (CONTOUR_CLASSES.has(normalizedCode)) {
    return {
      family: 'contour',
      priority: 50000,
      minZoom: 3,
      style: buildContourStyle(normalizedAttributes),
    };
  }

  if (RESTRICTED_CLASSES.has(normalizedCode)) {
    return {
      family: 'restricted',
      priority: 35000,
      minZoom: 3,
      style: buildRestrictedStyle(),
    };
  }

  if (HAZARD_CLASSES.has(normalizedCode)) {
    return {
      family: 'hazard',
      priority: 60000,
      minZoom: 4,
      style: buildHazardStyle(),
    };
  }

  if (NAVIGATION_CLASSES.has(normalizedCode)) {
    const labelField = normalizedCode === 'LIGHTS' || normalizedCode === 'LITFLT'
      ? (asString(normalizedAttributes._light_label) ? '_light_label' : asString(normalizedAttributes.OBJNAM) ? 'OBJNAM' : undefined)
      : undefined;

    return {
      family: 'navigation',
      priority: 70000,
      minZoom: 4,
      style: buildNavigationStyle(normalizedAttributes),
      labelField,
    };
  }

  if (ROUTING_CLASSES.has(normalizedCode)) {
    return {
      family: 'routing',
      priority: 80000,
      minZoom: 5,
      style: buildRoutingStyle(),
    };
  }

  if (SOUNDING_CLASSES.has(normalizedCode)) {
    return {
      family: 'sounding',
      priority: 85000,
      minZoom: 6,
      style: buildSoundingStyle(),
      labelField: 'VALSOU',
    };
  }

  if (LABEL_CLASSES.has(normalizedCode)) {
    return {
      family: 'label',
      priority: 90000,
      minZoom: 6,
      style: buildLabelStyle(),
      labelField: asString(normalizedAttributes.OBJNAM) ?? 'OBJNAM',
    };
  }

  return {
    family: 'base',
    priority: 10000,
    minZoom: 1,
    style: {
      fillColor: COLORS.CHGRY,
      fillOpacity: 0.4,
      strokeColor: COLORS.DEPCN,
      strokeWidth: 1,
    },
  };
}
