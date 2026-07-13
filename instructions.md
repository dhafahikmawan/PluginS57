# Panduan Pengembangan Plugin GeoLibre: S-57 (.000) Reader & GeoJSON Layer Converter

Dokumen ini adalah panduan langkah-demi-langkah (step-by-step) untuk membuat plugin **GeoLibre** berbasis Node.js yang mampu membaca file **S-57 (.000)** (format bagan navigasi laut internasional), mengonversinya menjadi format **GeoJSON**, dan menampilkannya sebagai layer interaktif di GeoLibre.

Panduan ini disusun agar mudah dipahami oleh **programmer junior** maupun **model AI (LLM)** dengan instruksi yang terperinci, contoh kode yang siap pakai, serta aspek-aspek penting yang harus diperhatikan selama proses konversi data.

---

## 1. Arsitektur Proyek & Struktur Folder

Arsitektur plugin mengacu pada template resmi [geolibre-plugin-template](https://github.com/opengeos/geolibre-plugin-template). Output akhir dari build plugin adalah file ZIP yang berisi manifest `plugin.json` dan hasil bundel kode JS/CSS di dalam folder `dist/`.

Berikut adalah struktur folder yang akan kita gunakan/buat di dalam proyek:

```text
plugin-s57-reader/
├── geolibre-plugin/
│   └── plugin.json           # Manifest plugin untuk GeoLibre
├── src/
│   ├── geolibre.ts           # Entrypoint utama plugin & integrasi GeoLibre Host API
│   ├── index.ts              # Entrypoint ekspor untuk MapLibre control
│   └── lib/
│       ├── components/
│       │   └── S57Uploader.tsx # Komponen React untuk UI upload & manajemen layer
│       ├── utils/
│       │   └── s57Converter.ts # Modul logika parsing & konversi S-57 ke GeoJSON
│       └── styles/
│           └── uploader.css   # Styling UI untuk panel pengunggah (rich aesthetics)
├── package.json
└── vite.config.ts            # Konfigurasi build Vite
```

---

## 2. Persiapan Awal (Setup)

### Langkah 1: Kloning & Inisialisasi Template
1. Unduh atau gunakan template plugin dari `geolibre-plugin-template`.
2. Jalankan perintah instalasi dependensi di terminal Anda:
   ```bash
   npm install
   ```

### Langkah 2: Tambahkan Library Parser S-57
Karena file `.000` adalah file biner dengan standar ISO/IEC 8211 yang kompleks, kita akan menggunakan pustaka javascript murni agar plugin dapat berjalan baik di browser maupun di GeoLibre Desktop (tanpa dependensi eksternal seperti GDAL/ogr2ogr yang memerlukan instalasi tingkat sistem OS).
```bash
npm install @s57-parser/s57
```

> [!NOTE]
> Pustaka `@s57-parser/s57` akan mengurai buffer biner file `.000` menjadi struktur data JavaScript, yang kemudian dapat dengan mudah dikonversi menjadi GeoJSON.

---

## 3. Implementasi Kode Sumber

Berikut adalah kode sumber terperinci yang perlu Anda buat atau perbarui.

### A. Manifest Plugin (`geolibre-plugin/plugin.json`)
File ini mendefinisikan identitas plugin agar dapat dideteksi oleh GeoLibre.

```json
{
  "id": "geolibre-s57-reader",
  "name": "S-57 Marine Chart Reader",
  "version": "1.0.0",
  "entry": "dist/index.js",
  "description": "Membaca file navigasi laut S-57 (.000), mengonversinya ke GeoJSON, dan memuatnya sebagai layer GeoLibre secara otomatis."
}
```

### B. Modul Konverter (`src/lib/utils/s57Converter.ts`)
Modul ini bertugas mengubah data biner S-57 menjadi kumpulan layer GeoJSON. S-57 memiliki ratusan kelas fitur berbeda. Modul ini akan memisahkan fitur berdasarkan kelas objeknya (Object Class) agar dapat dirender sebagai layer terpisah.

```typescript
import { parseS57, toGeoJSON } from '@s57-parser/s57';

export interface S57LayerData {
  classCode: string; // Contoh: LNDARE, DEPCNT, SOUNDG
  layerName: string; // Nama manusiawi untuk daftar layer
  geojson: any;      // FeatureCollection GeoJSON
}

/**
 * Mengonversi buffer file S-57 (.000) menjadi daftar layer GeoJSON yang terkelompok.
 */
export function convertS57ToGeoJSONLayers(arrayBuffer: ArrayBuffer): S57LayerData[] {
  // 1. Parsing file biner S-57
  const dataset = parseS57(arrayBuffer);
  
  // 2. Konversi dataset mentah ke GeoJSON menggunakan parser helper
  const fullGeoJSON = toGeoJSON(dataset);
  
  if (!fullGeoJSON || !fullGeoJSON.features) {
    throw new Error("File S-57 tidak menghasilkan fitur geometri apa pun.");
  }

  // 3. Kelompokkan fitur berdasarkan kelas objek S-57 (misal: LNDARE, DEPCNT)
  const groupedFeatures: Record<string, any[]> = {};
  
  for (const feature of fullGeoJSON.features) {
    // Properti OBJL atau OBJ_CLASS biasanya berisi kode kelas objek (misal: "LNDARE")
    const classCode = feature.properties?.OBJL || feature.properties?.OBJ_CLASS || "UNKNOWN";
    
    if (!groupedFeatures[classCode]) {
      groupedFeatures[classCode] = [];
    }
    groupedFeatures[classCode].push(feature);
  }

  // 4. Transformasikan kelompok fitur menjadi struktur Layer GeoLibre
  const layers: S57LayerData[] = Object.keys(groupedFeatures).map((code) => {
    return {
      classCode: code,
      layerName: getFriendlyLayerName(code),
      geojson: {
        type: "FeatureCollection",
        features: groupedFeatures[code]
      }
    };
  });

  return layers;
}

/**
 * Peta pembantu untuk memberikan nama yang mudah dipahami manusia dari kode singkatan S-57.
 */
function getFriendlyLayerName(code: string): string {
  const mapping: Record<string, string> = {
    LNDARE: "Daratan (Land Area)",
    DEPCNT: "Garis Kedalaman (Depth Contour)",
    DEPARE: "Area Kedalaman (Depth Area)",
    SOUNDG: "Titik Kedalaman (Soundings)",
    LIGHTS: "Lampu Navigasi (Lights)",
    BOYSPP: "Pelampung Khusus (Special Buoy)",
    OBSTRN: "Rintangan Laut (Obstruction)",
    WRECKK: "Bangkai Kapal (Wrecks)",
    PONTON: "Ponton / Dermaga (Pontoon)"
  };
  
  return mapping[code] || `Objek S-57: ${code}`;
}
```

### C. Komponen UI Pengunggah (`src/lib/components/S57Uploader.tsx`)
Komponen React ini diletakkan di sidebar kanan (Right Panel) GeoLibre untuk memudahkan pengguna mengunggah file `.000`.

```tsx
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
          const layers = convertS57ToGeoJSONLayers(buffer);
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
```

### D. Styling Premium (`src/lib/styles/uploader.css`)
Gunakan desain *glassmorphism* dan estetika gelap yang premium agar serasi dengan aplikasi GeoLibre modern.

```css
.s57-uploader-panel {
  padding: 16px;
  font-family: 'Inter', sans-serif;
  color: #f3f4f6;
  background: rgba(30, 41, 59, 0.7);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}

.s57-uploader-panel h3 {
  margin-top: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #60a5fa;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
}

.s57-uploader-panel .description {
  font-size: 0.85rem;
  color: #94a3b8;
  line-height: 1.4;
  margin-bottom: 16px;
}

.upload-zone {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.upload-zone input[type="file"] {
  display: none;
}

.upload-button {
  display: block;
  width: 100%;
  padding: 12px;
  text-align: center;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: transform 0.2s, opacity 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.upload-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
}

.upload-button.loading {
  background: #475569;
  cursor: not-allowed;
  animation: pulse 1.5s infinite;
}

.error-message {
  padding: 10px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
  border-radius: 6px;
  color: #fca5a5;
  font-size: 0.8rem;
  margin-bottom: 16px;
}

.loaded-section {
  background: rgba(15, 23, 42, 0.5);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.loaded-section h4 {
  margin: 0 0 8px 0;
  font-size: 0.85rem;
  color: #94a3b8;
}

.loaded-section ul {
  list-style: none;
  padding: 0;
  margin: 0 0 12px 0;
  font-size: 0.8rem;
}

.loaded-section li {
  padding: 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reset-button {
  width: 100%;
  padding: 8px;
  background: transparent;
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.4);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background 0.2s;
}

.reset-button:hover {
  background: rgba(248, 113, 113, 0.1);
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}
```

### E. Integrasi Host API (`src/geolibre.ts`)
Gunakan entrypoint ini untuk mendaftarkan UI Sidebar Kanan ke GeoLibre dan mengelola proses registrasi/pembatalan layer di peta menggunakan `registerExternalNativeLayer`.

```typescript
import ReactDOM from 'react-dom';
import React from 'react';
import type { GeoLibreAppAPI, GeoLibrePlugin } from './lib/geolibre/host-api';
import { S57Uploader } from './lib/components/S57Uploader';
import { S57LayerData } from './lib/utils/s57Converter';
import './lib/styles/uploader.css';

let appAPI: GeoLibreAppAPI | null = null;
let activeLayerIds: string[] = [];

// Fungsi pembantu untuk menentukan gaya default berdasarkan tipe kelas objek S-57
function getLayerStyle(classCode: string) {
  switch (classCode) {
    case 'LNDARE': // Daratan
      return { fillColor: '#e2d4b7', strokeColor: '#8c7d5c', strokeWidth: 1, fillOpacity: 0.9 };
    case 'DEPARE': // Area Kedalaman
      return { fillColor: '#e0f2fe', fillOpacity: 0.5 };
    case 'DEPCNT': // Garis kontur kedalaman
      return { strokeColor: '#0284c7', strokeWidth: 1.5 };
    case 'SOUNDG': // Titik angka kedalaman (Soundings)
      return { circleRadius: 3, fillColor: '#0f172a' };
    case 'LIGHTS': // Lampu navigasi
      return { circleRadius: 5, fillColor: '#eab308' };
    default:
      return { fillColor: '#cbd5e1', strokeColor: '#64748b', strokeWidth: 1, fillOpacity: 0.4 };
  }
}

export const s57ReaderPlugin: GeoLibrePlugin = {
  id: "geolibre-s57-reader",
  name: "S-57 Marine Chart Reader",
  version: "1.0.0",

  activate(app: GeoLibreAppAPI) {
    appAPI = app;

    // Cek apakah host mendukung pendaftaran panel kanan (Right Panel)
    if (app.registerRightPanel) {
      app.registerRightPanel({
        id: "s57-uploader-panel",
        title: "S-57 Loader",
        render: (container: HTMLElement) => {
          // Render komponen UI React ke container panel samping
          ReactDOM.render(
            <S57Uploader 
              onLayersLoaded={handleLayersLoaded}
              onClearLayers={handleClearLayers}
            />, 
            container
          );

          // Return fungsi cleanup ketika panel ditutup
          return () => {
            ReactDOM.unmountComponentAtNode(container);
          };
        }
      });
      
      // Buka panel samping secara otomatis setelah aktivasi
      if (app.openRightPanel) {
        app.openRightPanel("s57-uploader-panel");
      }
    }
    return true;
  },

  deactivate(app: GeoLibreAppAPI) {
    // Bersihkan semua layer di peta saat plugin dinonaktifkan
    handleClearLayers();
    
    if (app.unregisterRightPanel) {
      app.unregisterRightPanel("s57-uploader-panel");
    }
    appAPI = null;
    return true;
  }
};

/**
 * Meregistrasikan layer-layer GeoJSON baru ke sistem layer bawaan GeoLibre
 */
function handleLayersLoaded(layers: S57LayerData[]) {
  if (!appAPI || !appAPI.registerExternalNativeLayer) return;

  // Hapus layer lama terlebih dahulu jika ada
  handleClearLayers();

  for (const layer of layers) {
    const layerId = `s57-layer-${layer.classCode.toLowerCase()}`;
    
    // Konfigurasi registrasi layer
    appAPI.registerExternalNativeLayer({
      id: layerId,
      name: layer.layerName,
      geojson: layer.geojson,
      nativeLayerIds: [layerId],
      sourceIds: [layerId],
      opacity: 0.8,
      style: getLayerStyle(layer.classCode),
      metadata: {
        s57Class: layer.classCode,
        source: 'S-57 Import'
      }
    });

    activeLayerIds.push(layerId);
  }
}

/**
 * Menghapus semua layer yang diimpor dari peta
 */
function handleClearLayers() {
  if (!appAPI || !appAPI.unregisterExternalNativeLayer) return;

  for (const layerId of activeLayerIds) {
    appAPI.unregisterExternalNativeLayer(layerId);
  }
  activeLayerIds = [];
}

// Default export untuk dibaca oleh bundling system GeoLibre
export default s57ReaderPlugin;
```

---

## 4. Hal-hal Penting yang Harus Diperhatikan saat Konversi S-57 ke GeoJSON

Bagi programmer junior atau AI model yang melakukan pengodean lebih lanjut, perhatikan aspek krusial berikut dalam penanganan file spasial S-57:

### 1. Datum dan Proyeksi Geografis
- **Standar S-57:** S-57 secara mutlak menggunakan datum **WGS 84 (World Geodetic System 1984)** dengan unit derajat desimal (Latitude/Longitude).
- **GeoJSON:** Secara default menggunakan **CRS EPSG:4326** yang berbasis pada WGS 84.
- **Tindakan:** Pastikan parser tidak melakukan transformasi koordinat (proyeksi) tambahan kecuali diperlukan. Koordinat mentah dari S-57 dapat langsung dimasukkan sebagai koordinat `[longitude, latitude]` di GeoJSON.

### 2. Geometri S-57 yang Fleksibel
- Objek S-57 yang sama (misalnya, `LNDARE` / Land Area) dapat berupa **Point**, **LineString**, atau **Polygon** dalam satu file.
- **GeoJSON Constraint:** GeoJSON merepresentasikan tipe geometri terpisah.
- **Tindakan:** Pastikan parser memetakan properti geometry secara tepat. Jika objek bertipe area/polygon, koordinat pertama dan terakhir dari ring terluar (outer boundary) harus sama untuk menutup poligon secara valid.

### 3. Penanganan Atribut Khusus S-57
- S-57 menggunakan kode properti pendek 6 karakter untuk menyimpan metadata navigasi penting.
- **Contoh Atribut Penting:**
  - `VALDCO` (Value of Depth Contour): Menyimpan informasi nilai kedalaman kontur. Wajib dipertahankan agar visualisasi gradasi kedalaman air (biru tua ke biru muda) bisa dilakukan.
  - `DRVAL1` & `DRVAL2`: Batas rentang kedalaman aman di area tertentu.
  - `INFORM`: Keterangan teks tambahan.
- **Tindakan:** Jangan membuang properti objek ini saat konversi ke GeoJSON. Masukkan semua properti tersebut ke dalam objek `properties` di GeoJSON Feature.

### 4. Titik Kedalaman Laut (Soundings / `SOUNDG`)
- `SOUNDG` adalah tipe objek khusus dalam S-57 yang bertipe Point, namun menyajikan data **3D** (X, Y, Z) di mana Z adalah kedalaman dasar laut (draft).
- **Tindakan:** Dalam GeoJSON, representasikan `SOUNDG` sebagai koordinat 3D `[longitude, latitude, depth]` atau simpan nilai kedalaman tersebut di dalam `properties.depth` agar GeoLibre dapat menampilkan angka kedalaman secara tepat di atas peta.

### 5. Masalah Ukuran File & Kinerja Browser (Performance)
- Satu file S-57 `.000` mencakup peta laut satu cell utuh yang bisa berukuran beberapa Megabyte dengan puluhan ribu koordinat kompleks.
- Memproses seluruh layer di browser dapat menyebabkan aplikasi membeku (lag).
- **Tindakan:**
  - Lakukan **Geometry Simplification** (misalnya menggunakan algoritma Douglas-Peucker) untuk layer dengan skala kecil.
  - Hanya render layer-layer penting saja di awal (seperti kontur utama dan daratan), lalu muat layer detail (seperti penanda tiang navigasi/soundings kecil) pada level zoom yang lebih tinggi menggunakan parameter `minZoom` di `style`.

---

## 5. Lembar Checklist Implementasi (Junior / AI)

Sebelum menyatakan tugas ini selesai, lakukan pengujian mandiri menggunakan checklist di bawah ini:

- [ ] Proyek berhasil dibundel menjadi file `.zip` dengan menjalankan `npm run package:geolibre`.
- [ ] Berkas ZIP berisi berkas `plugin.json` di root folder, diikuti dengan berkas bundel `dist/index.js`.
- [ ] Pengguna dapat mengunggah berkas `.000` melalui input berkas di panel Right Sidebar.
- [ ] Konverter berhasil mengelompokkan data berdasarkan kelas objek (seperti `LNDARE`, `DEPCNT`).
- [ ] Setiap layer didaftarkan ke GeoLibre secara mandiri dengan fungsi `registerExternalNativeLayer` sehingga layer dapat dinonaktifkan/diaktifkan satu-persatu di panel layer utama GeoLibre.
- [ ] Warna dan ketebalan garis (styling) bervariasi tergantung tipe objek (misal: daratan berwarna cokelat/kuning gading, kontur berwarna biru).
- [ ] Berkas dibersihkan dengan benar ketika menekan tombol "Bersihkan Semua Layer" atau saat plugin dinonaktifkan (`deactivate`).
- [ ] Tidak ada galat kebocoran memori (memory leak) karena unmount komponen React berjalan dengan sukses saat panel ditutup.
