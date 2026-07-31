import type { PixoresAudioEffectChain } from "./types";

export const DEFAULT_AUDIO_EFFECTS: Required<PixoresAudioEffectChain> = {
  enabled: true,
  gainDb: 0,
  pan: 0,
  normalize: false,
  highPassHz: 0,
  humRemovalHz: 0,
  noiseReduction: 0,
  deEsser: 0,
  lowGainDb: 0,
  midGainDb: 0,
  highGainDb: 0,
  compressor: 0,
  limiter: true,
  echoEnabled: false,
  echoDelayMs: 180,
  echoDecay: 0.3,
  reverb: "none",
};

export const AUDIO_EFFECT_PRESETS = {
  cleanVoice: { noiseReduction: 0.55, highPassHz: 80, deEsser: 0.35, compressor: 0.45, limiter: true },
  podcast: { highPassHz: 70, lowGainDb: 1, midGainDb: 2, highGainDb: 1.5, compressor: 0.55, normalize: true, limiter: true },
  warmVoice: { highPassHz: 65, lowGainDb: 3, midGainDb: 1, highGainDb: -1, compressor: 0.35, limiter: true },
  music: { lowGainDb: 2, midGainDb: -1, highGainDb: 2, compressor: 0.2, limiter: true },
  studio: { reverb: "studio" as const, compressor: 0.25, limiter: true },
  hall: { reverb: "hall" as const, limiter: true },
} satisfies Record<string, Partial<PixoresAudioEffectChain>>;

export function resolveAudioEffects(value?: PixoresAudioEffectChain): Required<PixoresAudioEffectChain> {
  return { ...DEFAULT_AUDIO_EFFECTS, ...(value || {}) };
}
