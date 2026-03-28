import { describe, expect, it, vi } from "vitest";

import { MaestroOscControlApiImpl, oscFloat } from "../src/index.js";

function createOscClientMock() {
  return {
    send: vi.fn(async () => undefined),
    sendThrottled: vi.fn(async () => undefined)
  };
}

describe("MaestroOscControlApiImpl", () => {
  it("sends immediate OSC commands for direct actions", async () => {
    const oscClient = createOscClientMock();
    const api = new MaestroOscControlApiImpl(oscClient as never);

    await api.audio.setInput("USB Audio");
    await api.show.loadCueByIndex(2);
    await api.triggers.setFog(true);
    await api.group(2).setPattern("Solid Color");
    await api.group(2).setShape(15);

    expect(oscClient.send).toHaveBeenNthCalledWith(1, "/audio/input", "USB Audio");
    expect(oscClient.send).toHaveBeenNthCalledWith(2, "/show/cue/index", 2);
    expect(oscClient.send).toHaveBeenNthCalledWith(3, "/triggers/fog", true);
    expect(oscClient.send).toHaveBeenNthCalledWith(4, "/live/2/pattern", "Solid Color");
    expect(oscClient.send).toHaveBeenNthCalledWith(5, "/live/2/shape", 15);
  });

  it("sends throttled OSC commands for continuous values", async () => {
    const oscClient = createOscClientMock();
    const api = new MaestroOscControlApiImpl(oscClient as never);

    await api.global.setBrightness(0.4);
    await api.group(1).setBrightness(0.8);
    await api.group(1).setEnergy(0.2);

    expect(oscClient.sendThrottled).toHaveBeenNthCalledWith(
      1,
      "/global/brightness",
      { intervalMs: 300 },
      oscFloat(0.4)
    );
    expect(oscClient.sendThrottled).toHaveBeenNthCalledWith(
      2,
      "/live/1/brightness",
      { intervalMs: 500 },
      oscFloat(0.8)
    );
    expect(oscClient.sendThrottled).toHaveBeenNthCalledWith(3, "/live/1/energy", oscFloat(0.2));
  });

  it("rejects invalid group numbers and parameter values", async () => {
    const oscClient = createOscClientMock();
    const api = new MaestroOscControlApiImpl(oscClient as never);

    expect(() => api.group(0 as never)).toThrowError("Live group must be an integer between 1 and 4.");
    await expect(api.audio.setInput("   ")).rejects.toThrowError("Audio input name must not be empty.");
    await expect(api.show.loadCueByIndex(0)).rejects.toThrowError(
      "Cue index must be an integer greater than or equal to 1."
    );
    await expect(api.group(1).setBrightness(1.5)).rejects.toThrowError(
      "Brightness must be a finite number between 0 and 1."
    );
    await expect(api.group(1).setShape(16)).rejects.toThrowError("Shape must be an integer between 0 and 15.");
  });
});
