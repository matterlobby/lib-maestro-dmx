import { describe, expect, it, vi } from "vitest";

import {
  ColorPalettesApi,
  FixtureGroupsApi,
  FxPalettesApi,
  LiveApi,
  MaestroLookupApi,
  PaletteAssignmentsApi,
  PatternsApi,
  PatternsAvailableApi,
  ShowApi,
  ShowStateApi
} from "../src/index.js";

function createLookupApi() {
  const live = new LiveApi({
    getJson: vi.fn(async () => ({
      params: {
        patternId: "Wash",
        paletteId: "110",
        brightness: 0.8
      }
    }))
  } as never);
  const patterns = new PatternsApi({
    getJson: vi.fn(async () => ({
      manifests: [
        {
          id: "core",
          name: "Core",
          patterns: [
            {
              id: "Wash",
              name: "Wash",
              params: [{ param: "brightness" }],
              advancedParams: []
            }
          ]
        }
      ]
    }))
  } as never);
  const patternsAvailable = new PatternsAvailableApi({
    getJson: vi.fn(async () => ({
      ids: ["Wash"]
    }))
  } as never);
  const paletteAssignments = new PaletteAssignmentsApi({
    getJson: vi.fn(async () => ({
      states: [
        {
          paramGroup: "PRIMARY",
          activeColorPaletteId: "110",
          activeFxSnapshotId: "fx-1"
        }
      ]
    }))
  } as never);
  const colorPalettes = new ColorPalettesApi({
    getJson: vi.fn(async () => ({
      palettes: [
        {
          paletteId: "110",
          name: "All White"
        }
      ]
    }))
  } as never);
  const fxPalettes = new FxPalettesApi({
    getJson: vi.fn(async () => ({
      palettes: [
        {
          paletteId: "fx-1",
          name: "Pulse"
        }
      ]
    }))
  } as never);
  const show = new ShowApi({
    getJson: vi.fn(async () => ({
      patternCue: [
        {
          name: "Intro",
          params: {
            patternId: "Wash",
            paletteId: "110"
          }
        }
      ]
    }))
  } as never);
  const showState = new ShowStateApi({
    getJson: vi.fn(async () => ({
      type: "SHOW_PLAYING",
      playIndex: 0
    }))
  } as never);
  const fixtureGroups = new FixtureGroupsApi({
    getJson: vi.fn(async () => ({
      fixtureGroup: [
        {
          id: "group-1",
          paramGroup: "PRIMARY",
          fixtureId: ["fixture-1", "fixture-2"]
        }
      ]
    }))
  } as never);

  return {
    live,
    patterns,
    patternsAvailable,
    paletteAssignments,
    colorPalettes,
    fxPalettes,
    show,
    showState,
    fixtureGroups,
    lookup: new MaestroLookupApi({
      live,
      patterns,
      patternsAvailable,
      paletteAssignments,
      colorPalettes,
      fxPalettes,
      show,
      showState,
      fixtureGroups
    })
  };
}

describe("MaestroLookupApi", () => {
  it("resolves live group context from loaded snapshots", async () => {
    const api = createLookupApi();

    await api.live.read();
    await api.patterns.read();
    await api.patternsAvailable.read();
    await api.paletteAssignments.read();
    await api.colorPalettes.read();
    await api.fxPalettes.read();
    await api.fixtureGroups.read();

    const context = api.lookup.resolveLiveGroupContext("PRIMARY");

    expect(context).toEqual({
      paramGroup: "PRIMARY",
      live: expect.objectContaining({
        patternId: "Wash",
        paletteId: "110",
        brightness: 0.8
      }),
      fixtureGroup: expect.objectContaining({
        id: "group-1"
      }),
      paletteAssignment: expect.objectContaining({
        activeColorPaletteId: "110",
        activeFxSnapshotId: "fx-1"
      }),
      activeColorPalette: expect.objectContaining({
        paletteId: "110",
        name: "All White"
      }),
      activeFxPalette: expect.objectContaining({
        id: "fx-1",
        name: "Pulse"
      }),
      pattern: expect.objectContaining({
        id: "Wash",
        name: "Wash"
      }),
      patternAvailable: true
    });
  });

  it("resolves cue context and current cue context", async () => {
    const api = createLookupApi();

    await api.patterns.read();
    await api.patternsAvailable.read();
    await api.colorPalettes.read();
    await api.show.read();
    await api.showState.read();
    await api.fixtureGroups.read();

    const cueContext = api.lookup.resolveCueGroupContext(0, 1);
    const currentCueContext = api.lookup.resolveCurrentCueGroupContext("PRIMARY");

    expect(cueContext).toEqual({
      paramGroup: "PRIMARY",
      cueIndex: 0,
      cue: expect.objectContaining({
        name: "Intro"
      }),
      slot: expect.objectContaining({
        patternId: "Wash",
        paletteId: "110"
      }),
      fixtureGroup: expect.objectContaining({
        id: "group-1"
      }),
      palette: expect.objectContaining({
        paletteId: "110"
      }),
      pattern: expect.objectContaining({
        id: "Wash"
      }),
      patternAvailable: true
    });
    expect(currentCueContext?.cueIndex).toBe(0);
    expect(currentCueContext?.isPlaying).toBe(true);
  });

  it("returns undefined for unknown param groups or missing current cue index", async () => {
    const api = createLookupApi();

    expect(api.lookup.resolveLiveGroupContext("invalid")).toBeUndefined();
    expect(api.lookup.resolveCurrentCueGroupContext("PRIMARY")).toBeUndefined();
  });
});
