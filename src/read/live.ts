import { isRecord, toOptionalBoolean, toOptionalNumber, toOptionalString } from "../internal/normalize.js";
import { HttpClient } from "../transport/http.js";
import { ReadApi } from "./read-api.js";

export interface LiveSlotState {
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
}

export interface LiveState {
  mode: string;
  transition: Record<string, unknown>;
  primary: LiveSlotState;
  secondary: LiveSlotState;
  tertiary: LiveSlotState;
  quaternary: LiveSlotState;
  fetchedAt: Date;
}

interface LiveApiResponse {
  type?: unknown;
  transition?: unknown;
  params?: unknown;
  secondaryParams?: unknown;
  tertiaryParams?: unknown;
  quaternaryParams?: unknown;
}

function normalizeSlotState(value: unknown): LiveSlotState {
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
    blackoutOnSilence: toOptionalBoolean(value.blackoutOnSilence)
  };
}

export class LiveApi extends ReadApi<LiveState, LiveApiResponse> {
  public constructor(httpClient: HttpClient) {
    super(httpClient);
  }

  protected getPath(): string {
    return "/api/v1/live";
  }

  protected normalizeResponse(response: LiveApiResponse, fetchedAt: Date): LiveState {
    return {
      mode: typeof response.type === "string" ? response.type : "UNKNOWN",
      transition: isRecord(response.transition) ? response.transition : {},
      primary: normalizeSlotState(response.params),
      secondary: normalizeSlotState(response.secondaryParams),
      tertiary: normalizeSlotState(response.tertiaryParams),
      quaternary: normalizeSlotState(response.quaternaryParams),
      fetchedAt
    };
  }
}
