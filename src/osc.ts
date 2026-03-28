import dgram from "node:dgram";

export interface OscFloatArgument {
  type: "float";
  value: number;
}

export type OscArgument = boolean | number | string | OscFloatArgument;

export interface OscMessage {
  address: string;
  args: OscArgument[];
}

export interface OscResponse extends OscMessage {
  remoteAddress: string;
  remotePort: number;
}

export interface OscClientOptions {
  host: string;
  port: number;
  localPort?: number;
}

interface ThrottledOscSendState {
  lastSentAt: number | undefined;
  pendingArgs: OscArgument[] | undefined;
  timer: NodeJS.Timeout | undefined;
}

export interface OscThrottleOptions {
  intervalMs?: number;
}

function padToFourBytes(length: number): number {
  const remainder = length % 4;
  return remainder === 0 ? length : length + (4 - remainder);
}

function encodeOscString(value: string): Buffer {
  const raw = Buffer.from(value, "utf8");
  const size = padToFourBytes(raw.length + 1);
  const result = Buffer.alloc(size);
  raw.copy(result, 0);
  return result;
}

function decodeOscString(buffer: Buffer, offset: number): { nextOffset: number; value: string } {
  const end = buffer.indexOf(0, offset);

  if (end === -1) {
    throw new Error("Invalid OSC string: missing null terminator.");
  }

  const value = buffer.toString("utf8", offset, end);
  return {
    value,
    nextOffset: padToFourBytes(end + 1)
  };
}

function encodeOscArgument(argument: OscArgument): { typeTag: string; payload: Buffer } {
  if (isOscFloatArgument(argument)) {
    const payload = Buffer.alloc(4);
    payload.writeFloatBE(argument.value, 0);
    return { typeTag: "f", payload };
  }

  if (typeof argument === "string") {
    return {
      typeTag: "s",
      payload: encodeOscString(argument)
    };
  }

  if (typeof argument === "number") {
    if (Number.isInteger(argument)) {
      const payload = Buffer.alloc(4);
      payload.writeInt32BE(argument, 0);
      return { typeTag: "i", payload };
    }

    const payload = Buffer.alloc(4);
    payload.writeFloatBE(argument, 0);
    return { typeTag: "f", payload };
  }

  return {
    typeTag: argument ? "T" : "F",
    payload: Buffer.alloc(0)
  };
}

function isOscFloatArgument(argument: OscArgument): argument is OscFloatArgument {
  return typeof argument === "object" && argument !== null && argument.type === "float";
}

export function oscFloat(value: number): OscFloatArgument {
  return {
    type: "float",
    value
  };
}

export function encodeOscMessage(message: OscMessage): Buffer {
  const address = encodeOscString(message.address);
  const encodedArguments = message.args.map(encodeOscArgument);
  const typeTagString = `,${encodedArguments.map((argument) => argument.typeTag).join("")}`;
  const typeTags = encodeOscString(typeTagString);
  const payload = encodedArguments.map((argument) => argument.payload);

  return Buffer.concat([address, typeTags, ...payload]);
}

export function decodeOscMessage(buffer: Buffer): OscMessage {
  let offset = 0;
  const address = decodeOscString(buffer, offset);
  offset = address.nextOffset;

  const typeTags = decodeOscString(buffer, offset);
  offset = typeTags.nextOffset;

  if (!typeTags.value.startsWith(",")) {
    throw new Error("Invalid OSC type tag string.");
  }

  const args: OscArgument[] = [];

  for (const typeTag of typeTags.value.slice(1)) {
    switch (typeTag) {
      case "i":
        args.push(buffer.readInt32BE(offset));
        offset += 4;
        break;
      case "f":
        args.push(buffer.readFloatBE(offset));
        offset += 4;
        break;
      case "s": {
        const value = decodeOscString(buffer, offset);
        args.push(value.value);
        offset = value.nextOffset;
        break;
      }
      case "T":
        args.push(true);
        break;
      case "F":
        args.push(false);
        break;
      default:
        throw new Error(`Unsupported OSC type tag "${typeTag}".`);
    }
  }

  return {
    address: address.value,
    args
  };
}

export class OscClient {
  private static readonly DEFAULT_THROTTLE_MS = 250;
  private readonly host: string;
  private readonly port: number;
  private readonly localPort?: number;
  private readonly throttledSendStates = new Map<string, ThrottledOscSendState>();
  private socket: dgram.Socket | undefined;

  public constructor(options: OscClientOptions) {
    this.host = options.host;
    this.port = options.port;
    this.localPort = options.localPort;
  }

  public get connected(): boolean {
    return this.socket !== undefined;
  }

  public async connect(): Promise<void> {
    if (this.socket) {
      return;
    }

    const socket = dgram.createSocket("udp4");

    await new Promise<void>((resolve, reject) => {
      socket.once("error", reject);
      socket.bind(this.localPort ?? 0, () => {
        socket.off("error", reject);
        resolve();
      });
    });

    this.socket = socket;
  }

  public async close(): Promise<void> {
    this.clearThrottledSendStates();

    if (!this.socket) {
      return;
    }

    const socket = this.socket;
    this.socket = undefined;

    await new Promise<void>((resolve, reject) => {
      const onClose = (): void => {
        socket.off("error", onError);
        resolve();
      };

      const onError = (error: Error): void => {
        socket.off("close", onClose);
        reject(error);
      };

      socket.once("close", onClose);
      socket.once("error", onError);
      socket.close();
    });
  }

  public async send(address: string, ...args: OscArgument[]): Promise<void> {
    const socket = await this.getSocket();
    const message = encodeOscMessage({ address, args });

    await new Promise<void>((resolve, reject) => {
      socket.send(message, this.port, this.host, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  public async sendThrottled(
    address: string,
    argsOrOptions: OscArgument | OscThrottleOptions,
    ...remainingArgs: OscArgument[]
  ): Promise<void> {
    const { args, intervalMs } = this.normalizeThrottledSendArguments(argsOrOptions, remainingArgs);
    const state = this.getThrottledSendState(address);
    const now = Date.now();

    if (state.lastSentAt === undefined || now - state.lastSentAt >= intervalMs) {
      state.lastSentAt = now;
      void this.send(address, ...args).catch(() => {});
      return;
    }

    state.pendingArgs = args;

    if (state.timer) {
      return;
    }

    const delayMs = Math.max(intervalMs - (now - state.lastSentAt), 0);
    state.timer = setTimeout(() => {
      state.timer = undefined;

      const pendingArgs = state.pendingArgs;
      state.pendingArgs = undefined;

      if (!pendingArgs) {
        this.pruneThrottledSendState(address, state);
        return;
      }

      state.lastSentAt = Date.now();
      void this.send(address, ...pendingArgs)
        .catch(() => {})
        .finally(() => {
          this.pruneThrottledSendState(address, state);
        });
    }, delayMs);
  }

  public async probe(address: string, args: OscArgument[] = [], timeoutMs = 1000): Promise<OscResponse[]> {
    const socket = await this.getSocket();
    const responses: OscResponse[] = [];

    const onMessage = (buffer: Buffer, remote: dgram.RemoteInfo): void => {
      try {
        const message = decodeOscMessage(buffer);
        responses.push({
          ...message,
          remoteAddress: remote.address,
          remotePort: remote.port
        });
      } catch {
        // Ignore packets that are not decodable as plain OSC messages.
      }
    };

    socket.on("message", onMessage);

    try {
      await this.send(address, ...args);
      await new Promise<void>((resolve) => {
        setTimeout(resolve, timeoutMs);
      });
    } finally {
      socket.off("message", onMessage);
    }

    return responses;
  }

  private async getSocket(): Promise<dgram.Socket> {
    await this.connect();

    if (!this.socket) {
      throw new Error("OSC socket is not available.");
    }

    return this.socket;
  }

  private getThrottledSendState(address: string): ThrottledOscSendState {
    const existingState = this.throttledSendStates.get(address);

    if (existingState) {
      return existingState;
    }

    const newState: ThrottledOscSendState = {
      lastSentAt: undefined,
      pendingArgs: undefined,
      timer: undefined
    };

    this.throttledSendStates.set(address, newState);
    return newState;
  }

  private pruneThrottledSendState(address: string, state: ThrottledOscSendState): void {
    if (state.timer || state.pendingArgs) {
      return;
    }

    this.throttledSendStates.delete(address);
  }

  private clearThrottledSendStates(): void {
    for (const state of this.throttledSendStates.values()) {
      if (state.timer) {
        clearTimeout(state.timer);
      }
    }

    this.throttledSendStates.clear();
  }

  private normalizeThrottledSendArguments(
    argsOrOptions: OscArgument | OscThrottleOptions,
    remainingArgs: OscArgument[]
  ): { args: OscArgument[]; intervalMs: number } {
    if (this.isOscThrottleOptions(argsOrOptions)) {
      return {
        args: remainingArgs,
        intervalMs: argsOrOptions.intervalMs ?? OscClient.DEFAULT_THROTTLE_MS
      };
    }

    return {
      args: [argsOrOptions, ...remainingArgs],
      intervalMs: OscClient.DEFAULT_THROTTLE_MS
    };
  }

  private isOscThrottleOptions(value: OscArgument | OscThrottleOptions): value is OscThrottleOptions {
    return typeof value === "object" && value !== null && "intervalMs" in value;
  }
}
