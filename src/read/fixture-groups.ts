import { isRecord, normalizeArray, toOptionalString } from "../internal/normalize.js";
import { HttpClient } from "../transport/http.js";
import { ReadApi } from "./read-api.js";
import { normalizeParamGroup } from "./shared.js";

/** Runtime fixture-group metadata for one MaestroDMX group. */
export interface FixtureGroup {
  id: string;
  name?: string;
  paramGroup?: string;
  fixtureIds: string[];
  mappingConfig: Record<string, unknown>;
}

/** Snapshot of the stage fixture-group topology used during runtime. */
export interface FixtureGroupsState {
  groups: FixtureGroup[];
  fetchedAt: Date;
}

interface FixtureGroupsApiResponse {
  fixtureGroup?: unknown;
}

function normalizeFixtureGroup(value: unknown): FixtureGroup | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = toOptionalString(value.id);

  if (!id) {
    return undefined;
  }

  return {
    id,
    name: toOptionalString(value.name),
    paramGroup: toOptionalString(value.paramGroup),
    fixtureIds: Array.isArray(value.fixtureId)
      ? value.fixtureId.filter((entry): entry is string => typeof entry === "string")
      : [],
    mappingConfig: isRecord(value.mappingConfig) ? value.mappingConfig : {}
  };
}

/** Reader for `/api/v1/fixture_groups`. */
export class FixtureGroupsApi extends ReadApi<FixtureGroupsState, FixtureGroupsApiResponse> {
  public constructor(httpClient: HttpClient) {
    super(httpClient);
  }

  protected getPath(): string {
    return "/api/v1/fixture_groups";
  }

  protected normalizeResponse(response: FixtureGroupsApiResponse, fetchedAt: Date): FixtureGroupsState {
    return {
      groups: normalizeArray(response.fixtureGroup, normalizeFixtureGroup),
      fetchedAt
    };
  }

  /** Finds a fixture group by internal group id. */
  public getGroupById(id: string, snapshot?: FixtureGroupsState): FixtureGroup | undefined {
    return this.resolveSnapshot(snapshot)?.groups.find((group) => group.id === id);
  }

  /** Finds a fixture group by MaestroDMX param-group name or numeric index. */
  public getGroupByParamGroup(paramGroup: string | number, snapshot?: FixtureGroupsState): FixtureGroup | undefined {
    const resolvedSnapshot = this.resolveSnapshot(snapshot);
    const normalizedParamGroup = normalizeParamGroup(paramGroup);

    if (!resolvedSnapshot || !normalizedParamGroup) {
      return undefined;
    }

    return resolvedSnapshot.groups.find((group) => group.paramGroup === normalizedParamGroup);
  }

  /** Returns all fixture ids associated with one fixture group. */
  public listFixtureIds(group: string | number, snapshot?: FixtureGroupsState): string[] {
    return this.getGroupByParamGroup(group, snapshot)?.fixtureIds
      ?? this.getGroupById(typeof group === "string" ? group : "", snapshot)?.fixtureIds
      ?? [];
  }
}
