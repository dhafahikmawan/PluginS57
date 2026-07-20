function generateLightSectors(lightsGeoJson) {
        const sectorFeatures = [];
        
        lightsGeoJson.features.forEach(feature => {
            const props = feature.properties;
            if (props.SECTR1 !== undefined && props.SECTR2 !== undefined) {
                let sectr1 = parseFloat(props.SECTR1);
                let sectr2 = parseFloat(props.SECTR2);
                let valnmr = parseFloat(props.VALNMR);
                if (isNaN(valnmr)) valnmr = 9.0; // default 9 NM
                
                let color = '#F2E959'; // default White/Yellow
                if (props.COLOUR) {
                    if (props.COLOUR.includes('3')) color = '#FF0000'; // Red
                    else if (props.COLOUR.includes('4')) color = '#00FF00'; // Green
                }
                
                const coord = feature.geometry.coordinates;
                const lon = coord[0];
                const lat = coord[1];
                
                const rLat = (valnmr * 1852) / 111320;
                const rLon = rLat / Math.cos(lat * Math.PI / 180);
                
                const points = [[lon, lat]];
                
                // S-57 bearings are from seaward towards the light
                // So the light shines in the opposite direction (+180)
                let startAngle = (sectr1 + 180) % 360;
                let endAngle = (sectr2 + 180) % 360;
                if (endAngle <= startAngle) endAngle += 360;
                
                const steps = 32;
                const step = (endAngle - startAngle) / steps;
                
                for (let i = 0; i <= steps; i++) {
                    const bearing = startAngle + i * step;
                    const mathAngle = (90 - bearing) * Math.PI / 180;
                    
                    const pLon = lon + rLon * Math.cos(mathAngle);
                    const pLat = lat + rLat * Math.sin(mathAngle);
                    points.push([pLon, pLat]);
                }
                
                points.push([lon, lat]); // close polygon
                
                sectorFeatures.push({
                    type: 'Feature',
                    properties: { color: color },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [points]
                    }
                });
            }
        });
        
        return {
            type: 'FeatureCollection',
            features: sectorFeatures
        };
    }