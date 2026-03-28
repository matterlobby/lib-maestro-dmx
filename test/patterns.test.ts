import { describe, expect, it, vi } from "vitest";

import { PatternsApi } from "../src/index.js";

describe("PatternsApi", () => {
  it("normalizes manifests, patterns and params from the API response", async () => {
    const getJson = vi.fn(async () => ({
      manifests: [
        {
          interfaceVersion: "1",
          id: "core",
          name: "Core",
          description: "Default patterns",
          patterns: [
            {
              id: "wash",
              name: "Wash",
              description: "Color movement",
              params: [
                {
                  param: "brightness",
                  name: "Brightness",
                  description: "Fixture brightness"
                },
                "invalid-param"
              ],
              advancedParams: [
                {
                  param: "allowStrobe",
                  shape: ["FORWARD", 42, "MIRROR"]
                }
              ]
            },
            {
              id: "broken"
            }
          ]
        },
        "invalid-manifest"
      ]
    }));
    const api = new PatternsApi({ getJson } as never);

    const snapshot = await api.read();

    expect(getJson).toHaveBeenCalledWith("/api/v1/patterns");
    expect(snapshot.manifests).toEqual([
      {
        interfaceVersion: "1",
        id: "core",
        name: "Core",
        description: "Default patterns",
        patterns: [
          {
            id: "wash",
            name: "Wash",
            description: "Color movement",
            params: [
              {
                param: "brightness",
                name: "Brightness",
                description: "Fixture brightness",
                shape: undefined
              }
            ],
            advancedParams: [
              {
                param: "allowStrobe",
                name: undefined,
                description: undefined,
                shape: ["FORWARD", "MIRROR"]
              }
            ]
          }
        ]
      }
    ]);
    expect(snapshot.fetchedAt).toBeInstanceOf(Date);
    expect(api.getLastRead()).toBe(snapshot);
  });

  it("falls back to an empty manifest list for invalid responses", async () => {
    const api = new PatternsApi({
      getJson: vi.fn(async () => ({
        manifests: "not-an-array"
      }))
    } as never);

    const snapshot = await api.read();

    expect(snapshot.manifests).toEqual([]);
    expect(snapshot.fetchedAt).toBeInstanceOf(Date);
  });
});
