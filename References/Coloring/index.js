// node_modules/@turf/helpers/dist/esm/index.js
var earthRadius = 63710088e-1;
var factors = {
  centimeters: earthRadius * 100,
  centimetres: earthRadius * 100,
  degrees: 360 / (2 * Math.PI),
  feet: earthRadius * 3.28084,
  inches: earthRadius * 39.37,
  kilometers: earthRadius / 1e3,
  kilometres: earthRadius / 1e3,
  meters: earthRadius,
  metres: earthRadius,
  miles: earthRadius / 1609.344,
  millimeters: earthRadius * 1e3,
  millimetres: earthRadius * 1e3,
  nauticalmiles: earthRadius / 1852,
  radians: 1,
  yards: earthRadius * 1.0936
};

// node_modules/@turf/meta/dist/esm/index.js
function geomEach(geojson, callback) {
  var i, j, g, geometry, stopG, geometryMaybeCollection, isGeometryCollection, featureProperties, featureBBox, featureId, featureIndex = 0, isFeatureCollection = geojson.type === "FeatureCollection", isFeature = geojson.type === "Feature", stop = isFeatureCollection ? geojson.features.length : 1;
  for (i = 0; i < stop; i++) {
    geometryMaybeCollection = isFeatureCollection ? (
      // @ts-expect-error: Known type conflict
      geojson.features[i].geometry
    ) : isFeature ? (
      // @ts-expect-error: Known type conflict
      geojson.geometry
    ) : geojson;
    featureProperties = isFeatureCollection ? (
      // @ts-expect-error: Known type conflict
      geojson.features[i].properties
    ) : isFeature ? (
      // @ts-expect-error: Known type conflict
      geojson.properties
    ) : {};
    featureBBox = isFeatureCollection ? (
      // @ts-expect-error: Known type conflict
      geojson.features[i].bbox
    ) : isFeature ? (
      // @ts-expect-error: Known type conflict
      geojson.bbox
    ) : void 0;
    featureId = isFeatureCollection ? (
      // @ts-expect-error: Known type conflict
      geojson.features[i].id
    ) : isFeature ? (
      // @ts-expect-error: Known type conflict
      geojson.id
    ) : void 0;
    isGeometryCollection = geometryMaybeCollection ? geometryMaybeCollection.type === "GeometryCollection" : false;
    stopG = isGeometryCollection ? geometryMaybeCollection.geometries.length : 1;
    for (g = 0; g < stopG; g++) {
      geometry = isGeometryCollection ? geometryMaybeCollection.geometries[g] : geometryMaybeCollection;
      if (geometry === null) {
        if (
          // @ts-expect-error: Known type conflict
          callback(
            // @ts-expect-error: Known type conflict
            null,
            featureIndex,
            featureProperties,
            featureBBox,
            featureId
          ) === false
        )
          return false;
        continue;
      }
      switch (geometry.type) {
        case "Point":
        case "LineString":
        case "MultiPoint":
        case "Polygon":
        case "MultiLineString":
        case "MultiPolygon": {
          if (
            // @ts-expect-error: Known type conflict
            callback(
              geometry,
              featureIndex,
              featureProperties,
              featureBBox,
              featureId
            ) === false
          )
            return false;
          break;
        }
        case "GeometryCollection": {
          for (j = 0; j < geometry.geometries.length; j++) {
            if (
              // @ts-expect-error: Known type conflict
              callback(
                geometry.geometries[j],
                featureIndex,
                featureProperties,
                featureBBox,
                featureId
              ) === false
            )
              return false;
          }
          break;
        }
        default:
          throw new Error("Unknown Geometry Type");
      }
    }
    featureIndex++;
  }
}
function geomReduce(geojson, callback, initialValue) {
  var previousValue = initialValue;
  geomEach(
    geojson,
    function(currentGeometry, featureIndex, featureProperties, featureBBox, featureId) {
      if (featureIndex === 0 && initialValue === void 0)
        previousValue = currentGeometry;
      else
        previousValue = callback(
          // @ts-expect-error: Known type conflict
          previousValue,
          currentGeometry,
          featureIndex,
          featureProperties,
          featureBBox,
          featureId
        );
    }
  );
  return previousValue;
}

// node_modules/@turf/area/dist/esm/index.js
function area(geojson) {
  return geomReduce(
    geojson,
    (value, geom) => {
      return value + calculateArea(geom);
    },
    0
  );
}
function calculateArea(geom) {
  let total = 0;
  let i;
  switch (geom.type) {
    case "Polygon":
      return polygonArea(geom.coordinates);
    case "MultiPolygon":
      for (i = 0; i < geom.coordinates.length; i++) {
        total += polygonArea(geom.coordinates[i]);
      }
      return total;
    case "Point":
    case "MultiPoint":
    case "LineString":
    case "MultiLineString":
      return 0;
  }
  return 0;
}
function polygonArea(coords) {
  let total = 0;
  if (coords && coords.length > 0) {
    total += Math.abs(ringArea(coords[0]));
    for (let i = 1; i < coords.length; i++) {
      total -= Math.abs(ringArea(coords[i]));
    }
  }
  return total;
}
var FACTOR = earthRadius * earthRadius / 2;
var PI_OVER_180 = Math.PI / 180;
function ringArea(coords) {
  const coordsLength = coords.length - 1;
  if (coordsLength <= 2) return 0;
  let total = 0;
  let i = 0;
  while (i < coordsLength) {
    const lower = coords[i];
    const middle = coords[i + 1 === coordsLength ? 0 : i + 1];
    const upper = coords[i + 2 >= coordsLength ? (i + 2) % coordsLength : i + 2];
    const lowerX = lower[0] * PI_OVER_180;
    const middleY = middle[1] * PI_OVER_180;
    const upperX = upper[0] * PI_OVER_180;
    total += (upperX - lowerX) * Math.sin(middleY);
    i++;
  }
  return total * FACTOR;
}

// src/index.js
function applyLayerStyle(map, layerIds) {
  if (!map || typeof map.setPaintProperty !== "function") {
    return;
  }
  const paintOps = [
    ["fill-color", "#ff0000"],
    ["line-color", "#00ff00"],
    ["circle-color", "#ff0000"],
    ["circle-stroke-color", "#00ff00"],
    ["circle-stroke-width", 2],
    ["circle-radius", 8]
  ];
  layerIds.forEach((layerId) => {
    paintOps.forEach(([property, value]) => {
      try {
        map.setPaintProperty(layerId, property, value);
      } catch (err) {
      }
    });
  });
}
function styleGeoJsonLayer(app, name, layerId, attempt = 0) {
  const map = app?.getMap?.();
  if (!map || typeof map.getStyle !== "function") {
    if (attempt < 4) {
      setTimeout(() => styleGeoJsonLayer(app, name, layerId, attempt + 1), 250);
    }
    return;
  }
  const styleLayers = map.getStyle().layers || [];
  const candidates = [];
  styleLayers.forEach((layer) => {
    if (!layer?.id) {
      return;
    }
    const id = layer.id;
    if (id.includes(layerId)) {
      candidates.push(id);
    }
  });
  const uniqueIds = [...new Set(candidates.filter(Boolean))];
  applyLayerStyle(map, uniqueIds);
  if (uniqueIds.length === 0 && attempt < 4) {
    setTimeout(() => styleGeoJsonLayer(app, name, layerId, attempt + 1), 250);
  }
}
function addGeoJsonToLayer(app, name, data, layerId) {
  const addLayer = app?.addGeoJsonLayer;
  if (typeof addLayer === "function") {
    const result = addLayer(name, data);
    setTimeout(() => styleGeoJsonLayer(app, name, layerId), 0);
    return result;
  }
  return null;
}
var plugin = {
  id: "my-plugin",
  name: "My Plugin",
  version: "1.0.0",
  activate(app) {
    const layerId = "my-plugin-geojson-layer";
    const geojson = {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              -75.01635742187503,
              40.22790264239342
            ]
          },
          "properties": {
            "name": "p1"
          }
        },
        {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              -74.95867919921876,
              39.92210748577264
            ]
          },
          "properties": {
            "name": "p2"
          }
        },
        {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              -74.6702880859382,
              40.057835590127894
            ]
          },
          "properties": {
            "name": "p3"
          }
        },
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [
              [
                [
                  -75.07128906250014,
                  39.89577239757705
                ],
                [
                  -74.71835327148435,
                  39.831472300274925
                ],
                [
                  -74.52609252929685,
                  40.03260427212399
                ],
                [
                  -74.65792846679668,
                  40.13032360330075
                ],
                [
                  -75.07128906250014,
                  39.89577239757705
                ]
              ]
            ]
          },
          "properties": {
            "name": "poly1"
          }
        }
      ]
    };
    geojson.features.forEach((feature) => {
      if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
        try {
          const areaSqMeters = area(feature);
          const areaSqKm = areaSqMeters / 1e6;
          feature.properties.area_m2 = areaSqMeters;
          feature.properties.area_km2 = areaSqKm;
        } catch (err) {
          console.error("Error calculating area: ", err);
        }
      }
    });
    try {
      (async () => {
        await Promise.resolve(addGeoJsonToLayer(app, "My Plugin Layer", geojson, layerId));
      })();
    } catch (e) {
      console.error("Error while adding GeoJSON layer", e);
    }
  },
  deactivate(app) {
    try {
      const unregister = app?.unregisterExternalNativeLayer;
      if (typeof unregister === "function") {
        unregister("my-plugin-geojson-layer");
      }
    } catch (e) {
      console.error("Error while removing GeoJSON layer", e);
    }
  }
};
export {
  plugin as default,
  plugin
};
