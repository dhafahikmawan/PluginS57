import React, { useState } from 'react';
import { buildS57ConversionBundle, buildConversionBundleFromGeoJSON, S57ConversionBundle, S57LayerData } from '../utils/s57Converter';
import { triggerGeoJsonZipDownload } from '../utils/downloadZip';

// ── Types ────────────────────────────────────────────────────────────────────

type ConversionMode = 'local' | 'api';
type ParamType = 'text' | 'file';

interface KeyValuePair {
  id: string;
  key: string;
  type: ParamType;
  value: string | File | null;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface S57UploaderProps {
  // Callback untuk meregistrasikan layer baru ke GeoLibre Host
  onLayersLoaded: (layers: S57LayerData[]) => void;
  // Callback untuk menghapus layer yang terdaftar sebelumnya
  onClearLayers: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export const S57Uploader: React.FC<S57UploaderProps> = ({ onLayersLoaded, onClearLayers }) => {
  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFiles, setLoadedFiles] = useState<string[]>([]);
  const [conversionBundle, setConversionBundle] = useState<S57ConversionBundle | null>(null);

  // Mode selection state
  const [mode, setMode] = useState<ConversionMode>('local');

  // API mode state
  const [apiEndpoint, setApiEndpoint] = useState<string>('');
  const [apiMethod, setApiMethod] = useState<string>('POST');
  const [apiParams, setApiParams] = useState<KeyValuePair[]>([]);

  // ── Local S-57 file upload handler ───────────────────────────────────────

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

  // ── API parameter mutators ───────────────────────────────────────────────

  const handleAddParam = () => {
    setApiParams(prev => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, key: '', type: 'text', value: '' }
    ]);
  };

  const handleRemoveParam = (id: string) => {
    setApiParams(prev => prev.filter(p => p.id !== id));
  };

  const handleParamKeyChange = (id: string, key: string) => {
    setApiParams(prev => prev.map(p => p.id === id ? { ...p, key } : p));
  };

  const handleParamTypeChange = (id: string, type: ParamType) => {
    setApiParams(prev => prev.map(p => p.id === id ? { ...p, type, value: type === 'text' ? '' : null } : p));
  };

  const handleParamValueChange = (id: string, value: string | File | null) => {
    setApiParams(prev => prev.map(p => p.id === id ? { ...p, value } : p));
  };

  // ── API submit handler ───────────────────────────────────────────────────

  const handleApiSubmit = async () => {
    if (!apiEndpoint.trim()) return;

    setLoading(true);
    setError(null);

    try {
      let url = apiEndpoint.trim();
      const headers: Record<string, string> = {};
      let body: any = null;

      // Validate endpoint protocol
      if (!/^https?:\/\//i.test(url)) {
        throw new Error("Invalid URL protocol. API endpoint must start with http:// or https://");
      }

      const hasFiles = apiParams.some(p => p.type === 'file' && p.value instanceof File);

      // Method Specific Assemblies
      if (apiMethod === 'GET') {
        if (hasFiles) {
          throw new Error("HTTP GET method does not support file payloads. Please change the method to POST/PUT or remove the file parameter.");
        }

        // Append query string params
        const queryParams = new URLSearchParams();
        apiParams.forEach(p => {
          if (p.key.trim()) {
            queryParams.append(p.key.trim(), String(p.value || ''));
          }
        });
        const paramStr = queryParams.toString();
        if (paramStr) {
          url += (url.includes('?') ? '&' : '?') + paramStr;
        }
      } else {
        // POST, PUT, PATCH etc.
        // If files are present or user provides fields, package as FormData
        const formData = new FormData();
        apiParams.forEach(p => {
          if (p.key.trim()) {
            if (p.type === 'file') {
              if (p.value instanceof File) {
                formData.append(p.key.trim(), p.value);
              }
            } else {
              formData.append(p.key.trim(), String(p.value || ''));
            }
          }
        });
        body = formData;
        // CRITICAL: DO NOT set Content-Type header. Fetch will automatically set it
        // along with the correct multipart boundary.
      }

      // Make the API request
      const response = await fetch(url, {
        method: apiMethod,
        headers,
        body
      });
      console.log("Response: ");
      console.log(response);
      console.log("__________________________________________________________")
      // 1. HTTP Error Verification
      if (!response.ok) {
        throw new Error(`API returned HTTP Error ${response.status}: ${response.statusText}`);
      }

      // 2. Format Validation - Parse JSON
      let geojsonData: any;
      try {
        geojsonData = await response.json();
      } catch {
        throw new Error("API response is not a valid JSON document.");
      }

      // 3. Schema Verification - Must be GeoJSON FeatureCollection
      if (!geojsonData || geojsonData.type !== 'FeatureCollection' || !Array.isArray(geojsonData.features)) {
        throw new Error("API response format is invalid: Must be a valid GeoJSON FeatureCollection containing a 'features' array.");
      }

      // 4. Feature Availability Verification - Empty Warning
      if (geojsonData.features.length === 0) {
        throw new Error("The conversion API returned an empty feature collection.");
      }

      // Identify a name to represent this dataset in the layers manager
      const uploadedFileParam = apiParams.find(p => p.type === 'file' && p.value instanceof File);
      const sourceFileName = uploadedFileParam?.value instanceof File
        ? `api-${uploadedFileParam.value.name}`
        : 'api-conversion.geojson';

      // 5. Process GeoJSON utilizing the refactored layout builder
      const bundle = buildConversionBundleFromGeoJSON(geojsonData, sourceFileName);

      // Register layers in GeoLibre panel & Maplibre instance
      onLayersLoaded(bundle.processedLayers);
      setConversionBundle(bundle);
      setLoadedFiles(prev => [...prev, sourceFileName]);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during API conversion.");
      onClearLayers(); // Revert loaded state on map
    } finally {
      setLoading(false);
    }
  };

  // ── Reset handler ────────────────────────────────────────────────────────

  const handleReset = () => {
    onClearLayers();
    setLoadedFiles([]);
    setConversionBundle(null);
    setError(null);
  };

  // ── Download handler ─────────────────────────────────────────────────────

  const handleDownloadZip = async () => {
    if (!conversionBundle) return;
    await triggerGeoJsonZipDownload(conversionBundle, conversionBundle.sourceFileName.replace(/\.000$/i, ''));
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="s57-uploader-panel">
      <section className="s57-panel-hero">
        <span className="s57-panel-badge">Ready</span>
        <h3>S-57 Marine Chart Loader</h3>
        <p className="description">
          Choose to process files locally or convert online via an external API.
        </p>
      </section>

      <div className="s57-panel-body">
        {/* Conversion Mode Selection Dropdown */}
        <section className="s57-panel-card">
          <label htmlFor="s57-mode-select" className="input-label">Conversion Mode</label>
          <select
            id="s57-mode-select"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as ConversionMode);
              setError(null);
            }}
            className="mode-select-dropdown"
          >
            <option value="local">Local S-57 Parser (Offline)</option>
            <option value="api">Conversion API (Online)</option>
          </select>
        </section>

        {/* Conditionally Render Form based on Mode */}
        {mode === 'local' ? (
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
                {loading ? 'Processing File...' : 'Upload S-57 (.000) File'}
              </label>
            </div>
            {error && <div className="error-message">⚠️ {error}</div>}
          </section>
        ) : (
          <section className="s57-panel-card">
            <div className="api-config-form">
              {/* Endpoint field */}
              <div className="form-group">
                <label htmlFor="api-endpoint">API Endpoint URL</label>
                <input
                  id="api-endpoint"
                  type="text"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder="https://api.example.com/s57-to-geojson"
                  disabled={loading}
                  className="api-input-text"
                />
              </div>

              {/* Method selection */}
              <div className="form-group">
                <label htmlFor="api-method">HTTP Method</label>
                <select
                  id="api-method"
                  value={apiMethod}
                  onChange={(e) => setApiMethod(e.target.value)}
                  disabled={loading}
                  className="api-method-select"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>

              {/* Key-Value parameters */}
              <div className="form-group">
                <div className="param-header">
                  <label>Request Parameters</label>
                  <button
                    type="button"
                    onClick={handleAddParam}
                    disabled={loading}
                    className="add-param-button"
                    title="Add parameter row"
                  >
                    + Add Parameter
                  </button>
                </div>

                <div className="param-rows-container">
                  {apiParams.map((param) => (
                    <div key={param.id} className="param-row">
                      <input
                        type="text"
                        placeholder="Key"
                        value={param.key}
                        onChange={(e) => handleParamKeyChange(param.id, e.target.value)}
                        disabled={loading}
                        className="param-key-input"
                      />

                      <select
                        value={param.type}
                        onChange={(e) => handleParamTypeChange(param.id, e.target.value as ParamType)}
                        disabled={loading}
                        className="param-type-select"
                      >
                        <option value="text">Text</option>
                        <option value="file">File</option>
                      </select>

                      <div className="param-value-container">
                        {param.type === 'text' ? (
                          <input
                            type="text"
                            placeholder="Value"
                            value={param.value as string || ''}
                            onChange={(e) => handleParamValueChange(param.id, e.target.value)}
                            disabled={loading}
                            className="param-value-text-input"
                          />
                        ) : (
                          <div className="param-file-input-wrapper">
                            <input
                              type="file"
                              onChange={(e) => handleParamValueChange(param.id, e.target.files?.[0] || null)}
                              disabled={loading}
                              id={`file-input-${param.id}`}
                              className="param-file-input-hidden"
                            />
                            <label htmlFor={`file-input-${param.id}`} className="param-file-label">
                              {param.value instanceof File ? `📄 ${param.value.name}` : 'Upload File'}
                            </label>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveParam(param.id)}
                        disabled={loading}
                        className="remove-param-button"
                        title="Delete parameter"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execute Button */}
              <button
                onClick={handleApiSubmit}
                disabled={loading || !apiEndpoint.trim()}
                className={`execute-api-button ${loading ? 'loading' : ''}`}
              >
                {loading ? 'Connecting & Converting...' : 'Execute API Conversion'}
              </button>
            </div>
            {error && <div className="error-message">⚠️ {error}</div>}
          </section>
        )}

        {/* Loaded Files Panel (Shared between local and api mode) */}
        {loadedFiles.length > 0 && (
          <section className="s57-panel-card s57-panel-card-muted">
            <h4>Loaded layers</h4>
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
