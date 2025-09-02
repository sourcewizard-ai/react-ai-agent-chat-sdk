import { chatHistoryRoute } from "react-ai-agent-chat-sdk/api";
import { agentChatRouteConfig } from "@/lib/agent-config";

export async function GET(req: Request) {
  return chatHistoryRoute(agentChatRouteConfig, req);
}