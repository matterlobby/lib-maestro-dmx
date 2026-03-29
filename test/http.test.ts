import http from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import { HttpClient } from "../src/index.js";

let activeServer: http.Server | undefined;

afterEach(async () => {
  if (!activeServer) {
    return;
  }

  const server = activeServer;
  activeServer = undefined;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

describe("HttpClient.putJson", () => {
  it("sends a JSON PUT request", async () => {
    let resolveRequest: ((value: { method: string | undefined; url: string | undefined; body: string }) => void) | undefined;
    const receivedPromise = new Promise<{ method: string | undefined; url: string | undefined; body: string }>((resolve) => {
      resolveRequest = resolve;
    });

    const server = http.createServer((request, response) => {
      const chunks: Buffer[] = [];

      request.on("data", (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      request.on("end", () => {
        response.statusCode = 204;
        response.end();
        resolveRequest?.({
          method: request.method,
          url: request.url,
          body: Buffer.concat(chunks).toString("utf8")
        });
      });
    });

    activeServer = server;

    await new Promise<void>((resolve, reject) => {
      server.listen(0, "127.0.0.1", () => {
        resolve();
      });
      server.on("error", reject);
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected an IPv4 test server address.");
    }

    const client = new HttpClient({
      host: "127.0.0.1",
      port: address.port
    });

    await client.putJson("/api/v1/live", {
      params: {
        brightness: 0.5
      }
    });

    await expect(receivedPromise).resolves.toEqual({
      method: "PUT",
      url: "/api/v1/live",
      body: JSON.stringify({
        params: {
          brightness: 0.5
        }
      })
    });
  });
});
