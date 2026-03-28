import { oscFloat, OscClient } from "../transport/osc.js";

export type LiveGroup = 1 | 2 | 3 | 4;

function assertLiveGroup(group: LiveGroup): void {
  if (!Number.isInteger(group) || group < 1 || group > 4) {
    throw new RangeError("Live group must be an integer between 1 and 4.");
  }
}

function assertUnitInterval(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be a finite number between 0 and 1.`);
  }
}

function assertInteger(name: string, value: number, minimum = 0): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${name} must be an integer greater than or equal to ${minimum}.`);
  }
}

function assertString(name: string, value: string): void {
  if (value.trim().length === 0) {
    throw new RangeError(`${name} must not be empty.`);
  }
}

class GlobalControlApi {
  private readonly oscClient: OscClient;

  public constructor(oscClient: OscClient) {
    this.oscClient = oscClient;
  }

  public async setBrightness(value: number): Promise<void> {
    assertUnitInterval("Global brightness", value);
    await this.oscClient.sendThrottled("/global/brightness", { intervalMs: 300 }, oscFloat(value));
  }
}

class AudioControlApi {
  private readonly oscClient: OscClient;

  public constructor(oscClient: OscClient) {
    this.oscClient = oscClient;
  }

  public async setInput(name: string): Promise<void> {
    assertString("Audio input name", name);
    await this.oscClient.send("/audio/input", name);
  }

  public async nextInput(): Promise<void> {
    await this.oscClient.send("/audio/input/next");
  }
}

class LiveControlApi {
  private readonly oscClient: OscClient;

  public constructor(oscClient: OscClient) {
    this.oscClient = oscClient;
  }

  public async pause(): Promise<void> {
    await this.oscClient.send("/live/pause");
  }

  public async resume(): Promise<void> {
    await this.oscClient.send("/live/resume");
  }

  public async stop(): Promise<void> {
    await this.oscClient.send("/live/stop");
  }
}

class LiveGroupControlApi {
  private readonly oscClient: OscClient;
  private readonly group: LiveGroup;

  public constructor(oscClient: OscClient, group: LiveGroup) {
    assertLiveGroup(group);
    this.oscClient = oscClient;
    this.group = group;
  }

  public async setPattern(name: string): Promise<void> {
    assertString("Pattern name", name);
    await this.oscClient.send(this.address("pattern"), name);
  }

  public async setPatternIndex(index: number): Promise<void> {
    assertInteger("Pattern index", index);
    await this.oscClient.send(this.address("pattern/index"), index);
  }

  public async setPalette(id: number): Promise<void> {
    assertInteger("Palette id", id);
    await this.oscClient.send(this.address("palette"), id);
  }

  public async setPaletteIndex(index: number): Promise<void> {
    assertInteger("Palette index", index);
    await this.oscClient.send(this.address("palette/index"), index);
  }

  public async setFxPaletteIndex(index: number): Promise<void> {
    assertInteger("FX palette index", index);
    await this.oscClient.send(this.address("fx/index"), index);
  }

  public async setBrightness(value: number): Promise<void> {
    assertUnitInterval("Brightness", value);
    await this.oscClient.sendThrottled(this.address("brightness"), { intervalMs: 500 }, oscFloat(value));
  }

  public async setExcitement(value: number): Promise<void> {
    assertUnitInterval("Excitement", value);
    await this.oscClient.sendThrottled(this.address("excitement"), oscFloat(value));
  }

  public async setBackground(value: number): Promise<void> {
    assertUnitInterval("Background", value);
    await this.oscClient.sendThrottled(this.address("background"), oscFloat(value));
  }

  public async setMotionRange(value: number): Promise<void> {
    assertUnitInterval("Motion range", value);
    await this.oscClient.sendThrottled(this.address("motion/range"), oscFloat(value));
  }

  public async setMotionSpeed(value: number): Promise<void> {
    assertUnitInterval("Motion speed", value);
    await this.oscClient.sendThrottled(this.address("motion/speed"), oscFloat(value));
  }

  public async setSpeed(value: number): Promise<void> {
    assertUnitInterval("Speed", value);
    await this.oscClient.sendThrottled(this.address("speed"), oscFloat(value));
  }

  public async setEnergy(value: number): Promise<void> {
    assertUnitInterval("Energy", value);
    await this.oscClient.sendThrottled(this.address("energy"), oscFloat(value));
  }

  public async setVariance(value: number): Promise<void> {
    assertUnitInterval("Variance", value);
    await this.oscClient.sendThrottled(this.address("variance"), oscFloat(value));
  }

  public async setDecay(value: number): Promise<void> {
    assertUnitInterval("Decay", value);
    await this.oscClient.sendThrottled(this.address("decay"), oscFloat(value));
  }

  public async setAttack(value: number): Promise<void> {
    assertUnitInterval("Attack", value);
    await this.oscClient.sendThrottled(this.address("attack"), oscFloat(value));
  }

  public async setShape(value: number): Promise<void> {
    if (!Number.isInteger(value) || value < 0 || value > 15) {
      throw new RangeError("Shape must be an integer between 0 and 15.");
    }

    await this.oscClient.send(this.address("shape"), value);
  }

  private address(suffix: string): string {
    return `/live/${this.group}/${suffix}`;
  }
}

class ShowControlApi {
  private readonly oscClient: OscClient;

  public constructor(oscClient: OscClient) {
    this.oscClient = oscClient;
  }

  public async loadByName(name: string): Promise<void> {
    assertString("Show name", name);
    await this.oscClient.send("/show/name", name);
  }

  public async next(): Promise<void> {
    await this.oscClient.send("/show/next");
  }

  public async previous(): Promise<void> {
    await this.oscClient.send("/show/previous");
  }

  public async loadByIndex(index: number): Promise<void> {
    assertInteger("Show index", index);
    await this.oscClient.send("/show/index", index);
  }

  public async loadCueByIndex(index: number): Promise<void> {
    assertInteger("Cue index", index, 1);
    await this.oscClient.send("/show/cue/index", index);
  }

  public async nextCue(): Promise<void> {
    await this.oscClient.send("/show/cue/next");
  }

  public async previousCue(): Promise<void> {
    await this.oscClient.send("/show/cue/previous");
  }

  public async playPause(): Promise<void> {
    await this.oscClient.send("/show/play_pause");
  }

  public async play(): Promise<void> {
    await this.oscClient.send("/show/play");
  }

  public async stop(): Promise<void> {
    await this.oscClient.send("/show/stop");
  }
}

class TriggerControlApi {
  private readonly oscClient: OscClient;

  public constructor(oscClient: OscClient) {
    this.oscClient = oscClient;
  }

  public async setStrobe(enabled: boolean): Promise<void> {
    await this.oscClient.send("/triggers/strobe", enabled);
  }

  public async toggleStrobe(): Promise<void> {
    await this.oscClient.send("/triggers/strobe/toggle");
  }

  public async setStrobeBrightness(value: number): Promise<void> {
    assertUnitInterval("Strobe brightness", value);
    await this.oscClient.send("/triggers/strobe/brightness", oscFloat(value));
  }

  public async setStrobeRate(value: number): Promise<void> {
    assertUnitInterval("Strobe rate", value);
    await this.oscClient.send("/triggers/strobe/rate", oscFloat(value));
  }

  public async setBlinder(enabled: boolean): Promise<void> {
    await this.oscClient.send("/triggers/blinder", enabled);
  }

  public async toggleBlinder(): Promise<void> {
    await this.oscClient.send("/triggers/blinder/toggle");
  }

  public async setBlinderBrightness(value: number): Promise<void> {
    assertUnitInterval("Blinder brightness", value);
    await this.oscClient.send("/triggers/blinder/brightness", oscFloat(value));
  }

  public async setBlackout(enabled: boolean): Promise<void> {
    await this.oscClient.send("/triggers/blackout", enabled);
  }

  public async toggleBlackout(): Promise<void> {
    await this.oscClient.send("/triggers/blackout/toggle");
  }

  public async setFog(enabled: boolean): Promise<void> {
    await this.oscClient.send("/triggers/fog", enabled);
  }

  public async toggleFog(): Promise<void> {
    await this.oscClient.send("/triggers/fog/toggle");
  }

  public async setFogInterval(value: number): Promise<void> {
    assertUnitInterval("Fog interval", value);
    await this.oscClient.send("/triggers/fog/interval", oscFloat(value));
  }

  public async setFogDuration(value: number): Promise<void> {
    assertUnitInterval("Fog duration", value);
    await this.oscClient.send("/triggers/fog/duration", oscFloat(value));
  }

  public async setFogVolume(value: number): Promise<void> {
    assertUnitInterval("Fog volume", value);
    await this.oscClient.send("/triggers/fog/volume", oscFloat(value));
  }

  public async setFogSpeed(value: number): Promise<void> {
    assertUnitInterval("Fog speed", value);
    await this.oscClient.send("/triggers/fog/speed", oscFloat(value));
  }

  public async setEffect(enabled: boolean): Promise<void> {
    await this.oscClient.send("/triggers/effect", enabled);
  }

  public async toggleEffect(): Promise<void> {
    await this.oscClient.send("/triggers/effect/toggle");
  }
}

export interface MaestroOscControlApi {
  global: GlobalControlApi;
  audio: AudioControlApi;
  live: LiveControlApi;
  show: ShowControlApi;
  triggers: TriggerControlApi;
  group(group: LiveGroup): LiveGroupControlApi;
}

export class MaestroOscControlApiImpl implements MaestroOscControlApi {
  public readonly global: GlobalControlApi;
  public readonly audio: AudioControlApi;
  public readonly live: LiveControlApi;
  public readonly show: ShowControlApi;
  public readonly triggers: TriggerControlApi;
  private readonly oscClient: OscClient;

  public constructor(oscClient: OscClient) {
    this.oscClient = oscClient;
    this.global = new GlobalControlApi(oscClient);
    this.audio = new AudioControlApi(oscClient);
    this.live = new LiveControlApi(oscClient);
    this.show = new ShowControlApi(oscClient);
    this.triggers = new TriggerControlApi(oscClient);
  }

  public group(group: LiveGroup): LiveGroupControlApi {
    return new LiveGroupControlApi(this.oscClient, group);
  }
}
