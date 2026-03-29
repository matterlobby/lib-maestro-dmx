import { toOptionalNumber, toOptionalString } from "../internal/normalize.js";
import { HttpClient } from "../transport/http.js";
import { ReadApi } from "./read-api.js";

/** Snapshot of MaestroDMX software and device metadata. */
export interface SystemInfoState {
  name?: string;
  version?: string;
  buildNumber?: string;
  apiVersion?: string;
  commitHash?: string;
  wlanMacAddress?: string;
  ethMacAddress?: string;
  webApiTimeout?: number;
  uiVersion?: string;
  osRelease?: string;
  productName?: string;
  releaseType?: string;
  fetchedAt: Date;
}

interface SystemInfoApiResponse {
  name?: unknown;
  version?: unknown;
  buildNumber?: unknown;
  apiVersion?: unknown;
  commitHash?: unknown;
  wlanMacAddress?: unknown;
  ethMacAddress?: unknown;
  webApiTimeout?: unknown;
  uiVersion?: unknown;
  osRelease?: unknown;
  productName?: unknown;
  releaseType?: unknown;
}

/** Reader for `/api/v1/system_info`. */
export class SystemInfoApi extends ReadApi<SystemInfoState, SystemInfoApiResponse> {
  public constructor(httpClient: HttpClient) {
    super(httpClient);
  }

  protected getPath(): string {
    return "/api/v1/system_info";
  }

  protected normalizeResponse(response: SystemInfoApiResponse, fetchedAt: Date): SystemInfoState {
    return {
      name: toOptionalString(response.name),
      version: toOptionalString(response.version),
      buildNumber: toOptionalString(response.buildNumber),
      apiVersion: toOptionalString(response.apiVersion),
      commitHash: toOptionalString(response.commitHash),
      wlanMacAddress: toOptionalString(response.wlanMacAddress),
      ethMacAddress: toOptionalString(response.ethMacAddress),
      webApiTimeout: toOptionalNumber(response.webApiTimeout),
      uiVersion: toOptionalString(response.uiVersion),
      osRelease: toOptionalString(response.osRelease),
      productName: toOptionalString(response.productName),
      releaseType: toOptionalString(response.releaseType),
      fetchedAt
    };
  }
}
