import http from "node:http";
import https from "node:https";

/** Connection options for the internal HTTP client. */
export interface HttpClientOptions {
  host: string;
  port?: number;
  protocol?: "http" | "https";
}

/**
 * Minimal JSON-oriented HTTP client used by the MaestroDMX Web API readers.
 */
export class HttpClient {
  private readonly host: string;
  private readonly port?: number;
  private readonly protocol: "http" | "https";

  public constructor(options: HttpClientOptions) {
    this.host = options.host;
    this.port = options.port;
    this.protocol = options.protocol ?? "http";
  }

  /** Performs a JSON `GET` request and parses the response body. */
  public async getJson<T>(path: string): Promise<T> {
    const transport = this.protocol === "https" ? https : http;

    return new Promise<T>((resolve, reject) => {
      const request = transport.get(
        {
          host: this.host,
          port: this.port,
          path,
          headers: {
            Accept: "application/json"
          }
        },
        (response) => {
          if (!response.statusCode) {
            reject(new Error(`HTTP request to "${path}" returned no status code.`));
            return;
          }

          if (response.statusCode < 200 || response.statusCode >= 300) {
            response.resume();
            reject(new Error(`HTTP request to "${path}" failed with status ${response.statusCode}.`));
            return;
          }

          const chunks: Buffer[] = [];

          response.on("data", (chunk: Buffer | string) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });

          response.on("end", () => {
            try {
              const body = Buffer.concat(chunks).toString("utf8");
              resolve(JSON.parse(body) as T);
            } catch (error) {
              reject(error);
            }
          });
        }
      );

      request.on("error", reject);
    });
  }

  /** Performs a JSON `PUT` request with the given request body. */
  public async putJson(path: string, body: unknown): Promise<void> {
    const transport = this.protocol === "https" ? https : http;
    const payload = JSON.stringify(body);

    await new Promise<void>((resolve, reject) => {
      const request = transport.request(
        {
          host: this.host,
          port: this.port,
          path,
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload)
          }
        },
        (response) => {
          if (!response.statusCode) {
            reject(new Error(`HTTP request to "${path}" returned no status code.`));
            return;
          }

          if (response.statusCode < 200 || response.statusCode >= 300) {
            response.resume();
            reject(new Error(`HTTP request to "${path}" failed with status ${response.statusCode}.`));
            return;
          }

          response.resume();
          response.on("end", resolve);
        }
      );

      request.on("error", reject);
      request.write(payload);
      request.end();
    });
  }
}
