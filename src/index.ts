import { MaestroOscControlApiImpl } from "./control.js";
import type { LiveGroup, MaestroOscControlApi } from "./control.js";
import { HttpClient } from "./http.js";
import { LiveApi } from "./live.js";
import { OscClient } from "./osc.js";

const DEFAULT_OSC_PORT = 7672;

export type { HttpClientOptions } from "./http.js";
export type { LiveSlotState, LiveState } from "./live.js";
export type { OscArgument, OscClientOptions, OscMessage, OscResponse } from "./osc.js";
export type { LiveGroup, MaestroOscControlApi } from "./control.js";
export { HttpClient } from "./http.js";
export { LiveApi } from "./live.js";
export { OscClient, decodeOscMessage, encodeOscMessage } from "./osc.js";
export { MaestroOscControlApiImpl } from "./control.js";

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
  close(): Promise<void>;
}

class MaestroDmxClientImpl implements MaestroDmxClient {
  public readonly host: string;
  public readonly osc: OscClient;
  public readonly control: MaestroOscControlApi;
  public readonly live: LiveApi;

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
  }

  public async close(): Promise<void> {
    await this.osc.close();
  }
}

export function createClient(options: MaestroDmxClientOptions): MaestroDmxClient {
  return new MaestroDmxClientImpl(options);
}
