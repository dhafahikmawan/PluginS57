import re
import json

# Read config.js to get all S-57 layer names referenced
with open("c:/Users/erwin/OneDrive/Documents/Learning/Plugin 000/Samples/MAP/config.js", "r") as f:
    config_content = f.read()

# Layers can be in s52_styles.areas, s52_styles.lines, s52_styles.areaOutlines, s52_labels, LAYER_MIN_ZOOM
# Let's extract all uppercase strings of length 4 to 6 that look like S-57 layers
candidates = set(re.findall(r'"([A-Z_]{6})"', config_content) + re.findall(r"'([A-Z_]{6})'", config_content))
# Let's also include 4-letter and 5-letter uppercase words
candidates.update(re.findall(r'"([A-Z_]{4,5})"', config_content))
candidates.update(re.findall(r"'([A-Z_]{4,5})'", config_content))

# Filter to common S-57 layer pattern (uppercase letters/underscores, e.g. LNDARE, DEPARE, M_NPUB, M_QUAL, etc.)
s57_pattern = re.compile(r'^[A-Z][A-Z_0-9]{3,7}$')
s57_layers = sorted([c for c in candidates if s57_pattern.match(c)])

print("S57 Layers found in config.js:", len(s57_layers))
print(s57_layers)
