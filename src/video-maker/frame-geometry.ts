export type PixoresFrameBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PixoresFrameSlot = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const FRAME_CANVAS_MARGIN = 1;
const FRAME_CANVAS_SIZE = 100 - FRAME_CANVAS_MARGIN * 2;

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

/** Keeps legacy and newly auto-fitted frames fully visible inside the canvas. */
export function containFrameBounds(bounds: PixoresFrameBounds): PixoresFrameBounds {
  const sourceWidth = Math.max(0.5, finite(bounds.width, 1));
  const sourceHeight = Math.max(0.5, finite(bounds.height, 1));
  const scale = Math.min(1, FRAME_CANVAS_SIZE / sourceWidth, FRAME_CANVAS_SIZE / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const centerX = finite(bounds.x, 0) + sourceWidth / 2;
  const centerY = finite(bounds.y, 0) + sourceHeight / 2;
  const x = Math.min(100 - FRAME_CANVAS_MARGIN - width, Math.max(FRAME_CANVAS_MARGIN, centerX - width / 2));
  const y = Math.min(100 - FRAME_CANVAS_MARGIN - height, Math.max(FRAME_CANVAS_MARGIN, centerY - height / 2));
  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    width: Number(width.toFixed(3)),
    height: Number(height.toFixed(3)),
  };
}

export function fitFrameBoundsToMedia(media: PixoresFrameBounds, slot: PixoresFrameSlot): PixoresFrameBounds {
  const width = finite(media.width, 1) / Math.max(0.05, finite(slot.width, 1));
  const height = finite(media.height, 1) / Math.max(0.05, finite(slot.height, 1));
  return containFrameBounds({
    x: finite(media.x, 0) - finite(slot.x, 0) * width,
    y: finite(media.y, 0) - finite(slot.y, 0) * height,
    width,
    height,
  });
}
