import { isRecord } from "../internal/normalize.js";
import { HttpClient } from "../transport/http.js";
import { ReadApi } from "./read-api.js";
import { normalizeSlotState, selectSlotByParamGroup, type SlotState } from "./shared.js";

/** Slot state for one live fixture group. */
export interface LiveSlotState extends SlotState {}

/** Snapshot of the current MaestroDMX live state across all four fixture groups. */
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

/** Reader for `/api/v1/live`. */
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

  /** Returns the live slot for one fixture group. */
  public getGroup(paramGroup: string | number, snapshot?: LiveState): LiveSlotState | undefined {
    const resolvedSnapshot = this.resolveSnapshot(snapshot);

    if (!resolvedSnapshot) {
      return undefined;
    }

    return selectSlotByParamGroup(resolvedSnapshot, paramGroup);
  }

  /** Returns the active live pattern id for one fixture group. */
  public getPatternId(paramGroup: string | number, snapshot?: LiveState): string | undefined {
    return this.getGroup(paramGroup, snapshot)?.patternId;
  }

  /** Returns the active live palette id for one fixture group. */
  public getPaletteId(paramGroup: string | number, snapshot?: LiveState): string | undefined {
    return this.getGroup(paramGroup, snapshot)?.paletteId;
  }
}
