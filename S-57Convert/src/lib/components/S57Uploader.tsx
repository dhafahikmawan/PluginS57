import React, { useState } from 'react';
import { convertS57ToGeoJSONLayers, S57LayerData } from '../utils/s57Converter';

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
          const layers = convertS57ToGeoJSONLayers(buffer, file.name);
          onLayersLoaded(layers);
          
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
    setError(null);
  };

  return (
    <div className="s57-uploader-panel">
      <h3>S-57 Marine Chart Loader</h3>
      <p className="description">Unggah file peta navigasi laut (.000) untuk merendernya sebagai layer GeoJSON.</p>
      
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

      {loadedFiles.length > 0 && (
        <div className="loaded-section">
          <h4>File yang Dimuat:</h4>
          <ul>
            {loadedFiles.map((f, i) => <li key={i}>📄 {f}</li>)}
          </ul>
          <button onClick={handleReset} className="reset-button">Bersihkan Semua Layer</button>
        </div>
      )}
    </div>
  );
};
