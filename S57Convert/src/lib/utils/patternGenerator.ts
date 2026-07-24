export function ensureResarePatternsAdded(map: any) {
  if (!map || typeof map.hasImage !== 'function' || typeof map.addImage !== 'function') {
    return;
  }

  const createPattern = (id: string, drawFn: (ctx: CanvasRenderingContext2D, size: number) => void) => {
    if (map.hasImage(id)) {
      return;
    }

    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    drawFn(ctx, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    map.addImage(id, imageData);
  };

  createPattern('RESARE_pattern', (ctx, size) => {
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(197, 69, 195, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(size, 0);
    ctx.stroke();
  });

  createPattern('NOANCHR_pattern', (ctx, size) => {
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(4, 4);
    ctx.lineTo(size - 4, size - 4);
    ctx.moveTo(size - 4, 4);
    ctx.lineTo(4, size - 4);
    ctx.stroke();
  });

  createPattern('ENTPRO_pattern', (ctx, size) => {
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();
  });
}
