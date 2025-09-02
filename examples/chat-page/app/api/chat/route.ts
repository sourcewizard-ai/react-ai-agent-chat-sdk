import { chatRoute } from "react-ai-agent-chat-sdk/api";
import { agentChatRouteConfig } from "@/lib/agent-config";

export async function POST(req: Request) {
  return chatRoute(agentChatRouteConfig, req)
}
