import { describe, expect, it, vi } from "vitest";

import { PatternsAvailableApi } from "../src/index.js";

describe("PatternsAvailableApi", () => {
  it("normalizes the list of available pattern ids", async () => {
    const getJson = vi.fn(async () => ({
      ids: ["Still", 42, "Wash", null]
    }));
    const api = new PatternsAvailableApi({ getJson } as never);

    const snapshot = await api.read();

    expect(getJson).toHaveBeenCalledWith("/api/v1/patterns/available");
    expect(snapshot.ids).toEqual(["Still", "Wash"]);
    expect(snapshot.fetchedAt).toBeInstanceOf(Date);
  });

  it("falls back to an empty list", async () => {
    const api = new PatternsAvailableApi({
      getJson: vi.fn(async () => ({
        ids: "invalid"
      }))
    } as never);

    const snapshot = await api.read();

    expect(snapshot.ids).toEqual([]);
  });

  it("checks whether a pattern id is available", async () => {
    const api = new PatternsAvailableApi({
      getJson: vi.fn(async () => ({
        ids: ["Still", "Wash"]
      }))
    } as never);

    await api.read();

    expect(api.has("Still")).toBe(true);
    expect(api.has("Ambient")).toBe(false);
  });
});
