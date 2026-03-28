import { isRecord, normalizeArray, toOptionalString } from "../internal/normalize.js";
import { HttpClient } from "../transport/http.js";
import { ReadApi } from "./read-api.js";

export interface PatternParameter {
  param: string;
  name?: string;
  description?: string;
  shape?: string[];
}

export interface PatternDefinition {
  id: string;
  name: string;
  description?: string;
  params: PatternParameter[];
  advancedParams: PatternParameter[];
}

export interface PatternManifest {
  interfaceVersion?: string;
  id: string;
  name: string;
  description?: string;
  patterns: PatternDefinition[];
}

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
}
