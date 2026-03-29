import { isRecord, toOptionalBoolean, toOptionalNumber, toOptionalString } from "../internal/normalize.js";
import { HttpClient } from "../transport/http.js";
import { ReadApi } from "./read-api.js";

/** Runtime show playback state returned by MaestroDMX. */
export interface ShowPlaybackState {
  type: string;
  playIndex?: number;
  playTime?: number;
  previewEnabled?: boolean;
  preview: Record<string, unknown>;
  currentCue: Record<string, unknown>;
  id?: string;
  fetchedAt: Date;
}

interface ShowStateApiResponse {
  type?: unknown;
  playIndex?: unknown;
  playTime?: unknown;
  previewEnabled?: unknown;
  preview?: unknown;
  currentCue?: unknown;
  id?: unknown;
}

/** Reader for `/api/v1/show/state`. */
export class ShowStateApi extends ReadApi<ShowPlaybackState, ShowStateApiResponse> {
  public constructor(httpClient: HttpClient) {
    super(httpClient);
  }

  protected getPath(): string {
    return "/api/v1/show/state";
  }

  protected normalizeResponse(response: ShowStateApiResponse, fetchedAt: Date): ShowPlaybackState {
    return {
      type: toOptionalString(response.type) ?? "UNKNOWN",
      playIndex: toOptionalNumber(response.playIndex),
      playTime: toOptionalNumber(response.playTime),
      previewEnabled: toOptionalBoolean(response.previewEnabled),
      preview: isRecord(response.preview) ? response.preview : {},
      currentCue: isRecord(response.currentCue) ? response.currentCue : {},
      id: toOptionalString(response.id),
      fetchedAt
    };
  }

  /** Returns `true` when MaestroDMX currently reports a playing show state. */
  public isPlaying(snapshot?: ShowPlaybackState): boolean {
    return this.resolveSnapshot(snapshot)?.type.endsWith("_PLAYING") ?? false;
  }

  /** Returns `true` when MaestroDMX currently reports a stopped show state. */
  public isStopped(snapshot?: ShowPlaybackState): boolean {
    return this.resolveSnapshot(snapshot)?.type.endsWith("_STOPPED") ?? false;
  }

  /** Extracts the current cue name from the runtime show-state payload. */
  public getCurrentCueName(snapshot?: ShowPlaybackState): string | undefined {
    const currentCue = this.resolveSnapshot(snapshot)?.currentCue;
    const name = currentCue?.name;
    return typeof name === "string" ? name : undefined;
  }
}
