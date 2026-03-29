import { describe, expect, it, vi } from "vitest";

import { PaletteAssignmentsApi } from "../src/index.js";

describe("PaletteAssignmentsApi", () => {
  it("normalizes active palette assignments per param group", async () => {
    const getJson = vi.fn(async () => ({
      states: [
        {
          paramGroup: "PRIMARY",
          activeColorPaletteId: "110",
          activeFxSnapshotId: ""
        },
        "invalid-state"
      ],
      fxSnapshotIdPreview: "preview-1"
    }));
    const api = new PaletteAssignmentsApi({ getJson } as never);

    const snapshot = await api.read();

    expect(getJson).toHaveBeenCalledWith("/api/v1/palettes");
    expect(snapshot.states).toEqual([
      {
        paramGroup: "PRIMARY",
        activeColorPaletteId: "110",
        activeFxSnapshotId: ""
      }
    ]);
    expect(snapshot.fxSnapshotIdPreview).toBe("preview-1");
  });

  it("resolves active palette ids by param group", async () => {
    const api = new PaletteAssignmentsApi({
      getJson: vi.fn(async () => ({
        states: [
          {
            paramGroup: "SECONDARY",
            activeColorPaletteId: "303",
            activeFxSnapshotId: "fx-1"
          }
        ]
      }))
    } as never);

    await api.read();

    expect(api.getAssignment(2)?.paramGroup).toBe("SECONDARY");
    expect(api.getActiveColorPaletteId("secondary")).toBe("303");
    expect(api.getActiveFxSnapshotId("SECONDARY")).toBe("fx-1");
  });
});
