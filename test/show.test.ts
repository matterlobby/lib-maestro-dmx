import { describe, expect, it, vi } from "vitest";

import { ShowApi } from "../src/index.js";

describe("ShowApi", () => {
  it("normalizes show metadata and cues", async () => {
    const getJson = vi.fn(async () => ({
      id: "show-1",
      name: "Main Show",
      description: "Concert",
      defaultDuration: 300,
      defaultInTransitionDuration: 5,
      defaultOutTransitionDuration: 3,
      patternCue: [
        {
          uuid: "cue-1",
          name: "Intro",
          duration: -1,
          transition: { inDuration: 0 },
          params: {
            patternId: "Still",
            paletteId: "110",
            brightness: 1,
            allowBlackout: true
          },
          tertiaryParams: "invalid-slot"
        },
        "invalid-cue"
      ],
      color: {},
      fx: { strobe: true }
    }));
    const api = new ShowApi({ getJson } as never);

    const snapshot = await api.read();

    expect(getJson).toHaveBeenCalledWith("/api/v1/show");
    expect(snapshot).toEqual({
      id: "show-1",
      name: "Main Show",
      description: "Concert",
      defaultDuration: 300,
      defaultInTransitionDuration: 5,
      defaultOutTransitionDuration: 3,
      cues: [
        {
          uuid: "cue-1",
          name: "Intro",
          duration: -1,
          transition: { inDuration: 0 },
          primary: {
            patternId: "Still",
            paletteId: "110",
            brightness: 1,
            excitement: undefined,
            background: undefined,
            intensity: undefined,
            motion: undefined,
            speed: undefined,
            energy: undefined,
            variance: undefined,
            attack: undefined,
            decay: undefined,
            motionSpeed: undefined,
            blackout: undefined,
            blackoutOnSilence: undefined,
            allowBlackout: true,
            allowBlinder: undefined,
            allowStrobe: undefined,
            allowFog: undefined,
            allowEffect: undefined,
            audioReactivity: undefined
          },
          secondary: {},
          tertiary: {},
          quaternary: {}
        }
      ],
      color: {},
      fx: { strobe: true },
      fetchedAt: expect.any(Date)
    });
  });

  it("provides cue lookup helpers and cue slot access by param group", async () => {
    const api = new ShowApi({
      getJson: vi.fn(async () => ({
        patternCue: [
          {
            name: "Intro",
            params: { patternId: "Still" },
            secondaryParams: { patternId: "Wash" }
          },
          {
            name: "Finale",
            quaternaryParams: { paletteId: "110" }
          }
        ]
      }))
    } as never);

    await api.read();

    expect(api.getCueByIndex(0)?.name).toBe("Intro");
    expect(api.findCueByName("Finale")?.name).toBe("Finale");
    expect(api.getCueSlot(0, 2)?.patternId).toBe("Wash");
    expect(api.getCueSlot(1, "QUATERNARY")?.paletteId).toBe("110");
    expect(api.getCueByIndex(-1)).toBeUndefined();
  });
});
