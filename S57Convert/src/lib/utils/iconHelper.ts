/**
 * Icon sprite selection and mapping helper for S-57 point and symbol classes.
 * Maps S-57 object class + attributes to sprite keys from Samples/Icons/sprite.json.
 *
 * All keys in SPRITE_KEYS must exist in the bundled sprite.json (SMAC-M symbols).
 * Key legend (from sprite.json):
 *   LIGHTS11 = yellow/white light (generic/white)
 *   LIGHTS12 = red light
 *   LIGHTS13 = green light
 *   LITFLT01 = light float / light vessel generic
 *   BOYLAT13 = port-hand (red) lateral buoy
 *   BOYLAT14 = starboard-hand (green) lateral buoy
 *   BOYCAR01 = north cardinal buoy
 *   BOYCAR02 = east cardinal buoy
 *   BOYCAR03 = south cardinal buoy
 *   BOYCAR04 = west cardinal buoy
 *   BOYISD12 = isolated danger buoy
 *   BOYSAW12 = safe water buoy
 *   BOYSPP11 = special purpose buoy
 *   BOYSPP15 = preferred channel to port (red over green)
 *   BOYSPP25 = preferred channel to starboard (green over red)
 *   BCNLAT15 = port-hand (red) lateral beacon
 *   BCNLAT16 = starboard-hand (green) lateral beacon
 *   BCNLAT21 = generic lateral beacon (stick shape)
 *   BCNCAR01 = north cardinal beacon
 *   BCNCAR02 = east cardinal beacon
 *   BCNCAR03 = south cardinal beacon
 *   BCNCAR04 = west cardinal beacon
 *   BCNISD21 = isolated danger beacon
 *   BCNSPP21 = special purpose beacon
 *   WRECKS01 = wreck (generic/submerged)
 *   WRECKS04 = wreck (dangerous, depth uncertain)
 *   WRECKS05 = wreck (mast/funnel visible)
 *   UWTROC03 = underwater rock (covers and uncovers)
 *   UWTROC04 = underwater rock (always submerged)
 *   OBSTRN01 = obstruction (foul ground / generic)
 *   OBSTRN11 = obstruction (rock awash)
 *   TOWERS01 = generic tower (used as landmark fallback)
 *   DANGER01 = generic danger / unknown point fallback
 */

export interface SpriteManifest {
  [key: string]: {
    x: number;
    y: number;
    width: number;
    height: number;
    pixelRatio?: number;
  };
}

export interface IconMapping {
  spriteKey: string;
  size?: number;
  allowOverlap?: boolean;
  ignorePlacement?: boolean;
}

/**
 * Sprite key constants — values must match keys present in sprite.json.
 */
const SPRITE_KEYS = {
  // Lights (LIGHTS class)
  LIGHTS_GENERIC: 'LIGHTS11',   // white / generic light
  LIGHTS_RED:     'LIGHTS12',   // red light
  LIGHTS_GREEN:   'LIGHTS13',   // green light
  LIGHTS_YELLOW:  'LIGHTS11',   // yellow treated as white/generic

  // Light vessel / float (LITFLT class)
  LITFLT_GENERIC: 'LITFLT01',

  // Lateral buoys
  BUOY_LATERAL_RED:       'BOYLAT13',  // port-hand (red)
  BUOY_LATERAL_GREEN:     'BOYLAT14',  // starboard-hand (green)
  BUOY_PORT_HAND:         'BOYLAT13',
  BUOY_STARBOARD_HAND:    'BOYLAT14',
  BUOY_PREFERRED_PORT:    'BOYSPP15',  // preferred channel to port
  BUOY_PREFERRED_STARBOARD: 'BOYSPP25',// preferred channel to starboard

  // Cardinal buoys
  BUOY_CARDINAL_NORTH: 'BOYCAR01',
  BUOY_CARDINAL_EAST:  'BOYCAR02',
  BUOY_CARDINAL_SOUTH: 'BOYCAR03',
  BUOY_CARDINAL_WEST:  'BOYCAR04',

  // Special buoys
  BUOY_ISOLATED_DANGER: 'BOYISD12',
  BUOY_SAFE_WATER:      'BOYSAW12',
  BUOY_SPECIAL:         'BOYSPP11',
  BUOY_GENERIC:         'BOYCAR01',   // north cardinal shape as generic fallback

  // Lateral beacons
  BEACON_LATERAL_RED:   'BCNLAT15',   // port-hand (red)
  BEACON_LATERAL_GREEN: 'BCNLAT16',   // starboard-hand (green)

  // Cardinal beacons
  BEACON_CARDINAL_NORTH: 'BCNCAR01',
  BEACON_CARDINAL_EAST:  'BCNCAR02',
  BEACON_CARDINAL_SOUTH: 'BCNCAR03',
  BEACON_CARDINAL_WEST:  'BCNCAR04',

  // Special beacons
  BEACON_ISOLATED_DANGER: 'BCNISD21',
  BEACON_SPECIAL:         'BCNSPP21',
  BEACON_GENERIC:         'BCNLAT21', // generic stick beacon fallback

  // Wrecks
  WRECK_GENERIC:    'WRECKS01',  // generic / submerged wreck
  WRECK_DANGEROUS:  'WRECKS04',  // dangerous wreck (depth uncertain)
  WRECK_VISIBLE:    'WRECKS05',  // wreck with mast/funnel visible

  // Underwater rocks
  UNDERWATER_ROCK:           'UWTROC03', // covers and uncovers
  UNDERWATER_ROCK_SUBMERGED: 'UWTROC04', // always submerged

  // Obstructions
  OBSTRUCTION:       'OBSTRN01', // foul ground / generic
  OBSTRUCTION_AWASH: 'OBSTRN11', // rock awash

  // Landmarks
  LANDMARK: 'TOWERS01', // generic tower shape as landmark fallback

  // Fallback for unknown point classes
  GENERIC_POINT: 'DANGER01',
};

/**
 * Map BOYSHP (buoy shape) values to sprite keys.
 * S-57 BOYSHP codes.
 */
const BOYSHP_TO_SPRITE: Record<string | number, string> = {
  1: SPRITE_KEYS.BUOY_LATERAL_RED,   // Conical (typically port/red)
  2: SPRITE_KEYS.BUOY_LATERAL_GREEN, // Can (typically starboard/green)
  3: SPRITE_KEYS.BUOY_LATERAL_GREEN, // Spherical
  4: SPRITE_KEYS.BUOY_LATERAL_GREEN, // Pillar
  5: SPRITE_KEYS.BUOY_LATERAL_GREEN, // Spar
  6: SPRITE_KEYS.BUOY_GENERIC,       // Tower
  7: SPRITE_KEYS.BUOY_GENERIC,       // T-shaped
  8: SPRITE_KEYS.BUOY_GENERIC,       // Cross
  9: SPRITE_KEYS.BUOY_GENERIC,       // X-shaped
};

/**
 * Map BCNSHP (beacon shape) values to sprite keys.
 */
const BCNSHP_TO_SPRITE: Record<string | number, string> = {
  1: SPRITE_KEYS.BEACON_GENERIC, // Stake
  2: SPRITE_KEYS.BEACON_GENERIC, // Pole
  3: SPRITE_KEYS.BEACON_GENERIC, // Towers
  4: SPRITE_KEYS.BEACON_GENERIC, // Lattice
};

/**
 * Map CATBOY (buoy category) values to sprite keys.
 */
const CATBOY_TO_SPRITE: Record<string | number, string> = {
  1: SPRITE_KEYS.BUOY_PORT_HAND,          // Port hand
  2: SPRITE_KEYS.BUOY_STARBOARD_HAND,     // Starboard hand
  3: SPRITE_KEYS.BUOY_PREFERRED_PORT,     // Preferred channel to port
  4: SPRITE_KEYS.BUOY_PREFERRED_STARBOARD,// Preferred channel to starboard
  5: SPRITE_KEYS.BUOY_ISOLATED_DANGER,    // Isolated danger
  6: SPRITE_KEYS.BUOY_SAFE_WATER,         // Safe water
  7: SPRITE_KEYS.BUOY_SPECIAL,            // Special mark
  8: SPRITE_KEYS.BUOY_GENERIC,            // Light vessel / LANBY
  9: SPRITE_KEYS.BUOY_GENERIC,            // LANBY
};

/**
 * Map CATWRK (wreck category) values to sprite keys.
 */
const CATWRK_TO_SPRITE: Record<string | number, string> = {
  1: SPRITE_KEYS.WRECK_DANGEROUS,  // Non-dangerous wreck (depth known)
  2: SPRITE_KEYS.WRECK_DANGEROUS,  // Dangerous wreck (depth unknown)
  3: SPRITE_KEYS.WRECK_GENERIC,    // Distributed remains
  4: SPRITE_KEYS.WRECK_VISIBLE,    // Mast/funnel visible
  5: SPRITE_KEYS.WRECK_VISIBLE,    // Hull visible
};

/**
 * Resolve color variant from COLOUR attribute value.
 * S-57 COLOUR codes: 1=white, 2=black, 3=red, 4=green, 5=blue, 6=yellow, 7=grey
 */
function resolveColorVariant(color: unknown): 'RED' | 'GREEN' | 'YELLOW' | 'WHITE' | undefined {
  if (color === undefined || color === null) {
    return undefined;
  }

  const colorStr = String(color);
  // Check for numeric color codes — can be comma-separated list like "3,1"
  if (colorStr.includes('3')) return 'RED';
  if (colorStr.includes('4')) return 'GREEN';
  if (colorStr.includes('6') || colorStr.includes('2')) return 'YELLOW';
  if (colorStr.includes('1')) return 'WHITE';

  return undefined;
}

/**
 * Select sprite key for LIGHTS or LITFLT (navigational lights).
 */
export function selectLightSprite(attributes: Record<string, unknown>): IconMapping {
  const color = resolveColorVariant(attributes.COLOUR);
  let spriteKey = SPRITE_KEYS.LIGHTS_GENERIC;
  if (color === 'RED')    spriteKey = SPRITE_KEYS.LIGHTS_RED;
  else if (color === 'GREEN')  spriteKey = SPRITE_KEYS.LIGHTS_GREEN;
  else if (color === 'YELLOW') spriteKey = SPRITE_KEYS.LIGHTS_YELLOW;

  return {
    spriteKey,
    size: 1.0,
    allowOverlap: true,
    ignorePlacement: false,
  };
}

/**
 * Select sprite key for light vessels / floats (LITFLT).
 */
export function selectLitfltSprite(): IconMapping {
  return {
    spriteKey: SPRITE_KEYS.LITFLT_GENERIC,
    size: 1.0,
    allowOverlap: true,
    ignorePlacement: false,
  };
}

/**
 * Select sprite key for buoy classes (BOYLAT, BOYCAR, BOYSPP, BOYISD, BOYSAW).
 */
export function selectBuoySprite(classCode: string, attributes: Record<string, unknown>): IconMapping {
  let spriteKey = SPRITE_KEYS.BUOY_GENERIC;
  const color = resolveColorVariant(attributes.COLOUR);

  // Class-level defaults take lowest priority; attribute overrides below raise priority.
  switch (classCode) {
    case 'BOYLAT':
      spriteKey = color === 'RED' ? SPRITE_KEYS.BUOY_LATERAL_RED : SPRITE_KEYS.BUOY_LATERAL_GREEN;
      break;
    case 'BOYCAR':
      spriteKey = SPRITE_KEYS.BUOY_CARDINAL_NORTH; // default; CATCRD can override
      break;
    case 'BOYISD':
      spriteKey = SPRITE_KEYS.BUOY_ISOLATED_DANGER;
      break;
    case 'BOYSAW':
      spriteKey = SPRITE_KEYS.BUOY_SAFE_WATER;
      break;
    case 'BOYSPP':
      spriteKey = SPRITE_KEYS.BUOY_SPECIAL;
      break;
  }

  // BOYSHP override
  const boyshp = attributes.BOYSHP;
  if (boyshp !== undefined && boyshp !== null) {
    const mapped = BOYSHP_TO_SPRITE[String(boyshp)];
    if (mapped) spriteKey = mapped;
  }

  // CATBOY override (higher priority than BOYSHP for class discrimination)
  const catboy = attributes.CATBOY ?? attributes.CATBUA;
  if (catboy !== undefined && catboy !== null) {
    const mapped = CATBOY_TO_SPRITE[String(catboy)];
    if (mapped) spriteKey = mapped;
  }

  // Cardinal direction override (CATCRD: 1=N, 2=E, 3=S, 4=W)
  if (classCode === 'BOYCAR') {
    const catcrd = attributes.CATCRD;
    if (catcrd !== undefined && catcrd !== null) {
      const cardinals: Record<string, string> = {
        '1': SPRITE_KEYS.BUOY_CARDINAL_NORTH,
        '2': SPRITE_KEYS.BUOY_CARDINAL_EAST,
        '3': SPRITE_KEYS.BUOY_CARDINAL_SOUTH,
        '4': SPRITE_KEYS.BUOY_CARDINAL_WEST,
      };
      const mapped = cardinals[String(catcrd)];
      if (mapped) spriteKey = mapped;
    }
  }

  return {
    spriteKey,
    size: 1.0,
    allowOverlap: true,
    ignorePlacement: false,
  };
}

/**
 * Select sprite key for beacon classes (BCNLAT, BCNCAR, BCNSPP, BCNISD).
 */
export function selectBeaconSprite(classCode: string, attributes: Record<string, unknown>): IconMapping {
  let spriteKey = SPRITE_KEYS.BEACON_GENERIC;
  const color = resolveColorVariant(attributes.COLOUR);

  // Class-level defaults
  switch (classCode) {
    case 'BCNLAT':
      spriteKey = color === 'RED' ? SPRITE_KEYS.BEACON_LATERAL_RED : SPRITE_KEYS.BEACON_LATERAL_GREEN;
      break;
    case 'BCNCAR':
      spriteKey = SPRITE_KEYS.BEACON_CARDINAL_NORTH; // default
      break;
    case 'BCNISD':
      spriteKey = SPRITE_KEYS.BEACON_ISOLATED_DANGER;
      break;
    case 'BCNSPP':
      spriteKey = SPRITE_KEYS.BEACON_SPECIAL;
      break;
  }

  // BCNSHP override
  const bcnshp = attributes.BCNSHP ?? attributes.CATBCN;
  if (bcnshp !== undefined && bcnshp !== null) {
    const mapped = BCNSHP_TO_SPRITE[String(bcnshp)];
    if (mapped) spriteKey = mapped;
  }

  // Cardinal direction override (CATCRD: 1=N, 2=E, 3=S, 4=W)
  if (classCode === 'BCNCAR') {
    const catcrd = attributes.CATCRD;
    if (catcrd !== undefined && catcrd !== null) {
      const cardinals: Record<string, string> = {
        '1': SPRITE_KEYS.BEACON_CARDINAL_NORTH,
        '2': SPRITE_KEYS.BEACON_CARDINAL_EAST,
        '3': SPRITE_KEYS.BEACON_CARDINAL_SOUTH,
        '4': SPRITE_KEYS.BEACON_CARDINAL_WEST,
      };
      const mapped = cardinals[String(catcrd)];
      if (mapped) spriteKey = mapped;
    }
  }

  return {
    spriteKey,
    size: 1.0,
    allowOverlap: true,
    ignorePlacement: false,
  };
}

/**
 * Select sprite key for WRECKS.
 */
export function selectWreckSprite(attributes: Record<string, unknown>): IconMapping {
  let spriteKey = SPRITE_KEYS.WRECK_GENERIC;
  const catwrk = attributes.CATWRK;

  if (catwrk !== undefined && catwrk !== null) {
    const mapped = CATWRK_TO_SPRITE[String(catwrk)];
    if (mapped) spriteKey = mapped;
  }

  return {
    spriteKey,
    size: 1.0,
    allowOverlap: false,
    ignorePlacement: false,
  };
}

/**
 * Select sprite key for UWTROC (underwater rocks).
 */
export function selectUnderwaterRockSprite(attributes: Record<string, unknown> = {}): IconMapping {
  // WATLEV: 3=always submerged, 4=covers and uncovers, 5=awash, 7=floating
  const watlev = attributes.WATLEV;
  const spriteKey = (watlev !== undefined && String(watlev) === '3')
    ? SPRITE_KEYS.UNDERWATER_ROCK_SUBMERGED
    : SPRITE_KEYS.UNDERWATER_ROCK;

  return {
    spriteKey,
    size: 1.0,
    allowOverlap: false,
    ignorePlacement: false,
  };
}

/**
 * Select sprite key for OBSTRN (obstacles).
 */
export function selectObstructionSprite(attributes: Record<string, unknown> = {}): IconMapping {
  // WATLEV 5 = awash → use awash symbol
  const watlev = attributes.WATLEV;
  const spriteKey = (watlev !== undefined && String(watlev) === '5')
    ? SPRITE_KEYS.OBSTRUCTION_AWASH
    : SPRITE_KEYS.OBSTRUCTION;

  return {
    spriteKey,
    size: 1.0,
    allowOverlap: false,
    ignorePlacement: false,
  };
}

/**
 * Select sprite key for LNDMRK (landmarks).
 */
export function selectLandmarkSprite(attributes: Record<string, unknown> = {}): IconMapping {
  // CATLMK: 1=cairn, 2=cemetery, 3=chimney, 4=dish antenna, 5=flagstaff,
  // 6=flare stack, 7=mast, 8=wind motor, 9=monument, 10=column, 17=tower, ...
  const catlmk = attributes.CATLMK;
  let spriteKey = SPRITE_KEYS.LANDMARK;

  if (catlmk !== undefined && catlmk !== null) {
    const lmkMap: Record<string, string> = {
      '3':  'CHIMNY01', // chimney
      '5':  'FLGSTF01', // flagstaff
      '7':  'MSTCON04', // mast
      '9':  'MONUMT02', // monument
      '17': 'TOWERS01', // tower
    };
    const mapped = lmkMap[String(catlmk)];
    if (mapped) spriteKey = mapped;
  }

  return {
    spriteKey,
    size: 1.0,
    allowOverlap: true,
    ignorePlacement: false,
  };
}

/**
 * Master function: select icon mapping for any S-57 point class.
 * Always returns a valid sprite key that exists in sprite.json.
 */
export function selectIconMapping(classCode: string, attributes: Record<string, unknown>): IconMapping {
  const normalizedCode = String(classCode || '').toUpperCase();

  if (normalizedCode === 'LIGHTS') {
    return selectLightSprite(attributes);
  }

  if (normalizedCode === 'LITFLT') {
    return selectLitfltSprite();
  }

  if (['BOYLAT', 'BOYCAR', 'BOYSPP', 'BOYISD', 'BOYSAW'].includes(normalizedCode)) {
    return selectBuoySprite(normalizedCode, attributes);
  }

  if (['BCNLAT', 'BCNCAR', 'BCNSPP', 'BCNISD'].includes(normalizedCode)) {
    return selectBeaconSprite(normalizedCode, attributes);
  }

  if (normalizedCode === 'WRECKS') {
    return selectWreckSprite(attributes);
  }

  if (normalizedCode === 'UWTROC') {
    return selectUnderwaterRockSprite(attributes);
  }

  if (normalizedCode === 'OBSTRN') {
    return selectObstructionSprite(attributes);
  }

  if (normalizedCode === 'LNDMRK') {
    return selectLandmarkSprite(attributes);
  }

  // Fallback for unknown point classes — DANGER01 is guaranteed to exist in sprite.json
  return {
    spriteKey: SPRITE_KEYS.GENERIC_POINT,
    size: 1.0,
    allowOverlap: false,
    ignorePlacement: false,
  };
}
