import { MaestroOscControlApiImpl } from "./control/osc-control.js";
import type { LiveGroup, MaestroOscControlApi } from "./control/osc-control.js";
import { LiveApi } from "./read/live.js";
import { PatternsApi } from "./read/patterns.js";
import { HttpClient } from "./transport/http.js";
import { OscClient } from "./transport/osc.js";

const DEFAULT_OSC_PORT = 7672;

export type { LiveGroup, MaestroOscControlApi } from "./control/osc-control.js";
export type { LiveSlotState, LiveState } from "./read/live.js";
export type { PatternDefinition, PatternManifest, PatternParameter, PatternsState } from "./read/patterns.js";
export type { HttpClientOptions } from "./transport/http.js";
export type { OscArgument, OscClientOptions, OscMessage, OscResponse } from "./transport/osc.js";
export { MaestroOscControlApiImpl } from "./control/osc-control.js";
export { LiveApi } from "./read/live.js";
export { PatternsApi } from "./read/patterns.js";
export { HttpClient } from "./transport/http.js";
export { OscClient, decodeOscMessage, encodeOscMessage, oscFloat } from "./transport/osc.js";

export interface MaestroDmxClientOptions {
  host: string;
  protocol?: "http" | "https";
  localOscPort?: number;
}

export interface MaestroDmxClient {
  host: string;
  osc: OscClient;
  control: MaestroOscControlApi;
  live: LiveApi;
  patterns: PatternsApi;
  close(): Promise<void>;
}

class MaestroDmxClientImpl implements MaestroDmxClient {
  public readonly host: string;
  public readonly osc: OscClient;
  public readonly control: MaestroOscControlApi;
  public readonly live: LiveApi;
  public readonly patterns: PatternsApi;

  public constructor(options: MaestroDmxClientOptions) {
    this.host = options.host;
    this.osc = new OscClient({
      host: options.host,
      port: DEFAULT_OSC_PORT,
      localPort: options.localOscPort
    });
    this.control = new MaestroOscControlApiImpl(this.osc);
    this.live = new LiveApi(
      new HttpClient({
        host: options.host,
        protocol: options.protocol
      })
    );
    this.patterns = new PatternsApi(
      new HttpClient({
        host: options.host,
        protocol: options.protocol
      })
    );
  }

  public async close(): Promise<void> {
    await this.osc.close();
  }
}

export function createClient(options: MaestroDmxClientOptions): MaestroDmxClient {
  return new MaestroDmxClientImpl(options);
}
