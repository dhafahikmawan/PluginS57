import { describe, expect, it } from 'vitest';
import { selectS57LayerStyle, StyleReapplier, StyleTracker, type StyleApplicationMode } from '../src/lib/styles/s57StyleRegistry';

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

  it('uses dashed outlines with RESARE pattern fills for restricted areas', () => {
    const style = selectS57LayerStyle('RESARE', { RESTRN: '1' });

    expect(style.family).toBe('restricted');
    expect(style.style.strokeDasharray).toBe('4,4');
    expect(style.style.fillPattern).toBe('NOANCHR_pattern');
    expect(style.style.textColor).toBe('#c545c3');
  });

  it('renders M_NPUB as an outline-only dashed grey layer', () => {
    const style = selectS57LayerStyle('M_NPUB', {});

    expect(style.family).toBe('other');
    expect(style.priority).toBe(40000);
    expect(style.style.strokeColor).toBe('#a3b4b7');
    expect(style.style.strokeWidth).toBe(1);
    expect(style.style.strokeDasharray).toBe('4,4');
    expect(style.style.fillOpacity).toBe(0);
  });

  it('selects the correct pattern for entry prohibited restricted areas', () => {
    const style = selectS57LayerStyle('RESARE', { RESTRN: '14' });

    expect(style.family).toBe('restricted');
    expect(style.style.fillPattern).toBe('ENTPRO_pattern');
  });

  it('matches the sample styling expectations for remapped layer families', () => {
    const airare = selectS57LayerStyle('AIRARE', {});
    const bridge = selectS57LayerStyle('BRIDGE', {});
    const cblohd = selectS57LayerStyle('CBLOHD', {});
    const drgare = selectS57LayerStyle('DRGARE', { DRVAL1: 5 });
    const rivers = selectS57LayerStyle('RIVERS', { OBJNAM: 'Test River' });

    expect(airare.family).toBe('land');
    expect(airare.style.fillColor).toBe('#AB9D68');
    expect(airare.style.strokeColor).toBeUndefined();

    expect(bridge.family).toBe('base');
    expect(bridge.style.strokeColor).toBe('#7D898C');
    expect(bridge.style.strokeWidth).toBe(5);

    expect(cblohd.family).toBe('other');
    expect(cblohd.style.strokeColor).toBe('#7D898C');
    expect(cblohd.style.strokeWidth).toBe(4);
    expect(cblohd.style.strokeDasharray).toBe('4,4');

    expect(drgare.family).toBe('depth');
    expect(drgare.style.strokeColor).toBe('#8B999B');
    expect(drgare.style.strokeDasharray).toBe('4,4');

    expect(rivers.family).toBe('depth');
    expect(rivers.style.fillColor).toBe('#73B6EF');
    expect(rivers.style.strokeColor).toBe('#070707');
    expect(rivers.style.strokeWidth).toBe(1);
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

  it('applies only zoom ranges in zoom-only mode and skips paint properties', async () => {
    const reapply = new StyleReapplier();
    const style = selectS57LayerStyle('DEPARE', { DRVAL1: 1 });
    const zoomCalls: Array<[string, number, number | undefined]> = [];
    const paintCalls: Array<[string, string, unknown]> = [];

    const map = {
      getStyle: () => ({ layers: [{ id: 'hosted-layer' }] }),
      setLayerZoomRange: (layerId: string, minZoom: number, maxZoom?: number) => {
        zoomCalls.push([layerId, minZoom, maxZoom]);
      },
      setPaintProperty: (layerId: string, property: string, value: unknown) => {
        paintCalls.push([layerId, property, value]);
      },
      getPaintProperty: () => undefined,
    };

    const applied = await reapply.reapplyStyle(map as any, 'hosted-layer', style, 'DEPARE', {}, undefined, undefined, 'zoom-only');

    expect(applied).toBe(true);
    expect(zoomCalls).toHaveLength(1);
    expect(paintCalls).toHaveLength(0);
  });

  it('skips both zoom and paint in none mode', async () => {
    const reapply = new StyleReapplier();
    const style = selectS57LayerStyle('DEPARE', { DRVAL1: 1 });
    const zoomCalls: Array<[string, number, number | undefined]> = [];
    const paintCalls: Array<[string, string, unknown]> = [];

    const map = {
      getStyle: () => ({ layers: [{ id: 'hosted-layer' }] }),
      setLayerZoomRange: (layerId: string, minZoom: number, maxZoom?: number) => {
        zoomCalls.push([layerId, minZoom, maxZoom]);
      },
      setPaintProperty: (layerId: string, property: string, value: unknown) => {
        paintCalls.push([layerId, property, value]);
      },
      getPaintProperty: () => undefined,
    };

    const applied = await reapply.reapplyStyle(map as any, 'hosted-layer', style, 'DEPARE', {}, undefined, undefined, 'none');

    expect(applied).toBe(false);
    expect(zoomCalls).toHaveLength(0);
    expect(paintCalls).toHaveLength(0);
  });
});
