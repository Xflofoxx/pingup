import { encode, decode, DecodeOptions, EncoderOptions } from "@msgpack/msgpack";

export const MAGIC_BYTE = 0x50;
export const PROTOCOL_VERSION = 0x01;
export const COMPRESSION_THRESHOLD = 1024;

export enum MessageType {
  METRICS = 0x01,
  COMMAND = 0x02,
  COMMAND_RESULT = 0x03,
  CONFIG_REQUEST = 0x04,
  CONFIG_RESPONSE = 0x05,
  DISCOVERY = 0x06,
  HEALTH_CHECK = 0x07,
  ACK = 0x08,
}

export enum Flags {
  NONE = 0x00,
  COMPRESSED = 0x01,
  ENCRYPTED = 0x02,
  HAS_SIGNATURE = 0x04,
  KEEPALIVE = 0x08,
}

export interface BinaryMessage {
  magic: number;
  version: number;
  type: MessageType;
  flags: Flags;
  payloadLength: number;
  payload: Uint8Array;
  checksum: number;
}

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  const table = getCrc32Table();
  
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  
  return (crc ^ 0xffffffff) >>> 0;
}

function getCrc32Table(): number[] {
  const table: number[] = [];
  
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  
  return table;
}

export async function gzipCompress(data: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  writer.write(data);
  await writer.close();
  
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  const result = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return result;
}

export async function gzipDecompress(data: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  writer.write(data);
  await writer.close();
  
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  const result = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return result;
}

export function encodeMessage(
  type: MessageType,
  payload: Record<string, unknown>,
  flags: Flags = Flags.NONE
): Uint8Array {
  const encodedPayload = encode(payload) as Uint8Array;
  let finalPayload = encodedPayload;
  let finalFlags = flags;
  
  if (encodedPayload.length > COMPRESSION_THRESHOLD) {
    finalPayload = gzipCompressSync(encodedPayload);
    finalFlags |= Flags.COMPRESSED;
  }
  
  const header = new Uint8Array([
    MAGIC_BYTE,
    PROTOCOL_VERSION,
    type,
    finalFlags,
  ]);
  
  const lengthBuffer = new Uint8Array(4);
  const view = new DataView(lengthBuffer.buffer);
  view.setUint32(0, finalPayload.length, false);
  
  const messageData = new Uint8Array(header.length + lengthBuffer.length + finalPayload.length);
  messageData.set(header, 0);
  messageData.set(lengthBuffer, header.length);
  messageData.set(finalPayload, header.length + lengthBuffer.length);
  
  const checksum = crc32(messageData);
  const checksumBuffer = new Uint8Array(4);
  const checksumView = new DataView(checksumBuffer.buffer);
  checksumView.setUint32(0, checksum, false);
  
  const result = new Uint8Array(messageData.length + 4);
  result.set(messageData, 0);
  result.set(checksumBuffer, messageData.length);
  
  return result;
}

function gzipCompressSync(data: Uint8Array): Uint8Array {
  const deflated: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    deflated.push(data[i]);
  }
  
  return new Uint8Array(deflated);
}

export function decodeMessage(data: Uint8Array): {
  type: MessageType;
  flags: Flags;
  payload: Record<string, unknown>;
} {
  if (data.length < 12) {
    throw new Error("Message too short");
  }
  
  const header = data.slice(0, 4);
  const magic = header[0];
  const version = header[1];
  const type = header[2] as MessageType;
  const flags = header[3] as Flags;
  
  if (magic !== MAGIC_BYTE) {
    throw new Error(`Invalid magic byte: ${magic}`);
  }
  
  if (version !== PROTOCOL_VERSION) {
    throw new Error(`Unsupported protocol version: ${version}`);
  }
  
  const providedChecksum = new DataView(data.slice(data.length - 4, data.length).buffer).getUint32(0, false);
  const messageData = data.slice(0, data.length - 4);
  const calculatedChecksum = crc32(messageData);
  
  if (providedChecksum !== calculatedChecksum) {
    throw new Error(`Checksum mismatch: ${providedChecksum} != ${calculatedChecksum}`);
  }
  
  const lengthView = new DataView(data.slice(4, 8).buffer);
  const payloadLength = lengthView.getUint32(0, false);
  let payload = data.slice(8, 8 + payloadLength);
  
  if (flags & Flags.COMPRESSED) {
    payload = gzipDecompressSync(payload);
  }
  
  const decoded = decode(new Uint8Array(payload)) as Record<string, unknown>;
  
  return { type, flags, payload: decoded };
}

function gzipDecompressSync(data: Uint8Array): Uint8Array {
  return data;
}

export function createMetricsPayload(
  agentId: string,
  timestamp: number,
  metrics: Record<string, unknown>,
  status: string,
  signature?: string
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    a: agentId,
    t: timestamp,
    m: metrics,
    s: status,
  };
  
  if (signature) {
    payload.sig = signature;
  }
  
  return payload;
}

export function createCommandPayload(
  commandId: string,
  action: string,
  params: Record<string, unknown>,
  timestamp: number,
  signature: string
): Record<string, unknown> {
  return {
    id: commandId,
    a: action,
    p: params,
    ts: timestamp,
    sig: signature,
  };
}

export function createCommandResultPayload(
  commandId: string,
  result: Record<string, unknown>,
  status: string,
  timestamp: number
): Record<string, unknown> {
  return {
    id: commandId,
    r: result,
    st: status,
    ts: timestamp,
  };
}

export function createDiscoveryPayload(
  agentId: string,
  timestamp: number,
  devices: Record<string, unknown>[]
): Record<string, unknown> {
  return {
    a: agentId,
    t: timestamp,
    d: devices,
  };
}

export function parseMetricsPayload(payload: Record<string, unknown>): {
  agentId: string;
  timestamp: number;
  metrics: Record<string, unknown>;
  status: string;
  signature?: string;
} {
  return {
    agentId: payload.a as string,
    timestamp: payload.t as number,
    metrics: payload.m as Record<string, unknown>,
    status: payload.s as string,
    signature: payload.sig as string | undefined,
  };
}

export function parseCommandPayload(payload: Record<string, unknown>): {
  commandId: string;
  action: string;
  params: Record<string, unknown>;
  timestamp: number;
  signature: string;
} {
  return {
    commandId: payload.id as string,
    action: payload.a as string,
    params: payload.p as Record<string, unknown>,
    timestamp: payload.ts as number,
    signature: payload.sig as string,
  };
}

export function parseCommandResultPayload(payload: Record<string, unknown>): {
  commandId: string;
  result: Record<string, unknown>;
  status: string;
  timestamp: number;
} {
  return {
    commandId: payload.id as string,
    result: payload.r as Record<string, unknown>,
    status: payload.st as string,
    timestamp: payload.ts as number,
  };
}

export function parseDiscoveryPayload(payload: Record<string, unknown>): {
  agentId: string;
  timestamp: number;
  devices: Record<string, unknown>[];
} {
  return {
    agentId: payload.a as string,
    timestamp: payload.t as number,
    devices: payload.d as Record<string, unknown>[],
  };
}

export function createConfigRequestPayload(agentId: string): Record<string, unknown> {
  return {
    a: agentId,
  };
}

export function parseConfigResponsePayload(payload: Record<string, unknown>): {
  config: Record<string, unknown>;
} {
  return {
    config: payload.cfg as Record<string, unknown>,
  };
}
