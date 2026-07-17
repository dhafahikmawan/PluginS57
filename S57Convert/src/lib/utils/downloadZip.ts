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

export async function triggerGeoJsonZipDownload(bundle: DownloadBundle, fileName: string): Promise<void> {
  const blob = await createGeoJsonZip(bundle);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.zip`;
  link.click();
  URL.revokeObjectURL(url);
}
