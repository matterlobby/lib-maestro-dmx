import { describe, expect, it, vi } from "vitest";

import { BrightnessApi } from "../src/index.js";

describe("BrightnessApi", () => {
  it("normalizes the global brightness response", async () => {
    const getJson = vi.fn(async () => ({
      value: 0.73
    }));
    const api = new BrightnessApi({ getJson } as never);

    const snapshot = await api.read();

    expect(getJson).toHaveBeenCalledWith("/api/v1/brightness");
    expect(snapshot).toEqual({
      value: 0.73,
      fetchedAt: expect.any(Date)
    });
    expect(api.getLastRead()).toBe(snapshot);
  });

  it("falls back when the response contains no finite value", async () => {
    const api = new BrightnessApi({
      getJson: vi.fn(async () => ({
        value: Number.NaN
      }))
    } as never);

    const snapshot = await api.read();

    expect(snapshot.value).toBeUndefined();
  });
});
