import { toOptionalNumber } from "../internal/normalize.js";
import { HttpClient } from "../transport/http.js";
import { ReadApi } from "./read-api.js";

/** Snapshot of the global MaestroDMX stage brightness. */
export interface BrightnessState {
  value?: number;
  fetchedAt: Date;
}

interface BrightnessApiResponse {
  value?: unknown;
}

/** Reader for `/api/v1/brightness`. */
export class BrightnessApi extends ReadApi<BrightnessState, BrightnessApiResponse> {
  public constructor(httpClient: HttpClient) {
    super(httpClient);
  }

  protected getPath(): string {
    return "/api/v1/brightness";
  }

  protected normalizeResponse(response: BrightnessApiResponse, fetchedAt: Date): BrightnessState {
    return {
      value: toOptionalNumber(response.value),
      fetchedAt
    };
  }
}
