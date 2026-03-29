import { describe, expect, it, vi } from "vitest";

import { ShowStateApi } from "../src/index.js";

describe("ShowStateApi", () => {
  it("normalizes the current show playback state", async () => {
    const getJson = vi.fn(async () => ({
      type: "SHOW_PLAYING",
      playIndex: 2,
      playTime: 1234,
      previewEnabled: false,
      preview: {
        name: "Next Cue"
      },
      currentCue: {
        name: "Cue 2"
      },
      id: "show-1"
    }));
    const api = new ShowStateApi({ getJson } as never);

    const snapshot = await api.read();

    expect(getJson).toHaveBeenCalledWith("/api/v1/show/state");
    expect(snapshot).toEqual({
      type: "SHOW_PLAYING",
      playIndex: 2,
      playTime: 1234,
      previewEnabled: false,
      preview: {
        name: "Next Cue"
      },
      currentCue: {
        name: "Cue 2"
      },
      id: "show-1",
      fetchedAt: expect.any(Date)
    });
  });

  it("falls back for invalid response fields", async () => {
    const api = new ShowStateApi({
      getJson: vi.fn(async () => ({
        type: 42,
        preview: [],
        currentCue: "invalid"
      }))
    } as never);

    const snapshot = await api.read();

    expect(snapshot.type).toBe("UNKNOWN");
    expect(snapshot.preview).toEqual({});
    expect(snapshot.currentCue).toEqual({});
  });

  it("provides playback convenience helpers", async () => {
    const api = new ShowStateApi({
      getJson: vi.fn(async () => ({
        type: "SHOW_PLAYING",
        currentCue: {
          name: "Cue 2"
        }
      }))
    } as never);

    await api.read();

    expect(api.isPlaying()).toBe(true);
    expect(api.isStopped()).toBe(false);
    expect(api.getCurrentCueName()).toBe("Cue 2");
  });
});
