import http from "node:http";
import https from "node:https";

export interface HttpClientOptions {
  host: string;
  protocol?: "http" | "https";
}

export class HttpClient {
  private readonly host: string;
  private readonly protocol: "http" | "https";

  public constructor(options: HttpClientOptions) {
    this.host = options.host;
    this.protocol = options.protocol ?? "http";
  }

  public async getJson<T>(path: string): Promise<T> {
    const transport = this.protocol === "https" ? https : http;

    return new Promise<T>((resolve, reject) => {
      const request = transport.get(
        {
          host: this.host,
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
}
