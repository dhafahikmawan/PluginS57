import JSZip from 'jszip';

export interface DownloadBundle {
  sourceFileName: string;
  rawGeojsonByClass: Record<string, any>;
  processedLayers: Array<{ classCode: string; layerName: string; geojson?: any }>;
}

export async function createGeoJsonZip(bundle: DownloadBundle): Promise<Blob> {
  const zip = new JSZip();

  Object.entries(bundle.rawGeojsonByClass).forEach(([className, geojson]) => {
    zip.file(`raw/${className}.geojson`, JSON.stringify(geojson, null, 2));
  });

  bundle.processedLayers.forEach((layer) => {
    if (layer.geojson) {
      zip.file(`processed/${layer.layerName}.geojson`, JSON.stringify(layer.geojson, null, 2));
    }
  });

  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        sourceFileName: bundle.sourceFileName,
        generatedAt: new Date().toISOString(),
        classes: Object.keys(bundle.rawGeojsonByClass),
        processedLayers: bundle.processedLayers.map(l => l.layerName),
      },
      null,
      2,
    ),
  );

  return zip.generateAsync({ type: 'blob' });
}

const sanitizeFileName = (fileName: string): string =>
  fileName
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '')
    || 'file';

export async function createNestedGeoJsonZip(bundles: DownloadBundle[], outerFileName: string): Promise<Blob> {
  const zip = new JSZip();
  const usedNames: Record<string, number> = {};
  const manifest: {
    outerFileName: string;
    sourceFileCount: number;
    generatedAt: string;
    bundles: Array<{ sourceFileName: string; entryName: string }>;
  } = {
    outerFileName,
    sourceFileCount: bundles.length,
    generatedAt: new Date().toISOString(),
    bundles: [],
  };

  for (const bundle of bundles) {
    const innerBlob = await createGeoJsonZip(bundle);
    const baseName = bundle.sourceFileName.replace(/\.000$/i, '') || 'converted-file';
    const sanitized = sanitizeFileName(baseName);
    const count = usedNames[sanitized] ?? 0;
    usedNames[sanitized] = count + 1;
    const entryName = count === 0 ? `${sanitized}.zip` : `${sanitized}-${count + 1}.zip`;

    zip.file(entryName, innerBlob);
    manifest.bundles.push({ sourceFileName: bundle.sourceFileName, entryName });
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  return zip.generateAsync({ type: 'blob' });
}

export async function triggerGeoJsonZipDownload(bundle: DownloadBundle, fileName: string): Promise<void> {
  const blob = await createGeoJsonZip(bundle);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.zip`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function triggerGeoJsonZipDownloadForBundles(
  bundles: DownloadBundle[],
  fileName: string,
): Promise<void> {
  const blob = await createNestedGeoJsonZip(bundles, fileName);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.zip`;
  link.click();
  URL.revokeObjectURL(url);
}
