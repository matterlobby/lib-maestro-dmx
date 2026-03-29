import { isRecord, normalizeArray, toOptionalNumber, toOptionalString } from "../internal/normalize.js";
import { HttpClient } from "../transport/http.js";
import { ReadApi } from "./read-api.js";
import { normalizeSlotState, selectSlotByParamGroup, type SlotState } from "./shared.js";

/** One cue in a MaestroDMX show. */
export interface ShowCue {
  uuid?: string;
  name?: string;
  duration?: number;
  transition: Record<string, unknown>;
  primary: SlotState;
  secondary: SlotState;
  tertiary: SlotState;
  quaternary: SlotState;
}

/** Snapshot of the currently loaded MaestroDMX show definition. */
export interface ShowState {
  id?: string;
  name?: string;
  description?: string;
  defaultDuration?: number;
  defaultInTransitionDuration?: number;
  defaultOutTransitionDuration?: number;
  cues: ShowCue[];
  color: Record<string, unknown>;
  fx: Record<string, unknown>;
  fetchedAt: Date;
}

interface ShowApiResponse {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  patternCue?: unknown;
  defaultDuration?: unknown;
  defaultInTransitionDuration?: unknown;
  defaultOutTransitionDuration?: unknown;
  color?: unknown;
  fx?: unknown;
}

function normalizeShowCue(value: unknown): ShowCue | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    uuid: toOptionalString(value.uuid),
    name: toOptionalString(value.name),
    duration: toOptionalNumber(value.duration),
    transition: isRecord(value.transition) ? value.transition : {},
    primary: normalizeSlotState(value.params),
    secondary: normalizeSlotState(value.secondaryParams),
    tertiary: normalizeSlotState(value.tertiaryParams),
    quaternary: normalizeSlotState(value.quaternaryParams)
  };
}

/** Reader for `/api/v1/show`. */
export class ShowApi extends ReadApi<ShowState, ShowApiResponse> {
  public constructor(httpClient: HttpClient) {
    super(httpClient);
  }

  protected getPath(): string {
    return "/api/v1/show";
  }

  protected normalizeResponse(response: ShowApiResponse, fetchedAt: Date): ShowState {
    return {
      id: toOptionalString(response.id),
      name: toOptionalString(response.name),
      description: toOptionalString(response.description),
      defaultDuration: toOptionalNumber(response.defaultDuration),
      defaultInTransitionDuration: toOptionalNumber(response.defaultInTransitionDuration),
      defaultOutTransitionDuration: toOptionalNumber(response.defaultOutTransitionDuration),
      cues: normalizeArray(response.patternCue, normalizeShowCue),
      color: isRecord(response.color) ? response.color : {},
      fx: isRecord(response.fx) ? response.fx : {},
      fetchedAt
    };
  }

  /** Returns a cue by zero-based array index. */
  public getCueByIndex(index: number, snapshot?: ShowState): ShowCue | undefined {
    const resolvedSnapshot = this.resolveSnapshot(snapshot);

    if (!resolvedSnapshot || index < 0) {
      return undefined;
    }

    return resolvedSnapshot.cues[index];
  }

  /** Finds a cue by its display name. */
  public findCueByName(name: string, snapshot?: ShowState): ShowCue | undefined {
    return this.resolveSnapshot(snapshot)?.cues.find((cue) => cue.name === name);
  }

  /** Returns one cue slot for one fixture group. */
  public getCueSlot(index: number, paramGroup: string | number, snapshot?: ShowState): SlotState | undefined {
    const cue = this.getCueByIndex(index, snapshot);

    if (!cue) {
      return undefined;
    }

    return selectSlotByParamGroup(cue, paramGroup);
  }
}
