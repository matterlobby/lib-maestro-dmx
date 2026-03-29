import { HttpClient } from "../transport/http.js";
import { ReadApi } from "./read-api.js";

/** Snapshot of the currently available MaestroDMX pattern ids. */
export interface PatternsAvailableState {
  ids: string[];
  fetchedAt: Date;
}

interface PatternsAvailableApiResponse {
  ids?: unknown;
}

/** Reader for `/api/v1/patterns/available`. */
export class PatternsAvailableApi extends ReadApi<PatternsAvailableState, PatternsAvailableApiResponse> {
  public constructor(httpClient: HttpClient) {
    super(httpClient);
  }

  protected getPath(): string {
    return "/api/v1/patterns/available";
  }

  protected normalizeResponse(response: PatternsAvailableApiResponse, fetchedAt: Date): PatternsAvailableState {
    return {
      ids: Array.isArray(response.ids) ? response.ids.filter((entry): entry is string => typeof entry === "string") : [],
      fetchedAt
    };
  }

  /** Returns whether a pattern id is currently available. */
  public has(id: string, snapshot?: PatternsAvailableState): boolean {
    return this.resolveSnapshot(snapshot)?.ids.includes(id) ?? false;
  }
}
