export type TimelineElement = {
  start: number;
  duration: number;
};

export function calculateProjectDuration(elements: readonly TimelineElement[]) {
  return elements.reduce((latestEnd, element) => {
    const start = Number(element.start);
    const duration = Number(element.duration);
    if (!Number.isFinite(start) || !Number.isFinite(duration) || duration <= 0) return latestEnd;
    return Math.max(latestEnd, Math.max(0, start) + duration);
  }, 0);
}

export function snapTimeToFrame(time: number, fps: number) {
  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : 30;
  return Math.max(0, Math.round(Math.max(0, time) * safeFps) / safeFps);
}

export function calculateDurationInFrames(duration: number, fps: number) {
  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : 30;
  return Math.max(1, Math.ceil(Math.max(0, duration) * safeFps));
}
