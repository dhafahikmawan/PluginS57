return map.getStyle().layers.map(l => l.id); 
return Object.keys(map.getStyle().sources);
import json 
print(dir(geolibre));
for l in geolibre.layers: 
    print(l, type(l))
    # If it is a dictionary, let's see its keys. If it has name, let's print l.get('name') and l.get('id')
    if isinstance(l, dict):
        print(l.get('id'), l.get('name'))
    else:
        # It might be an object, let's try reading attributes
            try:
                print(l.id, l.name)
            except Exception as e:
                print(e)




for l in geolibre.layers: 
    if 'LIGHT' in l.name: 
        print(l.id, l.name)
const targetId = '3846bd64-803f-406a-a90d-55f553c882b7';\n
const layers = map.getStyle().layers.filter(l => l.id.includes(targetId));
const result = [];
for (const l of layers) {
    if (l.type === 'fill') {
        map.setPaintProperty(l.id, 'fill-color', '#ff0000');
        map.setPaintProperty(l.id, 'fill-opacity', 0.6);
        result.push(`${l.id} set to red fill`);
    } else if (l.type === 'line') {
        map.setPaintProperty(l.id, 'line-color', '#cc0000');
        result.push(`${l.id} set to dark red line`);
    }
}
return result;

