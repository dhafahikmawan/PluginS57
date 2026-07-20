/**
 * Icon sprite selection and mapping helper for S-57 point and symbol classes.
 * Maps S-57 object class + attributes to sprite keys from Samples/Icons/sprite.json.
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
 * Sprite key constants - these map to keys in sprite.json
 */
const SPRITE_KEYS = {
  // Lights
  LIGHTS_GENERIC: 'LIGHTS',
  LIGHTS_RED: 'LIGHTS_RED',
  LIGHTS_GREEN: 'LIGHTS_GREEN',
  LIGHTS_YELLOW: 'LIGHTS_YELLOW',

  // Buoys
  BUOY_LATERAL_RED: 'BOYLAT_RED',
  BUOY_LATERAL_GREEN: 'BOYLAT_GREEN',
  BUOY_CARDINAL_NORTH: 'BOYCAR_N',
  BUOY_CARDINAL_EAST: 'BOYCAR_E',
  BUOY_CARDINAL_SOUTH: 'BOYCAR_S',
  BUOY_CARDINAL_WEST: 'BOYCAR_W',
  BUOY_PORT_HAND: 'BOYLAT_RED',
  BUOY_STARBOARD_HAND: 'BOYLAT_GREEN',
  BUOY_PREFERRED_PORT: 'BOYSPP',
  BUOY_PREFERRED_STARBOARD: 'BOYSPP',
  BUOY_ISOLATED_DANGER: 'BOYISD',
  BUOY_SAFE_WATER: 'BOYSAW',
  BUOY_GENERIC: 'BUOY',

  // Beacons
  BEACON_LATERAL_RED: 'BCNLAT_RED',
  BEACON_LATERAL_GREEN: 'BCNLAT_GREEN',
  BEACON_CARDINAL_NORTH: 'BCNCAR_N',
  BEACON_CARDINAL_EAST: 'BCNCAR_E',
  BEACON_CARDINAL_SOUTH: 'BCNCAR_S',
  BEACON_CARDINAL_WEST: 'BCNCAR_W',
  BEACON_ISOLATED_DANGER: 'BCNISD',
  BEACON_GENERIC: 'BEACON',

  // Hazards
  WRECK_GENERIC: 'WRECKS',
  WRECK_DANGEROUS: 'WRECKS_DANGEROUS',
  UNDERWATER_ROCK: 'UWTROC',
  OBSTRUCTION: 'OBSTRN',

  // Landmarks
  LANDMARK: 'LNDMRK',

  // Fallback
  GENERIC_POINT: 'POINT',
};

/**
 * Map BOYSHP (buoy shape) values to sprite keys.
 * BOYSHP codes from S-57 standard.
 */
const BOYSHP_TO_SPRITE: Record<string | number, string> = {
  1: SPRITE_KEYS.BUOY_LATERAL_RED,      // Conical
  2: SPRITE_KEYS.BUOY_LATERAL_RED,      // Can
  3: SPRITE_KEYS.BUOY_LATERAL_GREEN,    // Spherical
  4: SPRITE_KEYS.BUOY_LATERAL_GREEN,    // Pillar
  5: SPRITE_KEYS.BUOY_LATERAL_GREEN,    // Spar
  6: SPRITE_KEYS.BUOY_GENERIC,          // Tower
  7: SPRITE_KEYS.BUOY_GENERIC,          // T-shaped
  8: SPRITE_KEYS.BUOY_GENERIC,          // Cross
  9: SPRITE_KEYS.BUOY_GENERIC,          // X-shaped
};

/**
 * Map BCNSHP (beacon shape) values to sprite keys.
 */
const BCNSHP_TO_SPRITE: Record<string | number, string> = {
  1: SPRITE_KEYS.BEACON_GENERIC,        // Stake
  2: SPRITE_KEYS.BEACON_GENERIC,        // Pole
  3: SPRITE_KEYS.BEACON_GENERIC,        // Towers
  4: SPRITE_KEYS.BEACON_GENERIC,        // Lattice
};

/**
 * Map CATBOY (buoy category) values to sprite keys.
 */
const CATBOY_TO_SPRITE: Record<string | number, string> = {
  1: SPRITE_KEYS.BUOY_PORT_HAND,        // Port hand
  2: SPRITE_KEYS.BUOY_STARBOARD_HAND,   // Starboard hand
  3: SPRITE_KEYS.BUOY_PREFERRED_PORT,   // Preferred channel port
  4: SPRITE_KEYS.BUOY_PREFERRED_STARBOARD, // Preferred channel starboard
  5: SPRITE_KEYS.BUOY_ISOLATED_DANGER,  // Isolated danger
  6: SPRITE_KEYS.BUOY_SAFE_WATER,       // Safe water
  7: SPRITE_KEYS.BUOY_GENERIC,          // Special mark
  8: SPRITE_KEYS.BUOY_GENERIC,          // Light vessel
  9: SPRITE_KEYS.BUOY_GENERIC,          // LANBY
};


/**
 * Map CATWRK (wreck category) values to sprite keys.
 */
const CATWRK_TO_SPRITE: Record<string | number, string> = {
  1: SPRITE_KEYS.WRECK_DANGEROUS,       // Dangerous wreck
  2: SPRITE_KEYS.WRECK_DANGEROUS,       // Vessel exceeding wreck depth
  3: SPRITE_KEYS.WRECK_GENERIC,        // Other wreck
};

/**
 * Select sprite key for LIGHTS or LITFLT (navigational lights).
 */
export function selectLightSprite(attributes: Record<string, unknown>): IconMapping {
  const color = resolveColorVariant(attributes.COLOUR);
  const spriteKey = color && color !== 'WHITE'
    ? `LIGHTS_${color}`
    : SPRITE_KEYS.LIGHTS_GENERIC;

  return {
    spriteKey,
    size: 20,
    allowOverlap: true,
    ignorePlacement: false,
  };
}

/**
 * Select sprite key for buoy classes (BOYLAT, BOYCAR, BOYSPP, BOYISD, BOYSAW).
 */
export function selectBuoySprite(classCode: string, attributes: Record<string, unknown>): IconMapping {
  let spriteKey = SPRITE_KEYS.BUOY_GENERIC;
  const boyshp = attributes.BOYSHP ?? attributes.CATBOY;
  const color = resolveColorVariant(attributes.COLOUR);

  // Try BOYSHP mapping first
  if (boyshp !== undefined && boyshp !== null) {
    const mapped = BOYSHP_TO_SPRITE[String(boyshp)];
    if (mapped) {
      spriteKey = mapped;
    }
  }

  // Try CATBOY mapping
  const catboy = attributes.CATBOY ?? attributes.CATBUA;
  if (catboy !== undefined && catboy !== null) {
    const mapped = CATBOY_TO_SPRITE[String(catboy)];
    if (mapped) {
      spriteKey = mapped;
    }
  }

  // Class-specific defaults
  if (classCode === 'BOYLAT' && color === 'RED') {
    spriteKey = SPRITE_KEYS.BUOY_LATERAL_RED;
  } else if (classCode === 'BOYLAT' && color === 'GREEN') {
    spriteKey = SPRITE_KEYS.BUOY_LATERAL_GREEN;
  } else if (classCode === 'BOYCAR') {
    spriteKey = SPRITE_KEYS.BUOY_CARDINAL_NORTH; // Default
  } else if (classCode === 'BOYISD') {
    spriteKey = SPRITE_KEYS.BUOY_ISOLATED_DANGER;
  } else if (classCode === 'BOYSAW') {
    spriteKey = SPRITE_KEYS.BUOY_SAFE_WATER;
  }

  return {
    spriteKey,
    size: 24,
    allowOverlap: true,
    ignorePlacement: false,
  };
}

/**
 * Select sprite key for beacon classes (BCNLAT, BCNCAR, BCNSPP, BCNISD).
 */
export function selectBeaconSprite(classCode: string, attributes: Record<string, unknown>): IconMapping {
  let spriteKey = SPRITE_KEYS.BEACON_GENERIC;
  const bcnshp = attributes.BCNSHP ?? attributes.CATBCN;
  const color = resolveColorVariant(attributes.COLOUR);

  // Try BCNSHP mapping
  if (bcnshp !== undefined && bcnshp !== null) {
    const mapped = BCNSHP_TO_SPRITE[String(bcnshp)];
    if (mapped) {
      spriteKey = mapped;
    }
  }

  // Class-specific defaults
  if (classCode === 'BCNLAT' && color === 'RED') {
    spriteKey = SPRITE_KEYS.BEACON_LATERAL_RED;
  } else if (classCode === 'BCNLAT' && color === 'GREEN') {
    spriteKey = SPRITE_KEYS.BEACON_LATERAL_GREEN;
  } else if (classCode === 'BCNCAR') {
    spriteKey = SPRITE_KEYS.BEACON_CARDINAL_NORTH; // Default
  } else if (classCode === 'BCNISD') {
    spriteKey = SPRITE_KEYS.BEACON_ISOLATED_DANGER;
  }

  return {
    spriteKey,
    size: 20,
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
    if (mapped) {
      spriteKey = mapped;
    }
  }

  return {
    spriteKey,
    size: 18,
    allowOverlap: false,
    ignorePlacement: false,
  };
}

/**
 * Select sprite key for UWTROC (underwater rocks).
 */
export function selectUnderwaterRockSprite(): IconMapping {
  return {
    spriteKey: SPRITE_KEYS.UNDERWATER_ROCK,
    size: 16,
    allowOverlap: false,
    ignorePlacement: false,
  };
}

/**
 * Select sprite key for OBSTRN (obstacles).
 */
export function selectObstructionSprite(): IconMapping {
  return {
    spriteKey: SPRITE_KEYS.OBSTRUCTION,
    size: 16,
    allowOverlap: false,
    ignorePlacement: false,
  };
}

/**
 * Select sprite key for LNDMRK (landmarks).
 */
export function selectLandmarkSprite(): IconMapping {
  return {
    spriteKey: SPRITE_KEYS.LANDMARK,
    size: 20,
    allowOverlap: true,
    ignorePlacement: false,
  };
}

/**
 * Resolve color variant from COLOUR attribute.
 */
function resolveColorVariant(color: unknown): 'RED' | 'GREEN' | 'YELLOW' | 'WHITE' | undefined {
  if (color === undefined || color === null) {
    return undefined;
  }

  const colorStr = String(color);
  if (colorStr.includes('3')) return 'RED';
  if (colorStr.includes('4')) return 'GREEN';
  if (colorStr.includes('2')) return 'YELLOW';
  if (colorStr.includes('1')) return 'WHITE';

  return undefined;
}

/**
 * Master function to select icon mapping for any S-57 point class.
 */
export function selectIconMapping(classCode: string, attributes: Record<string, unknown>): IconMapping {
  const normalizedCode = String(classCode || '').toUpperCase();

  if (normalizedCode === 'LIGHTS' || normalizedCode === 'LITFLT') {
    return selectLightSprite(attributes);
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
    return selectUnderwaterRockSprite();
  }

  if (normalizedCode === 'OBSTRN') {
    return selectObstructionSprite();
  }

  if (normalizedCode === 'LNDMRK') {
    return selectLandmarkSprite();
  }

  // Fallback for unknown classes
  return {
    spriteKey: SPRITE_KEYS.GENERIC_POINT,
    size: 16,
    allowOverlap: false,
    ignorePlacement: false,
  };
}
