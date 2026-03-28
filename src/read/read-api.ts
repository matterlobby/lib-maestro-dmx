import { HttpClient } from "../transport/http.js";

export abstract class ReadApi<TSnapshot, TResponse = unknown> {
  private readonly httpClient: HttpClient;
  private lastRead: TSnapshot | undefined;

  protected constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  protected abstract getPath(): string;

  protected abstract normalizeResponse(response: TResponse, fetchedAt: Date): TSnapshot;

  public async read(): Promise<TSnapshot> {
    const response = await this.httpClient.getJson<TResponse>(this.getPath());
    const fetchedAt = new Date();
    const snapshot = this.normalizeResponse(response, fetchedAt);

    this.lastRead = snapshot;
    return snapshot;
  }

  public getLastRead(): TSnapshot | undefined {
    return this.lastRead;
  }
}
