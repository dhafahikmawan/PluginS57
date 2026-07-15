import { parseS57, toGeoJSON } from '@s57-parser/s57';
import { getS57Acronym } from './s57ObjectClasses';

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toColorCode(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim();
  if (!normalized) return undefined;

  const colorMap: Record<string, string> = {
    '1': 'W',
    '2': 'Y',
    '3': 'R',
    '4': 'G',
    '5': 'W',
    '6': 'W',
  };

  return colorMap[normalized] ?? normalized;
}

function parseBearing(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function parseNominalRange(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function normalizeBearingDegrees(value: number): number {
  let normalized = value % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

type LightFeatureLike = {
  type?: string;
  geometry?: { type?: string; coordinates?: unknown } | null;
  properties?: Record<string, unknown> | null;
};

type SoundingFeatureLike = {
  type?: string;
  geometry?: { type?: string; coordinates?: unknown } | null;
  properties?: Record<string, unknown> | null;
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

function parseSoundingDepth(feature: SoundingFeatureLike): number | undefined {
  const props = feature.properties ?? {};
  const candidates = [
    props.DEPTH,
    props.depth,
    props.VALSOU,
    props.VALDCO,
    props.SOUVAL,
    props.souval,
    props.ATTL_133,
    props.ATTL_135,
    props.ATTL_1,
  ];

  for (const candidate of candidates) {
    if (candidate === props.ATTL_133 || candidate === props.ATTL_135 || candidate === props.ATTL_1) {
      const stringValue = typeof candidate === 'string' ? candidate : String(candidate ?? '');
      const cleaned = stringValue.replace(/[^0-9.-]/g, '');
      if (cleaned) {
        const parsed = Number(cleaned);
        if (Number.isFinite(parsed)) {
          if (String(Math.abs(parsed)).length > 4) {
            const digits = String(Math.abs(parsed));
            return Number(digits.slice(0, 2));
          }
          return parsed;
        }
      }
    }

    const parsed = asNumber(candidate);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  const geometry = feature.geometry as { type?: string; coordinates?: unknown } | undefined;
  const coordinates = geometry?.coordinates;
  if (Array.isArray(coordinates) && coordinates.length >= 3) {
    const depthFromCoordinates = asNumber(coordinates[2]);
    if (depthFromCoordinates !== undefined) {
      return depthFromCoordinates;
    }
  }

  return undefined;
}

function formatSoundingDecimal(depth: number): string {
  const decimalPart = depth - Math.trunc(depth);
  if (decimalPart === 0) {
    return '0';
  }
  return Number(decimalPart.toFixed(2)).toString().replace(/^0\./, '').replace(/0+$/, '');
}

export function buildProcessedSoundingFeatures(feature: SoundingFeatureLike): any[] {
  const depth = parseSoundingDepth(feature);
  if (depth === undefined) {
    return [];
  }

  const props = feature.properties ?? {};
  const processedProperties = {
    ...props,
    DEPTH: depth,
    DEPTH_INT: Math.trunc(depth),
    DEPTH_DEC: formatSoundingDecimal(depth),
  };

  const geometry = feature.geometry as { type?: string; coordinates?: unknown } | undefined;
  const coordinates = geometry?.coordinates;

  if (geometry?.type === 'Point' && Array.isArray(coordinates) && coordinates.length >= 2) {
    const [lon, lat] = coordinates as [number, number];
    return [{
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat],
      },
      properties: processedProperties,
    }];
  }

  return [];
}

export function buildLightSectorFeature(
  feature: LightFeatureLike,
  classCode: string = 'LIGHTS',
): any | undefined {
  const normalizedCode = String(classCode || '').toUpperCase();
  if (normalizedCode !== 'LIGHTS' && normalizedCode !== 'LITFLT') {
    return undefined;
  }

  const props = feature.properties ?? {};
  const start = parseBearing(props.SECTR1);
  const end = parseBearing(props.SECTR2);
  const rangeNm = parseNominalRange(props.VALNMR);
  const geometry = feature.geometry as { type?: string; coordinates?: [number, number] } | undefined;
  const point = geometry?.type === 'Point' && Array.isArray(geometry.coordinates)
    ? geometry.coordinates
    : undefined;

  if (start === undefined || end === undefined || rangeNm === undefined || !point || point.length < 2) {
    return undefined;
  }

  const [lon, lat] = point as [number, number];
  const startRadians = (normalizeBearingDegrees(start) * Math.PI) / 180;
  const endRadians = (normalizeBearingDegrees(end) * Math.PI) / 180;
  const radiusMeters = rangeNm * 1852;

  const points = [
    [lon, lat],
    [lon + (radiusMeters * Math.cos(startRadians)) / 111320, lat + (radiusMeters * Math.sin(startRadians)) / 110540],
    [lon + (radiusMeters * Math.cos(endRadians)) / 111320, lat + (radiusMeters * Math.sin(endRadians)) / 110540],
  ];

  const sectorFeature = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[point, points[1], points[2], point]],
    },
    properties: {
      ...props,
      _sector_start: start,
      _sector_end: end,
      _sector_range_m: radiusMeters,
      _sector_source_class: normalizedCode,
    },
  };

  return sectorFeature;
}

export function deriveLightLabel(properties: Record<string, unknown> = {}, classCode: string = 'LIGHTS'): string {
  const normalizedCode = String(classCode || '').toUpperCase();
  const props = properties ?? {};
  const lightChar = asString(props.LITCHR)?.trim();
  const signalGroup = asString(props.SIGGRP);
  const colorCode = toColorCode(props.COLOUR);
  const signalPeriod = asString(props.SIGPER);
  const nominalRange = asString(props.VALNMR);

  const hasLightStructure = Boolean(lightChar || signalGroup || colorCode || signalPeriod || nominalRange);
  const characteristic = lightChar ?? 'F';
  const groupSuffix = signalGroup ? `(${signalGroup})` : '';
  const colorSuffix = colorCode ? ` ${colorCode}` : '';
  const periodSuffix = signalPeriod ? ` ${signalPeriod}` : '';
  const rangeSuffix = nominalRange ? ` ${nominalRange}M` : '';

  const labelParts = [
    `${characteristic}${groupSuffix}`,
    colorSuffix.trim(),
    periodSuffix.trim(),
    rangeSuffix.trim(),
  ].filter(Boolean);

  const derivedLabel = labelParts.join(' ').trim();

  if (derivedLabel && hasLightStructure) {
    return normalizedCode === 'LITFLT' ? `LtV ${derivedLabel}` : derivedLabel;
  }

  return asString(props.OBJNAM) ?? 'Unnamed light';
}
/*
function enrichLightFeatures(features: Array<{ properties?: Record<string, unknown> }>, acronym: string): void {
  if (acronym !== 'LIGHTS' && acronym !== 'LITFLT') {
    return;
  }

  for (const feature of features) {
    const props = feature.properties ?? {};
    const label = deriveLightLabel(props, acronym);
    props._light_label = label;
  }
}
  */

export interface S57LayerData {
  classCode: string; // e.g., ADMARE, AIRARE, etc.
  layerName: string; // human‑readable layer name (acronym)
  geojson: any;      // FeatureCollection GeoJSON
  fileName: string;  // source file name
  metadata?: Record<string, unknown>;
}

/**
 * Mengonversi buffer file S-57 (.000) menjadi daftar layer GeoJSON yang terkelompok.
 */
export function convertS57ToGeoJSONLayers(arrayBuffer: ArrayBuffer, fileName: string): S57LayerData[] {
  // 1. Parsing file biner S-57
  const dataset = parseS57(arrayBuffer);
  
  // 2. Konversi dataset mentah ke GeoJSON menggunakan parser helper
  const fullGeoJSON = toGeoJSON(dataset);
  
  if (!fullGeoJSON || !fullGeoJSON.features) {
    throw new Error("File S-57 tidak menghasilkan fitur geometri apa pun.");
  }
  
  // 3. Kelompokkan fitur berdasarkan kode kelas objek S-57 (numeric OBJL) dan atribut styling
  const groupedFeatures: Record<string, any[]> = {};
  const groupAcronyms: Record<string, string> = {}; // groupKey -> original acronym
  
  for (const feature of fullGeoJSON.features) {
    const rawCode: any = feature.properties?.OBJL || feature.properties?.OBJ_CLASS;
    const codeStr = rawCode != null ? String(rawCode) : "UNKNOWN";
    const acronym = getS57Acronym(codeStr); // maps numeric code to S-57 acronym; returns code as-is if not found

    // Tentukan suffix khusus berdasarkan atribut untuk memisahkan style layer.
    // Gunakan ':' sebagai pemisah (bukan '_') agar kelas dengan underscore seperti M_NPUB tidak terpengaruh.
    let suffix = '';
    const props = feature.properties || {};

    if (acronym === 'LIGHTS' || acronym === 'LITFLT') {
      props._light_label = deriveLightLabel(props, acronym);
      const sectorFeature = buildLightSectorFeature(feature, acronym);
      if (sectorFeature) {
        props._light_sector = sectorFeature;
      }
    }
    
    if (acronym === 'DEPARE' || acronym === 'DRGARE') {
      const drval1 = Number(props.DRVAL1) || 0;
      if (drval1 < 0) suffix = ':IT';
      else if (drval1 < 2.0) suffix = ':VS';
      else if (drval1 < 30.0) suffix = ':MS';
      else suffix = ':DW';
    } else if (acronym === 'DEPCNT' || acronym === 'SLCONS') {
      const uncertain = String(props.QUAPOS) === '2' || String(props.CONDTN) === '2';
      suffix = uncertain ? ':UNC' : ':CER';
    } else if (acronym === 'LIGHTS') {
      const color = String(props.COLOUR || '');
      if (color.includes('3')) suffix = ':RED';
      else if (color.includes('4')) suffix = ':GRN';
      else suffix = ':YLW';
    }

    const groupKey = `${acronym}${suffix}`;

    if (!groupedFeatures[groupKey]) {
      groupedFeatures[groupKey] = [];
      groupAcronyms[groupKey] = acronym; // Simpan mapping key -> acronym asli
    }
    groupedFeatures[groupKey].push(feature);
  }
  
  // 4. Transformasikan kelompok fitur menjadi struktur Layer GeoLibre
  const layers: S57LayerData[] = Object.keys(groupedFeatures).map((groupKey) => {
    const features = groupedFeatures[groupKey];
    const sampleProperties = features[0]?.properties ?? {};
    const acronym = groupAcronyms[groupKey]; // Ambil nama class asli yang sudah disimpan

    if (acronym === 'LIGHTS' || acronym === 'LITFLT') {
      const sectorFeatures = features.flatMap((item) => {
        const sectorFeature = buildLightSectorFeature(item, acronym);
        return sectorFeature ? [sectorFeature] : [];
      });

      if (sectorFeatures.length > 0) {
        features.push(...sectorFeatures);
      }
    }

    return {
      classCode: acronym,
      layerName: groupKey,
      fileName: fileName,
      metadata: {
        featureCount: features.length,
        sampleProperties,
        sourcePath: fileName,
        styleHints: {
          objl: sampleProperties.OBJL ?? sampleProperties.OBJ_CLASS ?? acronym,
          labelField: acronym === 'LIGHTS' || acronym === 'LITFLT'
            ? (sampleProperties._light_label ? '_light_label' : 'OBJNAM')
            : (sampleProperties.OBJNAM ?? 'OBJNAM')
        }
      },
      geojson: {
        type: "FeatureCollection",
        features
      }
    };
  });

  const rawSoundingFeatures = groupedFeatures['SOUNDG'] ?? [];
  const processedSoundingFeatures = rawSoundingFeatures.flatMap((feature) => buildProcessedSoundingFeatures(feature));

  if (processedSoundingFeatures.length > 0) {
    layers.push({
      classCode: 'SOUNDG_processed',
      layerName: 'SOUNDG_processed',
      fileName,
      metadata: {
        featureCount: processedSoundingFeatures.length,
        sampleProperties: processedSoundingFeatures[0]?.properties ?? {},
        sourcePath: fileName,
        styleHints: {
          objl: 'SOUNDG_processed',
          labelField: 'DEPTH',
        }
      },
      geojson: {
        type: 'FeatureCollection',
        features: processedSoundingFeatures,
      }
    });
  }

  return layers;
}


