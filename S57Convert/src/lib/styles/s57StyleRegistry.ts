import type { GeoLibreNativeLayerStyle } from '../geolibre/host-api';
import { selectIconMapping } from '../utils/iconHelper';

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
  maxZoom?: number;
  style: GeoLibreNativeLayerStyle;
  labelField?: string;
}

interface TrackedS57Style {
  layerId: string;
  styleSelection: S57StyleSelection;
  classCode: string;
  attributes: Record<string, unknown>;
}

export class StyleTracker {
  private trackedStyles = new Map<string, TrackedS57Style>();

  trackStyle(
    layerId: string,
    styleSelection: S57StyleSelection,
    classCode: string,
    attributes: Record<string, unknown> = {},
  ) {
    if (!layerId) {
      return;
    }

    this.trackedStyles.set(layerId, {
      layerId,
      styleSelection,
      classCode,
      attributes,
    });
  }

  getStyle(layerId: string): S57StyleSelection | null {
    return this.trackedStyles.get(layerId)?.styleSelection ?? null;
  }

  getTrackedStyle(layerId: string): TrackedS57Style | null {
    return this.trackedStyles.get(layerId) ?? null;
  }

  getAllTrackedLayers(): string[] {
    return [...this.trackedStyles.keys()];
  }

  resetAll() {
    this.trackedStyles.clear();
  }
}

export class StyleReapplier {
  constructor(private readonly tracker: StyleTracker = new StyleTracker()) {}

  async reapplyStyle(
    map: { getStyle?: () => { layers?: Array<{ id?: string; source?: string }> }; setPaintProperty?: (layerId: string, property: string, value: unknown) => void; getPaintProperty?: (layerId: string, property: string) => unknown; setLayerZoomRange?: (layerId: string, minZoom: number, maxZoom?: number) => void },
    layerId: string,
    styleSelection?: S57StyleSelection | null,
    classCode?: string,
    attributes: Record<string, unknown> = {},
    targetName?: string,
  ): Promise<boolean> {
    const trackedStyle = styleSelection
      ? { layerId, styleSelection, classCode: classCode ?? '', attributes }
      : this.tracker.getTrackedStyle(layerId);

    if (!trackedStyle || !map || typeof map.getStyle !== 'function') {
      return false;
    }

    const candidateLayerIds = this.getCandidateLayerIds(map, layerId, targetName);
    if (candidateLayerIds.length === 0) {
      return false;
    }

    const paintOps = this.buildPaintOps(trackedStyle.styleSelection.style);
    let applied = false;

    candidateLayerIds.forEach((candidateLayerId) => {
      const minZoom = trackedStyle.styleSelection.minZoom;
      const maxZoom = trackedStyle.styleSelection.maxZoom;

      if (minZoom !== undefined) {
        try {
          if (maxZoom !== undefined) {
            map.setLayerZoomRange?.(candidateLayerId, minZoom, maxZoom);
          } else {
            map.setLayerZoomRange?.(candidateLayerId, minZoom);
          }
          applied = true;
        } catch {
          // Ignore transient MapLibre setter failures and retry later.
        }
      }

      paintOps.forEach(([property, value]) => {
        try {
          const currentValue = map.getPaintProperty?.(candidateLayerId, property);
          if (currentValue !== value) {
            map.setPaintProperty?.(candidateLayerId, property, value);
          }
          applied = true;
        } catch {
          // Ignore transient MapLibre setter failures and retry later.
        }
      });
    });

    return applied;
  }

  async reapplyAllStyles(map: { getStyle?: () => { layers?: Array<{ id?: string; source?: string }> }; setPaintProperty?: (layerId: string, property: string, value: unknown) => void; getPaintProperty?: (layerId: string, property: string) => unknown }): Promise<number> {
    const trackedLayers = this.tracker.getAllTrackedLayers();
    let appliedCount = 0;

    for (const trackedLayerId of trackedLayers) {
      const applied = await this.reapplyStyle(map, trackedLayerId);
      if (applied) {
        appliedCount += 1;
      }
    }

    return appliedCount;
  }

  private buildPaintOps(style: GeoLibreNativeLayerStyle): Array<[string, unknown]> {
    const paintOps: Array<[string, unknown]> = [];

    if (style.fillColor) {
      paintOps.push(['fill-color', style.fillColor]);
      paintOps.push(['circle-color', style.fillColor]);
    }

    if (style.fillOpacity !== undefined) {
      paintOps.push(['fill-opacity', style.fillOpacity]);
      paintOps.push(['circle-opacity', style.fillOpacity]);
    }

    if (style.strokeColor) {
      paintOps.push(['line-color', style.strokeColor]);
      paintOps.push(['circle-stroke-color', style.strokeColor]);
    }

    if (style.strokeWidth !== undefined) {
      paintOps.push(['line-width', style.strokeWidth]);
      paintOps.push(['circle-stroke-width', style.strokeWidth]);
    }

    if (style.strokeDasharray && style.strokeDasharray !== 'none') {
      paintOps.push(['line-dasharray', style.strokeDasharray.split(',').map(Number)]);
    }

    if (style.circleRadius !== undefined) {
      paintOps.push(['circle-radius', style.circleRadius]);
    }

    // Icon and symbol properties (layout properties, not paint)
    if (style.iconImage) {
      paintOps.push(['icon-image', style.iconImage]);
    }

    if (style.iconSize !== undefined) {
      paintOps.push(['icon-size', style.iconSize]);
    }

    if (style.iconAllowOverlap !== undefined) {
      paintOps.push(['icon-allow-overlap', style.iconAllowOverlap]);
    }

    if (style.iconIgnorePlacement !== undefined) {
      paintOps.push(['icon-ignore-placement', style.iconIgnorePlacement]);
    }

    if (style.textField) {
      paintOps.push(['text-field', style.textField]);
    }

    if (style.textSize !== undefined) {
      paintOps.push(['text-size', style.textSize]);
    }

    if (style.textOffset !== undefined) {
      paintOps.push(['text-offset', style.textOffset]);
    }

    if (style.textAnchor) {
      paintOps.push(['text-anchor', style.textAnchor]);
    }

    return paintOps;
  }

  private getCandidateLayerIds(
    map: { getStyle?: () => { layers?: Array<{ id?: string; source?: string }> } },
    layerId: string,
    targetName?: string,
  ): string[] {
    const styleLayers = map.getStyle?.()?.layers ?? [];
    const tokens = [layerId, targetName].filter(Boolean) as string[];
    const candidates = new Set<string>();

    styleLayers.forEach((layer) => {
      if (!layer?.id) {
        return;
      }

      const layerName = layer.id;
      const sourceName = layer.source ?? '';
      const matchesToken = tokens.some((token) => {
        const normalizedToken = token.toLowerCase();
        return layerName.toLowerCase().includes(normalizedToken) || sourceName.toLowerCase().includes(normalizedToken);
      });

      if (matchesToken || layerName === layerId || sourceName === layerId) {
        candidates.add(layerName);
      }
    });

    return [...candidates];
  }
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
  // S-52 Navigation light colors (official standard)
  NAV_RED: '#CD4759',
  NAV_GREEN: '#00A04D',
  NAV_YELLOW: '#FFCE00',
};

const LAND_CLASSES = new Set(['LNDARE', 'LAKARE', 'COALNE', 'CONVYR', 'BUAARE', 'BUISGL', 'DRYDOC', 'ROADWY']);
const DEPTH_CLASSES = new Set(['DEPARE', 'DRGARE', 'CANALS', 'DOCARE', 'LOKBSN', 'RIVERS', 'TUNNEL']);
const CONTOUR_CLASSES = new Set(['DEPCNT', 'SLCONS']);
const RESTRICTED_CLASSES = new Set(['RESARE', 'PONTON', 'PIPARE', 'CBLSUB', 'CBLOHD', 'PIPOHD']);
const HAZARD_CLASSES = new Set(['WRECKS', 'OBSTRN', 'UWTROC', 'CBLARE']);
const NAVIGATION_CLASSES = new Set(['LIGHTS', 'BOYINB', 'BOYISD', 'BCNARE', 'BCNLAT', 'BOYLAT', 'BOYCAR', 'BOYSPP', 'BOYSAW', 'BCNCAR', 'BCNSPP', 'BCNISD', 'LITFLT']);
const ROUTING_CLASSES = new Set(['SEAARE', 'TSSRON', 'TSELNE', 'TSSBND', 'TRFLNE']);
const SOUNDING_CLASSES = new Set(['SOUNDG', 'SOUNDG_PROCESSED']);
const LANDMARK_CLASSES = new Set(['LNDMRK']);
const LABEL_CLASSES = new Set(['TEXT', 'M_ACCY', 'M_NPUB']);
const BASE_CHART_CLASSES = new Set(['LNDARE', 'DEPARE', 'DRGARE', 'COALNE', 'FLODOC', 'PONTON', 'UNSARE', 'HULKES', 'LAKARE', 'BUAARE', 'RIVERS', 'CANALS', 'ROADWY', 'SLCONS', 'BRIDGE']);

const PURPOSE_ZOOM_RANGES: Record<number, { minZoom: number; maxZoom: number }> = {
  1: { minZoom: 0, maxZoom: 9 },
  2: { minZoom: 7, maxZoom: 10 },
  3: { minZoom: 9, maxZoom: 12 },
  4: { minZoom: 11, maxZoom: 14 },
  5: { minZoom: 13, maxZoom: 17 },
  6: { minZoom: 16, maxZoom: 22 },
};

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

function resolvePurposeCode(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return undefined;
}

function getPurposeZoomRange(purposeCode?: string | number): { minZoom: number; maxZoom: number } {
  const normalized = resolvePurposeCode(purposeCode);
  if (normalized && PURPOSE_ZOOM_RANGES[normalized]) {
    return PURPOSE_ZOOM_RANGES[normalized];
  }

  return PURPOSE_ZOOM_RANGES[1] ?? { minZoom: 0, maxZoom: 9 };
}

function getLayerZoomRange(classCode: string, purposeCode?: string | number): { minZoom: number; maxZoom: number } {
  const normalizedCode = String(classCode || '').toUpperCase();
  const purposeRange = getPurposeZoomRange(purposeCode);

  if (BASE_CHART_CLASSES.has(normalizedCode)) {
    return { minZoom: purposeRange.minZoom, maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'DEPCNT') {
    return { minZoom: Math.max(purposeRange.minZoom, 5), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'SOUNDG' || normalizedCode === 'SOUNDG_PROCESSED') {
    return { minZoom: Math.max(purposeRange.minZoom, 7), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'SEAARE') {
    return { minZoom: Math.max(purposeRange.minZoom, 4), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'LNDRGN') {
    return { minZoom: Math.max(purposeRange.minZoom, 5), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'SBDARE') {
    return { minZoom: Math.max(purposeRange.minZoom, 8), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'RESARE' || normalizedCode === 'MIPARE' || normalizedCode === 'ISTZNE' || normalizedCode === 'PRCARE' || normalizedCode === 'COSARE' || normalizedCode === 'CONZNE' || normalizedCode === 'RECTRC' || normalizedCode === 'TSELNE' || normalizedCode === 'TSSBND' || normalizedCode === 'TSEZNE' || normalizedCode === 'CTNARE' || normalizedCode === 'EXEZNE' || normalizedCode === 'ADMARE') {
    return { minZoom: Math.max(purposeRange.minZoom, 7), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'ACHARE') {
    return { minZoom: Math.max(purposeRange.minZoom, 8), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'DMPGRD' || normalizedCode === 'CBLSUB' || normalizedCode === 'PIPSOL') {
    return { minZoom: Math.max(purposeRange.minZoom, 9), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'PIPOHD' || normalizedCode === 'CBLOHD') {
    return { minZoom: Math.max(purposeRange.minZoom, 10), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'LIGHTS') {
    return { minZoom: Math.max(purposeRange.minZoom, 9), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'LIGHT_SECTORS') {
    return { minZoom: Math.max(purposeRange.minZoom, 9), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'LITFLT' || normalizedCode === 'MORFAC') {
    return { minZoom: Math.max(purposeRange.minZoom, 11), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'TOPMAR' || normalizedCode === 'PILBOP' || normalizedCode === 'BERTHS' || normalizedCode === 'CRANES') {
    return { minZoom: Math.max(purposeRange.minZoom, 12), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'BOYLAT' || normalizedCode === 'BOYCAR' || normalizedCode === 'BOYSPP' || normalizedCode === 'BOYISD' || normalizedCode === 'BOYSAW' || normalizedCode === 'BCNLAT' || normalizedCode === 'BCNSPP' || normalizedCode === 'BCNCAR' || normalizedCode === 'BCNISD') {
    return { minZoom: Math.max(purposeRange.minZoom, 10), maxZoom: purposeRange.maxZoom };
  }

  if (normalizedCode === 'WRECKS' || normalizedCode === 'UWTROC' || normalizedCode === 'OBSTRN' || normalizedCode === 'LNDMRK') {
    return { minZoom: Math.max(purposeRange.minZoom, 10), maxZoom: purposeRange.maxZoom };
  }

  return { minZoom: Math.max(purposeRange.minZoom, 1), maxZoom: purposeRange.maxZoom };
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


function buildHazardSymbolStyle(classCode: string, attributes: Record<string, unknown>): GeoLibreNativeLayerStyle {
  const iconMapping = selectIconMapping(classCode, attributes);
  
  return {
    iconImage: iconMapping.spriteKey,
    iconSize: iconMapping.size ?? 18,
    iconAllowOverlap: iconMapping.allowOverlap ?? false,
    iconIgnorePlacement: iconMapping.ignorePlacement ?? false,
  };
}



function buildNavigationSymbolStyle(classCode: string, attributes: Record<string, unknown>): GeoLibreNativeLayerStyle {
  const iconMapping = selectIconMapping(classCode, attributes);
  
  return {
    iconImage: iconMapping.spriteKey,
    iconSize: iconMapping.size ?? 20,
    iconAllowOverlap: iconMapping.allowOverlap ?? true,
    iconIgnorePlacement: iconMapping.ignorePlacement ?? false,
  };
}

function buildLightSectorStyle(attributes: Record<string, unknown>): GeoLibreNativeLayerStyle {
  // Colors per Colors.md §2.3:
  //   COLOUR contains '3' → #FF0000 (red)
  //   COLOUR contains '4' → #00FF00 (green)
  //   fallback              → #F2E959 (white/yellow)
  const colString = asString(attributes.COLOUR) ?? '';
  let color = '#F2E959';
  if (colString.includes('3')) color = '#FF0000';
  else if (colString.includes('4')) color = '#00FF00';

  return {
    fillColor: color,
    fillOpacity: 0.25,
    strokeColor: color,
    strokeWidth: 1.0,
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

function buildLandmarkSymbolStyle(attributes: Record<string, unknown>): GeoLibreNativeLayerStyle {
  const iconMapping = selectIconMapping('LNDMRK', attributes);
  
  return {
    iconImage: iconMapping.spriteKey,
    iconSize: iconMapping.size ?? 20,
    iconAllowOverlap: true,
    iconIgnorePlacement: false,
    textField: asString(attributes.OBJNAM) ?? undefined,
    textSize: 10,
    textOffset: [0, 1.5],
    textAnchor: 'top',
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
  purposeCode?: string | number,
): S57StyleSelection {
  const normalizedCode = String(classCode || '').toUpperCase();
  const normalizedAttributes = attributes ?? {};
  const purposeCandidate = normalizedAttributes.PURPOSE ?? normalizedAttributes.ENC_PURPOSE ?? normalizedAttributes.PURP ?? normalizedAttributes.M_HOPA ?? normalizedAttributes.HOPA ?? normalizedAttributes.M_COVR ?? normalizedAttributes.COVR;
  const zoomRange = getLayerZoomRange(normalizedCode, purposeCode ?? resolvePurposeCode(purposeCandidate));

  if (LAND_CLASSES.has(normalizedCode)) {
    return {
      family: 'land',
      priority: 20000,
      minZoom: zoomRange.minZoom,
      maxZoom: zoomRange.maxZoom,
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
      minZoom: zoomRange.minZoom,
      maxZoom: zoomRange.maxZoom,
      style: buildDepthStyle(normalizedAttributes),
    };
  }

  if (CONTOUR_CLASSES.has(normalizedCode)) {
    return {
      family: 'contour',
      priority: 50000,
      minZoom: zoomRange.minZoom,
      maxZoom: zoomRange.maxZoom,
      style: buildContourStyle(normalizedAttributes),
    };
  }

  if (RESTRICTED_CLASSES.has(normalizedCode)) {
    return {
      family: 'restricted',
      priority: 35000,
      minZoom: zoomRange.minZoom,
      maxZoom: zoomRange.maxZoom,
      style: buildRestrictedStyle(),
    };
  }

  if (HAZARD_CLASSES.has(normalizedCode)) {
    return {
      family: 'hazard',
      priority: 60000,
      minZoom: zoomRange.minZoom,
      maxZoom: zoomRange.maxZoom,
      style: buildHazardSymbolStyle(normalizedCode, normalizedAttributes),
    };
  }

  if (normalizedCode === 'LIGHT_SECTORS') {
    return {
      family: 'navigation',
      priority: 69000,
      minZoom: zoomRange.minZoom,
      maxZoom: zoomRange.maxZoom,
      style: buildLightSectorStyle(normalizedAttributes),
    };
  }

  if (NAVIGATION_CLASSES.has(normalizedCode)) {
    const labelField = normalizedCode === 'LIGHTS' || normalizedCode === 'LITFLT'
      ? (asString(normalizedAttributes._light_label) ? '_light_label' : asString(normalizedAttributes.OBJNAM) ? 'OBJNAM' : undefined)
      : undefined;

    return {
      family: 'navigation',
      priority: 70000,
      minZoom: zoomRange.minZoom,
      maxZoom: zoomRange.maxZoom,
      style: buildNavigationSymbolStyle(normalizedCode, normalizedAttributes),
      labelField,
    };
  }

  if (ROUTING_CLASSES.has(normalizedCode)) {
    return {
      family: 'routing',
      priority: 80000,
      minZoom: zoomRange.minZoom,
      maxZoom: zoomRange.maxZoom,
      style: buildRoutingStyle(),
    };
  }

  if (SOUNDING_CLASSES.has(normalizedCode)) {
    return {
      family: 'sounding',
      priority: 85000,
      minZoom: zoomRange.minZoom,
      maxZoom: zoomRange.maxZoom,
      style: buildSoundingStyle(),
      labelField: 'VALSOU',
    };
  }

  if (LANDMARK_CLASSES.has(normalizedCode)) {
    return {
      family: 'navigation',
      priority: 72000,
      minZoom: zoomRange.minZoom,
      maxZoom: zoomRange.maxZoom,
      style: buildLandmarkSymbolStyle(normalizedAttributes),
      labelField: asString(normalizedAttributes.OBJNAM) ?? undefined,
    };
  }

  if (LABEL_CLASSES.has(normalizedCode)) {
    return {
      family: 'label',
      priority: 90000,
      minZoom: zoomRange.minZoom,
      maxZoom: zoomRange.maxZoom,
      style: buildLabelStyle(),
      labelField: asString(normalizedAttributes.OBJNAM) ?? 'OBJNAM',
    };
  }

  return {
    family: 'base',
    priority: 10000,
    minZoom: zoomRange.minZoom,
    maxZoom: zoomRange.maxZoom,
    style: {
      fillColor: COLORS.CHGRY,
      fillOpacity: 0.4,
      strokeColor: COLORS.DEPCN,
      strokeWidth: 1,
    },
  };
}
