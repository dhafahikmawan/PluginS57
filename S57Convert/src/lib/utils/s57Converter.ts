import { parseS57, toGeoJSON } from '@s57-parser/s57';
import { getS57Acronym } from './s57ObjectClasses';

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
          labelField: sampleProperties.OBJNAM ?? 'OBJNAM'
        }
      },
      geojson: {
        type: "FeatureCollection",
        features
      }
    };
  });

  return layers;
}


