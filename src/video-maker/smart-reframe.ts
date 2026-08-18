import type {
  PixoresSmartReframe,
  PixoresSmartReframeKeyframe,
} from "@/src/video-render/types";

export type SmartFaceObservation = {
  trackId: string;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  confidence: number;
  mouthOpen: number;
  mouthMotion: number;
};

export type SmartFaceSample = {
  time: number;
  faces: SmartFaceObservation[];
};

export type SmartSpeechRange = {
  start: number;
  end: number;
};

export type BuildSmartReframeOptions = {
  mode: "static" | "dynamic";
  preferActiveSpeaker: boolean;
  speechRanges?: SmartSpeechRange[];
  duration: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, precision = 4) {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

function isSpeechActive(time: number, ranges: SmartSpeechRange[]) {
  return ranges.some((range) => time >= range.start - 0.08 && time <= range.end + 0.08);
}

function faceBaseScore(face: SmartFaceObservation) {
  const areaScore = clamp(face.width * face.height * 8, 0, 1.5);
  const distanceFromCenter = Math.hypot(face.centerX - 0.5, face.centerY - 0.46);
  const centerScore = 1 - clamp(distanceFromCenter / 0.72, 0, 1);
  return areaScore * 1.45 + centerScore * 0.38 + clamp(face.confidence, 0, 1) * 0.22;
}

function speakerScore(face: SmartFaceObservation) {
  return clamp(face.mouthMotion * 5.5 + face.mouthOpen * 0.42, 0, 2);
}

function chooseFace(
  sample: SmartFaceSample,
  previousTrackId: string,
  preferActiveSpeaker: boolean,
  speechActive: boolean,
) {
  if (!sample.faces.length) return undefined;
  const scored = sample.faces.map((face) => {
    const continuity = face.trackId === previousTrackId ? 0.72 : 0;
    const speechWeight = preferActiveSpeaker ? (speechActive ? 2.4 : 0.72) : 0;
    return {
      face,
      score: faceBaseScore(face) + continuity + speakerScore(face) * speechWeight,
    };
  }).sort((first, second) => second.score - first.score);

  const best = scored[0];
  const previous = scored.find((item) => item.face.trackId === previousTrackId);
  if (!previous || previous.face.trackId === best.face.trackId) return best.face;

  // A small hysteresis prevents rapid speaker changes from turning into camera jitter.
  const switchMargin = preferActiveSpeaker && speechActive ? 0.2 : 0.48;
  return best.score >= previous.score + switchMargin ? best.face : previous.face;
}

function faceZoom(face: SmartFaceObservation) {
  // Keep a talking head prominent without producing an uncomfortable extreme close-up.
  return clamp(0.34 / Math.max(0.08, face.height), 1.04, 1.42);
}

function createFocusKeyframe(
  time: number,
  face: SmartFaceObservation,
  previous?: PixoresSmartReframeKeyframe,
) {
  const targetX = clamp(face.centerX, 0.08, 0.92);
  const targetY = clamp(face.centerY - face.height * 0.09, 0.12, 0.82);
  const targetZoom = faceZoom(face);
  const changedSpeaker = Boolean(previous?.trackId && previous.trackId !== face.trackId);
  const smoothing = previous ? (changedSpeaker ? 0.2 : 0.34) : 1;
  const centerX = previous ? previous.centerX + (targetX - previous.centerX) * smoothing : targetX;
  const centerY = previous ? previous.centerY + (targetY - previous.centerY) * smoothing : targetY;
  const zoom = previous ? previous.zoom + (targetZoom - previous.zoom) * smoothing : targetZoom;
  return {
    time: round(time, 3),
    centerX: round(centerX),
    centerY: round(centerY),
    zoom: round(zoom, 3),
    trackId: face.trackId,
    confidence: round(face.confidence, 3),
  } satisfies PixoresSmartReframeKeyframe;
}

function simplifyKeyframes(keyframes: PixoresSmartReframeKeyframe[]) {
  if (keyframes.length <= 2) return keyframes;
  const simplified = [keyframes[0]];
  for (let index = 1; index < keyframes.length - 1; index += 1) {
    const current = keyframes[index];
    const previous = simplified.at(-1)!;
    const speakerChanged = current.trackId !== previous.trackId;
    const moved = Math.hypot(current.centerX - previous.centerX, current.centerY - previous.centerY);
    const zoomed = Math.abs(current.zoom - previous.zoom);
    const elapsed = current.time - previous.time;
    if (speakerChanged || moved >= 0.009 || zoomed >= 0.012 || elapsed >= 0.9) simplified.push(current);
  }
  simplified.push(keyframes.at(-1)!);
  return simplified;
}

function buildDynamicTrack(samples: SmartFaceSample[], options: BuildSmartReframeOptions) {
  const speechRanges = options.speechRanges || [];
  const keyframes: PixoresSmartReframeKeyframe[] = [];
  let previousTrackId = "";
  let pendingTrackId = "";
  let pendingTrackFrames = 0;

  for (const sample of samples) {
    const speechActive = speechRanges.length === 0 || isSpeechActive(sample.time, speechRanges);
    let face = chooseFace(sample, previousTrackId, options.preferActiveSpeaker, speechActive);
    if (!face) continue;

    if (previousTrackId && face.trackId !== previousTrackId) {
      if (pendingTrackId === face.trackId) pendingTrackFrames += 1;
      else {
        pendingTrackId = face.trackId;
        pendingTrackFrames = 1;
      }
      const currentFace = sample.faces.find((item) => item.trackId === previousTrackId);
      if (pendingTrackFrames < 2 && currentFace) face = currentFace;
      else {
        previousTrackId = face.trackId;
        pendingTrackId = "";
        pendingTrackFrames = 0;
      }
    } else {
      previousTrackId = face.trackId;
      pendingTrackId = "";
      pendingTrackFrames = 0;
    }

    keyframes.push(createFocusKeyframe(sample.time, face, keyframes.at(-1)));
  }

  return simplifyKeyframes(keyframes);
}

function buildStaticTrack(samples: SmartFaceSample[], options: BuildSmartReframeOptions) {
  const speechRanges = options.speechRanges || [];
  const tracks = new Map<string, { faces: SmartFaceObservation[]; score: number }>();
  for (const sample of samples) {
    const speechActive = speechRanges.length === 0 || isSpeechActive(sample.time, speechRanges);
    for (const face of sample.faces) {
      const current = tracks.get(face.trackId) || { faces: [], score: 0 };
      current.faces.push(face);
      current.score += faceBaseScore(face)
        + (options.preferActiveSpeaker && speechActive ? speakerScore(face) * 2.2 : 0);
      tracks.set(face.trackId, current);
    }
  }
  const primary = [...tracks.entries()].sort((first, second) => second[1].score - first[1].score)[0];
  if (!primary) return [];
  const [trackId, track] = primary;
  const totalWeight = track.faces.reduce((sum, face) => sum + Math.max(0.05, face.width * face.height), 0);
  const average = track.faces.reduce((result, face) => {
    const weight = Math.max(0.05, face.width * face.height);
    result.centerX += face.centerX * weight;
    result.centerY += face.centerY * weight;
    result.width += face.width * weight;
    result.height += face.height * weight;
    result.confidence += face.confidence * weight;
    return result;
  }, { centerX: 0, centerY: 0, width: 0, height: 0, confidence: 0 });
  const face: SmartFaceObservation = {
    trackId,
    centerX: average.centerX / totalWeight,
    centerY: average.centerY / totalWeight,
    width: average.width / totalWeight,
    height: average.height / totalWeight,
    confidence: average.confidence / totalWeight,
    mouthOpen: 0,
    mouthMotion: 0,
  };
  const first = createFocusKeyframe(0, face);
  return [first, { ...first, time: round(options.duration, 3) }];
}

export function buildSmartReframe(
  samples: SmartFaceSample[],
  options: BuildSmartReframeOptions,
): PixoresSmartReframe | undefined {
  const normalizedSamples = [...samples]
    .filter((sample) => Number.isFinite(sample.time) && sample.faces.length > 0)
    .sort((first, second) => first.time - second.time);
  if (!normalizedSamples.length) return undefined;
  const keyframes = options.mode === "static"
    ? buildStaticTrack(normalizedSamples, options)
    : buildDynamicTrack(normalizedSamples, options);
  if (!keyframes.length) return undefined;
  return {
    mode: options.mode,
    speakerSelection: options.preferActiveSpeaker,
    source: "mediapipe-face-landmarker",
    keyframes,
  };
}

export function resolveSmartReframeAtTime(
  reframe: PixoresSmartReframe | undefined,
  time: number,
): PixoresSmartReframeKeyframe | undefined {
  const keyframes = reframe?.keyframes;
  if (!keyframes?.length) return undefined;
  if (time <= keyframes[0].time) return keyframes[0];
  if (time >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1];
  const nextIndex = keyframes.findIndex((keyframe) => keyframe.time >= time);
  const next = keyframes[nextIndex];
  const previous = keyframes[Math.max(0, nextIndex - 1)];
  const span = Math.max(0.001, next.time - previous.time);
  const rawProgress = clamp((time - previous.time) / span, 0, 1);
  const progress = rawProgress * rawProgress * (3 - 2 * rawProgress);
  return {
    time,
    centerX: previous.centerX + (next.centerX - previous.centerX) * progress,
    centerY: previous.centerY + (next.centerY - previous.centerY) * progress,
    zoom: previous.zoom + (next.zoom - previous.zoom) * progress,
    trackId: progress < 0.5 ? previous.trackId : next.trackId,
    confidence: previous.confidence === undefined || next.confidence === undefined
      ? previous.confidence ?? next.confidence
      : previous.confidence + (next.confidence - previous.confidence) * progress,
  };
}

export function sliceSmartReframe(
  reframe: PixoresSmartReframe | undefined,
  offset: number,
  duration: number,
) {
  if (!reframe?.keyframes.length) return undefined;
  const safeOffset = Math.max(0, offset);
  const safeDuration = Math.max(0.05, duration);
  const end = safeOffset + safeDuration;
  const first = resolveSmartReframeAtTime(reframe, safeOffset);
  const last = resolveSmartReframeAtTime(reframe, end);
  const middle = reframe.keyframes
    .filter((keyframe) => keyframe.time > safeOffset && keyframe.time < end)
    .map((keyframe) => ({ ...keyframe, time: round(keyframe.time - safeOffset, 3) }));
  const keyframes = [
    ...(first ? [{ ...first, time: 0 }] : []),
    ...middle,
    ...(last ? [{ ...last, time: round(safeDuration, 3) }] : []),
  ];
  return keyframes.length ? { ...reframe, keyframes: simplifyKeyframes(keyframes) } : undefined;
}
