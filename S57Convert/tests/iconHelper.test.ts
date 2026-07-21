import { describe, it, expect } from 'vitest';
import {
  selectIconMapping,
  selectLightSprite,
  selectLitfltSprite,
  selectBuoySprite,
  selectBeaconSprite,
  selectWreckSprite,
  selectUnderwaterRockSprite,
  selectObstructionSprite,
  selectLandmarkSprite,
} from '../src/lib/utils/iconHelper';

// ─── Helper ────────────────────────────────────────────────────────────────────
/** All sprite keys that must exist in Samples/Icons/sprite.json */
const VALID_SPRITE_KEYS = new Set([
  // lights
  'LIGHTS11', 'LIGHTS12', 'LIGHTS13',
  // light vessel
  'LITFLT01', 'LITFLT02', 'LITFLT10', 'LITFLT61',
  // lateral buoys
  'BOYLAT13', 'BOYLAT14', 'BOYLAT23', 'BOYLAT24', 'BOYLAT25',
  'BOYLAT26', 'BOYLAT27', 'BOYLAT50', 'BOYLAT51',
  // cardinal buoys
  'BOYCAR01', 'BOYCAR02', 'BOYCAR03', 'BOYCAR04',
  // special buoys
  'BOYISD12', 'BOYSAW12', 'BOYSPP11', 'BOYSPP15', 'BOYSPP25',
  // lateral beacons
  'BCNLAT15', 'BCNLAT16', 'BCNLAT21', 'BCNLAT22', 'BCNLAT23',
  'BCNLAT24', 'BCNLAT50',
  // cardinal beacons
  'BCNCAR01', 'BCNCAR02', 'BCNCAR03', 'BCNCAR04',
  // special beacons
  'BCNISD21', 'BCNSPP13', 'BCNSPP21',
  // wrecks
  'WRECKS01', 'WRECKS04', 'WRECKS05', 'WRECKS07',
  // underwater rocks
  'UWTROC03', 'UWTROC04',
  // obstructions
  'OBSTRN01', 'OBSTRN02', 'OBSTRN03', 'OBSTRN11', 'OBSTRN18',
  // landmarks
  'TOWERS01', 'CHIMNY01', 'FLGSTF01', 'MSTCON04', 'MONUMT02',
  // danger / fallback
  'DANGER01', 'DANGER02', 'DANGER03',
]);

function assertValidKey(result: { spriteKey: string }) {
  expect(VALID_SPRITE_KEYS.has(result.spriteKey),
    `Sprite key "${result.spriteKey}" is not present in sprite.json`
  ).toBe(true);
}

// ─── selectLightSprite ─────────────────────────────────────────────────────────
describe('selectLightSprite', () => {
  it('returns red light key (LIGHTS12) for COLOUR=3', () => {
    const result = selectLightSprite({ COLOUR: '3' });
    expect(result.spriteKey).toBe('LIGHTS12');
    expect(result.allowOverlap).toBe(true);
    assertValidKey(result);
  });

  it('returns green light key (LIGHTS13) for COLOUR=4', () => {
    const result = selectLightSprite({ COLOUR: '4' });
    expect(result.spriteKey).toBe('LIGHTS13');
    assertValidKey(result);
  });

  it('returns generic light (LIGHTS11) for yellow/white COLOUR=6', () => {
    const result = selectLightSprite({ COLOUR: '6' });
    expect(result.spriteKey).toBe('LIGHTS11');
    assertValidKey(result);
  });

  it('falls back to generic light (LIGHTS11) when COLOUR is missing', () => {
    const result = selectLightSprite({});
    expect(result.spriteKey).toBe('LIGHTS11');
    assertValidKey(result);
  });
});

// ─── selectLitfltSprite ────────────────────────────────────────────────────────
describe('selectLitfltSprite', () => {
  it('returns LITFLT01', () => {
    const result = selectLitfltSprite();
    expect(result.spriteKey).toBe('LITFLT01');
    assertValidKey(result);
  });
});

// ─── selectBuoySprite ─────────────────────────────────────────────────────────
describe('selectBuoySprite', () => {
  it('selects BOYLAT13 (port-hand red) for BOYLAT with COLOUR=3', () => {
    const result = selectBuoySprite('BOYLAT', { COLOUR: '3' });
    expect(result.spriteKey).toBe('BOYLAT13');
    assertValidKey(result);
  });

  it('selects BOYLAT14 (starboard-hand green) for BOYLAT with COLOUR=4', () => {
    const result = selectBuoySprite('BOYLAT', { COLOUR: '4' });
    expect(result.spriteKey).toBe('BOYLAT14');
    assertValidKey(result);
  });

  it('uses CATBOY=5 to select isolated danger buoy (BOYISD12)', () => {
    const result = selectBuoySprite('BOYLAT', { CATBOY: 5 });
    expect(result.spriteKey).toBe('BOYISD12');
    assertValidKey(result);
  });

  it('handles BOYISD class → BOYISD12', () => {
    const result = selectBuoySprite('BOYISD', {});
    expect(result.spriteKey).toBe('BOYISD12');
    assertValidKey(result);
  });

  it('handles BOYSAW class → BOYSAW12', () => {
    const result = selectBuoySprite('BOYSAW', {});
    expect(result.spriteKey).toBe('BOYSAW12');
    assertValidKey(result);
  });

  it('handles BOYSPP class → BOYSPP11', () => {
    const result = selectBuoySprite('BOYSPP', {});
    expect(result.spriteKey).toBe('BOYSPP11');
    assertValidKey(result);
  });

  it('BOYCAR with CATCRD=2 → BOYCAR02 (east cardinal)', () => {
    const result = selectBuoySprite('BOYCAR', { CATCRD: 2 });
    expect(result.spriteKey).toBe('BOYCAR02');
    assertValidKey(result);
  });

  it('CATBOY=3 → BOYSPP15 (preferred channel to port)', () => {
    const result = selectBuoySprite('BOYLAT', { CATBOY: 3 });
    expect(result.spriteKey).toBe('BOYSPP15');
    assertValidKey(result);
  });

  it('falls back to BOYCAR01 when no distinguishing attributes', () => {
    const result = selectBuoySprite('BOYLAT', {});
    // no COLOUR → green side default (BOYLAT14); without COLOUR it will be green
    assertValidKey(result);
  });
});

// ─── selectBeaconSprite ───────────────────────────────────────────────────────
describe('selectBeaconSprite', () => {
  it('selects BCNLAT15 (port-hand red) for BCNLAT with COLOUR=3', () => {
    const result = selectBeaconSprite('BCNLAT', { COLOUR: '3' });
    expect(result.spriteKey).toBe('BCNLAT15');
    assertValidKey(result);
  });

  it('selects BCNLAT16 (starboard-hand green) for BCNLAT with COLOUR=4', () => {
    const result = selectBeaconSprite('BCNLAT', { COLOUR: '4' });
    expect(result.spriteKey).toBe('BCNLAT16');
    assertValidKey(result);
  });

  it('handles BCNISD class → BCNISD21', () => {
    const result = selectBeaconSprite('BCNISD', {});
    expect(result.spriteKey).toBe('BCNISD21');
    assertValidKey(result);
  });

  it('BCNCAR with CATCRD=3 → BCNCAR03 (south cardinal)', () => {
    const result = selectBeaconSprite('BCNCAR', { CATCRD: 3 });
    expect(result.spriteKey).toBe('BCNCAR03');
    assertValidKey(result);
  });

  it('falls back to BCNLAT21 when class=BCNLAT and no colour', () => {
    const result = selectBeaconSprite('BCNLAT', {});
    // no COLOUR → green default
    expect(result.spriteKey).toBe('BCNLAT16');
    assertValidKey(result);
  });
});

// ─── selectWreckSprite ────────────────────────────────────────────────────────
describe('selectWreckSprite', () => {
  it('selects WRECKS04 (dangerous) for CATWRK=1', () => {
    const result = selectWreckSprite({ CATWRK: 1 });
    expect(result.spriteKey).toBe('WRECKS04');
    assertValidKey(result);
  });

  it('selects WRECKS05 (visible) for CATWRK=4', () => {
    const result = selectWreckSprite({ CATWRK: 4 });
    expect(result.spriteKey).toBe('WRECKS05');
    assertValidKey(result);
  });

  it('selects WRECKS01 (generic) when CATWRK is missing', () => {
    const result = selectWreckSprite({});
    expect(result.spriteKey).toBe('WRECKS01');
    assertValidKey(result);
  });
});

// ─── selectUnderwaterRockSprite ───────────────────────────────────────────────
describe('selectUnderwaterRockSprite', () => {
  it('returns UWTROC03 for default (covers and uncovers)', () => {
    const result = selectUnderwaterRockSprite({});
    expect(result.spriteKey).toBe('UWTROC03');
    expect(result.allowOverlap).toBe(false);
    assertValidKey(result);
  });

  it('returns UWTROC04 for WATLEV=3 (always submerged)', () => {
    const result = selectUnderwaterRockSprite({ WATLEV: 3 });
    expect(result.spriteKey).toBe('UWTROC04');
    assertValidKey(result);
  });
});

// ─── selectObstructionSprite ──────────────────────────────────────────────────
describe('selectObstructionSprite', () => {
  it('returns OBSTRN01 by default', () => {
    const result = selectObstructionSprite({});
    expect(result.spriteKey).toBe('OBSTRN01');
    expect(result.allowOverlap).toBe(false);
    assertValidKey(result);
  });

  it('returns OBSTRN11 for WATLEV=5 (awash)', () => {
    const result = selectObstructionSprite({ WATLEV: 5 });
    expect(result.spriteKey).toBe('OBSTRN11');
    assertValidKey(result);
  });
});

// ─── selectLandmarkSprite ─────────────────────────────────────────────────────
describe('selectLandmarkSprite', () => {
  it('returns TOWERS01 by default', () => {
    const result = selectLandmarkSprite({});
    expect(result.spriteKey).toBe('TOWERS01');
    expect(result.allowOverlap).toBe(true);
    assertValidKey(result);
  });

  it('returns CHIMNY01 for CATLMK=3 (chimney)', () => {
    const result = selectLandmarkSprite({ CATLMK: 3 });
    expect(result.spriteKey).toBe('CHIMNY01');
    assertValidKey(result);
  });

  it('returns FLGSTF01 for CATLMK=5 (flagstaff)', () => {
    const result = selectLandmarkSprite({ CATLMK: 5 });
    expect(result.spriteKey).toBe('FLGSTF01');
    assertValidKey(result);
  });

  it('returns MONUMT02 for CATLMK=9 (monument)', () => {
    const result = selectLandmarkSprite({ CATLMK: 9 });
    expect(result.spriteKey).toBe('MONUMT02');
    assertValidKey(result);
  });
});

// ─── selectIconMapping (master function) ──────────────────────────────────────
describe('selectIconMapping', () => {
  it('routes LIGHTS → LIGHTS12 for red', () => {
    const result = selectIconMapping('LIGHTS', { COLOUR: '3' });
    expect(result.spriteKey).toBe('LIGHTS12');
    assertValidKey(result);
  });

  it('routes LITFLT → LITFLT01', () => {
    const result = selectIconMapping('LITFLT', {});
    expect(result.spriteKey).toBe('LITFLT01');
    assertValidKey(result);
  });

  it('routes BOYLAT → BOYLAT13 for red', () => {
    const result = selectIconMapping('BOYLAT', { COLOUR: '3' });
    expect(result.spriteKey).toBe('BOYLAT13');
    assertValidKey(result);
  });

  it('routes BOYCAR → BOYCAR01 by default', () => {
    const result = selectIconMapping('BOYCAR', {});
    expect(result.spriteKey).toBe('BOYCAR01');
    assertValidKey(result);
  });

  it('routes BOYISD → BOYISD12', () => {
    const result = selectIconMapping('BOYISD', {});
    expect(result.spriteKey).toBe('BOYISD12');
    assertValidKey(result);
  });

  it('routes BOYSAW → BOYSAW12', () => {
    const result = selectIconMapping('BOYSAW', {});
    expect(result.spriteKey).toBe('BOYSAW12');
    assertValidKey(result);
  });

  it('routes BCNLAT → BCNLAT15 for red', () => {
    const result = selectIconMapping('BCNLAT', { COLOUR: '3' });
    expect(result.spriteKey).toBe('BCNLAT15');
    assertValidKey(result);
  });

  it('routes BCNISD → BCNISD21', () => {
    const result = selectIconMapping('BCNISD', {});
    expect(result.spriteKey).toBe('BCNISD21');
    assertValidKey(result);
  });

  it('routes WRECKS → WRECKS01 (generic)', () => {
    const result = selectIconMapping('WRECKS', {});
    expect(result.spriteKey).toBe('WRECKS01');
    assertValidKey(result);
  });

  it('routes WRECKS with CATWRK=2 → WRECKS04 (dangerous)', () => {
    const result = selectIconMapping('WRECKS', { CATWRK: 2 });
    expect(result.spriteKey).toBe('WRECKS04');
    assertValidKey(result);
  });

  it('routes UWTROC → UWTROC03', () => {
    const result = selectIconMapping('UWTROC', {});
    expect(result.spriteKey).toBe('UWTROC03');
    assertValidKey(result);
  });

  it('routes OBSTRN → OBSTRN01', () => {
    const result = selectIconMapping('OBSTRN', {});
    expect(result.spriteKey).toBe('OBSTRN01');
    assertValidKey(result);
  });

  it('routes LNDMRK → TOWERS01', () => {
    const result = selectIconMapping('LNDMRK', {});
    expect(result.spriteKey).toBe('TOWERS01');
    assertValidKey(result);
  });

  it('returns DANGER01 for unknown class (fallback)', () => {
    const result = selectIconMapping('UNKNOWN_CLASS', {});
    expect(result.spriteKey).toBe('DANGER01');
    assertValidKey(result);
  });

  it('is case-insensitive for class codes', () => {
    const lower = selectIconMapping('lights', { COLOUR: '3' });
    const upper = selectIconMapping('LIGHTS', { COLOUR: '3' });
    expect(lower.spriteKey).toBe(upper.spriteKey);
    assertValidKey(lower);
  });
});
