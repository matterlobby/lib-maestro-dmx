import { isRecord, normalizeArray, toOptionalBoolean, toOptionalString } from "../internal/normalize.js";
import { HttpClient } from "../transport/http.js";
import { ReadApi } from "./read-api.js";

/** FX palette or snapshot entry returned by MaestroDMX. */
export interface FxPalette {
  id: string;
  name?: string;
  type?: string;
  readOnly?: boolean;
}

/** Snapshot of the MaestroDMX FX palette catalog. */
export interface FxPalettesState {
  palettes: FxPalette[];
  fetchedAt: Date;
}

interface FxPalettesApiResponse {
  palettes?: unknown;
  snapshots?: unknown;
  fxSnapshots?: unknown;
}

function normalizeFxPalette(value: unknown): FxPalette | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = toOptionalString(value.id) ?? toOptionalString(value.snapshotId) ?? toOptionalString(value.paletteId);

  if (!id) {
    return undefined;
  }

  return {
    id,
    name: toOptionalString(value.name),
    type: toOptionalString(value.type),
    readOnly: toOptionalBoolean(value.readOnly)
  };
}

/** Reader for `/api/v1/palettes/fx`. */
export class FxPalettesApi extends ReadApi<FxPalettesState, FxPalettesApiResponse> {
  public constructor(httpClient: HttpClient) {
    super(httpClient);
  }

  protected getPath(): string {
    return "/api/v1/palettes/fx";
  }

  protected normalizeResponse(response: FxPalettesApiResponse, fetchedAt: Date): FxPalettesState {
    const entries = response.palettes ?? response.snapshots ?? response.fxSnapshots;

    return {
      palettes: normalizeArray(entries, normalizeFxPalette),
      fetchedAt
    };
  }

  /** Finds one FX palette by id. */
  public findById(id: string, snapshot?: FxPalettesState): FxPalette | undefined {
    return this.resolveSnapshot(snapshot)?.palettes.find((palette) => palette.id === id);
  }
}
