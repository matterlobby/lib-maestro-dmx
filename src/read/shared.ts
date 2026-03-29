import { isRecord, toOptionalBoolean, toOptionalNumber, toOptionalString } from "../internal/normalize.js";

/** Canonical MaestroDMX fixture-group identifiers used by the Web API. */
export type ParamGroup = "PRIMARY" | "SECONDARY" | "TERTIARY" | "QUATERNARY";

/**
 * Common slot payload shared by live-state and cue-state readers.
 *
 * The exact subset of populated fields depends on the selected pattern and the
 * fixture capabilities of the addressed group.
 */
export interface SlotState {
  patternId?: string;
  paletteId?: string;
  brightness?: number;
  excitement?: number;
  background?: number;
  intensity?: number;
  motion?: number;
  speed?: number;
  energy?: number;
  variance?: number;
  attack?: number;
  decay?: number;
  motionSpeed?: number;
  blackout?: boolean;
  blackoutOnSilence?: boolean;
  allowBlackout?: boolean;
  allowBlinder?: boolean;
  allowStrobe?: boolean;
  allowFog?: boolean;
  allowEffect?: boolean;
  audioReactivity?: boolean;
}

const PARAM_GROUP_FROM_INDEX: Record<number, ParamGroup> = {
  1: "PRIMARY",
  2: "SECONDARY",
  3: "TERTIARY",
  4: "QUATERNARY"
};

/** Converts group indices or names to the canonical MaestroDMX param-group id. */
export function normalizeParamGroup(value: string | number): ParamGroup | undefined {
  if (typeof value === "number") {
    return PARAM_GROUP_FROM_INDEX[value];
  }

  const normalized = value.trim().toUpperCase();

  if (normalized === "PRIMARY" || normalized === "SECONDARY" || normalized === "TERTIARY" || normalized === "QUATERNARY") {
    return normalized;
  }

  return undefined;
}

/**
 * Selects one slot from a four-group payload by param-group name or group
 * index.
 */
export function selectSlotByParamGroup<TSlot>(
  slots: {
    primary: TSlot;
    secondary: TSlot;
    tertiary: TSlot;
    quaternary: TSlot;
  },
  paramGroup: string | number
): TSlot | undefined {
  switch (normalizeParamGroup(paramGroup)) {
    case "PRIMARY":
      return slots.primary;
    case "SECONDARY":
      return slots.secondary;
    case "TERTIARY":
      return slots.tertiary;
    case "QUATERNARY":
      return slots.quaternary;
    default:
      return undefined;
  }
}

/** Normalizes a live or cue slot payload returned by the MaestroDMX Web API. */
export function normalizeSlotState(value: unknown): SlotState {
  if (!isRecord(value)) {
    return {};
  }

  return {
    patternId: toOptionalString(value.patternId),
    paletteId: toOptionalString(value.paletteId),
    brightness: toOptionalNumber(value.brightness),
    excitement: toOptionalNumber(value.excitement) ?? toOptionalNumber(value.intensity),
    background: toOptionalNumber(value.background),
    intensity: toOptionalNumber(value.intensity),
    motion: toOptionalNumber(value.motion),
    speed: toOptionalNumber(value.speed),
    energy: toOptionalNumber(value.energy),
    variance: toOptionalNumber(value.variance),
    attack: toOptionalNumber(value.attack),
    decay: toOptionalNumber(value.decay),
    motionSpeed: toOptionalNumber(value.motionSpeed),
    blackout: toOptionalBoolean(value.blackout),
    blackoutOnSilence: toOptionalBoolean(value.blackoutOnSilence),
    allowBlackout: toOptionalBoolean(value.allowBlackout),
    allowBlinder: toOptionalBoolean(value.allowBlinder),
    allowStrobe: toOptionalBoolean(value.allowStrobe),
    allowFog: toOptionalBoolean(value.allowFog),
    allowEffect: toOptionalBoolean(value.allowEffect),
    audioReactivity: toOptionalBoolean(value.audioReactivity)
  };
}
