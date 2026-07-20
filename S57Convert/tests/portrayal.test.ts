import { describe, it, expect } from 'vitest';
import { selectS57LayerStyle } from '../src/lib/styles/s57StyleRegistry';

describe('LIGHTS portrayal styling', () => {
  it('uses OBJNAM field for LIGHTS styling', () => {
    const selection = selectS57LayerStyle('LIGHTS', {
      COLOUR: '3',
      OBJNAM: 'North Beacon',
    });

    expect(selection.family).toBe('navigation');
    expect(selection.labelField).toBe('OBJNAM');
    expect(selection.style.iconImage).toBe('LIGHTS_RED');
  });

  it('applies different colors based on LIGHTS color attributes', () => {
    const redLights = selectS57LayerStyle('LIGHTS', { COLOUR: '3' });
    const greenLights = selectS57LayerStyle('LIGHTS', { COLOUR: '4' });
    const yellowLights = selectS57LayerStyle('LIGHTS', { COLOUR: '2' });

    expect(redLights.style.iconImage).toBe('LIGHTS_RED');
    expect(greenLights.style.iconImage).toBe('LIGHTS_GREEN');
    expect(yellowLights.style.iconImage).toBe('LIGHTS_YELLOW');
  });
});

