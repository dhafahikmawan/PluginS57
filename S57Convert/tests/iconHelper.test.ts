import { describe, it, expect } from 'vitest';
import {
  selectIconMapping,
  selectLightSprite,
  selectBuoySprite,
  selectBeaconSprite,
  selectWreckSprite,
  selectUnderwaterRockSprite,
  selectObstructionSprite,
  selectLandmarkSprite,
} from '../src/lib/utils/iconHelper';

describe('Icon sprite selection', () => {
  describe('selectLightSprite', () => {
    it('selects red light icon for COLOUR=3', () => {
      const result = selectLightSprite({ COLOUR: '3' });
      expect(result.spriteKey).toBe('LIGHTS_RED');
      expect(result.allowOverlap).toBe(true);
    });

    it('selects green light icon for COLOUR=4', () => {
      const result = selectLightSprite({ COLOUR: '4' });
      expect(result.spriteKey).toBe('LIGHTS_GREEN');
    });

    it('selects yellow light icon for COLOUR=2', () => {
      const result = selectLightSprite({ COLOUR: '2' });
      expect(result.spriteKey).toBe('LIGHTS_YELLOW');
    });

    it('falls back to generic light icon when COLOUR is missing', () => {
      const result = selectLightSprite({});
      expect(result.spriteKey).toBe('LIGHTS');
    });
  });

  describe('selectBuoySprite', () => {
    it('selects red lateral buoy for BOYLAT with COLOUR=3', () => {
      const result = selectBuoySprite('BOYLAT', { COLOUR: '3' });
      expect(result.spriteKey).toBe('BOYLAT_RED');
    });

    it('selects green lateral buoy for BOYLAT with COLOUR=4', () => {
      const result = selectBuoySprite('BOYLAT', { COLOUR: '4' });
      expect(result.spriteKey).toBe('BOYLAT_GREEN');
    });

    it('uses CATBOY attribute when available', () => {
      const result = selectBuoySprite('BOYLAT', { CATBOY: 5 }); // Isolated danger
      expect(result.spriteKey).toBe('BOYISD');
    });

    it('handles BOYISD class specifically', () => {
      const result = selectBuoySprite('BOYISD', {});
      expect(result.spriteKey).toBe('BOYISD');
    });

    it('handles BOYSAW class specifically', () => {
      const result = selectBuoySprite('BOYSAW', {});
      expect(result.spriteKey).toBe('BOYSAW');
    });

    it('falls back to generic buoy when attributes are missing', () => {
      const result = selectBuoySprite('BOYLAT', {});
      expect(result.spriteKey).toBe('BUOY');
    });
  });

  describe('selectBeaconSprite', () => {
    it('selects red lateral beacon for BCNLAT with COLOUR=3', () => {
      const result = selectBeaconSprite('BCNLAT', { COLOUR: '3' });
      expect(result.spriteKey).toBe('BCNLAT_RED');
    });

    it('selects green lateral beacon for BCNLAT with COLOUR=4', () => {
      const result = selectBeaconSprite('BCNLAT', { COLOUR: '4' });
      expect(result.spriteKey).toBe('BCNLAT_GREEN');
    });

    it('handles BCNISD class specifically', () => {
      const result = selectBeaconSprite('BCNISD', {});
      expect(result.spriteKey).toBe('BCNISD');
    });

    it('falls back to generic beacon when attributes are missing', () => {
      const result = selectBeaconSprite('BCNLAT', {});
      expect(result.spriteKey).toBe('BEACON');
    });
  });

  describe('selectWreckSprite', () => {
    it('selects dangerous wreck icon for CATWRK=1', () => {
      const result = selectWreckSprite({ CATWRK: 1 });
      expect(result.spriteKey).toBe('WRECKS_DANGEROUS');
    });

    it('selects generic wreck icon when CATWRK is missing', () => {
      const result = selectWreckSprite({});
      expect(result.spriteKey).toBe('WRECKS');
    });
  });

  describe('selectUnderwaterRockSprite', () => {
    it('returns underwater rock sprite', () => {
      const result = selectUnderwaterRockSprite();
      expect(result.spriteKey).toBe('UWTROC');
      expect(result.allowOverlap).toBe(false);
    });
  });

  describe('selectObstructionSprite', () => {
    it('returns obstruction sprite', () => {
      const result = selectObstructionSprite({});
      expect(result.spriteKey).toBe('OBSTRN');
      expect(result.allowOverlap).toBe(false);
    });
  });

  describe('selectLandmarkSprite', () => {
    it('returns landmark sprite', () => {
      const result = selectLandmarkSprite({ OBJNAM: 'Church' });
      expect(result.spriteKey).toBe('LNDMRK');
      expect(result.allowOverlap).toBe(true);
    });
  });

  describe('selectIconMapping (master function)', () => {
    it('routes LIGHTS to light sprite selection', () => {
      const result = selectIconMapping('LIGHTS', { COLOUR: '3' });
      expect(result.spriteKey).toBe('LIGHTS_RED');
    });

    it('routes LITFLT to light sprite selection', () => {
      const result = selectIconMapping('LITFLT', { COLOUR: '4' });
      expect(result.spriteKey).toBe('LIGHTS_GREEN');
    });

    it('routes BOYLAT to buoy sprite selection', () => {
      const result = selectIconMapping('BOYLAT', { COLOUR: '3' });
      expect(result.spriteKey).toBe('BOYLAT_RED');
    });

    it('routes BCNLAT to beacon sprite selection', () => {
      const result = selectIconMapping('BCNLAT', { COLOUR: '3' });
      expect(result.spriteKey).toBe('BCNLAT_RED');
    });

    it('routes WRECKS to wreck sprite selection', () => {
      const result = selectIconMapping('WRECKS', { CATWRK: 1 });
      expect(result.spriteKey).toBe('WRECKS_DANGEROUS');
    });

    it('routes UWTROC to underwater rock selection', () => {
      const result = selectIconMapping('UWTROC', {});
      expect(result.spriteKey).toBe('UWTROC');
    });

    it('routes OBSTRN to obstruction selection', () => {
      const result = selectIconMapping('OBSTRN', {});
      expect(result.spriteKey).toBe('OBSTRN');
    });

    it('routes LNDMRK to landmark selection', () => {
      const result = selectIconMapping('LNDMRK', {});
      expect(result.spriteKey).toBe('LNDMRK');
    });

    it('returns generic point for unknown class', () => {
      const result = selectIconMapping('UNKNOWN_CLASS', {});
      expect(result.spriteKey).toBe('POINT');
    });

    it('is case-insensitive for class codes', () => {
      const result1 = selectIconMapping('lights', { COLOUR: '3' });
      const result2 = selectIconMapping('LIGHTS', { COLOUR: '3' });
      expect(result1.spriteKey).toBe(result2.spriteKey);
    });
  });
});
