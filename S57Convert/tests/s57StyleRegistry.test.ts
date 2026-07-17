import { describe, expect, it } from 'vitest';
import { selectS57LayerStyle, StyleReapplier, StyleTracker } from '../src/lib/styles/s57StyleRegistry';

describe('selectS57LayerStyle', () => {
  it('assigns a depth family and a safe depth fill for depth areas', () => {
    const style = selectS57LayerStyle('DEPARE', { DRVAL1: 10, SAFCON: 5 });

    expect(style.family).toBe('depth');
    expect(style.priority).toBeGreaterThan(20000);
    expect(style.style.fillColor).toBe('#98C5F2');
    expect(style.minZoom).toBeGreaterThanOrEqual(0);
  });

  it('uses the ENC purpose minimum and maximum zooms for base chart layers', () => {
    const style = selectS57LayerStyle('LNDARE', {}, 2);

    expect(style.minZoom).toBe(7);
    expect(style.maxZoom).toBe(10);
  });

  it('defaults base chart layers to overview visibility when no purpose is provided', () => {
    const style = selectS57LayerStyle('LNDARE', {});

    expect(style.minZoom).toBe(0);
    expect(style.maxZoom).toBe(9);
  });

  it('derives zoom ranges from purpose metadata on attributes when no explicit purpose code is provided', () => {
    const style = selectS57LayerStyle('LNDARE', { PURPOSE: 4 });

    expect(style.minZoom).toBe(11);
    expect(style.maxZoom).toBe(14);
  });

  it('uses the higher of the purpose minimum and the layer-specific zoom threshold', () => {
    const contourStyle = selectS57LayerStyle('DEPCNT', {}, 2);
    const soundingStyle = selectS57LayerStyle('SOUNDG', {}, 2);
    const hazardStyle = selectS57LayerStyle('LIGHTS', {}, 3);

    expect(contourStyle.minZoom).toBe(7);
    expect(soundingStyle.minZoom).toBe(7);
    expect(hazardStyle.minZoom).toBe(9);
  });

  it('uses dashed outlines for restricted areas', () => {
    const style = selectS57LayerStyle('RESARE', { RESTRN: '1' });

    expect(style.family).toBe('restricted');
    expect(style.style.strokeDasharray).toBe('6,4');
    expect(style.style.fillColor).toBe('#c545c3');
  });

  it('does not attempt zoom-range updates for non-existent layers', async () => {
    const reapply = new StyleReapplier();
    const style = selectS57LayerStyle('DEPARE', { DRVAL1: 1 });
    const zoomCalls: Array<[string, number, number | undefined]> = [];

    const map = {
      getStyle: () => ({
        layers: [{ id: 'other-layer' }],
      }),
      setLayerZoomRange: (layerId: string, minZoom: number, maxZoom?: number) => {
        zoomCalls.push([layerId, minZoom, maxZoom]);
      },
    };

    const applied = await reapply.reapplyStyle(map as any, 'hosted-layer', style, 'DEPARE', {}, 'layer-name');

    expect(applied).toBe(false);
    expect(zoomCalls).toHaveLength(0);
  });

  it('reapplies tracked styles to matching layers after style resets', async () => {
    const tracker = new StyleTracker();
    const reapply = new StyleReapplier();
    const style = selectS57LayerStyle('DEPARE', { DRVAL1: 1 });
    const appliedPaint: Array<[string, string, unknown]> = [];

    const map = {
      getStyle: () => ({
        layers: [{ id: 'hosted-layer' }, { id: 'other-layer' }],
      }),
      setPaintProperty: (layerId: string, property: string, value: unknown) => {
        appliedPaint.push([layerId, property, value]);
      },
      getPaintProperty: (layerId: string, property: string) => {
        const match = appliedPaint.find(([id, prop]) => id === layerId && prop === property);
        return match?.[2];
      },
    };

    tracker.trackStyle('hosted-layer', style, 'DEPARE', { DRVAL1: 1 });
    await reapply.reapplyStyle(map as any, 'hosted-layer', style, 'DEPARE');

    expect(appliedPaint.some(([layerId, property]) => layerId === 'hosted-layer' && property === 'fill-color')).toBe(true);
    expect(appliedPaint.some(([layerId, property]) => layerId === 'hosted-layer' && property === 'line-color')).toBe(true);
  });
});
