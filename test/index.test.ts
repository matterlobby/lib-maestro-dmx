import { describe, expect, it, vi } from "vitest";

import {
  BrightnessApi,
  ColorPalettesApi,
  createClient,
  FixtureGroupsApi,
  FxPalettesApi,
  HttpClient,
  LiveApi,
  MaestroLookupApi,
  MaestroOscControlApiImpl,
  OscClient,
  PaletteAssignmentsApi,
  PatternsApi,
  PatternsAvailableApi,
  ShowApi,
  ShowStateApi,
  SystemInfoApi
} from "../src/index.js";

describe("createClient", () => {
  it("creates a wired MaestroDMX client with the expected dependencies", () => {
    const client = createClient({
      host: "maestro.local",
      protocol: "https",
      localOscPort: 9100
    });

    expect(client.host).toBe("maestro.local");
    expect(client.osc).toBeInstanceOf(OscClient);
    expect(client.systemInfo).toBeInstanceOf(SystemInfoApi);
    expect(client.brightness).toBeInstanceOf(BrightnessApi);
    expect(client.live).toBeInstanceOf(LiveApi);
    expect(client.patterns).toBeInstanceOf(PatternsApi);
    expect(client.patternsAvailable).toBeInstanceOf(PatternsAvailableApi);
    expect(client.paletteAssignments).toBeInstanceOf(PaletteAssignmentsApi);
    expect(client.colorPalettes).toBeInstanceOf(ColorPalettesApi);
    expect(client.fxPalettes).toBeInstanceOf(FxPalettesApi);
    expect(client.show).toBeInstanceOf(ShowApi);
    expect(client.showState).toBeInstanceOf(ShowStateApi);
    expect(client.fixtureGroups).toBeInstanceOf(FixtureGroupsApi);
    expect(client.lookup).toBeInstanceOf(MaestroLookupApi);
    expect(client.control).toBeInstanceOf(MaestroOscControlApiImpl);
  });

  it("delegates close to the OSC client", async () => {
    const client = createClient({ host: "maestro.local" });
    const closeSpy = vi.spyOn(client.osc, "close").mockResolvedValue(undefined);

    await client.close();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
