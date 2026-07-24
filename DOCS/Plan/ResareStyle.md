# Implementation Plan: Update RESARE Layer Styling

This document provides step-by-step instructions for updating the styling of the S-57 Restricted Area (`RESARE`) layer. Follow these instructions precisely to implement the rules from `/DOCS/Analysis/RESARE.md` without modifying the core `host-api.ts` file.

## 1. Create the Pattern Generator

We need to dynamically generate the fill patterns on the MapLibre map instance using the HTML `<canvas>` API, so that they exist when the styles are applied.

**File:** Create a new file at `S57Convert/src/lib/utils/patternGenerator.ts`

**Implementation:** Copy and paste the following code into the new file:

```typescript
export function ensureResarePatternsAdded(map: any) {
  // Check if the map supports the required methods
  if (!map || typeof map.hasImage !== 'function' || typeof map.addImage !== 'function') return;

  const createPattern = (id: string, drawFn: (ctx: CanvasRenderingContext2D, size: number) => void) => {
    if (map.hasImage(id)) return; // Skip if already added
    
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    drawFn(ctx, size);
    
    const imageData = ctx.getImageData(0, 0, size, size);
    map.addImage(id, imageData);
  };

  // 1. Base pattern: magenta diagonal hash
  createPattern('RESARE_pattern', (ctx, size) => {
    ctx.strokeStyle = 'rgba(197, 69, 195, 0.4)'; // Magenta with opacity
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(size, 0);
    ctx.stroke();
  });

  // 2. Anchoring Prohibited pattern (Placeholder: Red Cross)
  createPattern('NOANCHR_pattern', (ctx, size) => {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(4, 4);
    ctx.lineTo(size - 4, size - 4);
    ctx.moveTo(size - 4, 4);
    ctx.lineTo(4, size - 4);
    ctx.stroke();
  });

  // 3. Entry Prohibited pattern (Placeholder: Red Circle)
  createPattern('ENTPRO_pattern', (ctx, size) => {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, (size / 2) - 4, 0, Math.PI * 2);
    ctx.stroke();
  });
}
```

## 2. Update Style Definitions

We need to add support for `fillPattern` and `textColor` locally without changing `host-api.ts`.

**File:** `S57Convert/src/lib/styles/s57StyleRegistry.ts`

**Step 2.1: Create Local Type**
Find the `S57StyleSelection` interface. Immediately above it, define the new `ExtendedLayerStyle` type, and update `S57StyleSelection` to use it:

```typescript
// Add this above S57StyleSelection
export type ExtendedLayerStyle = GeoLibreNativeLayerStyle & { 
  fillPattern?: string; 
  textColor?: string; 
};

// Update S57StyleSelection to use it:
export interface S57StyleSelection {
  family: S57LayerFamily;
  priority: number;
  minZoom: number;
  maxZoom?: number;
  style: ExtendedLayerStyle; // Changed from GeoLibreNativeLayerStyle
  labelField?: string;
}
```

**Step 2.2: Update Paint Ops**
Find the `buildPaintOps` function inside `StyleReapplier`. Update its signature to use `ExtendedLayerStyle` and add logic to push the new properties:

```typescript
  // Change signature
  private buildPaintOps(style: ExtendedLayerStyle): Array<[string, unknown]> {
    const paintOps: Array<[string, unknown]> = [];

    // ... existing if statements ...

    // ADD THESE NEW BLOCKS AT THE END BEFORE RETURN:
    if (style.fillPattern) {
      paintOps.push(['fill-pattern', style.fillPattern]);
    }
    
    if (style.textColor) {
      paintOps.push(['text-color', style.textColor]);
    }

    return paintOps;
  }
```

**Step 2.3: Update `buildRestrictedStyle`**
Replace the existing `buildRestrictedStyle` function with the following implementation:

```typescript
// Replace the existing function
function buildRestrictedStyle(attributes: Record<string, unknown>): ExtendedLayerStyle {
  const restrn = asString(attributes.RESTRN) ?? '';
  let fillPattern = 'RESARE_pattern'; // Default hash pattern

  // 14 is Entry Prohibited, 1 is Anchoring Prohibited
  if (restrn.includes('14')) {
    fillPattern = 'ENTPRO_pattern';
  } else if (restrn.includes('1')) {
    fillPattern = 'NOANCHR_pattern';
  }

  return {
    fillPattern,
    strokeColor: COLORS.TRFCD,
    strokeWidth: 2,
    strokeDasharray: '4,4',
    textColor: COLORS.TRFCD, // Labels will be magenta
  };
}
```

**Step 2.4: Update `selectS57LayerStyle`**
Find the `RESTRICTED_CLASSES` block inside `selectS57LayerStyle` and update it to pass the attributes and set the `labelField`:

```typescript
  if (RESTRICTED_CLASSES.has(normalizedCode)) {
    return {
      family: 'restricted',
      priority: 35000,
      minZoom: zoomRange.minZoom,
      maxZoom: zoomRange.maxZoom,
      style: buildRestrictedStyle(normalizedAttributes),
      labelField: asString(normalizedAttributes.OBJNAM) ?? undefined, // Added this line
    };
  }
```

## 3. Register Patterns Before Styling

We must ensure our new patterns are added to the map before any styles try to use them. 

**File:** `S57Convert/src/lib/styles/s57StyleRegistry.ts`

**Step 3.1: Add Import**
At the top of the file, add:
```typescript
import { ensureResarePatternsAdded } from '../utils/patternGenerator';
```

**Step 3.2: Call in `reapplyStyle`**
Find the `reapplyStyle` function in `StyleReapplier`. Add a call to `ensureResarePatternsAdded` near the beginning, right after checking if the map exists:

```typescript
  async reapplyStyle(
    map: { /* ... */ },
    // ...
  ): Promise<boolean> {
    const trackedStyle = // ...
    if (!trackedStyle || !map || typeof map.getStyle !== 'function') {
      return false;
    }

    // ADD THIS LINE
    ensureResarePatternsAdded(map);

    const candidateLayerIds = // ...
```
