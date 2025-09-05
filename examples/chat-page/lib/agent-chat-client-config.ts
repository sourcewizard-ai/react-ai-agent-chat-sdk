'use client';

import { AgentChatConfig } from 'react-ai-agent-chat-sdk/config-client';
import { ToolRenderer } from './agent-tools';

// Create client configuration directly
export const agentChatClientConfig: AgentChatConfig = {
  tools: {
    read_file: { display_name: "Reading file" },
    edit_file: { display_name: "Editing file" },
    list_files: { display_name: "Listing files", renderKey: "list_files" },
  },
  route: "/api/chat",
  historyRoute: "/api/chat/history",
  toolRenderers: {
    'list_files': ToolRenderer,
  },
  showDebugPanel: process.env.NODE_ENV === 'development',
};

// Legacy function for backward compatibility
export function createClientConfig(): AgentChatConfig {
  return agentChatClientConfig;
}