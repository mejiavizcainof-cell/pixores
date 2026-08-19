import type { PixoresExportSettings } from "./export-settings";
import type { PixoresVideoLayer, PixoresVideoProject } from "./types";
import { calculateProjectDuration } from "./timeline";
import { sliceSmartReframe } from "../video-maker/smart-reframe";

function trimLayerToRange(layer: PixoresVideoLayer, rangeStart: number, rangeEnd: number, rangeDuration: number) {
  const layerStart = Number(layer.start) || 0;
  const layerEnd = layerStart + Math.max(0, Number(layer.duration) || 0);
  const clippedStart = Math.max(layerStart, rangeStart);
  const clippedEnd = Math.min(layerEnd, rangeEnd);
  const clippedDuration = clippedEnd - clippedStart;
  if (clippedDuration <= 0.001) return null;

  const trimFromStart = Math.max(0, clippedStart - layerStart);
  const timedMedia = layer.type === "media" || layer.type === "audio";
  const originalSourceStart = Number(layer.sourceStart ?? layer.trimStart ?? 0) || 0;
  const sourceStart = timedMedia ? originalSourceStart + trimFromStart : layer.sourceStart;
  const sourceEnd = timedMedia ? (sourceStart ?? 0) + clippedDuration : layer.sourceEnd;

  return {
    ...layer,
    start: Math.max(0, clippedStart - rangeStart),
    duration: clippedDuration,
    cutTime: layer.cutTime === undefined ? undefined : Math.max(0, Math.min(rangeDuration, layer.cutTime - rangeStart)),
    sourceStart,
    trimStart: timedMedia ? sourceStart : layer.trimStart,
    sourceEnd,
    trimEnd: timedMedia ? sourceEnd : layer.trimEnd,
    animations: layer.animations?.map((animation) => ({
      ...animation,
      start: Math.max(0, animation.start - trimFromStart),
    })),
    keyframes: layer.keyframes?.flatMap((keyframe) => {
      const nextTime = keyframe.time - trimFromStart;
      return nextTime >= 0 && nextTime <= clippedDuration ? [{ ...keyframe, time: nextTime }] : [];
    }),
    smartReframe: sliceSmartReframe(layer.smartReframe, trimFromStart, clippedDuration),
  } satisfies PixoresVideoLayer;
}

export function createExportRangeProject(project: PixoresVideoProject, settings?: PixoresExportSettings) {
  const fullDuration = Math.max(0.05, Number(project.duration) || calculateProjectDuration(project.layers));
  const requestedStart = Number(settings?.rangeStart);
  const requestedEnd = Number(settings?.rangeEnd);
  const rangeStart = Number.isFinite(requestedStart) ? Math.max(0, Math.min(requestedStart, fullDuration)) : 0;
  const rangeEnd = Number.isFinite(requestedEnd) ? Math.max(rangeStart, Math.min(requestedEnd, fullDuration)) : fullDuration;

  if (rangeStart <= 0.001 && rangeEnd >= fullDuration - 0.001) {
    return { ...project, duration: fullDuration };
  }

  const rangeDuration = Math.max(0.05, rangeEnd - rangeStart);
  const layers = project.layers.flatMap((layer) => {
    const trimmed = trimLayerToRange(layer, rangeStart, rangeEnd, rangeDuration);
    return trimmed ? [trimmed] : [];
  });

  return {
    ...project,
    duration: rangeDuration,
    layers,
    transitions: project.transitions.flatMap((transition) => {
      const transitionEnd = transition.start + transition.duration;
      const clippedStart = Math.max(transition.start, rangeStart);
      const clippedEnd = Math.min(transitionEnd, rangeEnd);
      if (clippedEnd - clippedStart <= 0.001) return [];
      return [{
        ...transition,
        start: clippedStart - rangeStart,
        duration: clippedEnd - clippedStart,
        cutTime: transition.cutTime === undefined
          ? undefined
          : Math.max(0, Math.min(rangeDuration, transition.cutTime - rangeStart)),
      }];
    }),
  } satisfies PixoresVideoProject;
}
