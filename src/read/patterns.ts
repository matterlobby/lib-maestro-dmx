import { isRecord, normalizeArray, toOptionalString } from "../internal/normalize.js";
import { HttpClient } from "../transport/http.js";
import { ReadApi } from "./read-api.js";

/** Describes one configurable pattern parameter in MaestroDMX. */
export interface PatternParameter {
  param: string;
  name?: string;
  description?: string;
  shape?: string[];
}

/** Full definition of one MaestroDMX pattern. */
export interface PatternDefinition {
  id: string;
  name: string;
  description?: string;
  params: PatternParameter[];
  advancedParams: PatternParameter[];
}

/** A named collection of related patterns, such as Maestro or Core patterns. */
export interface PatternManifest {
  interfaceVersion?: string;
  id: string;
  name: string;
  description?: string;
  patterns: PatternDefinition[];
}

/** Snapshot of the full MaestroDMX pattern catalog. */
export interface PatternsState {
  manifests: PatternManifest[];
  fetchedAt: Date;
}

interface PatternsApiResponse {
  manifests?: unknown;
}

function normalizePatternParameter(value: unknown): PatternParameter | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const param = toOptionalString(value.param);

  if (!param) {
    return undefined;
  }

  const shape = Array.isArray(value.shape)
    ? value.shape.filter((entry): entry is string => typeof entry === "string")
    : undefined;

  return {
    param,
    name: toOptionalString(value.name),
    description: toOptionalString(value.description),
    shape: shape?.length ? shape : undefined
  };
}

function normalizePatternDefinition(value: unknown): PatternDefinition | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = toOptionalString(value.id);
  const name = toOptionalString(value.name);

  if (!id || !name) {
    return undefined;
  }

  return {
    id,
    name,
    description: toOptionalString(value.description),
    params: normalizeArray(value.params, normalizePatternParameter),
    advancedParams: normalizeArray(value.advancedParams, normalizePatternParameter)
  };
}

function normalizePatternManifest(value: unknown): PatternManifest | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = toOptionalString(value.id);
  const name = toOptionalString(value.name);

  if (!id || !name) {
    return undefined;
  }

  return {
    interfaceVersion: toOptionalString(value.interfaceVersion),
    id,
    name,
    description: toOptionalString(value.description),
    patterns: normalizeArray(value.patterns, normalizePatternDefinition)
  };
}

/** Reader for `/api/v1/patterns`. */
export class PatternsApi extends ReadApi<PatternsState, PatternsApiResponse> {
  public constructor(httpClient: HttpClient) {
    super(httpClient);
  }

  protected getPath(): string {
    return "/api/v1/patterns";
  }

  protected normalizeResponse(response: PatternsApiResponse, fetchedAt: Date): PatternsState {
    return {
      manifests: normalizeArray(response.manifests, normalizePatternManifest),
      fetchedAt
    };
  }

  /** Returns all patterns from every manifest as a flat list. */
  public listPatterns(snapshot?: PatternsState): PatternDefinition[] {
    const resolvedSnapshot = this.resolveSnapshot(snapshot);

    if (!resolvedSnapshot) {
      return [];
    }

    return resolvedSnapshot.manifests.flatMap((manifest) => manifest.patterns);
  }

  /** Finds a manifest by its manifest id. */
  public findManifestById(id: string, snapshot?: PatternsState): PatternManifest | undefined {
    const resolvedSnapshot = this.resolveSnapshot(snapshot);
    return resolvedSnapshot?.manifests.find((manifest) => manifest.id === id);
  }

  /** Finds a pattern by its pattern id. */
  public findPatternById(id: string, snapshot?: PatternsState): PatternDefinition | undefined {
    return this.listPatterns(snapshot).find((pattern) => pattern.id === id);
  }

  /** Finds a regular or advanced parameter definition for one pattern. */
  public findParameter(patternId: string, param: string, snapshot?: PatternsState): PatternParameter | undefined {
    const pattern = this.findPatternById(patternId, snapshot);

    if (!pattern) {
      return undefined;
    }

    return [...pattern.params, ...pattern.advancedParams].find((entry) => entry.param === param);
  }
}
