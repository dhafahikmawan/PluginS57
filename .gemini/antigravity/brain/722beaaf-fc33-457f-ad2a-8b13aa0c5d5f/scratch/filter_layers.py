import re

# Read files
with open("c:/Users/erwin/OneDrive/Documents/Learning/Plugin 000/Samples/MAP/config.js", "r", encoding="utf-8") as f:
    config = f.read()

with open("c:/Users/erwin/OneDrive/Documents/Learning/Plugin 000/Samples/MAP/app.js", "r", encoding="utf-8") as f:
    app = f.read()

try:
    with open("c:/Users/erwin/OneDrive/Documents/Learning/Plugin 000/Samples/MAP/s52_utils.js", "r", encoding="utf-8") as f:
        utils = f.read()
except FileNotFoundError:
    utils = ""

combined = config + "\n" + app + "\n" + utils

# S-52 Colors:
colors = {
    'CHBLK', 'CHGRD', 'CHGRF', 'CHRED', 'CHGRN', 'CHYLW', 'CHMGD', 'CHMGF',
    'LITRD', 'LITGN', 'LITYW', 'LANDA', 'LANDF', 'CHBRN', 'DEPDW', 'DEPMD',
    'DEPMS', 'DEPVS', 'DEPIT', 'DEPCN', 'CSTLN', 'NODTA', 'TRFCD', 'RADHI', 'CHGRY',
    'NAV_RED', 'NAV_GREEN', 'NAV_YELLOW'
}

# Attributes:
attrs = {
    'OBJNAM', 'VERCCL', 'VERCLR', 'ORIENT', 'VALMAG', 'VALSOU', 'DRVAL1', 'QUAPOS', 'CONDTN', 'RESTRN', 'COLOUR'
}

# Extract uppercase words of length 4 to 8
candidates = set(re.findall(r'\b([A-Z_0-9]{4,8})\b', combined))

# S-57 layers generally match: ADMARE, LNDARE, COALNE, etc.
# Exclude known colors, attributes, JS keywords, standard abbreviations
exclusions = {
    'TRUE', 'FALSE', 'NULL', 'JSON', 'HTML', 'RGBA', 'ECDIS', 'UUID', 'PORT',
    'ZOOM', 'PATH', 'FILE', 'TYPE', 'SIZE', 'DUSK', 'NIGHT', 'UTME', 'UTMN',
    'LATD', 'LOND', 'GEOM', 'AREA', 'LINE', 'TEXT', 'BASE', 'MAPP', 'MAPS',
    'OPEN', 'LOAD', 'FILL', 'DASH', 'UNIT', 'MODE', 'PROP', 'DATA', 'NAME',
    'LANG', 'SHOW', 'HIDE', 'PLAY', 'STOP', 'WIND', 'WARN', 'INFO', 'PLAN',
    'KEYS', 'VERT', 'GRID', 'ELEV', 'CONV', 'TRAF', 'CABL', 'DEPT', 'SECT',
    'ANCR', 'OBST', 'MARK', 'BUOY', 'BEAC', 'CONT', 'HAZD', 'ROUT', 'SOUND',
    'LABL', 'OTHR', 'TSSL', 'ARRO', 'COMP', 'QUAL', 'PUBL', 'SYST', 'MARK',
    'COVR', 'CSCL', 'SREL', 'STAT', 'DONE', 'INIT', 'POST', 'SEND', 'GETS',
    'SETS', 'LIST', 'KEYS', 'USER', 'APPL', 'MAIN', 'STYL', 'TEMP', 'ONLOAD',
    'MAPLIBRE', 'MAPBOX', 'GLYPHS', 'SPRITE', 'SOURCE', 'LAYER', 'OSM_', 'OSM',
    'DAY', 'DUSK', 'NIGHT', 'S52_COLORS', 'S52_STYLES', 'S52_LABELS', 'PALETTE',
    'ENC_ZOOM_RANGE', 'LAYER_MIN_ZOOM'
}

s57_layers = []
for c in candidates:
    if c in colors or c in attrs or c in exclusions:
        continue
    # must be uppercase letters (and underscores)
    if re.match(r'^[A-Z][A-Z_0-9]{3,7}$', c):
        s57_layers.append(c)

print(sorted(s57_layers))
