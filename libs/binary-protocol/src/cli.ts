import { encodeMessage, decodeMessage, MessageType, Flags, createMetricsPayload, parseMetricsPayload } from "./index.ts";

const command = Deno.args[0];

if (command === "encode") {
  const payload = createMetricsPayload(
    "AGENT-001",
    Date.now(),
    { cpu: 45.5, ram: 62.3, disk: 78.1 },
    "online"
  );
  
  const encoded = encodeMessage(MessageType.METRICS, payload);
  console.log("Encoded:", Buffer.from(encoded).toString("base64"));
  console.log("Size:", encoded.length, "bytes");
}

if (command === "decode") {
  const base64 = Deno.args[1];
  const data = new Uint8Array(Buffer.from(base64, "base64"));
  
  const decoded = decodeMessage(data);
  console.log("Decoded:", JSON.stringify(decoded.payload, null, 2));
}
