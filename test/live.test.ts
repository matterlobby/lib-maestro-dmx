import { describe, expect, it, vi } from "vitest";

import { LiveApi } from "../src/index.js";

describe("LiveApi", () => {
  it("normalizes a live response and stores the last snapshot", async () => {
    const getJson = vi.fn(async () => ({
      type: "LIVE",
      transition: { name: "fade" },
      params: {
        patternId: "solid",
        brightness: 0.8,
        blackout: false
      },
      secondaryParams: {
        paletteId: "warm",
        motionSpeed: 0.25
      },
      tertiaryParams: "invalid-slot",
      quaternaryParams: {
        blackoutOnSilence: true
      }
    }));
    const api = new LiveApi({ getJson } as never);

    const snapshot = await api.read();

    expect(getJson).toHaveBeenCalledWith("/api/v1/live");
    expect(snapshot.mode).toBe("LIVE");
    expect(snapshot.transition).toEqual({ name: "fade" });
    expect(snapshot.primary).toEqual({
      patternId: "solid",
      paletteId: undefined,
      brightness: 0.8,
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
      blackout: false,
      blackoutOnSilence: undefined
    });
    expect(snapshot.secondary).toEqual({
      patternId: undefined,
      paletteId: "warm",
      brightness: undefined,
      excitement: undefined,
      background: undefined,
      intensity: undefined,
      motion: undefined,
      speed: undefined,
      energy: undefined,
      variance: undefined,
      attack: undefined,
      decay: undefined,
      motionSpeed: 0.25,
      blackout: undefined,
      blackoutOnSilence: undefined
    });
    expect(snapshot.tertiary).toEqual({});
    expect(snapshot.quaternary).toEqual({
      patternId: undefined,
      paletteId: undefined,
      brightness: undefined,
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
      blackoutOnSilence: true
    });
    expect(snapshot.fetchedAt).toBeInstanceOf(Date);
    expect(api.getLastRead()).toBe(snapshot);
  });

  it("falls back for invalid response fields", async () => {
    const api = new LiveApi({
      getJson: vi.fn(async () => ({
        type: 42,
        transition: "not-a-record",
        params: {
          patternId: 123,
          brightness: Number.NaN,
          blackout: "nope"
        }
      }))
    } as never);

    const snapshot = await api.read();

    expect(snapshot.mode).toBe("UNKNOWN");
    expect(snapshot.transition).toEqual({});
    expect(snapshot.primary).toEqual({
      patternId: undefined,
      paletteId: undefined,
      brightness: undefined,
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
      blackoutOnSilence: undefined
    });
    expect(snapshot.secondary).toEqual({});
    expect(snapshot.tertiary).toEqual({});
    expect(snapshot.quaternary).toEqual({});
  });

  it("maps excitement directly and falls back to intensity when needed", async () => {
    const api = new LiveApi({
      getJson: vi.fn(async () => ({
        params: {
          excitement: 0.7
        },
        secondaryParams: {
          intensity: 0.6
        }
      }))
    } as never);

    const snapshot = await api.read();

    expect(snapshot.primary.excitement).toBe(0.7);
    expect(snapshot.primary.intensity).toBeUndefined();
    expect(snapshot.secondary.excitement).toBe(0.6);
    expect(snapshot.secondary.intensity).toBe(0.6);
  });
});
