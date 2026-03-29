import { isRecord, normalizeArray, toOptionalBoolean, toOptionalNumber, toOptionalString } from "../internal/normalize.js";
import { HttpClient } from "../transport/http.js";
import { ReadApi } from "./read-api.js";

/** One RGBWAUV-style color stop in an extended MaestroDMX palette. */
export interface PaletteColor {
  r?: number;
  g?: number;
  b?: number;
  w?: number;
  am?: number;
  u?: number;
}

/** One color palette definition returned by MaestroDMX. */
export interface ColorPalette {
  paletteId: string;
  name: string;
  type?: string;
  children: string[];
  hexColors: string[];
  colors: PaletteColor[];
  readOnly?: boolean;
}

/** Snapshot of the MaestroDMX color palette catalog. */
export interface ColorPalettesState {
  palettes: ColorPalette[];
  fetchedAt: Date;
}

interface ColorPalettesApiResponse {
  palettes?: unknown;
}

function normalizePaletteColor(value: unknown): PaletteColor | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    r: toOptionalNumber(value.r),
    g: toOptionalNumber(value.g),
    b: toOptionalNumber(value.b),
    w: toOptionalNumber(value.w),
    am: toOptionalNumber(value.am),
    u: toOptionalNumber(value.u)
  };
}

function normalizeColorPalette(value: unknown): ColorPalette | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const paletteId = toOptionalString(value.paletteId);
  const name = toOptionalString(value.name);

  if (!paletteId || !name) {
    return undefined;
  }

  const hexColors = Array.isArray(value.hexColors)
    ? value.hexColors
        .filter((entry): entry is string | number => typeof entry === "string" || typeof entry === "number")
        .map((entry) => String(entry))
    : [];

  const children = Array.isArray(value.children)
    ? value.children
        .filter((entry): entry is string | number => typeof entry === "string" || typeof entry === "number")
        .map((entry) => String(entry))
    : [];

  return {
    paletteId,
    name,
    type: toOptionalString(value.type),
    children,
    hexColors,
    colors: normalizeArray(value.colors, normalizePaletteColor),
    readOnly: toOptionalBoolean(value.readOnly)
  };
}

/** Reader for `/api/v1/palettes/color`. */
export class ColorPalettesApi extends ReadApi<ColorPalettesState, ColorPalettesApiResponse> {
  public constructor(httpClient: HttpClient) {
    super(httpClient);
  }

  protected getPath(): string {
    return "/api/v1/palettes/color";
  }

  protected normalizeResponse(response: ColorPalettesApiResponse, fetchedAt: Date): ColorPalettesState {
    return {
      palettes: normalizeArray(response.palettes, normalizeColorPalette),
      fetchedAt
    };
  }

  /** Finds one palette by palette id. */
  public findById(paletteId: string, snapshot?: ColorPalettesState): ColorPalette | undefined {
    return this.resolveSnapshot(snapshot)?.palettes.find((palette) => palette.paletteId === paletteId);
  }

  /** Finds one palette by its display name. */
  public findByName(name: string, snapshot?: ColorPalettesState): ColorPalette | undefined {
    return this.resolveSnapshot(snapshot)?.palettes.find((palette) => palette.name === name);
  }

  /** Returns grouped palettes only. */
  public listGroups(snapshot?: ColorPalettesState): ColorPalette[] {
    return this.resolveSnapshot(snapshot)?.palettes.filter((palette) => palette.type === "GROUP") ?? [];
  }

  /** Returns individual palettes only. */
  public listLeafPalettes(snapshot?: ColorPalettesState): ColorPalette[] {
    return this.resolveSnapshot(snapshot)?.palettes.filter((palette) => palette.type !== "GROUP") ?? [];
  }

  /** Resolves the child palettes referenced by a grouped palette. */
  public resolveChildren(paletteId: string, snapshot?: ColorPalettesState): ColorPalette[] {
    const palette = this.findById(paletteId, snapshot);

    if (!palette || palette.type !== "GROUP") {
      return [];
    }

    return palette.children
      .map((childId) => this.findById(childId, snapshot))
      .filter((child): child is ColorPalette => child !== undefined);
  }
}
