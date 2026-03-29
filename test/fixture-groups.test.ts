import { describe, expect, it, vi } from "vitest";

import { FixtureGroupsApi } from "../src/index.js";

describe("FixtureGroupsApi", () => {
  it("normalizes fixture groups and mapping config", async () => {
    const getJson = vi.fn(async () => ({
      fixtureGroup: [
        {
          id: "group-1",
          name: "Primary",
          paramGroup: "PRIMARY",
          fixtureId: ["fixture-1", "fixture-2", 42],
          mappingConfig: {
            gridMapping: {
              style: "WRAP"
            }
          }
        },
        {
          name: "broken"
        }
      ]
    }));
    const api = new FixtureGroupsApi({ getJson } as never);

    const snapshot = await api.read();

    expect(getJson).toHaveBeenCalledWith("/api/v1/fixture_groups");
    expect(snapshot.groups).toEqual([
      {
        id: "group-1",
        name: "Primary",
        paramGroup: "PRIMARY",
        fixtureIds: ["fixture-1", "fixture-2"],
        mappingConfig: {
          gridMapping: {
            style: "WRAP"
          }
        }
      }
    ]);
  });

  it("finds groups by id or param group and lists fixture ids", async () => {
    const api = new FixtureGroupsApi({
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

    await api.read();

    expect(api.getGroupById("group-1")?.paramGroup).toBe("PRIMARY");
    expect(api.getGroupByParamGroup(1)?.id).toBe("group-1");
    expect(api.listFixtureIds("PRIMARY")).toEqual(["fixture-1", "fixture-2"]);
    expect(api.listFixtureIds("group-1")).toEqual(["fixture-1", "fixture-2"]);
  });
});
