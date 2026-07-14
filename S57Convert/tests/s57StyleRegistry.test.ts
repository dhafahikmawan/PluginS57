import { describe, expect, it } from 'vitest';
import { selectS57LayerStyle } from '../src/lib/styles/s57StyleRegistry';

describe('selectS57LayerStyle', () => {
  it('assigns a depth family and a safe depth fill for depth areas', () => {
    const style = selectS57LayerStyle('DEPARE', { DRVAL1: 10, SAFCON: 5 });

    expect(style.family).toBe('depth');
    expect(style.priority).toBeGreaterThan(20000);
    expect(style.style.fillColor).toBe('#bae6fd');
    expect(style.minZoom).toBeGreaterThan(0);
  });

  it('uses dashed outlines for restricted areas', () => {
    const style = selectS57LayerStyle('RESARE', { RESTRN: '1' });

    expect(style.family).toBe('restricted');
    expect(style.style.strokeDasharray).toBe('6,4');
    expect(style.style.fillColor).toBe('#fef3c7');
  });
});
