import { Hono } from "hono";
import { getNetworkTopology, getDeviceDetails } from "../services/topology.ts";

export const topologyRouter = new Hono();

topologyRouter.get("/", (c) => {
  const agentId = c.req.query("agentId");
  const topology = getNetworkTopology(agentId);
  
  return c.json(topology);
});

topologyRouter.get("/device/:ip", (c) => {
  const ip = c.req.param("ip");
  const details = getDeviceDetails(ip);
  
  if (!details) {
    return c.json({ error: "Device not found" }, 404);
  }
  
  return c.json(details);
});

topologyRouter.get("/json", (c) => {
  const agentId = c.req.query("agentId");
  const topology = getNetworkTopology(agentId);
  
  return c.json(topology);
});
