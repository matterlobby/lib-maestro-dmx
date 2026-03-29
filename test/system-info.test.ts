import { describe, expect, it, vi } from "vitest";

import { SystemInfoApi } from "../src/index.js";

describe("SystemInfoApi", () => {
  it("normalizes system information metadata", async () => {
    const getJson = vi.fn(async () => ({
      name: "Maestro",
      version: "1.5.1",
      buildNumber: "4",
      apiVersion: "1.0",
      webApiTimeout: 20,
      productName: "Maestro"
    }));
    const api = new SystemInfoApi({ getJson } as never);

    const snapshot = await api.read();

    expect(getJson).toHaveBeenCalledWith("/api/v1/system_info");
    expect(snapshot).toEqual({
      name: "Maestro",
      version: "1.5.1",
      buildNumber: "4",
      apiVersion: "1.0",
      commitHash: undefined,
      wlanMacAddress: undefined,
      ethMacAddress: undefined,
      webApiTimeout: 20,
      uiVersion: undefined,
      osRelease: undefined,
      productName: "Maestro",
      releaseType: undefined,
      fetchedAt: expect.any(Date)
    });
  });
});
