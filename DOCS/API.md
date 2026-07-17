# Implementation Plan: External S-57 Conversion API Integration

This document outlines the step-by-step implementation plan for enhancing the **GeoLibre S-57 Reader Plugin** to support two modes of operation:
1. **Built-in S-57 Parser** (existing offline WebAssembly/JS parsing using `@s57-parser/s57`).
2. **Conversion API** (submitting files/parameters to an external API endpoint and loading the returned GeoJSON).

---

## 1. Objectives & Requirements

- **Dropdown Selection**: Provide a dropdown menu in the right-side control panel to select the conversion method:
  - *Local S-57 Parser (Offline)*
  - *Conversion API (Online)*
- **Dynamic Input Forms**:
  - Selection of **Local S-57 Parser** displays only the standard file upload button ("Upload S-57 (.000) file").
  - Selection of **Conversion API** displays input fields for:
    - **API Endpoint**: Text input for the target URL.
    - **HTTP Method**: Dropdown selection (e.g., `POST`, `GET`, `PUT`, `PATCH`).
    - **Dynamic Key-Value Parameters**: A dynamic table/list allowing the user to add and delete parameter fields via a `+` button. Each row must support:
      - Parameter key (string input).
      - Parameter type selector (dropdown: `Text` or `File`).
      - Parameter value (either a text input or a file upload selector depending on the selected type).
- **Strict Verification & Validation**:
  - The API response **must** be verified to contain valid GeoJSON.
  - Warn the user in the UI if:
    - The API returns an HTTP error (e.g., `4xx`, `5xx` status, or network failure).
    - The API returns invalid JSON or invalid GeoJSON formatting.
    - The returned GeoJSON contains an empty feature collection (`features: []`).
- **GeoJSON Processing Compatibility**:
  - Once validated, the API-returned GeoJSON must flow through the same layer-splitting, feature-enriching (if any), styling, and download-packaging logic as the built-in parser.
  - Use [/Samples/API/Result.geojson](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/Samples/API/Result.geojson) as the target test structure.

---

## 2. Component Refactoring

### A. Refactoring Core Grouping Logic in [s57Converter.ts](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/utils/s57Converter.ts)

Currently, the feature grouping, styling, and bundle generation are bundled inside `convertS57ToGeoJSONLayersWithBundle(arrayBuffer, fileName)`. We must extract the GeoJSON-to-bundle processing logic so it can be reused for both local parsing outputs and API responses.

1. **Extract Grouping Logic**:
   Create a new helper function `buildConversionBundleFromGeoJSON(fullGeoJSON: any, fileName: string): S57ConversionBundle`.
   
   ```typescript
   export function buildConversionBundleFromGeoJSON(
     fullGeoJSON: any,
     fileName: string
   ): S57ConversionBundle {
     if (!fullGeoJSON || !fullGeoJSON.features) {
       throw new Error("Invalid GeoJSON: Missing features array.");
     }

     const groupedFeatures: Record<string, any[]> = {};
     const groupAcronyms: Record<string, string> = {};
     const rawGroupedFeatures: Record<string, any[]> = {};

     for (const feature of fullGeoJSON.features) {
       const rawCode = feature.properties?.OBJL || feature.properties?.OBJ_CLASS;
       const codeStr = rawCode != null ? String(rawCode) : "UNKNOWN";
       const acronym = getS57Acronym(codeStr);

       if (!rawGroupedFeatures[acronym]) {
         rawGroupedFeatures[acronym] = [];
       }
       rawGroupedFeatures[acronym].push(structuredClone(feature));

       let suffix = '';
       const props = feature.properties || {};

       if (acronym === 'LIGHTS' || acronym === 'LITFLT') {
         props._light_label = deriveLightLabel(props, acronym);
         const sectorFeature = buildLightSectorFeature(feature, acronym);
         if (sectorFeature) {
           props._light_sector = sectorFeature;
         }
       }

       // Split layers based on depth range or styling categories
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
         groupAcronyms[groupKey] = acronym;
       }
       groupedFeatures[groupKey].push(feature);
     }

     const layers: S57LayerData[] = Object.keys(groupedFeatures).map((groupKey) => {
       const features = groupedFeatures[groupKey];
       const sampleProperties = features[0]?.properties ?? {};
       const acronym = groupAcronyms[groupKey];

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

     const rawSoundingFeatures = rawGroupedFeatures['SOUNDG'] ?? [];
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

     const rawGeojsonByClass: Record<string, any> = {};
     Object.entries(rawGroupedFeatures).forEach(([className, features]) => {
       rawGeojsonByClass[className] = {
         type: 'FeatureCollection',
         features: features.map((feature) => structuredClone(feature)),
       };
     });

     return {
       sourceFileName: fileName,
       rawGeojsonByClass,
       processedLayers: layers,
     };
   }
   ```

2. **Simplify the Original Local Converter**:
   Update `convertS57ToGeoJSONLayersWithBundle` to utilize this new helper after parsing the binary file:
   ```typescript
   function convertS57ToGeoJSONLayersWithBundle(arrayBuffer: ArrayBuffer, fileName: string) {
     const dataset = parseS57(arrayBuffer);
     const fullGeoJSON = toGeoJSON(dataset);
     
     if (!fullGeoJSON || !fullGeoJSON.features) {
       throw new Error("File S-57 tidak menghasilkan fitur geometri apa pun.");
     }
     
     return {
       layers: buildConversionBundleFromGeoJSON(fullGeoJSON, fileName).processedLayers,
       bundle: buildConversionBundleFromGeoJSON(fullGeoJSON, fileName)
     };
   }
   ```

---

## 3. UI Component Updates: S57Uploader.tsx

Modify [S57Uploader.tsx](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/components/S57Uploader.tsx) to manage state, configuration inputs, and user interaction.

### A. New State Variables
Add states to manage dropdown selections and dynamic parameter arrays:
```typescript
type ConversionMode = 'local' | 'api';
type ParamType = 'text' | 'file';

interface KeyValuePair {
  id: string;
  key: string;
  type: ParamType;
  value: string | File | null;
}

const [mode, setMode] = useState<ConversionMode>('local');
const [apiEndpoint, setApiEndpoint] = useState<string>('');
const [apiMethod, setApiMethod] = useState<string>('POST');
const [apiParams, setApiParams] = useState<KeyValuePair[]>([]);
```

### B. Form Rendering Logic
Render components based on the selected mode:

```tsx
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
              {loading ? 'Processing File...' : 'Choose S-57 File (.000)'}
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
```

### C. Helper States Mutators
Implement standard array operations in React for parameter rows:
```typescript
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
```

---

## 4. API Request Construction & Execution Logic

Implement the `handleApiSubmit` click event inside `S57Uploader.tsx`.

```typescript
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
```

---

## 5. UI styling updates: `uploader.css`

Ensure the elements fit the current design system by appending the following styles to [uploader.css](file:///c:/Users/erwin/OneDrive/Documents/Learning/Plugin%20000/S57Convert/src/lib/styles/uploader.css):

```css
.mode-select-dropdown,
.api-method-select,
.param-type-select {
  width: 100%;
  padding: 8px 12px;
  background-color: #2c2c2e;
  border: 1px solid #3a3a3c;
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  transition: border-color 0.2s;
  outline: none;
}

.mode-select-dropdown:focus,
.api-method-select:focus,
.param-type-select:focus {
  border-color: #007aff;
}

.api-config-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  color: #8e8e93;
  font-weight: 500;
}

.api-input-text,
.param-key-input,
.param-value-text-input {
  padding: 8px 12px;
  background-color: #2c2c2e;
  border: 1px solid #3a3a3c;
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.api-input-text:focus,
.param-key-input:focus,
.param-value-text-input:focus {
  border-color: #007aff;
}

.param-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.add-param-button {
  background-color: #1c1c1e;
  color: #30d158;
  border: 1px solid #30d158;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-param-button:hover {
  background-color: #30d158;
  color: #ffffff;
}

.param-rows-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;
}

.param-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1.5fr auto;
  gap: 6px;
  align-items: center;
}

.param-file-input-wrapper {
  position: relative;
  width: 100%;
}

.param-file-input-hidden {
  display: none;
}

.param-file-label {
  display: block;
  padding: 8px;
  background-color: #2c2c2e;
  border: 1px dashed #48484a;
  border-radius: 6px;
  color: #0a84ff;
  font-size: 12px;
  text-align: center;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background-color 0.2s;
}

.param-file-label:hover {
  background-color: #3a3a3c;
}

.remove-param-button {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  color: #ff453a;
  transition: transform 0.1s;
}

.remove-param-button:hover {
  transform: scale(1.15);
}

.execute-api-button {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #007aff, #0a84ff);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.execute-api-button:hover {
  opacity: 0.9;
}

.execute-api-button:disabled {
  background: #3a3a3c;
  color: #8e8e93;
  cursor: not-allowed;
}

.execute-api-button.loading {
  background: #3a3a3c;
  cursor: wait;
}
```

---

## 6. Verification and Testing Checklist

To verify the correct execution, the following tests should be performed:

### A. Manual Integration Tests
1. **Validation Checks (Error Cases)**:
   - Provide an invalid API Endpoint address (e.g. `ftp://invalid-url.com`) and verify that the plugin halts and highlights: `"Invalid URL protocol. API endpoint must start with http:// or https://"`
   - Point the API URL to a mock server that returns HTTP status codes like `500 Internal Server Error` or `404 Not Found`. Verify that the panel emits the correct HTTP error warning.
   - Point the API URL to a route that returns plain HTML or simple text. Verify that the system registers: `"API response is not a valid JSON document."`
   - Return valid JSON that lacks GeoJSON attributes (e.g. `{ "success": true }`). Verify it reports: `"API response format is invalid: Must be a valid GeoJSON FeatureCollection containing a 'features' array."`
   - Return an empty feature collection (`{ "type": "FeatureCollection", "features": [] }`). Verify it alerts: `"The conversion API returned an empty feature collection."`
2. **Payload Test (Multipart Form Data)**:
   - Configure a mock receiver endpoint (e.g. using a local Node/Express script or `https://httpbin.org/post`).
   - Submit parameters with keys `chart_file` (File type) and `resolution` (Text type = `high`). Verify the request payload arrives as a multipart stream containing both items.
3. **GeoJSON Processing Test**:
   - Utilize `/Samples/API/Result.geojson` directly. This can be served via a local static server (e.g. `npx serve Samples/API`) or a mocked API call that responds with this file's contents.
   - Verify that all map layers (such as `ADMARE`, `DEPARE`, `SOUNDG_processed`) are created successfully in GeoLibre and display on the canvas with correct styles (custom lights labels, depth shading, etc.) matching the local parser's visual representation.
   - Trigger the ZIP Download on the resulting layers. Verify that a valid zip containing separated class geojsons can be successfully downloaded.
