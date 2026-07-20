import type { TSSArrowsOptions } from '../utils/tssArrowsGenerator';

export const DEFAULT_TSS_OPTIONS: TSSArrowsOptions = {
  arrowInterval: 5000,
  arrowType: 'vector',
  arrowSize: 50,
  offsetMeters: 0,
  minZoom: 8,
  maxZoom: 22,
  preserveSourceTraceability: true,
  enableCaching: true,
};
