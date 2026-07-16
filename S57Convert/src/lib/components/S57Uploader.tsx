import React, { useState } from 'react';
import { buildS57ConversionBundle, S57ConversionBundle, S57LayerData } from '../utils/s57Converter';
import { triggerGeoJsonZipDownload } from '../utils/downloadZip';

interface S57UploaderProps {
  // Callback untuk meregistrasikan layer baru ke GeoLibre Host
  onLayersLoaded: (layers: S57LayerData[]) => void;
  // Callback untuk menghapus layer yang terdaftar sebelumnya
  onClearLayers: () => void;
}

export const S57Uploader: React.FC<S57UploaderProps> = ({ onLayersLoaded, onClearLayers }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFiles, setLoadedFiles] = useState<string[]>([]);
  const [conversionBundle, setConversionBundle] = useState<S57ConversionBundle | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Pastikan ekstensi adalah .000
    if (!file.name.endsWith('.000')) {
      setError("Format file tidak valid. Harap masukkan file S-57 dengan ekstensi '.000'");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          if (!buffer) throw new Error("Gagal membaca data file biner.");
          
          // Konversi data biner
          const bundle = buildS57ConversionBundle(buffer, file.name);
          onLayersLoaded(bundle.processedLayers);
          setConversionBundle(bundle);
          
          setLoadedFiles(prev => [...prev, file.name]);
        } catch (err: any) {
          setError(err.message || "Gagal mengurai file S-57.");
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setError("Gagal membaca file dari disk.");
        setLoading(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan proses.");
      setLoading(false);
    }
  };

  const handleReset = () => {
    onClearLayers();
    setLoadedFiles([]);
    setConversionBundle(null);
    setError(null);
  };

  const handleDownloadZip = async () => {
    if (!conversionBundle) return;
    await triggerGeoJsonZipDownload(conversionBundle, conversionBundle.sourceFileName.replace(/\.000$/i, ''));
  };

  return (
    <div className="s57-uploader-panel">
      <section className="s57-panel-hero">
        <span className="s57-panel-badge">Ready</span>
        <h3>S-57 Marine Chart Loader</h3>
        <p className="description">
          Upload nautical data and keep your conversion workflow visible in one place.
        </p>
      </section>

      <div className="s57-panel-body">
        <section className="s57-panel-card">
          <div className="upload-zone">
            <input
              type="file"
              accept=".000"
              onChange={handleFileUpload}
              disabled={loading}
              id="s57-file-input"
            />
            <label htmlFor="s57-file-input" className={`upload-button ${loading ? 'loading' : ''}`}>
              {loading ? 'Memproses File...' : 'Pilih File S-57 (.000)'}
            </label>
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}
        </section>

        {loadedFiles.length > 0 && (
          <section className="s57-panel-card s57-panel-card-muted">
            <h4>Loaded files</h4>
            <ul className="loaded-list">
              {loadedFiles.map((f, i) => <li key={i}>📄 {f}</li>)}
            </ul>
            <div className="s57-panel-actions">
              {conversionBundle && (
                <button onClick={handleDownloadZip} className="download-button">Download ZIP</button>
              )}
              <button onClick={handleReset} className="reset-button">Clear layers</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
