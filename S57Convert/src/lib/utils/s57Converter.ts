import { parseS57, toGeoJSON } from '@s57-parser/s57';
import { getS57Acronym } from './s57ObjectClasses';
import { formatLightLabel, generateSectorsForFeature } from './lights';



export interface S57LayerData {
  classCode: string; // e.g., ADMARE, AIRARE, etc.
  layerName: string; // human‑readable layer name (acronym)
  geojson: any;      // FeatureCollection GeoJSON
  fileName: string;  // source file name
  metadata?: Record<string, unknown>;
}

export interface S57ConversionBundle {
  sourceFileName: string;
  rawGeojsonByClass: Record<string, any>;
  processedLayers: S57LayerData[];
}

/**
 * Builds an S57ConversionBundle from a raw GeoJSON FeatureCollection.
 * This is the shared grouping/enrichment logic used by both the local parser
 * and the external API conversion path.
 */
export function buildConversionBundleFromGeoJSON(
  fullGeoJSON: any,
  fileName: string
): S57ConversionBundle {
  if (!fullGeoJSON || !fullGeoJSON.features) {
    throw new Error("Invalid GeoJSON: Missing features array.");
  }

  // 1. Kelompokkan fitur berdasarkan kode kelas objek S-57 (numeric OBJL) dan atribut styling
  const groupedFeatures: Record<string, any[]> = {};
  const groupAcronyms: Record<string, string> = {}; // groupKey -> original acronym
  const rawGroupedFeatures: Record<string, any[]> = {};

  // Accumulate generated light sector polygons across all LIGHTS/LITFLT features.
  const sectorFeatures: any[] = [];

  for (const feature of fullGeoJSON.features) {
    const rawCode: any = feature.properties?.OBJL || feature.properties?.OBJ_CLASS;
    const codeStr = rawCode != null ? String(rawCode) : "UNKNOWN";
    const acronym = getS57Acronym(codeStr); // maps numeric code to S-57 acronym; returns code as-is if not found

    if (!rawGroupedFeatures[acronym]) {
      rawGroupedFeatures[acronym] = [];
    }
    rawGroupedFeatures[acronym].push(structuredClone(feature));

    // Tentukan suffix khusus berdasarkan atribut untuk memisahkan style layer.
    // Gunakan '--' sebagai pemisah (bukan '_') agar kelas dengan underscore seperti M_NPUB tidak terpengaruh.
    let suffix = '';
    const props = feature.properties || {};

    if (acronym === 'DEPARE' || acronym === 'DRGARE') {
      const drval1 = Number(props.DRVAL1) || 0;
      if (drval1 < 0) suffix = '--IT';
      else if (drval1 < 2.0) suffix = '--VS';
      else if (drval1 < 30.0) suffix = '--MS';
      else suffix = '--DW';
    } else if (acronym === 'DEPCNT' || acronym === 'SLCONS') {
      const uncertain = String(props.QUAPOS) === '2' || String(props.CONDTN) === '2';
      suffix = uncertain ? '--UNC' : '--CER';
    } else if (acronym === 'LIGHTS' || acronym === 'LITFLT') {
      // Enrich feature with derived light label
      feature.properties._light_label = formatLightLabel(props);

      // Generate sector polygon(s) for this light feature
      const generated = generateSectorsForFeature(feature);
      sectorFeatures.push(...generated);

      if (acronym === 'LIGHTS') {
        const color = String(props.COLOUR || '');
        if (color.includes('3')) suffix = '--RED';
        else if (color.includes('4')) suffix = '--GRN';
        else suffix = '--YLW';
      }
    }

    const groupKey = `${acronym}${suffix}`;

    if (!groupedFeatures[groupKey]) {
      groupedFeatures[groupKey] = [];
      groupAcronyms[groupKey] = acronym; // Simpan mapping key -> acronym asli
    }
    groupedFeatures[groupKey].push(feature);
  }

  // 2. Transformasikan kelompok fitur menjadi struktur Layer GeoLibre
  const layers: S57LayerData[] = Object.keys(groupedFeatures).flatMap((groupKey) => {
    const acronym = groupAcronyms[groupKey]; // Ambil nama class asli yang sudah disimpan
    if (acronym === 'SOUNDG') {
      return [];
    }

    const features = groupedFeatures[groupKey];
    const sampleProperties = features[0]?.properties ?? {};

    return [{
      classCode: acronym,
      layerName: groupKey,
      fileName: fileName,
      metadata: {
        featureCount: features.length,
        sampleProperties,
        sourcePath: fileName,
        styleHints: {
          objl: sampleProperties.OBJL ?? sampleProperties.OBJ_CLASS ?? acronym,
          labelField: sampleProperties.OBJNAM ?? 'OBJNAM'
        }
      },
      geojson: {
        type: "FeatureCollection",
        features
      }
    }];
  });

  const rawGeojsonByClass: Record<string, any> = {};
  Object.entries(rawGroupedFeatures).forEach(([className, features]) => {
    rawGeojsonByClass[className] = {
      type: 'FeatureCollection',
      features: features.map((feature) => structuredClone(feature)),
    };
  });

  const soundgFeatures = rawGroupedFeatures['SOUNDG'] ?? [];
  if (soundgFeatures.length > 0) {
    const soundgProcessedFeatures = buildProcessedSoundings(soundgFeatures);

    if (soundgProcessedFeatures.length > 0) {
      const sampleProperties = soundgProcessedFeatures[0]?.properties ?? {};
      layers.push({
        classCode: 'SOUNDG_processed',
        layerName: 'SOUNDG_processed',
        fileName,
        metadata: {
          featureCount: soundgProcessedFeatures.length,
          sampleProperties,
          sourcePath: fileName,
          styleHints: {
            objl: 'SOUNDG_processed',
            labelField: 'VALSOU',
          },
        },
        geojson: {
          type: 'FeatureCollection',
          features: soundgProcessedFeatures,
        },
      });
    }
  }

  // Append the LIGHT_SECTORS layer if any sector polygons were generated.
  if (sectorFeatures.length > 0) {
    layers.push({
      classCode: 'LIGHT_SECTORS',
      layerName: 'LIGHT_SECTORS',
      fileName,
      metadata: {
        featureCount: sectorFeatures.length,
        sampleProperties: sectorFeatures[0]?.properties ?? {},
        sourcePath: fileName,
        styleHints: {
          objl: 'LIGHT_SECTORS',
          labelField: 'OBJNAM',
        },
      },
      geojson: {
        type: 'FeatureCollection',
        features: sectorFeatures,
      },
    });
  }

  return {
    sourceFileName: fileName,
    rawGeojsonByClass,
    processedLayers: layers,
  };
}

function buildProcessedSoundings(features: any[]): any[] {
  const processedFeatures: any[] = [];

  for (const originalFeature of features) {
    const geometry = originalFeature?.geometry;
    const properties = structuredClone(originalFeature?.properties ?? {});

    if (!geometry || !Array.isArray(geometry.coordinates)) {
      continue;
    }

    if (geometry.type === 'Point') {
      const coords = geometry.coordinates;
      if (coords.length < 2) {
        continue;
      }

      const depth = resolveSoundingDepth(coords, properties);
      if (depth === undefined) {
        continue;
      }

      const { depthInt, depthDec, depthValue } = formatSoundingDepth(depth);
      processedFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [coords[0], coords[1]] },
        properties: {
          ...properties,
          DEPTH: depthValue,
          DEPTH_INT: depthInt,
          DEPTH_DEC: depthDec,
        },
      });
      continue;
    }

    if (geometry.type === 'MultiPoint') {
      for (const coords of geometry.coordinates) {
        if (!Array.isArray(coords) || coords.length < 2) {
          continue;
        }

        const depth = resolveSoundingDepth(coords, properties);
        if (depth === undefined) {
          continue;
        }

        const { depthInt, depthDec, depthValue } = formatSoundingDepth(depth);
        processedFeatures.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [coords[0], coords[1]] },
          properties: {
            ...properties,
            DEPTH: depthValue,
            DEPTH_INT: depthInt,
            DEPTH_DEC: depthDec,
          },
        });
      }
      continue;
    }
  }

  return processedFeatures;
}

function resolveSoundingDepth(coords: any[], properties: Record<string, unknown>): number | undefined {
  const rawDepth = coords.length > 2 ? coords[2] : undefined;
  const depthCandidate = rawDepth ?? properties.DEPTH ?? properties.VALSOU;
  return parseNumericDepth(depthCandidate);
}

function parseNumericDepth(value: unknown): number | undefined {
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

function formatSoundingDepth(depth: number) {
  const depthValue = Number.isFinite(depth) ? Math.round(depth * 100) / 100 : depth;
  const depthInt = Math.trunc(depthValue);
  const decimalPart = Math.abs(depthValue - depthInt);
  const depthDec = decimalPart === 0
    ? '0'
    : String(Number(decimalPart.toFixed(2))).replace(/^0\./, '');

  return { depthValue, depthInt, depthDec };
}

/**
 * Mengonversi buffer file S-57 (.000) menjadi daftar layer GeoJSON yang terkelompok.
 * Parses the binary first, then delegates to buildConversionBundleFromGeoJSON.
 */
function convertS57ToGeoJSONLayersWithBundle(arrayBuffer: ArrayBuffer, fileName: string): {
  layers: S57LayerData[];
  bundle: S57ConversionBundle;
} {
  // 1. Parsing file biner S-57
  const dataset = parseS57(arrayBuffer);

  // 2. Konversi dataset mentah ke GeoJSON menggunakan parser helper
  const fullGeoJSON = toGeoJSON(dataset);

  if (!fullGeoJSON || !fullGeoJSON.features) {
    throw new Error("File S-57 tidak menghasilkan fitur geometri apa pun.");
  }

  const bundle = buildConversionBundleFromGeoJSON(fullGeoJSON, fileName);

  return {
    layers: bundle.processedLayers,
    bundle,
  };
}

export function convertS57ToGeoJSONLayers(arrayBuffer: ArrayBuffer, fileName: string): S57LayerData[] {
  return convertS57ToGeoJSONLayersWithBundle(arrayBuffer, fileName).layers;
}

export function buildS57ConversionBundle(arrayBuffer: ArrayBuffer, fileName: string): S57ConversionBundle {
  return convertS57ToGeoJSONLayersWithBundle(arrayBuffer, fileName).bundle;
}


