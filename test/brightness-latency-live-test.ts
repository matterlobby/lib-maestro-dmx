import { performance } from "node:perf_hooks";

import { createClient, HttpClient, oscFloat, type LiveSlotState, type LiveState } from "../src/index.js";

const LIVE_TEST_HOST = "maestro.local";
const LIVE_TEST_GROUPS = [1, 2] as const;
const LIVE_TEST_DURATION_MS = 2_000;
const LIVE_TEST_STEPS = 21;
const POLL_INTERVAL_MS = 25;
const POST_RUN_SETTLE_MS = 8_000;
const BETWEEN_RUNS_PAUSE_MS = 3_000;
const PRE_RAMP_ZERO_SETTLE_MS = 2_000;
const VISIBILITY_TOLERANCE = 0.035;
const HTTP_PATH = "/api/v1/live";

type TransportName = "osc" | "http";
type LiveGroup = (typeof LIVE_TEST_GROUPS)[number];

interface LivePutParams {
  patternId: string;
  paletteId: string;
  brightness: number;
  background: number;
  intensity: number;
  motion: number;
  speed: number;
  energy: number;
  variance: number;
  attack: number;
  decay: number;
  motionSpeed: number;
  blackout: boolean;
  allowBlackout: boolean;
  allowBlinder: boolean;
  allowStrobe: boolean;
  allowFog: boolean;
  allowEffect: boolean;
  blackoutOnSilence: boolean;
}

interface LatencySample {
  group: LiveGroup;
  targetBrightness: number;
  sentAtMs: number;
  visibleAtMs?: number;
  latencyMs?: number;
}

interface TransportResult {
  transport: TransportName;
  samples: LatencySample[];
  observations: BrightnessObservation[];
}

interface LivePutPayload {
  params: LivePutParams;
  secondaryParams: LivePutParams;
}

interface BrightnessSnapshot {
  1: number | undefined;
  2: number | undefined;
}

interface BrightnessObservation {
  atMs: number;
  values: BrightnessSnapshot;
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function clampUnitInterval(value: number): number {
  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

function roundBrightness(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function toWritableParams(slot: LiveSlotState): LivePutParams {
  return {
    patternId: slot.patternId ?? "Ambient",
    paletteId: slot.paletteId ?? "218",
    brightness: clampUnitInterval(slot.brightness ?? 0),
    background: clampUnitInterval(slot.background ?? 0.5),
    intensity: clampUnitInterval(slot.intensity ?? slot.excitement ?? 0.5),
    motion: clampUnitInterval(slot.motion ?? 1),
    speed: clampUnitInterval(slot.speed ?? 0.5),
    energy: clampUnitInterval(slot.energy ?? 0.5),
    variance: clampUnitInterval(slot.variance ?? 0.5),
    attack: clampUnitInterval(slot.attack ?? 0.5),
    decay: clampUnitInterval(slot.decay ?? 0.5),
    motionSpeed: clampUnitInterval(slot.motionSpeed ?? 0.5),
    blackout: slot.blackout ?? false,
    allowBlackout: true,
    allowBlinder: true,
    allowStrobe: true,
    allowFog: true,
    allowEffect: true,
    blackoutOnSilence: slot.blackoutOnSilence ?? false
  };
}

function formatMs(value: number): string {
  return `${value.toFixed(1)} ms`;
}

function selectSlotState(state: LiveState, group: LiveGroup): LiveSlotState {
  return group === 1 ? state.primary : state.secondary;
}

function percentile(sortedValues: number[], ratio: number): number {
  if (sortedValues.length === 0) {
    return Number.NaN;
  }

  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(sortedValues.length * ratio) - 1));
  return sortedValues[index];
}

function summarizeLatencies(samples: LatencySample[]): {
  count: number;
  matched: number;
  minMs: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
} {
  const values = samples
    .map((sample) => sample.latencyMs)
    .filter((value): value is number => value !== undefined)
    .sort((left, right) => left - right);

  return {
    count: samples.length,
    matched: values.length,
    minMs: values[0] ?? Number.NaN,
    medianMs: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
    maxMs: values[values.length - 1] ?? Number.NaN
  };
}

function printResult(result: TransportResult): void {
  console.log(`\n${result.transport.toUpperCase()} results`);

  for (const group of LIVE_TEST_GROUPS) {
    const groupSamples = result.samples.filter((sample) => sample.group === group);
    const summary = summarizeLatencies(groupSamples);
    const observedValues = result.observations
      .map((observation) => observation.values[group])
      .filter((value): value is number => value !== undefined);
    const maxObserved = observedValues.length > 0 ? Math.max(...observedValues) : Number.NaN;
    const finalObserved = observedValues.length > 0 ? observedValues[observedValues.length - 1] : Number.NaN;

    console.log(
      `group ${group}: matched ${summary.matched}/${summary.count}, min ${formatMs(summary.minMs)}, median ${formatMs(summary.medianMs)}, p95 ${formatMs(summary.p95Ms)}, max ${formatMs(summary.maxMs)}`
    );
    console.log(`group ${group}: max observed brightness=${maxObserved.toFixed(3)}, final observed brightness=${finalObserved.toFixed(3)}`);

    for (const sample of groupSamples) {
      const latency = sample.latencyMs === undefined ? "not observed" : formatMs(sample.latencyMs);
      console.log(`group=${sample.group} brightness=${sample.targetBrightness.toFixed(3)} -> ${latency}`);
    }
  }
}

async function waitForVisibility(
  pollBrightness: () => Promise<BrightnessSnapshot>,
  samples: LatencySample[],
  experimentStartMs: number,
  observations: BrightnessObservation[]
): Promise<void> {
  const deadline = performance.now() + LIVE_TEST_DURATION_MS + POST_RUN_SETTLE_MS;

  while (performance.now() < deadline) {
    const visibleBrightnessByGroup = await pollBrightness();
    const now = performance.now();
    observations.push({
      atMs: now - experimentStartMs,
      values: visibleBrightnessByGroup
    });

    for (const sample of samples) {
      if (sample.latencyMs !== undefined) {
        continue;
      }

      if (now - experimentStartMs < sample.sentAtMs) {
        continue;
      }

      const visibleBrightness = visibleBrightnessByGroup[sample.group];
      if (visibleBrightness === undefined) {
        continue;
      }

      if (visibleBrightness >= sample.targetBrightness - VISIBILITY_TOLERANCE) {
        sample.visibleAtMs = now - experimentStartMs;
        sample.latencyMs = sample.visibleAtMs - sample.sentAtMs;
      }
    }

    const pendingCount = samples.filter((sample) => sample.latencyMs === undefined).length;

    if (samples.length > 0 && pendingCount === 0) {
      return;
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

async function runOscRamp(
  sendBrightness: (value: number) => Promise<void>,
  pollBrightness: () => Promise<BrightnessSnapshot>
): Promise<TransportResult> {
  const samples: LatencySample[] = [];
  const observations: BrightnessObservation[] = [];

  console.log(
    `Setting brightness to 0.000 on groups ${LIVE_TEST_GROUPS.join(", ")} and waiting ${PRE_RAMP_ZERO_SETTLE_MS} ms before the OSC ramp...`
  );
  await sendBrightness(0);
  await sleep(PRE_RAMP_ZERO_SETTLE_MS);

  const startMs = performance.now();
  const visibilityPromise = waitForVisibility(pollBrightness, samples, startMs, observations);

  for (let index = 1; index < LIVE_TEST_STEPS; index += 1) {
    const targetBrightness = roundBrightness(index / (LIVE_TEST_STEPS - 1));
    const targetOffsetMs = (LIVE_TEST_DURATION_MS * index) / (LIVE_TEST_STEPS - 1);
    const waitMs = startMs + targetOffsetMs - performance.now();

    if (waitMs > 0) {
      await sleep(waitMs);
    }

    await sendBrightness(targetBrightness);
    const sentAtMs = performance.now() - startMs;

    for (const group of LIVE_TEST_GROUPS) {
      samples.push({
        group,
        targetBrightness,
        sentAtMs
      });
    }
  }

  await visibilityPromise;
  return { transport: "osc", samples, observations };
}

async function runHttpRamp(
  sendBrightness: (value: number) => Promise<void>,
  pollBrightness: () => Promise<BrightnessSnapshot>
): Promise<TransportResult> {
  const samples: LatencySample[] = [];
  const observations: BrightnessObservation[] = [];

  console.log(
    `Setting brightness to 0.000 on groups ${LIVE_TEST_GROUPS.join(", ")} and waiting ${PRE_RAMP_ZERO_SETTLE_MS} ms before the HTTP PUT ramp...`
  );
  await sendBrightness(0);
  await sleep(PRE_RAMP_ZERO_SETTLE_MS);

  const startMs = performance.now();
  const visibilityPromise = waitForVisibility(pollBrightness, samples, startMs, observations);

  for (let index = 1; index < LIVE_TEST_STEPS; index += 1) {
    const targetBrightness = roundBrightness(index / (LIVE_TEST_STEPS - 1));
    const targetOffsetMs = (LIVE_TEST_DURATION_MS * index) / (LIVE_TEST_STEPS - 1);
    const waitMs = startMs + targetOffsetMs - performance.now();

    if (waitMs > 0) {
      await sleep(waitMs);
    }

    await sendBrightness(targetBrightness);
    const sentAtMs = performance.now() - startMs;

    for (const group of LIVE_TEST_GROUPS) {
      samples.push({
        group,
        targetBrightness,
        sentAtMs
      });
    }
  }

  await visibilityPromise;
  return { transport: "http", samples, observations };
}

async function main(): Promise<void> {
  const client = createClient({ host: LIVE_TEST_HOST });
  const httpClient = new HttpClient({ host: LIVE_TEST_HOST });

  console.log(
    `Running brightness latency experiment against ${LIVE_TEST_HOST} on groups ${LIVE_TEST_GROUPS.join(" and ")}.`
  );
  console.log(`Ramp duration: ${LIVE_TEST_DURATION_MS} ms, steps: ${LIVE_TEST_STEPS}, poll interval: ${POLL_INTERVAL_MS} ms.`);
  console.log("This experiment mutates the live state on the real device.");

  try {
    const initialState = await client.live.read();
    const basePayload: LivePutPayload = {
      params: toWritableParams(initialState.primary),
      secondaryParams: toWritableParams(initialState.secondary)
    };

    console.log("Initial writable payload:", basePayload);

    const pollBrightness = async (): Promise<BrightnessSnapshot> => {
      const liveState = await client.live.read();

      return {
        1: selectSlotState(liveState, 1).brightness,
        2: selectSlotState(liveState, 2).brightness
      };
    };

    const sendOscBrightness = async (brightness: number): Promise<void> => {
      await Promise.all(
        LIVE_TEST_GROUPS.map((group) => client.osc.send(`/live/${group}/brightness`, oscFloat(brightness)))
      );
    };

    const sendHttpBrightness = async (brightness: number): Promise<void> => {
      await httpClient.putJson(HTTP_PATH, {
        params: {
          ...basePayload.params,
          brightness
        },
        secondaryParams: {
          ...basePayload.secondaryParams,
          brightness
        }
      });
    };

    console.log("\nRunning OSC ramp...");
    const oscResult = await runOscRamp(sendOscBrightness, pollBrightness);

    console.log(`\nWaiting ${BETWEEN_RUNS_PAUSE_MS} ms before the HTTP PUT ramp...`);
    await sleep(BETWEEN_RUNS_PAUSE_MS);

    console.log("\nRunning HTTP PUT ramp...");
    const httpResult = await runHttpRamp(sendHttpBrightness, pollBrightness);

    printResult(oscResult);
    printResult(httpResult);
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
