import { describe, expect, it, vi } from "vitest";

import { FxPalettesApi } from "../src/index.js";

describe("FxPalettesApi", () => {
  it("normalizes fx palette lists from different response keys", async () => {
    const getJson = vi.fn(async () => ({
      snapshots: [
        {
          snapshotId: "fx-1",
          name: "Pulse",
          readOnly: true
        },
        {
          id: "fx-2",
          type: "SNAPSHOT"
        },
        "invalid"
      ]
    }));
    const api = new FxPalettesApi({ getJson } as never);

    const snapshot = await api.read();

    expect(getJson).toHaveBeenCalledWith("/api/v1/palettes/fx");
    expect(snapshot.palettes).toEqual([
      {
        id: "fx-1",
        name: "Pulse",
        type: undefined,
        readOnly: true
      },
      {
        id: "fx-2",
        name: undefined,
        type: "SNAPSHOT",
        readOnly: undefined
      }
    ]);
  });

  it("returns an empty list for empty responses", async () => {
    const api = new FxPalettesApi({
      getJson: vi.fn(async () => ({}))
    } as never);

    const snapshot = await api.read();

    expect(snapshot.palettes).toEqual([]);
  });

  it("looks up fx palettes by id", async () => {
    const api = new FxPalettesApi({
      getJson: vi.fn(async () => ({
        palettes: [
          {
            paletteId: "fx-7",
            name: "Spark"
          }
        ]
      }))
    } as never);

    await api.read();

    expect(api.findById("fx-7")?.name).toBe("Spark");
  });
});
