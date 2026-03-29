import type { FixtureGroup, FixtureGroupsApi } from "./fixture-groups.js";
import type { FxPalette, FxPalettesApi } from "./fx-palettes.js";
import type { LiveApi, LiveSlotState } from "./live.js";
import type { PaletteAssignment, PaletteAssignmentsApi } from "./palette-assignments.js";
import type { ColorPalette, ColorPalettesApi } from "./color-palettes.js";
import type { PatternDefinition, PatternsApi } from "./patterns.js";
import type { PatternsAvailableApi } from "./patterns-available.js";
import type { ShowApi, ShowCue } from "./show.js";
import type { ShowStateApi } from "./show-state.js";
import { normalizeParamGroup, type ParamGroup, type SlotState } from "./shared.js";

/** Resolved runtime context for one live fixture group. */
export interface LiveGroupContext {
  paramGroup: ParamGroup;
  live: LiveSlotState;
  fixtureGroup?: FixtureGroup;
  paletteAssignment?: PaletteAssignment;
  activeColorPalette?: ColorPalette;
  activeFxPalette?: FxPalette;
  pattern?: PatternDefinition;
  patternAvailable: boolean;
}

/** Resolved authored cue context for one cue and one fixture group. */
export interface CueGroupContext {
  paramGroup: ParamGroup;
  cueIndex: number;
  cue?: ShowCue;
  slot?: SlotState;
  fixtureGroup?: FixtureGroup;
  palette?: ColorPalette;
  pattern?: PatternDefinition;
  patternAvailable: boolean;
}

/** Resolved context for the currently active cue and one fixture group. */
export interface CurrentCueGroupContext extends CueGroupContext {
  isPlaying: boolean;
}

/**
 * High-level lookup API that combines already loaded reader snapshots.
 *
 * This layer is intentionally read-only and does not issue HTTP requests by
 * itself. Call the relevant `read()` methods first, then resolve contexts from
 * the cached snapshots.
 */
export class MaestroLookupApi {
  private readonly liveApi: LiveApi;
  private readonly patternsApi: PatternsApi;
  private readonly patternsAvailableApi: PatternsAvailableApi;
  private readonly paletteAssignmentsApi: PaletteAssignmentsApi;
  private readonly colorPalettesApi: ColorPalettesApi;
  private readonly fxPalettesApi: FxPalettesApi;
  private readonly showApi: ShowApi;
  private readonly showStateApi: ShowStateApi;
  private readonly fixtureGroupsApi: FixtureGroupsApi;

  public constructor(dependencies: {
    live: LiveApi;
    patterns: PatternsApi;
    patternsAvailable: PatternsAvailableApi;
    paletteAssignments: PaletteAssignmentsApi;
    colorPalettes: ColorPalettesApi;
    fxPalettes: FxPalettesApi;
    show: ShowApi;
    showState: ShowStateApi;
    fixtureGroups: FixtureGroupsApi;
  }) {
    this.liveApi = dependencies.live;
    this.patternsApi = dependencies.patterns;
    this.patternsAvailableApi = dependencies.patternsAvailable;
    this.paletteAssignmentsApi = dependencies.paletteAssignments;
    this.colorPalettesApi = dependencies.colorPalettes;
    this.fxPalettesApi = dependencies.fxPalettes;
    this.showApi = dependencies.show;
    this.showStateApi = dependencies.showState;
    this.fixtureGroupsApi = dependencies.fixtureGroups;
  }

  /** Resolves a merged runtime view for one live fixture group. */
  public resolveLiveGroupContext(paramGroup: string | number): LiveGroupContext | undefined {
    const normalizedParamGroup = normalizeParamGroup(paramGroup);

    if (!normalizedParamGroup) {
      return undefined;
    }

    const live = this.liveApi.getGroup(normalizedParamGroup);

    if (!live) {
      return undefined;
    }

    const paletteAssignment = this.paletteAssignmentsApi.getAssignment(normalizedParamGroup);
    const activeColorPaletteId = paletteAssignment?.activeColorPaletteId ?? live.paletteId;
    const patternId = live.patternId;

    return {
      paramGroup: normalizedParamGroup,
      live,
      fixtureGroup: this.fixtureGroupsApi.getGroupByParamGroup(normalizedParamGroup),
      paletteAssignment,
      activeColorPalette: activeColorPaletteId ? this.colorPalettesApi.findById(activeColorPaletteId) : undefined,
      activeFxPalette: paletteAssignment?.activeFxSnapshotId
        ? this.fxPalettesApi.findById(paletteAssignment.activeFxSnapshotId)
        : undefined,
      pattern: patternId ? this.patternsApi.findPatternById(patternId) : undefined,
      patternAvailable: patternId ? this.patternsAvailableApi.has(patternId) : false
    };
  }

  /** Resolves a merged authored view for one cue and one fixture group. */
  public resolveCueGroupContext(cueIndex: number, paramGroup: string | number): CueGroupContext | undefined {
    const normalizedParamGroup = normalizeParamGroup(paramGroup);

    if (!normalizedParamGroup) {
      return undefined;
    }

    const cue = this.showApi.getCueByIndex(cueIndex);
    const slot = this.showApi.getCueSlot(cueIndex, normalizedParamGroup);

    return {
      paramGroup: normalizedParamGroup,
      cueIndex,
      cue,
      slot,
      fixtureGroup: this.fixtureGroupsApi.getGroupByParamGroup(normalizedParamGroup),
      palette: slot?.paletteId ? this.colorPalettesApi.findById(slot.paletteId) : undefined,
      pattern: slot?.patternId ? this.patternsApi.findPatternById(slot.patternId) : undefined,
      patternAvailable: slot?.patternId ? this.patternsAvailableApi.has(slot.patternId) : false
    };
  }

  /** Resolves the currently playing cue context for one fixture group. */
  public resolveCurrentCueGroupContext(paramGroup: string | number): CurrentCueGroupContext | undefined {
    const showPlaybackState = this.showStateApi.getLastRead();
    const cueIndex = showPlaybackState?.playIndex;

    if (cueIndex === undefined || cueIndex < 0) {
      return undefined;
    }

    const context = this.resolveCueGroupContext(cueIndex, paramGroup);

    if (!context) {
      return undefined;
    }

    return {
      ...context,
      isPlaying: this.showStateApi.isPlaying(showPlaybackState)
    };
  }
}
