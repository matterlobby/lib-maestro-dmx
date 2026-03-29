const DEFAULT_URL = "ws://maestro.local/notifications";
const CLOSE_TIMEOUT_MS = 1_000;

type ScalarValue =
  | { kind: "varint"; value: number }
  | { kind: "fixed32"; uint32: number; float32: number }
  | { kind: "fixed64"; bigint: bigint; double: number }
  | { kind: "length-delimited"; utf8?: string; base64: string; hex: string; nested?: ProtobufField[] };

type ProtobufField = {
  fieldNumber: number;
  wireType: number;
  value: ScalarValue;
};

type EnvelopeMessage = {
  kind: "protobuf-envelope";
  fields: ProtobufField[];
  typeUrl?: string;
  payload?: {
    base64: string;
    hex: string;
    utf8?: string;
    fields?: ProtobufField[];
  };
};

type PlainMessage = {
  kind: "text";
  text: string;
};

type BinaryMessage = {
  kind: "binary";
  base64: string;
  hex: string;
  utf8?: string;
};

type DecodedMessage = EnvelopeMessage | PlainMessage | BinaryMessage;

function isPrintableUtf8(text: string): boolean {
  return !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text);
}

function maybeUtf8(buffer: Buffer): string | undefined {
  const text = buffer.toString("utf8");
  return isPrintableUtf8(text) ? text : undefined;
}

function readVarint(buffer: Buffer, offset: number): { value: number; nextOffset: number } {
  let result = 0;
  let shift = 0;
  let index = offset;

  while (index < buffer.length) {
    const byte = buffer[index];
    result |= (byte & 0x7f) << shift;
    index += 1;

    if ((byte & 0x80) === 0) {
      return { value: result, nextOffset: index };
    }

    shift += 7;
  }

  throw new Error("Encountered an unterminated varint.");
}

function tryParseProtobuf(buffer: Buffer): ProtobufField[] | undefined {
  const fields: ProtobufField[] = [];
  let offset = 0;

  try {
    while (offset < buffer.length) {
      const tag = readVarint(buffer, offset);
      offset = tag.nextOffset;

      const fieldNumber = tag.value >> 3;
      const wireType = tag.value & 0x07;

      if (fieldNumber === 0) {
        return undefined;
      }

      if (wireType === 0) {
        const value = readVarint(buffer, offset);
        offset = value.nextOffset;
        fields.push({
          fieldNumber,
          wireType,
          value: { kind: "varint", value: value.value }
        });
        continue;
      }

      if (wireType === 2) {
        const length = readVarint(buffer, offset);
        offset = length.nextOffset;

        const endOffset = offset + length.value;
        if (endOffset > buffer.length) {
          return undefined;
        }

        const slice = buffer.subarray(offset, endOffset);
        offset = endOffset;

        const utf8 = maybeUtf8(slice);
        const nested = tryParseProtobuf(slice);
        fields.push({
          fieldNumber,
          wireType,
          value: {
            kind: "length-delimited",
            utf8,
            base64: slice.toString("base64"),
            hex: slice.toString("hex"),
            nested
          }
        });
        continue;
      }

      if (wireType === 5) {
        if (offset + 4 > buffer.length) {
          return undefined;
        }

        const uint32 = buffer.readUInt32LE(offset);
        const float32 = buffer.readFloatLE(offset);
        offset += 4;

        fields.push({
          fieldNumber,
          wireType,
          value: { kind: "fixed32", uint32, float32 }
        });
        continue;
      }

      if (wireType === 1) {
        if (offset + 8 > buffer.length) {
          return undefined;
        }

        const bigint = buffer.readBigUInt64LE(offset);
        const double = buffer.readDoubleLE(offset);
        offset += 8;

        fields.push({
          fieldNumber,
          wireType,
          value: { kind: "fixed64", bigint, double }
        });
        continue;
      }

      return undefined;
    }
  } catch {
    return undefined;
  }

  return fields;
}

function decodeBase64Payload(payload: string): DecodedMessage {
  const buffer = Buffer.from(payload, "base64");
  const fields = tryParseProtobuf(buffer);

  if (fields) {
    if (
      fields.length >= 2 &&
      fields[0]?.fieldNumber === 1 &&
      fields[0]?.value.kind === "varint" &&
      fields[1]?.fieldNumber === 2 &&
      fields[1]?.value.kind === "length-delimited" &&
      fields[1].value.nested
    ) {
      const nestedFields = fields[1].value.nested;
      const typeUrlField = nestedFields.find(
        (field) => field.fieldNumber === 1 && field.value.kind === "length-delimited"
      );
      const valueField = nestedFields.find(
        (field) => field.fieldNumber === 2 && field.value.kind === "length-delimited"
      );

      return {
        kind: "protobuf-envelope",
        fields,
        typeUrl: typeUrlField?.value.kind === "length-delimited" ? typeUrlField.value.utf8 : undefined,
        payload:
          valueField?.value.kind === "length-delimited"
            ? {
                base64: valueField.value.base64,
                hex: valueField.value.hex,
                utf8: valueField.value.utf8,
                fields: valueField.value.nested
              }
            : undefined
      };
    }

    return {
      kind: "binary",
      base64: buffer.toString("base64"),
      hex: buffer.toString("hex"),
      utf8: maybeUtf8(buffer)
    };
  }

  const utf8 = maybeUtf8(buffer);
  if (utf8) {
    return {
      kind: "text",
      text: utf8
    };
  }

  return {
    kind: "binary",
    base64: buffer.toString("base64"),
    hex: buffer.toString("hex"),
    utf8
  };
}

function normalizeTextPayload(data: string): string {
  const trimmed = data.trim();

  if (trimmed.length === 0) {
    throw new Error("Received an empty text frame.");
  }

  return trimmed;
}

async function readMessageText(data: MessageEvent["data"]): Promise<string> {
  if (typeof data === "string") {
    return normalizeTextPayload(data);
  }

  if (data instanceof ArrayBuffer) {
    return normalizeTextPayload(Buffer.from(data).toString("utf8"));
  }

  if (ArrayBuffer.isView(data)) {
    return normalizeTextPayload(Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8"));
  }

  if (data instanceof Blob) {
    return normalizeTextPayload(await data.text());
  }

  throw new Error(`Received an unsupported WebSocket message type: ${Object.prototype.toString.call(data)}.`);
}

async function main(): Promise<void> {
  const url = process.argv[2] ?? DEFAULT_URL;
  const socket = new WebSocket(url);

  console.log(`Connecting to ${url}`);

  socket.addEventListener("open", () => {
    console.log("WebSocket connected. Waiting for notifications...");
  });

  socket.addEventListener("message", async (event) => {
    try {
      const payload = await readMessageText(event.data);
      const decoded = decodeBase64Payload(payload);
      const timestamp = new Date().toISOString();

      console.log(`[${timestamp}] Received notification`);
      console.dir(decoded, { depth: null, colors: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      console.error("Failed to decode notification message:");
      console.error(message);
    }
  });

  socket.addEventListener("error", () => {
    console.error("WebSocket error.");
  });

  socket.addEventListener("close", (event) => {
    console.log(`WebSocket closed (code=${event.code}, reason=${event.reason || "n/a"}).`);
  });

  const shutdown = () => {
    if (socket.readyState === WebSocket.CLOSING || socket.readyState === WebSocket.CLOSED) {
      return;
    }

    console.log("Closing WebSocket connection...");
    socket.close();

    setTimeout(() => {
      process.exit(0);
    }, CLOSE_TIMEOUT_MS).unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
