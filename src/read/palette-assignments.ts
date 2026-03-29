import { isRecord, normalizeArray, toOptionalString } from "../internal/normalize.js";
import { HttpClient } from "../transport/http.js";
import { ReadApi } from "./read-api.js";
import { normalizeParamGroup } from "./shared.js";

/** Active palette selection for one MaestroDMX fixture group. */
export interface PaletteAssignment {
  paramGroup?: string;
  activeColorPaletteId?: string;
  activeFxSnapshotId?: string;
}

/** Snapshot of active palette assignments across all fixture groups. */
export interface PaletteAssignmentsState {
  states: PaletteAssignment[];
  fxSnapshotIdPreview?: string;
  fetchedAt: Date;
}

interface PaletteAssignmentsApiResponse {
  states?: unknown;
  fxSnapshotIdPreview?: unknown;
}

function normalizePaletteAssignment(value: unknown): PaletteAssignment | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    paramGroup: toOptionalString(value.paramGroup),
    activeColorPaletteId: toOptionalString(value.activeColorPaletteId),
    activeFxSnapshotId: toOptionalString(value.activeFxSnapshotId)
  };
}

/** Reader for `/api/v1/palettes`. */
export class PaletteAssignmentsApi extends ReadApi<PaletteAssignmentsState, PaletteAssignmentsApiResponse> {
  public constructor(httpClient: HttpClient) {
    super(httpClient);
  }

  protected getPath(): string {
    return "/api/v1/palettes";
  }

  protected normalizeResponse(response: PaletteAssignmentsApiResponse, fetchedAt: Date): PaletteAssignmentsState {
    return {
      states: normalizeArray(response.states, normalizePaletteAssignment),
      fxSnapshotIdPreview: toOptionalString(response.fxSnapshotIdPreview),
      fetchedAt
    };
  }

  /** Returns the active palette assignment for one fixture group. */
  public getAssignment(paramGroup: string | number, snapshot?: PaletteAssignmentsState): PaletteAssignment | undefined {
    const resolvedSnapshot = this.resolveSnapshot(snapshot);
    const normalizedParamGroup = normalizeParamGroup(paramGroup);

    if (!resolvedSnapshot || !normalizedParamGroup) {
      return undefined;
    }

    return resolvedSnapshot.states.find((state) => state.paramGroup === normalizedParamGroup);
  }

  /** Returns the active color palette id for one fixture group. */
  public getActiveColorPaletteId(paramGroup: string | number, snapshot?: PaletteAssignmentsState): string | undefined {
    return this.getAssignment(paramGroup, snapshot)?.activeColorPaletteId;
  }

  /** Returns the active FX snapshot id for one fixture group. */
  public getActiveFxSnapshotId(paramGroup: string | number, snapshot?: PaletteAssignmentsState): string | undefined {
    return this.getAssignment(paramGroup, snapshot)?.activeFxSnapshotId;
  }
}
