import { createClient, type LiveState } from "../src/index.js";

const LIVE_TEST_HOST = "maestro.local";
const LIVE_TEST_GROUP = 1 as const;
const LIVE_TEST_BRIGHTNESS = 0.37;
const LIVE_TEST_EXCITEMENT = 0.63;
const LIVE_TEST_PALETTE_ID = 223;
const LIVE_TEST_PALETTE_INDEX = 1;
const LIVE_TEST_PALETTE_READBACK = "223";
const LIVE_TEST_PATTERNS = ["Solid Color", "Ambient"] as const;
const BRIGHTNESS_TOLERANCE = 0.02;
const EXCITEMENT_TOLERANCE = 0.02;
const POLL_INTERVAL_MS = 250;
const TIMEOUT_MS = 8000;

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function isWithinTolerance(actual: number | undefined, expected: number, tolerance: number): boolean {
  return actual !== undefined && Math.abs(actual - expected) <= tolerance;
}

async function waitForState(label: string, poll: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (await poll()) {
      return;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out while waiting for ${label}.`);
}

function selectGroupState(state: LiveState) {
  return state.primary;
}

async function main(): Promise<void> {
  const client = createClient({ host: LIVE_TEST_HOST });

  console.log(`Running live MaestroDMX test against ${LIVE_TEST_HOST} on group ${LIVE_TEST_GROUP}.`);

  try {
    const initialState = await client.live.read();
    const initialGroupState = selectGroupState(initialState);
    console.log("Initial live state:", {
      patternId: initialGroupState.patternId,
      paletteId: initialGroupState.paletteId,
      brightness: initialGroupState.brightness,
      excitement: initialGroupState.excitement,
      intensity: initialGroupState.intensity
    });

    await client.control.group(LIVE_TEST_GROUP).setBrightness(LIVE_TEST_BRIGHTNESS);
    await waitForState(`brightness=${LIVE_TEST_BRIGHTNESS}`, async () => {
      const liveState = await client.live.read();
      const groupState = selectGroupState(liveState);
      return isWithinTolerance(groupState.brightness, LIVE_TEST_BRIGHTNESS, BRIGHTNESS_TOLERANCE);
    });
    console.log(`Brightness readback matched ${LIVE_TEST_BRIGHTNESS}.`);

    await client.control.group(LIVE_TEST_GROUP).setExcitement(LIVE_TEST_EXCITEMENT);
    await waitForState(`excitement=${LIVE_TEST_EXCITEMENT}`, async () => {
      const liveState = await client.live.read();
      const groupState = selectGroupState(liveState);
      return isWithinTolerance(groupState.excitement, LIVE_TEST_EXCITEMENT, EXCITEMENT_TOLERANCE);
    });
    console.log(`Excitement readback matched ${LIVE_TEST_EXCITEMENT}.`);

    for (const patternName of LIVE_TEST_PATTERNS) {
      await client.control.group(LIVE_TEST_GROUP).setPattern(patternName);
      await waitForState(`pattern=${patternName}`, async () => {
        const liveState = await client.live.read();
        const groupState = selectGroupState(liveState);
        return groupState.patternId === patternName;
      });
      console.log(`Pattern readback matched ${patternName}.`);
    }

    await client.control.group(LIVE_TEST_GROUP).setPalette(LIVE_TEST_PALETTE_ID);
    await waitForState(`palette=${LIVE_TEST_PALETTE_READBACK}`, async () => {
      const liveState = await client.live.read();
      const groupState = selectGroupState(liveState);
      return groupState.paletteId === LIVE_TEST_PALETTE_READBACK;
    });
    console.log(`Palette ID readback matched ${LIVE_TEST_PALETTE_READBACK}.`);

    await client.control.group(LIVE_TEST_GROUP).setPaletteIndex(LIVE_TEST_PALETTE_INDEX);
    await waitForState(`palette index=${LIVE_TEST_PALETTE_INDEX}`, async () => {
      const liveState = await client.live.read();
      const groupState = selectGroupState(liveState);
      return groupState.paletteId === LIVE_TEST_PALETTE_READBACK;
    });
    console.log(
      `Palette index ${LIVE_TEST_PALETTE_INDEX} readback matched paletteId ${LIVE_TEST_PALETTE_READBACK}.`
    );

    console.log("Live MaestroDMX test finished successfully.");
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
