import { Hono } from "hono";
import { 
  getCommand, 
  listCommands, 
  createCommand, 
  getPendingCommands,
  updateCommandResult 
} from "../services/commands.ts";
import {
  decodeMessage,
  MessageType,
  parseCommandResultPayload,
  encodeMessage,
  createCommandPayload,
  Flags,
} from "../../../libs/binary-protocol/src/index.ts";

export const commandsRouter = new Hono();

commandsRouter.get("/", (c) => {
  const agentId = c.req.query("agentId");
  const status = c.req.query("status");
  
  const commands = listCommands(agentId, status);
  return c.json({ commands });
});

commandsRouter.get("/pending/:agentId", (c) => {
  const agentId = c.req.param("agentId");
  const contentType = c.req.header("content-type") || "";
  
  if (contentType.includes("msgpack")) {
    return handleBinaryPendingCommands(c);
  }
  
  const commands = getPendingCommands(agentId);
  return c.json({ commands });
});

async function handleBinaryPendingCommands(c: any) {
  try {
    const agentId = c.req.param("agentId");
    const commands = getPendingCommands(agentId);
    
    const commandsPayload = {
      cmds: commands.map((cmd: any) => createCommandPayload(
        cmd.id,
        cmd.action,
        cmd.params || {},
        new Date(cmd.created_at).getTime(),
        cmd.signature || ""
      )),
    };
    
    const encoded = encodeMessage(MessageType.COMMAND, commandsPayload, Flags.NONE);
    
    return c.body(encoded, {
      status: 200,
      headers: { "Content-Type": "application/msgpack" },
    });
  } catch (e) {
    console.error("Binary commands error:", e);
    return c.json({ error: "Failed to get commands" }, 500);
  }
}

commandsRouter.get("/bin/:agentId", async (c) => {
  return handleBinaryPendingCommands(c);
});

commandsRouter.get("/:id", (c) => {
  const id = c.req.param("id");
  const command = getCommand(id);
  
  if (!command) {
    return c.json({ error: "Command not found" }, 404);
  }
  
  return c.json({ command });
});

commandsRouter.post("/", async (c) => {
  const body = await c.req.json();
  
  if (!body.agent_id || !body.action) {
    return c.json({ error: "agent_id and action required" }, 400);
  }
  
  const command = createCommand({
    id: body.id || `CMD-${Date.now()}`,
    agent_id: body.agent_id,
    action: body.action,
    params: body.params,
    signature: body.signature,
  });
  
  return c.json({ command }, 201);
});

commandsRouter.post("/:id/result", async (c) => {
  const id = c.req.param("id");
  const contentType = c.req.header("content-type") || "";
  
  if (contentType.includes("msgpack")) {
    return handleBinaryCommandResult(c, id);
  }
  
  const body = await c.req.json();
  
  updateCommandResult(id, body.result || {}, body.status || "completed");
  
  return c.json({ success: true });
});

async function handleBinaryCommandResult(c: any, commandId: string) {
  try {
    const body = await c.req.arrayBuffer();
    const data = new Uint8Array(body);
    
    const decoded = decodeMessage(data);
    
    if (decoded.type !== MessageType.COMMAND_RESULT) {
      return c.json({ error: "Invalid message type" }, 400);
    }
    
    const parsed = parseCommandResultPayload(decoded.payload);
    
    updateCommandResult(commandId, parsed.result, parsed.status);
    
    const responsePayload = { success: true };
    const encoded = encodeMessage(MessageType.ACK, responsePayload, Flags.NONE);
    
    return c.body(encoded, {
      status: 200,
      headers: { "Content-Type": "application/msgpack" },
    });
  } catch (e) {
    console.error("Binary command result error:", e);
    return c.json({ error: "Invalid binary payload" }, 400);
  }
}

commandsRouter.post("/bin/:id/result", async (c) => {
  const id = c.req.param("id");
  return handleBinaryCommandResult(c, id);
});
