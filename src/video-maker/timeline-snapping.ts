export const SNAP_THRESHOLD_PX = 8;

export type SnapCandidate = {
  time: number;
  kind: "timeline-start" | "clip-start" | "clip-end" | "playhead" | "marker" | "work-area";
};

export type SnapResult = {
  time: number;
  snapPoint: number | null;
};

export function getSnapCandidates({ layers, movingLayerId, playhead, markers = [], workArea = [] }: {
  layers: ReadonlyArray<{ id: string; start: number; duration: number }>;
  movingLayerId: string;
  playhead: number;
  markers?: readonly number[];
  workArea?: readonly number[];
}) {
  const candidates: SnapCandidate[] = [
    { time: 0, kind: "timeline-start" },
    { time: playhead, kind: "playhead" },
    ...markers.map((time): SnapCandidate => ({ time, kind: "marker" })),
    ...workArea.map((time): SnapCandidate => ({ time, kind: "work-area" })),
    ...layers.flatMap((layer): SnapCandidate[] => layer.id === movingLayerId ? [] : [
      { time: layer.start, kind: "clip-start" },
      { time: layer.start + layer.duration, kind: "clip-end" },
    ]),
  ];
  const unique = new Map<number, SnapCandidate>();
  for (const candidate of candidates) {
    if (!Number.isFinite(candidate.time) || candidate.time < 0) continue;
    const key = Number(candidate.time.toFixed(6));
    if (!unique.has(key)) unique.set(key, { ...candidate, time: key });
  }
  return [...unique.values()];
}

export function findNearestSnapPoint(time: number, candidates: readonly SnapCandidate[], thresholdSeconds: number) {
  let nearest: SnapCandidate | null = null;
  let nearestDistance = Math.max(0, thresholdSeconds);
  for (const candidate of candidates) {
    const distance = Math.abs(time - candidate.time);
    if (distance <= nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  return nearest;
}

export function calculateSnappedTime({ time, alternateTime, candidates, pixelsPerSecond }: {
  time: number;
  alternateTime?: number;
  candidates: readonly SnapCandidate[];
  pixelsPerSecond: number;
}): SnapResult {
  const thresholdSeconds = SNAP_THRESHOLD_PX / Math.max(1, pixelsPerSecond);
  const primary = findNearestSnapPoint(time, candidates, thresholdSeconds);
  const alternate = alternateTime === undefined ? null : findNearestSnapPoint(alternateTime, candidates, thresholdSeconds);
  const primaryDistance = primary ? Math.abs(time - primary.time) : Number.POSITIVE_INFINITY;
  const alternateDistance = alternate && alternateTime !== undefined ? Math.abs(alternateTime - alternate.time) : Number.POSITIVE_INFINITY;
  if (alternate && alternateDistance < primaryDistance && alternateTime !== undefined) {
    return { time: time + alternate.time - alternateTime, snapPoint: alternate.time };
  }
  if (primary) return { time: primary.time, snapPoint: primary.time };
  return { time, snapPoint: null };
}
