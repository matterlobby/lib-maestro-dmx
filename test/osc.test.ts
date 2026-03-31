import { describe, expect, it, vi } from "vitest";

import { decodeOscMessage, encodeOscMessage, oscFloat, OscClient } from "../src/index.js";

describe("encodeOscMessage / decodeOscMessage", () => {
  it("roundtrips supported OSC argument types", () => {
    const encoded = encodeOscMessage({
      address: "/live/1/brightness",
      args: [1, 0.5, "solid", true, false, oscFloat(0.25)]
    });

    expect(decodeOscMessage(encoded)).toEqual({
      address: "/live/1/brightness",
      args: [1, 0.5, "solid", true, false, 0.25]
    });
  });

  it("rejects invalid type tag strings", () => {
    const invalid = Buffer.concat([Buffer.from("/bad\0\0\0,iii\0"), Buffer.alloc(12)]);
    invalid.write(",iii", 8, "utf8");
    invalid[8] = "i".charCodeAt(0);

    expect(() => decodeOscMessage(invalid)).toThrowError("Invalid OSC type tag string.");
  });

  it("rejects unsupported OSC type tags", () => {
    const invalid = Buffer.concat([Buffer.from("/bad\0\0\0,\0\0\0"), Buffer.alloc(0)]);
    invalid.write(",x", 8, "utf8");

    expect(() => decodeOscMessage(invalid)).toThrowError('Unsupported OSC type tag "x".');
  });
});

describe("OscClient.sendThrottled", () => {
  it("sends immediately, coalesces pending values, and sends the trailing value", async () => {
    vi.useFakeTimers();

    try {
      const client = new OscClient({ host: "maestro.local", port: 7672 });
      const sendSpy = vi.spyOn(client, "send").mockResolvedValue(undefined);

      await client.sendThrottled("/live/1/energy", oscFloat(0.1));
      await client.sendThrottled("/live/1/energy", oscFloat(0.2));
      await client.sendThrottled("/live/1/energy", oscFloat(0.3));

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenNthCalledWith(1, "/live/1/energy", oscFloat(0.1));

      await vi.advanceTimersByTimeAsync(250);

      expect(sendSpy).toHaveBeenCalledTimes(2);
      expect(sendSpy).toHaveBeenNthCalledWith(2, "/live/1/energy", oscFloat(0.3));

      await client.close();
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses the explicit throttle interval when provided", async () => {
    vi.useFakeTimers();

    try {
      const client = new OscClient({ host: "maestro.local", port: 7672 });
      const sendSpy = vi.spyOn(client, "send").mockResolvedValue(undefined);

      await client.sendThrottled("/global/brightness", { intervalMs: 500 }, oscFloat(0.4));
      await client.sendThrottled("/global/brightness", { intervalMs: 500 }, oscFloat(0.6));

      expect(sendSpy).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(499);
      expect(sendSpy).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(sendSpy).toHaveBeenCalledTimes(2);
      expect(sendSpy).toHaveBeenNthCalledWith(2, "/global/brightness", oscFloat(0.6));

      await client.close();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps separate throttle windows per OSC address", async () => {
    vi.useFakeTimers();

    try {
      const client = new OscClient({ host: "maestro.local", port: 7672 });
      const sendSpy = vi.spyOn(client, "send").mockResolvedValue(undefined);

      await client.sendThrottled("/live/1/brightness", { intervalMs: 310 }, oscFloat(0.1));
      await client.sendThrottled("/live/2/brightness", { intervalMs: 310 }, oscFloat(0.2));
      await client.sendThrottled("/global/brightness", { intervalMs: 300 }, oscFloat(0.3));

      expect(sendSpy).toHaveBeenCalledTimes(3);
      expect(sendSpy).toHaveBeenNthCalledWith(1, "/live/1/brightness", oscFloat(0.1));
      expect(sendSpy).toHaveBeenNthCalledWith(2, "/live/2/brightness", oscFloat(0.2));
      expect(sendSpy).toHaveBeenNthCalledWith(3, "/global/brightness", oscFloat(0.3));

      await client.sendThrottled("/live/1/brightness", { intervalMs: 310 }, oscFloat(0.4));
      await client.sendThrottled("/live/2/brightness", { intervalMs: 310 }, oscFloat(0.5));
      await client.sendThrottled("/global/brightness", { intervalMs: 300 }, oscFloat(0.6));

      expect(sendSpy).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(300);

      expect(sendSpy).toHaveBeenCalledTimes(4);
      expect(sendSpy).toHaveBeenNthCalledWith(4, "/global/brightness", oscFloat(0.6));

      await vi.advanceTimersByTimeAsync(10);

      expect(sendSpy).toHaveBeenCalledTimes(6);
      expect(sendSpy).toHaveBeenNthCalledWith(5, "/live/1/brightness", oscFloat(0.4));
      expect(sendSpy).toHaveBeenNthCalledWith(6, "/live/2/brightness", oscFloat(0.5));

      await client.close();
    } finally {
      vi.useRealTimers();
    }
  });
});
