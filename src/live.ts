import { HttpClient } from "./http.js";

export interface LiveSlotState {
  patternId?: string;
  paletteId?: string;
  brightness?: number;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeSlotState(value: unknown): LiveSlotState {
  if (!isRecord(value)) {
    return {};
  }

  return {
    patternId: toOptionalString(value.patternId),
    paletteId: toOptionalString(value.paletteId),
    brightness: toOptionalNumber(value.brightness),
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

export class LiveApi {
  private readonly httpClient: HttpClient;
  private lastRead: LiveState | undefined;

  public constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  public async read(): Promise<LiveState> {
    const response = await this.httpClient.getJson<LiveApiResponse>("/api/v1/live");
    const snapshot: LiveState = {
      mode: typeof response.type === "string" ? response.type : "UNKNOWN",
      transition: isRecord(response.transition) ? response.transition : {},
      primary: normalizeSlotState(response.params),
      secondary: normalizeSlotState(response.secondaryParams),
      tertiary: normalizeSlotState(response.tertiaryParams),
      quaternary: normalizeSlotState(response.quaternaryParams),
      fetchedAt: new Date()
    };

    this.lastRead = snapshot;
    return snapshot;
  }

  public getLastRead(): LiveState | undefined {
    return this.lastRead;
  }
}
