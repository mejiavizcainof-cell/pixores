import type { FaceLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { SmartFaceObservation, SmartFaceSample } from "./smart-reframe";

export type AnalyzeFaceTrackingInput = {
  sourceUrls: string[];
  sourceStart: number;
  sourceEnd: number;
  sampleFps?: number;
  maxFaces?: number;
  shouldCancel?: () => boolean;
  onProgress?: (progress: number, message: string) => void;
};

type TrackedFace = SmartFaceObservation & {
  lastSeenAt: number;
};

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null;
let inferenceTimestampMs = 1;
let faceTrackSequence = 0;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

async function createFaceLandmarker() {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const wasmBase = new URL("/video-maker-assets/mediapipe/wasm", window.location.href).href.replace(/\/$/, "");
  const modelPath = new URL("/video-maker-assets/models/face_landmarker.task", window.location.href).href;
  const vision = await FilesetResolver.forVisionTasks(wasmBase);
  const sharedOptions = {
    baseOptions: { modelAssetPath: modelPath },
    runningMode: "VIDEO" as const,
    numFaces: 6,
    minFaceDetectionConfidence: 0.45,
    minFacePresenceConfidence: 0.45,
    minTrackingConfidence: 0.42,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false,
  };
  try {
    return await FaceLandmarker.createFromOptions(vision, {
      ...sharedOptions,
      baseOptions: { ...sharedOptions.baseOptions, delegate: "GPU" },
    });
  } catch {
    return FaceLandmarker.createFromOptions(vision, {
      ...sharedOptions,
      baseOptions: { ...sharedOptions.baseOptions, delegate: "CPU" },
    });
  }
}

function getFaceLandmarker() {
  faceLandmarkerPromise ||= createFaceLandmarker().catch((error) => {
    faceLandmarkerPromise = null;
    throw error;
  });
  return faceLandmarkerPromise;
}

function releaseVideo(video: HTMLVideoElement) {
  video.pause();
  video.removeAttribute("src");
  video.load();
}

function loadVideo(sourceUrl: string, timeoutMs = 18_000) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement("video");
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      video.onloadeddata = null;
      video.onerror = null;
      if (error) {
        releaseVideo(video);
        reject(error);
      } else resolve(video);
    };
    const timeoutId = window.setTimeout(() => finish(new Error("Timed out while opening the local video for face analysis.")), timeoutMs);
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.onloadeddata = () => finish();
    video.onerror = () => finish(new Error("The local video could not be decoded for face analysis."));
    video.src = new URL(sourceUrl, window.location.href).href;
    video.load();
  });
}

async function loadFirstVideo(sourceUrls: string[]) {
  let lastError: unknown;
  for (const sourceUrl of sourceUrls) {
    if (!sourceUrl) continue;
    try {
      return await loadVideo(sourceUrl);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No local source was available for face analysis.");
}

function seekVideo(video: HTMLVideoElement, time: number, timeoutMs = 8_000) {
  const safeDuration = Number.isFinite(video.duration) ? Math.max(0, video.duration - 0.04) : time;
  const target = clamp(time, 0, safeDuration);
  if (video.readyState >= 2 && Math.abs(video.currentTime - target) <= 0.025) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      video.onseeked = null;
      video.onerror = null;
      if (error) reject(error);
      else resolve();
    };
    const timeoutId = window.setTimeout(() => finish(new Error("A video frame could not be decoded during face analysis.")), timeoutMs);
    video.onseeked = () => finish();
    video.onerror = () => finish(new Error("A video frame failed while detecting faces."));
    try {
      video.currentTime = target;
    } catch (error) {
      finish(error instanceof Error ? error : new Error("The face-analysis frame could not be selected."));
    }
  });
}

function getFaceBounds(landmarks: NormalizedLandmark[]) {
  let minimumX = 1;
  let minimumY = 1;
  let maximumX = 0;
  let maximumY = 0;
  for (const landmark of landmarks) {
    minimumX = Math.min(minimumX, landmark.x);
    minimumY = Math.min(minimumY, landmark.y);
    maximumX = Math.max(maximumX, landmark.x);
    maximumY = Math.max(maximumY, landmark.y);
  }
  const width = clamp(maximumX - minimumX, 0.02, 1);
  const height = clamp(maximumY - minimumY, 0.02, 1);
  return {
    centerX: clamp((minimumX + maximumX) / 2, 0, 1),
    centerY: clamp((minimumY + maximumY) / 2, 0, 1),
    width,
    height,
  };
}

function getMouthOpen(landmarks: NormalizedLandmark[], blendshapes?: Array<{ categoryName: string; score: number }>) {
  const jawOpen = blendshapes?.find((item) => item.categoryName === "jawOpen")?.score;
  if (jawOpen !== undefined) return clamp(jawOpen, 0, 1);
  const upperLip = landmarks[13];
  const lowerLip = landmarks[14];
  if (!upperLip || !lowerLip) return 0;
  const bounds = getFaceBounds(landmarks);
  return clamp(Math.abs(lowerLip.y - upperLip.y) / Math.max(0.02, bounds.height) * 4, 0, 1);
}

function distance(first: Pick<SmartFaceObservation, "centerX" | "centerY">, second: Pick<SmartFaceObservation, "centerX" | "centerY">) {
  return Math.hypot(first.centerX - second.centerX, first.centerY - second.centerY);
}

function assignTracks(
  observations: Array<Omit<SmartFaceObservation, "trackId" | "mouthMotion">>,
  previousFaces: TrackedFace[],
  time: number,
) {
  const availablePrevious = new Set(previousFaces.map((_, index) => index));
  const ordered = [...observations].sort((first, second) => second.width * second.height - first.width * first.height);
  return ordered.map((observation) => {
    let matchedIndex = -1;
    let matchedDistance = Number.POSITIVE_INFINITY;
    for (const index of availablePrevious) {
      const previous = previousFaces[index];
      const currentDistance = distance(observation, previous);
      const allowedDistance = Math.max(0.11, Math.max(observation.width, previous.width) * 1.35);
      if (currentDistance <= allowedDistance && currentDistance < matchedDistance) {
        matchedIndex = index;
        matchedDistance = currentDistance;
      }
    }
    const previous = matchedIndex >= 0 ? previousFaces[matchedIndex] : undefined;
    if (matchedIndex >= 0) availablePrevious.delete(matchedIndex);
    const trackId = previous?.trackId || `face-${++faceTrackSequence}`;
    return {
      ...observation,
      trackId,
      mouthMotion: previous ? Math.abs(observation.mouthOpen - previous.mouthOpen) : 0,
      lastSeenAt: time,
    } satisfies TrackedFace;
  });
}

function yieldToRenderer() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}

export async function analyzeFaceTracking({
  sourceUrls,
  sourceStart,
  sourceEnd,
  sampleFps = 4,
  maxFaces = 6,
  shouldCancel,
  onProgress,
}: AnalyzeFaceTrackingInput): Promise<SmartFaceSample[]> {
  if (typeof window === "undefined") throw new Error("Face analysis is only available in Pixores Video Maker Pro.");
  const start = Math.max(0, Number(sourceStart) || 0);
  const requestedEnd = Math.max(start + 0.05, Number(sourceEnd) || start + 0.05);
  onProgress?.(0, "Loading the local face-tracking model...");
  const [landmarker, video] = await Promise.all([getFaceLandmarker(), loadFirstVideo(sourceUrls)]);
  try {
    const end = Number.isFinite(video.duration) ? Math.min(requestedEnd, Math.max(start + 0.05, video.duration)) : requestedEnd;
    const duration = Math.max(0.05, end - start);
    const maximumSamples = 3_600;
    const interval = Math.max(1 / clamp(sampleFps, 1, 8), duration / maximumSamples);
    const sampleCount = Math.max(1, Math.ceil(duration / interval) + 1);
    const samples: SmartFaceSample[] = [];
    let previousFaces: TrackedFace[] = [];
    const inferenceBaseTimestampMs = inferenceTimestampMs + 1;

    for (let index = 0; index < sampleCount; index += 1) {
      if (shouldCancel?.()) throw new Error("Smart Clips export cancelled");
      const localTime = Math.min(duration, index * interval);
      await seekVideo(video, start + localTime);
      const frameTimestampMs = Math.max(
        inferenceTimestampMs + 1,
        inferenceBaseTimestampMs + Math.round(localTime * 1_000),
      );
      inferenceTimestampMs = frameTimestampMs;
      const result = landmarker.detectForVideo(video, frameTimestampMs);
      const observations = result.faceLandmarks.slice(0, maxFaces).map((landmarks, faceIndex) => {
        const bounds = getFaceBounds(landmarks);
        const categories = result.faceBlendshapes[faceIndex]?.categories || [];
        return {
          ...bounds,
          confidence: 1,
          mouthOpen: getMouthOpen(landmarks, categories),
        };
      });
      const tracked = assignTracks(observations, previousFaces, localTime);
      previousFaces = tracked;
      samples.push({
        time: Number(localTime.toFixed(3)),
        faces: tracked.map((face) => ({
          trackId: face.trackId,
          centerX: face.centerX,
          centerY: face.centerY,
          width: face.width,
          height: face.height,
          confidence: face.confidence,
          mouthOpen: face.mouthOpen,
          mouthMotion: face.mouthMotion,
        })),
      });
      const progress = (index + 1) / sampleCount;
      onProgress?.(progress, `Analyzing faces locally · ${Math.round(progress * 100)}%`);
      if (index % 8 === 7) await yieldToRenderer();
    }
    return samples;
  } finally {
    releaseVideo(video);
  }
}
