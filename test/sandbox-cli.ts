import { readFile } from "node:fs/promises";

import { createClient, HttpClient, oscFloat } from "../src/index.js";

const DEFAULT_HOST = "maestro.local";
const DEFAULT_PROTOCOL = "http";
const DEFAULT_LIVE_PATH = "/api/v1/live";
const DEFAULT_WATCH_INTERVAL_MS = 250;

type SupportedCommand =
  | "help"
  | "live:get"
  | "live:watch"
  | "patterns:get"
  | "osc:send"
  | "osc:brightness"
  | "http:put-live"
  | "http:set-brightness";

function printHelp(): void {
  console.log(`MaestroDMX sandbox CLI

Usage:
  npm run sandbox -- <command> [...args]

Commands:
  help
    Show this help.

  live:get
    Fetch and print /api/v1/live once.

  live:watch [intervalMs]
    Poll /api/v1/live continuously.

  patterns:get
    Fetch and print /api/v1/patterns.

  osc:send <address> [args...]
    Send one raw OSC message.
    Args use prefixes:
      f:0.5   float
      i:12    integer
      s:text  string
      b:true  boolean

  osc:brightness <group> <value>
    Shortcut for /live/<group>/brightness with an OSC float.

  http:put-live <json-or-@file>
    PUT a JSON payload to /api/v1/live.
    Example:
      npm run sandbox -- http:put-live '{"params":{"brightness":0.5}}'
      npm run sandbox -- http:put-live @payload.json

  http:set-brightness <value> [group]
    Read /api/v1/live, keep the current params, replace brightness, and PUT back.
    The optional group is currently supported only for group 1.

Environment:
  MAESTRO_HOST       default: maestro.local
  MAESTRO_PROTOCOL   default: http
`);
}

function getClientOptions() {
  return {
    host: process.env.MAESTRO_HOST ?? DEFAULT_HOST,
    protocol: (process.env.MAESTRO_PROTOCOL as "http" | "https" | undefined) ?? DEFAULT_PROTOCOL
  };
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function parseOscArgument(raw: string): boolean | number | string | ReturnType<typeof oscFloat> {
  if (raw.startsWith("f:")) {
    return oscFloat(Number(raw.slice(2)));
  }

  if (raw.startsWith("i:")) {
    return Number.parseInt(raw.slice(2), 10);
  }

  if (raw.startsWith("s:")) {
    return raw.slice(2);
  }

  if (raw.startsWith("b:")) {
    const value = raw.slice(2).toLowerCase();
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  throw new Error(`Unsupported OSC argument "${raw}". Use f:, i:, s: or b:.`);
}

async function readJsonInput(raw: string): Promise<unknown> {
  if (raw.startsWith("@")) {
    const content = await readFile(raw.slice(1), "utf8");
    return JSON.parse(content);
  }

  return JSON.parse(raw);
}

function clampUnitInterval(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Expected a finite brightness value, received "${value}".`);
  }

  if (value < 0 || value > 1) {
    throw new Error(`Expected brightness in [0, 1], received "${value}".`);
  }

  return value;
}

function ensureRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected an object payload.");
  }

  return value as Record<string, unknown>;
}

async function handleLiveGet(): Promise<void> {
  const client = createClient(getClientOptions());

  try {
    const liveState = await client.live.read();
    console.dir(liveState, { depth: null, colors: true });
  } finally {
    await client.close();
  }
}

async function handleLiveWatch(intervalMs: number): Promise<void> {
  const client = createClient(getClientOptions());

  try {
    console.log(`Watching live state every ${intervalMs} ms. Press Ctrl+C to stop.`);

    while (true) {
      const liveState = await client.live.read();
      console.log(new Date().toISOString());
      console.dir(liveState, { depth: 2, colors: true });
      await sleep(intervalMs);
    }
  } finally {
    await client.close();
  }
}

async function handlePatternsGet(): Promise<void> {
  const client = createClient(getClientOptions());

  try {
    const patterns = await client.patterns.read();
    console.dir(patterns, { depth: null, colors: true });
  } finally {
    await client.close();
  }
}

async function handleOscSend(address: string, rawArgs: string[]): Promise<void> {
  const client = createClient(getClientOptions());

  try {
    const args = rawArgs.map(parseOscArgument);
    await client.osc.send(address, ...args);
    console.log("OSC message sent.", { address, args });
  } finally {
    await client.close();
  }
}

async function handleOscBrightness(groupRaw: string, valueRaw: string): Promise<void> {
  const group = Number.parseInt(groupRaw, 10);
  const brightness = clampUnitInterval(Number(valueRaw));

  if (!Number.isInteger(group) || group < 1 || group > 4) {
    throw new Error(`Expected a group between 1 and 4, received "${groupRaw}".`);
  }

  await handleOscSend(`/live/${group}/brightness`, [`f:${brightness}`]);
}

async function handleHttpPutLive(rawPayload: string): Promise<void> {
  const httpClient = new HttpClient(getClientOptions());
  const payload = await readJsonInput(rawPayload);

  await httpClient.putJson(DEFAULT_LIVE_PATH, payload);
  console.log("HTTP PUT sent.", payload);
}

async function handleHttpSetBrightness(valueRaw: string, groupRaw?: string): Promise<void> {
  const brightness = clampUnitInterval(Number(valueRaw));
  const group = groupRaw === undefined ? 1 : Number.parseInt(groupRaw, 10);

  if (group !== 1) {
    throw new Error("http:set-brightness currently supports only group 1 because /api/v1/live writes params only.");
  }

  const client = createClient(getClientOptions());
  const httpClient = new HttpClient(getClientOptions());

  try {
    const liveState = await client.live.read();
    const params = ensureRecord({
      patternId: liveState.primary.patternId ?? "Ambient",
      paletteId: liveState.primary.paletteId ?? "218",
      brightness,
      background: liveState.primary.background ?? 0.5,
      intensity: liveState.primary.intensity ?? liveState.primary.excitement ?? 0.5,
      motion: liveState.primary.motion ?? 1,
      speed: liveState.primary.speed ?? 0.5,
      energy: liveState.primary.energy ?? 0.5,
      variance: liveState.primary.variance ?? 0.5,
      attack: liveState.primary.attack ?? 0.5,
      decay: liveState.primary.decay ?? 0.5,
      motionSpeed: liveState.primary.motionSpeed ?? 0.5,
      blackout: liveState.primary.blackout ?? false,
      allowBlackout: true,
      allowBlinder: true,
      allowStrobe: true,
      allowFog: true,
      allowEffect: true,
      blackoutOnSilence: liveState.primary.blackoutOnSilence ?? false
    });

    await httpClient.putJson(DEFAULT_LIVE_PATH, { params });
    console.log("HTTP brightness update sent.", { group, brightness, params });
  } finally {
    await client.close();
  }
}

async function main(): Promise<void> {
  const [commandRaw, ...args] = process.argv.slice(2);
  const command = (commandRaw ?? "help") as SupportedCommand;

  switch (command) {
    case "help":
      printHelp();
      return;
    case "live:get":
      await handleLiveGet();
      return;
    case "live:watch":
      await handleLiveWatch(args[0] ? Number.parseInt(args[0], 10) : DEFAULT_WATCH_INTERVAL_MS);
      return;
    case "patterns:get":
      await handlePatternsGet();
      return;
    case "osc:send":
      if (!args[0]) {
        throw new Error("Usage: osc:send <address> [args...]");
      }

      await handleOscSend(args[0], args.slice(1));
      return;
    case "osc:brightness":
      if (!args[0] || !args[1]) {
        throw new Error("Usage: osc:brightness <group> <value>");
      }

      await handleOscBrightness(args[0], args[1]);
      return;
    case "http:put-live":
      if (!args[0]) {
        throw new Error("Usage: http:put-live <json-or-@file>");
      }

      await handleHttpPutLive(args[0]);
      return;
    case "http:set-brightness":
      if (!args[0]) {
        throw new Error("Usage: http:set-brightness <value> [group]");
      }

      await handleHttpSetBrightness(args[0], args[1]);
      return;
    default:
      throw new Error(`Unknown command "${command}". Run "npm run sandbox -- help".`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
