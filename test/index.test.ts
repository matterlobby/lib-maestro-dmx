import { describe, expect, it, vi } from "vitest";

import {
  createClient,
  HttpClient,
  LiveApi,
  MaestroOscControlApiImpl,
  OscClient,
  PatternsApi
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
    expect(client.live).toBeInstanceOf(LiveApi);
    expect(client.patterns).toBeInstanceOf(PatternsApi);
    expect(client.control).toBeInstanceOf(MaestroOscControlApiImpl);
  });

  it("delegates close to the OSC client", async () => {
    const client = createClient({ host: "maestro.local" });
    const closeSpy = vi.spyOn(client.osc, "close").mockResolvedValue(undefined);

    await client.close();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
