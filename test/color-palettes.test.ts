import { describe, expect, it, vi } from "vitest";

import { ColorPalettesApi } from "../src/index.js";

describe("ColorPalettesApi", () => {
  it("normalizes group palettes, hex palettes and channel palettes", async () => {
    const getJson = vi.fn(async () => ({
      palettes: [
        {
          paletteId: "218",
          name: "Warm Group",
          type: "GROUP",
          children: ["300", 302, null],
          readOnly: true
        },
        {
          paletteId: "110",
          name: "All White",
          hexColors: ["16777215", 16777215]
        },
        {
          paletteId: "888",
          name: "Cyber Red",
          colors: [
            { r: 1, g: 0, b: 0, u: 1 },
            "invalid-color"
          ]
        },
        {
          name: "broken"
        }
      ]
    }));
    const api = new ColorPalettesApi({ getJson } as never);

    const snapshot = await api.read();

    expect(getJson).toHaveBeenCalledWith("/api/v1/palettes/color");
    expect(snapshot.palettes).toEqual([
      {
        paletteId: "218",
        name: "Warm Group",
        type: "GROUP",
        children: ["300", "302"],
        hexColors: [],
        colors: [],
        readOnly: true
      },
      {
        paletteId: "110",
        name: "All White",
        type: undefined,
        children: [],
        hexColors: ["16777215", "16777215"],
        colors: [],
        readOnly: undefined
      },
      {
        paletteId: "888",
        name: "Cyber Red",
        type: undefined,
        children: [],
        hexColors: [],
        colors: [
          {
            r: 1,
            g: 0,
            b: 0,
            w: undefined,
            am: undefined,
            u: 1
          }
        ],
        readOnly: undefined
      }
    ]);
  });

  it("provides palette lookup helpers and resolves group children", async () => {
    const api = new ColorPalettesApi({
      getJson: vi.fn(async () => ({
        palettes: [
          {
            paletteId: "group-1",
            name: "Warm Group",
            type: "GROUP",
            children: ["p1", "p2"]
          },
          {
            paletteId: "p1",
            name: "Red"
          },
          {
            paletteId: "p2",
            name: "Amber"
          }
        ]
      }))
    } as never);

    await api.read();

    expect(api.findById("p1")?.name).toBe("Red");
    expect(api.findByName("Amber")?.paletteId).toBe("p2");
    expect(api.listGroups()).toHaveLength(1);
    expect(api.listLeafPalettes()).toHaveLength(2);
    expect(api.resolveChildren("group-1").map((palette) => palette.name)).toEqual(["Red", "Amber"]);
  });
});
