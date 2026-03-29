import { HttpClient } from "../transport/http.js";

/**
 * Base class for typed MaestroDMX Web API readers.
 *
 * Each reader stores the latest normalized snapshot so convenience methods can
 * operate without issuing another HTTP request.
 */
export abstract class ReadApi<TSnapshot, TResponse = unknown> {
  private readonly httpClient: HttpClient;
  private lastRead: TSnapshot | undefined;

  protected constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  protected abstract getPath(): string;

  protected abstract normalizeResponse(response: TResponse, fetchedAt: Date): TSnapshot;

  /** Performs one HTTP read and stores the normalized snapshot as `lastRead`. */
  public async read(): Promise<TSnapshot> {
    const response = await this.httpClient.getJson<TResponse>(this.getPath());
    const fetchedAt = new Date();
    const snapshot = this.normalizeResponse(response, fetchedAt);

    this.lastRead = snapshot;
    return snapshot;
  }

  /** Returns the most recently fetched snapshot, if any. */
  public getLastRead(): TSnapshot | undefined {
    return this.lastRead;
  }

  /** Resolves an explicit snapshot or falls back to `lastRead`. */
  protected resolveSnapshot(snapshot?: TSnapshot): TSnapshot | undefined {
    return snapshot ?? this.lastRead;
  }
}
